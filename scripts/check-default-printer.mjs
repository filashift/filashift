// BASE, SAMPLE, OUT and CHROME may be overridden for a staging or local run.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const base=process.env.BASE||"https://filashift.com";
const b=await chromium.launch({executablePath:process.env.CHROME||`${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try {
  for(const width of [390,1280]){
    const ctx=await b.newContext({viewport:{width,height:850},serviceWorkers:"block"});
    if(base.includes("127.0.0.1")) await ctx.addInitScript(()=>{window.__PRERENDER=true});
    for (const [name,file] of [["filament",process.env.FEED],["config",process.env.CONFIG]])
      if (file) await ctx.route(`**/data/${name}.json`,r=>r.fulfill({path:file,contentType:"application/json"}));
    const p=await ctx.newPage();
    const selected=async(id)=>{await p.waitForSelector(`[data-testid="chip-printer-${id}"][aria-pressed="true"]`);};
    await p.goto(base);await selected("flashforge-creator-5-pro");
    assert.match(await p.getByTestId("button-printer-picker").innerText(),/Creator 5 Pro/);
    if(width===1280){
      await p.getByTestId("input-file").setInputFiles(process.env.SAMPLE||"/tmp/x1c_painted_pla.3mf");
      await p.locator('[data-testid^="button-convert-f"]').first().click();
      const dl=p.waitForEvent("download");
      await p.locator('[data-testid^="button-download-f"]').first().click();await (await dl).saveAs(process.env.OUT||"/tmp/filashift-creator5pro.3mf");
      const row=p.locator('[data-testid^="shop-f"][data-testid$="-offer-0"]').first();
      await row.waitFor();assert.match(await row.locator("xpath=ancestor::li[1]").innerText(),/\$[\d.]+[\s\S]*\$[\d.]+\/kg/);
    }
    await p.getByTestId("chip-printer-snapmaker-u1").click();await selected("snapmaker-u1");
    await p.goto(base+"/?printer=flashforge-ad5x");await selected("flashforge-ad5x");
    await p.goto(base+"/?printer=nonexistent");await selected("flashforge-creator-5-pro");
    console.log(`${width}px: default, manual switch, deep link and fallback passed`);await ctx.close();
  }
} finally {await b.close();}
