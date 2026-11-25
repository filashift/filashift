// Run after npm run build. No external traffic or affiliate clicks.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { preview } from "vite";

const store = "https://elegoo.sjv.io/xJMdoA";
const items = [["ELEGOO", 22], ["Other", 12]].map(([b, p], i) => ({
  b, p, ppk: p, r: b, t: `${b} test spool`, v: "Black", c: ["Black"], f: "PLA", m: "PLA",
  d: 1.75, kg: 1, n: 1, ok: true, was: null, form: "spool", u: `https://shop.example/products/spool?variant=${i}`,
}));
const server = await preview({ configFile: false, build: { outDir: "dist/public" }, preview: { host: "127.0.0.1", port: 0 } });
const browser = await chromium.launch({ executablePath: process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome` });
try {
  for (const [prefix, label, width] of [["", "Shop ELEGOO", 1280], ["/es", "Comprar en ELEGOO", 390], ["/de", "Bei ELEGOO einkaufen", 1280], ["/fr", "Acheter chez ELEGOO", 390]]) {
    const page = await browser.newPage({ viewport: { width, height: 850 }, serviceWorkers: "block" });
    await page.addInitScript(() => {window.__PRERENDER = true;});
    await page.route("**/data/config.json", r => r.fulfill({json: {}}));
    await page.route("**/data/filament.json*", r => r.fulfill({json: {schema: 2, updated: new Date().toISOString(), stores: {ELEGOO: 1, Other: 1}, count: 2, items}}));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}${prefix}/filament`);
    const a = page.getByTestId("link-elegoo-store");
    await a.waitFor();
    assert((await a.innerText()).includes(label));
    assert.equal(await a.getAttribute("href"), store);
    assert.equal(await a.getAttribute("target"), "_blank");
    assert.equal(await a.getAttribute("rel"), "sponsored noopener noreferrer");
    assert.equal(await page.locator(`main a[href="${store}"]`).count(), 1);
    assert(await page.getByTestId("text-affiliate-disclosure").isVisible());
    await page.getByTestId("link-offer-2").waitFor();
    for (const [rank, index] of [[1, 1], [2, 0]]) {
      assert.equal(await page.getByTestId(`link-offer-${rank}`).getAttribute("href"), items[index].u);
    }
    await page.getByTestId("input-search").fill("ELEGOO");
    await page.getByTestId("link-offer-2").waitFor({state: "detached"});
    assert.equal(await page.getByTestId("link-offer-1").getAttribute("href"), items[0].u);
    console.log(`PASS ${prefix || "/en"} ${width}px: exact storefront URL, disclosure, price order, filtered variant link`);
    await page.close();
  }
} finally {await browser.close(); await server.close();}
