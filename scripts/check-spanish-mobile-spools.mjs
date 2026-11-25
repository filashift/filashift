import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { chromium, devices } from "playwright-core";
import { preview } from "vite";
import { assertX1AmsWarning } from "./assert-x1-ams-warning.mjs";

// Keep expectations independent of the guide: a swapped or missing CTA must fail.
const bambuPicks = [["Bambu Lab A1", "PLA"], ["Bambu Lab X1 Carbon", "PETG"]];
const creator = ["Flashforge Creator 5 Pro", "PLA"];
const u1 = ["Snapmaker U1", "PLA"];
const mode = process.argv[2];
const english = mode === "--english-shortcuts";
const lang = english ? "en" : "es";
assert(!mode || (["--shortcuts","--bambu","--english-shortcuts"].includes(mode) && process.argv.length === 3), "Expected no arguments, --shortcuts, --bambu or --english-shortcuts");
const picks = mode === "--bambu" ? bambuPicks : mode === "--shortcuts"
  ? [creator, ...bambuPicks, u1]
  : [creator, ...bambuPicks, ["Original Prusa MK4S", "PETG"], u1];
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
  const guide=`${base}/guides/filament-buying-guide-five-printers`;
  if (!mode) {
    await page.goto(`${guide}?lang=en`);
    await page.getByRole("button",{name:"Bambu Lab X1 Carbon",exact:true}).tap();
    await assertX1AmsWarning(page.getByRole("region",{name:"Bambu Lab X1 Carbon",exact:true}),"en");
    console.log("PASS X1 Carbon original AMS warning: English content and placement");
  }
  await page.goto(`${guide}?lang=${lang}`);
  assert(await page.evaluate(()=>navigator.maxTouchPoints>0 && innerWidth<500));
  for (const [printer,material] of picks) {
    try {
      const card=page.getByRole("region",{name:printer,exact:true});
      if (mode) {
        await page.getByRole("button",{name:printer,exact:true}).tap();
        assert(await card.evaluate(el=>document.activeElement===el),"Printer shortcut did not focus the matching section");
      }
      if (printer === "Bambu Lab X1 Carbon") {
        await assertX1AmsWarning(card,lang);
        console.log(`PASS X1 Carbon original AMS warning: ${lang} content and placement`);
      }
      const ams=printer==="Bambu Lab X1 Carbon", u1=printer==="Snapmaker U1";
      const fit=card.getByTestId("atomic-reel-guide");
      assert.equal(await fit.count(),ams||u1?1:0);
      if(ams||u1){
        const labels=await fit.locator("strong").allTextContents();
        assert.deepEqual(labels,[english?`1 kg: ${ams?"Within":"Outside"} size limits.`:`1 kg: ${ams?"Dentro":"Fuera"} de los límites.`,english?"3.5 kg jumbo: Outside size limits.":"Jumbo de 3,5 kg: Fuera de los límites."]);
        assert.equal(await fit.locator("a").count(),2);
        assert.match(await fit.innerText(),ams?/200 mm/:/51 mm/);
      }
      await card.getByRole("link",{name:english ? `Compare ${material} spools` : `Comparar bobinas de ${material}`,exact:true}).tap();
      for(const phase of ["tap","reload"]) {
        if(phase==="reload"){
          await page.evaluate(()=>localStorage.removeItem("filashift-lang"));
          await page.reload();
        }
        await page.getByTestId("offer-1").waitFor();
        const url=new URL(page.url());
        assert.equal(url.pathname,"/filament");
        for(const [key,value] of Object.entries({pack:"single",d:"1.75",f:material,t:material})) assert.equal(url.searchParams.get(key),value,key);
        assert.equal(url.searchParams.get("lang") ?? "en",lang);
        assert.equal(await page.locator("html").getAttribute("lang"),lang);
        for(const [id,value] of Object.entries({"select-type":material,"select-pack":english?"Single spool":"Una bobina","select-diameter":"1.75 mm","select-sort":english?"Lowest total price":"Menor precio total"})) assert.equal(await page.getByTestId(id).innerText(),value,id);
        assert.equal(await page.getByTestId("switch-instock").getAttribute("aria-checked"),"true");
        assert.equal(await page.getByTestId("feeder").inputValue(),ams?"ams":u1?"u1":"none");
        assert.deepEqual(errors,[]);
      }
      await page.goBack();
      await card.waitFor();
      console.log(`PASS ${printer}: ${material}, ${lang} touch navigation and reload`);
    } catch (err) { throw new Error(`${lang} mobile single-spool check failed: ${printer} (${material})`,{cause:err}); }
  }
} finally {
  await browser?.close();
  await server?.close();
}
