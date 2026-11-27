// Run after npm run build. No external traffic.
// The /filament sort label fits at desktop widths, and the current page's nav tab is fully visible on phones.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { preview } from "vite";

const items = [["Brand", 20], ["Other", 12]].map(([b, p], i) => ({
  b, p, ppk: p, r: b, t: `${b} test spool`, v: "Black", c: ["Black"], f: "PLA", m: "PLA",
  d: 1.75, kg: 1, n: 1, ok: true, was: null, form: "spool", u: `https://shop.example/products/spool?variant=${i}`,
}));
const server = await preview({ configFile: false, build: { outDir: "dist/public" }, preview: { host: "127.0.0.1", port: 0 } });
const browser = await chromium.launch({ executablePath: process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome` });
const fits = (loc) => loc.evaluate((el) => {
  const r = el.getBoundingClientRect(), s = el.querySelector("span") || el;
  return { overflow: s.scrollWidth - s.clientWidth, w: Math.round(r.width) };
});
try {
  const root = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const prefix of ["", "/es", "/de", "/fr"]) {
    for (const width of [1024, 1280, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 850 }, serviceWorkers: "block" });
      await page.addInitScript(() => { window.__PRERENDER = true; });
      await page.route("**/data/config.json", (r) => r.fulfill({ json: {} }));
      await page.route("**/data/filament.json*", (r) => r.fulfill({ json: { schema: 2, updated: new Date().toISOString(), stores: { Brand: 1, Other: 1 }, count: 2, items } }));
      await page.goto(`${root}${prefix}/filament`);
      const sel = page.getByTestId("select-sort");
      await sel.waitFor();
      const f = await fits(sel);
      assert(f.overflow <= 0, `${prefix || "/en"} ${width}px sort label clipped by ${f.overflow}px`);
      await page.close();
    }
    console.log(`PASS ${prefix || "/en"}: sort label fits at 1024, 1280 and 1440 px`);
    for (const [path, tid] of [["/filament", "nav-filament"], ["/guides", "nav-guides"], ["/faq", "nav-faq"]]) {
      for (const width of [320, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 800 }, serviceWorkers: "block" });
        await page.addInitScript(() => { window.__PRERENDER = true; });
        await page.route("**/data/config.json", (r) => r.fulfill({ json: {} }));
        await page.route("**/data/filament.json*", (r) => r.fulfill({ json: { schema: 2, updated: new Date().toISOString(), stores: { Brand: 1 }, count: 2, items } }));
        await page.goto(`${root}${prefix}${path}`);
        const tab = page.getByTestId(tid);
        await tab.waitFor();
        await page.waitForTimeout(150);
        assert.equal(await tab.getAttribute("aria-current"), "page");
        const [t, n] = await Promise.all([tab.boundingBox(), tab.locator("xpath=..").boundingBox()]);
        assert(t.x >= n.x - 0.5 && t.x + t.width <= n.x + n.width + 0.5, `${prefix || "/en"}${path} ${width}px tab clipped`);
        assert.equal(await page.evaluate(() => window.scrollY), 0);
        await page.close();
      }
    }
    console.log(`PASS ${prefix || "/en"}: current nav tab fully visible at 320 and 390 px on /filament, /guides, /faq`);
  }
} finally { await browser.close(); await server.close(); }
