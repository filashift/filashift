// Run after npm run build. No external traffic or affiliate clicks.
// Flashforge affiliate link: filament prices page only, static link, no script.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { preview } from "vite";

const store = "https://flashforge.sjv.io/aNg6Nq";
const items = [["Flashforge", 22], ["Other", 12]].map(([b, p], i) => ({
  b, p, ppk: p, r: b, t: `${b} test spool`, v: "Black", c: ["Black"], f: "PLA", m: "PLA",
  d: 1.75, kg: 1, n: 1, ok: true, was: null, form: "spool", u: `https://shop.example/products/spool?variant=${i}`,
}));
const server = await preview({ configFile: false, build: { outDir: "dist/public" }, preview: { host: "127.0.0.1", port: 0 } });
const browser = await chromium.launch({ executablePath: process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome` });
try {
  for (const [prefix, label, width] of [["", "Shop Flashforge (affiliate link)", 1280], ["/es", "Comprar en Flashforge (enlace de afiliado)", 390], ["/de", "Bei Flashforge einkaufen (Affiliate-Link)", 1280], ["/fr", "Acheter chez Flashforge (lien affilié)", 390]]) {
    const page = await browser.newPage({ viewport: { width, height: 850 }, serviceWorkers: "block" });
    const external = [];
    page.on("request", (r) => { const h = new URL(r.url()).hostname; if (h !== "127.0.0.1") external.push(r.url()); });
    await page.addInitScript(() => { window.__PRERENDER = true; });
    await page.route("**/data/config.json", (r) => r.fulfill({ json: {} }));
    await page.route("**/data/filament.json*", (r) => r.fulfill({ json: { schema: 2, updated: new Date().toISOString(), stores: { Flashforge: 1, Other: 1 }, count: 2, items } }));
    const root = `http://127.0.0.1:${server.httpServer.address().port}${prefix}`;
    await page.goto(`${root}/filament`);
    const a = page.getByTestId("link-flashforge-store");
    await a.waitFor();
    assert.equal((await a.innerText()).trim(), label);
    assert.equal(await a.getAttribute("href"), store);
    assert.equal(await a.getAttribute("target"), "_blank");
    assert.equal(await a.getAttribute("rel"), "sponsored noopener noreferrer");
    assert.equal(await page.locator(`main a[href="${store}"]`).count(), 1);
    assert(await page.getByTestId("link-elegoo-store").isVisible());
    assert(await page.getByTestId("text-affiliate-disclosure").isVisible());
    const ab = await a.boundingBox(), vw = page.viewportSize().width;
    assert(ab && ab.x >= 0 && ab.x + ab.width <= vw, "link fits the viewport");
    await page.getByTestId("link-offer-2").waitFor();
    for (const [rank, index] of [[1, 1], [2, 0]]) assert.equal(await page.getByTestId(`link-offer-${rank}`).getAttribute("href"), items[index].u);
    assert.equal(await page.locator('script[src*="impact"], script[src*="sjv.io"]').count(), 0);
    console.log(`PASS ${prefix || "/en"} ${width}px: filament page link, label, rel, disclosure, price order unchanged, no script`);
    for (const path of ["/guides", "/guides/makerworld-to-flashforge", "/guides/filament-buying-guide-five-printers", "/"]) {
      await page.goto(`${root}${path}`);
      await page.locator("main").waitFor();
      await page.waitForTimeout(300);
      assert.equal(await page.locator('a[href*="flashforge.sjv.io"]').count(), 0, `no Flashforge affiliate link on ${path}`);
    }
    assert.deepEqual(external, [], "no third-party requests");
    console.log(`PASS ${prefix || "/en"}: no Flashforge affiliate link on guides or home, no third-party requests`);
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
