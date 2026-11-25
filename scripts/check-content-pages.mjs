// Checks the /tested page, the "Request a printer" form (picker empty state and /tested)
// and the three 2026-11-25 conversion guides, in English and Spanish, desktop and mobile.
// Usage: npm run build && node scripts/prerender.mjs && node scripts/check-content-pages.mjs
// Set SHOTS=/some/dir to also save screenshots.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, webkit, devices } from "playwright-core";
import { preview } from "vite";

const dist = "dist/public";
const shots = process.env.SHOTS || "";
if (shots) fs.mkdirSync(shots, { recursive: true });

// Static checks on the prerendered output.
const testedHtml = fs.readFileSync(path.join(dist, "tested/index.html"), "utf8");
assert.match(testedHtml, /<title>Printer test results[^<]*\| FilaShift<\/title>/);
assert.match(testedHtml, /<meta name="description" content="[^"]{60,}"/);
const ld = [...testedHtml.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const flat = ld.flatMap((j) => (j["@graph"] ? j["@graph"] : [j]));
assert.ok(flat.some((j) => j["@type"] === "Dataset"), "Dataset JSON-LD in prerendered /tested");
const sitemap = fs.readFileSync(path.join(dist, "sitemap.xml"), "utf8");
for (const u of ["/tested", "/guides/creality-print-to-bambu", "/guides/bambu-to-prusaslicer-mmu3-xl", "/guides/bambu-h3c-p3c-multicolour"])
  assert.ok(sitemap.includes(`https://filashift.com${u}<`), `sitemap has ${u}`);
const index = JSON.parse(fs.readFileSync(path.join(dist, "profiles/index.json"), "utf8"));
const total = index.length;
const evidence = JSON.parse(fs.readFileSync(`${dist}/profiles/tested.json`, "utf8")).printers;
const passed = index.filter(p => evidence[p.id]?.ok).length;
console.log(`PASS prerender: /tested title, description, Dataset JSON-LD; sitemap has /tested and 3 new guides (${total} printers)`);

const server = await preview({ configFile: false, build: { outDir: dist }, preview: { host: "127.0.0.1", port: 0 } });
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const chrome = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`;
const T = {
  en: { count: `${passed} of ${total} printers slicer-tested`, shown: (n) => `Showing ${n} of ${total} printers`, title: "Printer test results", req: "Request a printer", none: "No printer matches.", sent: "Thanks, your request was received." },
  es: { count: `${passed} de ${total} impresoras probadas en laminador`, shown: (n) => `Se muestran ${n} de ${total} impresoras`, title: "Resultados de las pruebas de impresoras", req: "Solicitar una impresora", none: "Ninguna impresora coincide.", sent: "Gracias, recibimos tu solicitud." },
};
const ALLOWED = ["kind", "brand", "model", "slicer", "message", "website", "page"];
let browser;
const noOverflow = async (p, what) => {
  const [sw, w] = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(sw <= w, `${what}: no horizontal overflow (${sw} > ${w})`);
};
try {
  const es = JSON.parse(fs.readFileSync("client/src/lib/es.json", "utf8"));
  for (const k of ["Request a printer", "Printer test results", "How the tests work", "Send request", "Test results"]) assert.ok(es[k], `es.json has "${k}"`);

  for (const [engine, profile, width] of [[chromium, "Desktop Chrome", 1280], [chromium, "Desktop Chrome", 320], [webkit, "iPhone 13", 390]]) {
    browser = await engine.launch(engine === chromium ? { executablePath: chrome } : {});
    for (const lang of ["en", "es"]) {
      const t = T[lang];
      const dev = { ...devices[profile] };
      if (profile === "Desktop Chrome") dev.viewport = { width, height: 900 };
      const ctx = await browser.newContext({ ...dev, serviceWorkers: "block" });
      await ctx.addInitScript(() => { window.__PRERENDER = true; });
      const p = await ctx.newPage();
      const posts = [];
      await p.route("**/api/**", async (r) => {
        const req = r.request();
        if (req.method() === "POST") posts.push({ url: req.url(), body: req.postDataJSON() });
        await r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
      });
      const tag = `${profile} ${width}px ${lang.toUpperCase()}`;
      const shot = async (name) => { if (shots) await p.screenshot({ path: path.join(shots, `${name}-${width}-${lang}.png`), fullPage: false }); };

      // /tested page.
      await p.goto(`${base}/tested?lang=${lang}`);
      await p.waitForFunction((l) => document.documentElement.lang === l, lang);
      await assert.doesNotReject(p.getByTestId("text-tested-count").filter({ hasText: t.count }).waitFor());
      assert.equal((await p.getByTestId("text-page-title").textContent()).trim(), t.title);
      assert.equal(await p.locator('[data-testid^="row-tested-"]').count(), total);
      assert.equal((await p.getByTestId("text-tested-shown").textContent()).trim(), t.shown(total));
      assert.ok(await p.locator("#ld-tested, script[type='application/ld+json']").count());
      await noOverflow(p, `${tag} /tested`);
      await shot("tested");
      await p.getByTestId("table-tested").scrollIntoViewIfNeeded();
      await shot("tested-table");

      await p.getByTestId("input-tested-search").fill("H3C");
      await p.waitForFunction(() => document.querySelectorAll('[data-testid^="row-tested-"]').length === 1);
      assert.equal(await p.getByTestId("row-tested-bambu-lab-h3c").count(), 1);
      await p.getByTestId("input-tested-search").fill("");
      await p.getByTestId("select-tested-brand").click();
      await p.getByRole("option", { name: "Prusa", exact: true }).click();
      await p.waitForFunction(() => { const n = document.querySelectorAll('[data-testid^="row-tested-"]').length; return n > 0 && n < 50; });
      const prusaRows = await p.locator('[data-testid^="row-tested-"]').count();
      assert.equal(prusaRows, index.filter((x) => x.vendor === "Prusa").length);
      await p.getByTestId("select-tested-slicer").click();
      await p.getByRole("option", { name: "Bambu Studio", exact: true }).click();
      await p.getByTestId("tested-empty").waitFor();
      assert.equal((await p.getByTestId("tested-empty").locator("p").first().textContent()).trim(), t.none);
      await noOverflow(p, `${tag} /tested empty`);
      await shot("tested-empty");
      await p.goto(`${base}/tested?lang=${lang}&slicer=Bambu%20Studio`);
      await p.waitForFunction(() => document.querySelectorAll('[data-testid^="row-tested-"]').length > 0);
      const bambuRows = await p.locator('[data-testid^="row-tested-"]').count();
      assert.equal(bambuRows, index.filter((x) => x.slicer === "Bambu Studio").length);

      // Request from /tested.
      await p.getByTestId("button-request-printer-tested").click();
      const dlg = p.getByTestId("dialog-printer-request");
      await dlg.waitFor();
      assert.equal(await dlg.locator('input[type="email"]').count(), 0, "no email field");
      assert.equal((await dlg.getByRole("heading").first().textContent()).trim(), t.req);
      await p.getByTestId("input-request-brand").fill("Acme");
      await p.getByTestId("input-request-model").fill("Z9 Test");
      await p.getByTestId("input-request-slicer").fill("OrcaSlicer 2.5");
      await p.getByTestId("input-request-note").fill("0.6 mm nozzle");
      await noOverflow(p, `${tag} request dialog`);
      await shot("request-dialog");
      await p.getByTestId("button-request-send").click();
      await p.getByTestId("text-printer-request-sent").waitFor();
      assert.ok((await p.getByTestId("text-printer-request-sent").textContent()).includes(t.sent));
      assert.equal(posts.length, 1, "exactly one POST");
      assert.ok(posts[0].url.endsWith("/api/report"));
      const b = posts[0].body;
      assert.deepEqual(Object.keys(b).filter((k) => !ALLOWED.includes(k)), [], `only allowed fields: ${Object.keys(b)}`);
      assert.equal(b.kind, "printer-request");
      assert.equal(b.brand, "Acme"); assert.equal(b.model, "Z9 Test"); assert.equal(b.slicer, "OrcaSlicer 2.5"); assert.equal(b.message, "0.6 mm nozzle");
      assert.equal(b.website, "");
      await p.keyboard.press("Escape");
      console.log(`PASS ${tag}: /tested rows ${total}, search, brand (${prusaRows}), slicer (${bambuRows}), empty state, request POST fields`);

      // Picker empty state on the home page.
      posts.length = 0;
      await p.goto(`${base}/?lang=${lang}`);
      await p.waitForFunction((l) => document.documentElement.lang === l, lang);
      await p.getByTestId("link-tested-results").waitFor();
      assert.equal(await p.getByTestId("link-tested-results").getAttribute("href"), "/tested");
      assert.equal(await p.getByTestId("footer-tested").count(), 1);
      await p.getByTestId("button-printer-picker").click();
      await p.getByTestId("input-printer-search").fill("Zyxwv 9000");
      await p.getByTestId("printer-search-empty").waitFor();
      await noOverflow(p, `${tag} picker empty`);
      await shot("picker-empty");
      await p.getByTestId("printer-search-empty").getByTestId("button-request-printer").click();
      await dlg.waitFor();
      assert.equal(await p.getByTestId("input-request-model").inputValue(), "Zyxwv 9000");
      await p.getByTestId("button-request-send").click();
      await p.getByText(lang === "es" ? "Escribe la marca y el modelo de la impresora." : "Please enter the printer brand and model.", { exact: false }).first().waitFor();
      assert.equal(posts.length, 0, "validation blocks send without brand");
      await p.keyboard.press("Escape");
      await p.getByTestId("footer-tested").click();
      await p.waitForURL("**/tested**");
      console.log(`PASS ${tag}: home links, picker empty state opens prefilled request dialog, validation, footer link`);

      // New guides.
      await p.goto(`${base}/guides?lang=${lang}`);
      for (const slug of ["creality-print-to-bambu", "bambu-to-prusaslicer-mmu3-xl", "bambu-h3c-p3c-multicolour"]) {
        await p.getByTestId(`link-guide-${slug}`).waitFor();
      }
      if (width !== 1280) await shot("guides-index");
      for (const slug of ["creality-print-to-bambu", "bambu-to-prusaslicer-mmu3-xl", "bambu-h3c-p3c-multicolour"]) {
        await p.goto(`${base}/guides/${slug}?lang=${lang}`);
        await p.waitForFunction((l) => document.documentElement.lang === l, lang);
        await p.locator('time[datetime="2026-11-25"]').waitFor();
        const h1 = (await p.getByTestId("text-page-title").textContent()).trim();
        assert.ok(h1.length > 10);
        await noOverflow(p, `${tag} guide ${slug}`);
        if (slug === "bambu-h3c-p3c-multicolour") await shot("guide-h3c");
      }
      console.log(`PASS ${tag}: 3 new guides render, dated 2026-11-25, no overflow`);
      await ctx.close();
    }
    await browser.close(); browser = null;
  }
  console.log("PASS check-content-pages");
} finally { await browser?.close(); await server?.close(); }
