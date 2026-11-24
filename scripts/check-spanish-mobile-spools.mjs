import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

// Keep expectations independent of the guide: a swapped or missing CTA must fail.
const picks = [
  ["Flashforge Creator 5 Pro", "PLA"], ["Bambu Lab A1", "PLA"],
  ["Bambu Lab X1 Carbon", "PETG"], ["Original Prusa MK4S", "PETG"], ["Snapmaker U1", "PLA"],
];
const items = ["PLA","PETG"].map(m => ({
  b:"Fixture", r:"Fixture", t:`Test ${m}`, v:"Black", c:["Black"], f:m, m,
  d:1.75, kg:1, n:1, form:"spool", p:20, ppk:20, was:null, ok:true,
  u:`https://example.invalid/${m}?variant=1`,
}));
const server = process.env.BASE ? null : await preview({
  configFile:false, build:{outDir:"dist/public"}, preview:{host:"127.0.0.1",port:0},
});
const base = process.env.BASE || `http://127.0.0.1:${server.httpServer.address().port}`;
const executablePath = [process.env.CHROME, `${homedir()}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`, "/usr/bin/chromium", "/usr/bin/google-chrome"].find(p=>p && existsSync(p));
let browser;
try {
  browser = await chromium.launch({executablePath});
  const ctx = await browser.newContext({...devices["Pixel 7"], locale:"en-US", serviceWorkers:"block"});
  ctx.setDefaultTimeout(10000);
  if (server) {
    await ctx.addInitScript(()=>{window.__PRERENDER=true;});
    await ctx.route("**/data/filament.json", r=>r.fulfill({json:{schema:2, updated:new Date().toISOString(), count:items.length, stores:{Fixture:2}, items}}));
    await ctx.route("**/data/config.json", r=>r.fulfill({json:{}}));
  }
  const page=await ctx.newPage();
  const errors=[];
  page.on("pageerror", e=>errors.push(e.message));
  await page.goto(`${base}/guides/filament-buying-guide-five-printers?lang=es`);
  assert(await page.evaluate(()=>navigator.maxTouchPoints>0 && innerWidth<500));
  for (const [printer,material] of picks) {
    try {
      const card=page.getByRole("region",{name:printer,exact:true});
      await card.getByRole("link",{name:`Comparar bobinas de ${material}`,exact:true}).tap();
      for(const phase of ["tap","reload"]) {
        if(phase==="reload"){
          await page.evaluate(()=>localStorage.removeItem("filashift-lang"));
          await page.reload();
        }
        await page.getByTestId("offer-1").waitFor();
        const url=new URL(page.url());
        assert.equal(url.pathname,"/filament");
        for(const [key,value] of Object.entries({lang:"es",pack:"single",d:"1.75",f:material,t:material})) assert.equal(url.searchParams.get(key),value,key);
        assert.equal(await page.locator("html").getAttribute("lang"),"es");
        for(const [id,value] of Object.entries({"select-type":material,"select-pack":"Una bobina","select-diameter":"1.75 mm","select-sort":"Menor precio total"})) assert.equal(await page.getByTestId(id).innerText(),value,id);
        assert.equal(await page.getByTestId("switch-instock").getAttribute("aria-checked"),"true");
        assert.deepEqual(errors,[]);
      }
      await page.goBack();
      await card.waitFor();
      console.log(`PASS ${printer}: ${material}, Spanish touch navigation and reload`);
    } catch (err) { throw new Error(`Spanish mobile single-spool check failed: ${printer} (${material})`,{cause:err}); }
  }
} finally {
  await browser?.close();
  await server?.close();
}
