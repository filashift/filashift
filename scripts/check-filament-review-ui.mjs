// Run on built app: node scripts/check-filament-review-ui.mjs x1c_paint.3mf ad5x_project.3mf
import assert from "node:assert/strict";
import {chromium} from "playwright-core";
import {preview} from "vite";
const [mixed, pla] = process.argv.slice(2);
assert.ok(mixed && pla);
const server = await preview({configFile:false,build:{outDir:"dist/public"},preview:{host:"127.0.0.1",port:0}});
const browser = await chromium.launch({executablePath:process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try {
  for(const [file, hasReview] of [[mixed,true],[pla,false]]) {
    const page=await browser.newPage({serviceWorkers:"block"});
    await page.addInitScript(()=>{window.__PRERENDER=true;});
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?printer=wondermaker-zr`);
    await page.getByTestId("input-file").setInputFiles(file);
    await page.locator("article [data-testid^=button-convert-]").click();
    await page.locator("[data-testid^=panel-result-]").waitFor();
    const panel=page.getByTestId("filament-review");
    assert.equal(await panel.count(), hasReview ? 1 : 0);
    if(hasReview) {
      assert.match(await panel.locator("summary").innerText(), /filament 3 \(PETG\)/);
      assert.equal(await panel.locator("li:visible").count(),2);
      await panel.locator("summary").click();
      assert.equal(await panel.locator("li:visible").count(),0);
    }
    await page.close();
  }
  console.log("Mixed and all-PLA browser conversions passed.");
} finally { await browser.close(); await server.close(); }
