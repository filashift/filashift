// Usage: node scripts/check-filament-partners.mjs
// BASE / FEED / CONFIG can point to staging. Checks only public data; no checkout.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
const base = process.env.BASE || "https://filashift.com";
const json = async (name, file) => file ? JSON.parse(await readFile(file, "utf8")) :
  (await (await fetch(`${base}/data/${name}.json`)).json());
const feed = await json("filament", process.env.FEED), cfg = await json("config", process.env.CONFIG);
assert.equal(feed.schema, 2);
assert.equal(new Set(feed.items.map(i => i.u)).size, feed.count);
assert(feed.items.every(i => i.c.length <= 1 && [true, false, null].includes(i.ok)));
const b = await chromium.launch({executablePath:process.env.CHROME ||
  `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try {
  for (const width of [390, 1280]) {
    const ctx = await b.newContext({viewport:{width,height:850},serviceWorkers:"block"});
    if (process.env.FEED) {
      await ctx.addInitScript(() => {window.__PRERENDER = true});
      for (const [name, value] of [["filament", feed], ["config", cfg]])
        await ctx.route(`**/data/${name}.json`, r=>r.fulfill({json:value}));
    }
    const page = await ctx.newPage();
    await page.goto(`${base}/filament`);
    await page.getByTestId("text-updated").waitFor();
    for (const host of Object.keys(cfg.affiliates)) {
      const items = feed.items.filter(i => new URL(i.u).host === host);
      assert(items.length, `missing ${host}`);
      await page.getByTestId("input-search").fill(items[0].b);
      const stock = page.getByTestId("switch-instock");
      for (const stockOnly of [true,false]) {
        if ((await stock.getAttribute("aria-checked")==="true") !== stockOnly) await stock.click();
        // The finder defaults to 1.75 mm filament.
        const ordered = feed.items.filter(i=>(!stockOnly||i.ok) && i.d === 1.75 &&
          `${i.b} ${i.t} ${i.v} ${i.m} ${i.c.join(" ")}`.toLowerCase().includes(items[0].b.toLowerCase())).sort((a,b)=>a.ppk-b.ppk);
        if (!ordered.length) {assert.match(await page.getByTestId("text-count").innerText(),/0 results/); continue;}
        // Offers with equal price per kg may appear in any order, so match each row
        // to the offer it links to among the offers tied at that rank's price.
        const seen = new Set();
        for (const [idx, expected] of ordered.slice(0,40).entries()) {
          const row=page.getByTestId(`offer-${idx+1}`);
          const label=await row.innerText();
          const a=page.getByTestId(`link-offer-${idx+1}`), link=new URL(await a.getAttribute("href"));
          const dest=link.searchParams.has("u")?new URL(link.searchParams.get("u")):link;
          const key = (u) => { const x = new URL(u); return `${x.origin}${x.pathname}?variant=${x.searchParams.get("variant")}`; };
          const item = ordered.find(i => i.ppk === expected.ppk && !seen.has(i) && key(i.u) === key(dest.href));
          assert(item, `rank ${idx+1}: link ${dest.href} is not an offer at $${expected.ppk}/kg`);
          seen.add(item);
          if (item.v) assert(label.includes(item.v));
          assert.equal(label.includes("Out of stock"),item.ok===false);
          assert.equal(label.includes("Stock not confirmed"),item.ok===null);
          if (dest.hostname === "store.sunlu.com") assert.equal(dest.searchParams.get("sca_source"),"filashift-finder");
          if (host===new URL(item.u).host) assert((await a.getAttribute("rel")).includes("sponsored"));
        }
      }
      console.log(`${width}px ${host}: exact links, labels and stock filters passed`);
    }
    await ctx.close();
  }
} finally {await b.close();}
