// Run after npm run build. No external traffic.
// MF-008: the Printers section (#printers) finds any supported model by name, in all four languages.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { preview } from "vite";

const index = JSON.parse(await readFile("dist/public/profiles/index.json", "utf8"));
const list = Array.isArray(index) ? index : index.printers;
assert(list.some((p) => p.id === "flashforge-creator-5-pro"), "Creator 5 Pro is in the profile index");
const server = await preview({ configFile: false, build: { outDir: "dist/public" }, preview: { host: "127.0.0.1", port: 0 } });
const browser = await chromium.launch({ executablePath: process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome` });
const L = {
  "": { ph: "Find your printer, e.g. Creator 5 Pro", none: "No supported printer matches that search." },
  "/es": { ph: "Busca tu impresora, p. ej., Creator 5 Pro", none: "Ninguna impresora compatible coincide con esa búsqueda." },
  "/de": { ph: "Drucker suchen, z. B. Creator 5 Pro", none: "Kein unterstützter Drucker passt zu dieser Suche." },
  "/fr": { ph: "Trouvez votre imprimante, p. ex. Creator 5 Pro", none: "Aucune imprimante prise en charge ne correspond à cette recherche." },
};
try {
  const root = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const [prefix, t] of Object.entries(L)) {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, serviceWorkers: "block" });
      await page.addInitScript(() => { window.__PRERENDER = true; });
      const external = [];
      page.on("request", (r) => { if (new URL(r.url()).hostname !== "127.0.0.1") external.push(r.url()); });
      await page.goto(`${root}${prefix}/`);
      await page.getByTestId("nav-printers").click();
      const input = page.getByTestId("input-printers-search");
      await input.waitFor();
      await page.waitForTimeout(300);
      assert.equal(await input.getAttribute("placeholder"), t.ph);
      const box = await input.boundingBox();
      assert(box.x >= 0 && box.x + box.width <= width, "search box fits");
      await input.fill("Creator 5 Pro");
      const hit = page.getByTestId("printers-search-flashforge-creator-5-pro");
      await hit.waitFor();
      assert.equal((await hit.locator("span").first().innerText()).trim(), "Flashforge Creator 5 Pro");
      const ids = await page.locator('[data-testid^="printers-search-"]').evaluateAll((els) => els.map((e) => e.dataset.testid));
      assert.deepEqual(ids.filter((x) => x.startsWith("printers-search-flashforge")), ["printers-search-flashforge-creator-5-pro"]);
      await input.fill("creator 5");
      await page.getByTestId("printers-search-flashforge-creator-5").waitFor();
      await input.fill("flashforge");
      assert.equal(await page.locator('[data-testid^="printers-search-flashforge-"]').count(), list.filter((p) => p.vendor === "Flashforge").length);
      await input.fill("zzqx 9000");
      assert((await page.getByTestId("text-printers-search-empty").innerText()).includes(t.none));
      await input.fill("Creator 5 Pro");
      await hit.click();
      await page.waitForTimeout(800);
      assert((await page.getByTestId("button-printer-picker").innerText()).includes("Flashforge Creator 5 Pro"), "picking sets the target printer");
      await input.fill("");
      assert.equal(await page.getByTestId("list-printers-search").count(), 0);
      assert(await page.getByTestId("brand-flashforge").isVisible(), "brand cards still shown when the search is empty");
      assert.deepEqual(external, [], "no third-party requests");
      await page.close();
    }
    console.log(`PASS ${prefix || "/en"}: "Creator 5 Pro" found in #printers at 390 and 1280 px, sets the target, all 13 Flashforge models searchable, empty state translated`);
  }
} finally { await browser.close(); await server.close(); }
