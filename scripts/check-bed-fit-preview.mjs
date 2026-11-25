// Run against a local build: node scripts/check-bed-fit-preview.mjs x1c_paint.3mf
import assert from "node:assert/strict";
import {chromium} from "playwright-core";
import {preview} from "vite";
const file=process.argv[2]; assert.ok(file);
const server=await preview({configFile:false,build:{outDir:"dist/public"},preview:{host:"127.0.0.1",port:0}});
const browser=await chromium.launch({executablePath:process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try {
  for(const [printer,over] of [["voron-0-1",true],["wondermaker-zr",false]]) {
    const page=await browser.newPage({serviceWorkers:"block"});
    await page.addInitScript(()=>{window.__PRERENDER=true;});
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?printer=${printer}`);
    await page.getByTestId("input-file").setInputFiles(file);
    const panel=page.getByTestId("preflight");
    await panel.getByText(over?/Exceeds the bed/:/Within the bed rectangle/).first().waitFor();
    assert.equal(await panel.getByTestId("bed-fit-next-step").count(), over?1:0);
    if(over) assert.match(await panel.getByTestId("bed-fit-next-step").innerText(),/Arrange or move some to another plate/);
    await page.close();
  }
  console.log("Preflight: same project offers full-size recovery on Voron; no bed warning on ZR.");
} finally {await browser.close(); await server.close();}
