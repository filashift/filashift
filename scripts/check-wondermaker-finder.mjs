import assert from "node:assert/strict";
import {chromium, webkit, devices} from "playwright-core";
import {preview} from "vite";

const server = process.env.BASE ? null : await preview({configFile:false,build:{outDir:"dist/public"},preview:{host:"127.0.0.1",port:0}});
const base = process.env.BASE || `http://127.0.0.1:${server.httpServer.address().port}`;
const models = ["wondermaker-zr","wondermaker-zr-ultra","wondermaker-zr-ultra-s"];
try {
  for (const [engine, device] of [[chromium,"Desktop Chrome"],[webkit,"iPhone 13"]]) {
    const browser = await engine.launch(engine === chromium ? {executablePath:process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`} : {});
    try {
      const page = await browser.newPage({...devices[device],serviceWorkers:"block"});
      if (server) await page.addInitScript(()=>{window.__PRERENDER=true;});
      await page.goto(base + "/");
      const picker = page.getByTestId("button-printer-picker"), search = page.getByTestId("input-printer-search");
      const list = page.locator("[cmdk-item][data-testid^='option-printer-']");
      async function checkFamily() {
        await page.waitForFunction(()=>document.querySelectorAll("[cmdk-item][data-testid^='option-printer-']").length === 3);
        assert.deepEqual((await list.evaluateAll(xs=>xs.map(x=>x.dataset.testid.slice("option-printer-".length)))).sort(),models);
      }
      for (const id of models) {
        await page.getByTestId("filter-wondermaker-printers").click();
        await checkFamily();
        await page.getByTestId(`option-printer-${id}`).click();
        await search.waitFor({state:"detached"});
        const name = { "wondermaker-zr":"WonderMaker ZR","wondermaker-zr-ultra":"WonderMaker ZR Ultra","wondermaker-zr-ultra-s":"WonderMaker ZR Ultra S" }[id];
        assert.equal((await picker.innerText()).split("\n")[0],name);
      }
      await picker.click();
      assert.equal(await search.inputValue(),"");
      for (const q of ["wondermakers","WonderMaker","wonder makers","Wonder Maker","WONDERMAKERS"]) {
        await search.fill(q); await checkFamily();
      }
      await search.fill("Flashforge AD5X");
      await page.getByTestId("option-printer-flashforge-ad5x").click();
      await search.waitFor({state:"detached"}); // let the first picker close before opening the batch picker
      assert.match(await picker.innerText(),/AD5X/);
      await page.getByTestId("batch-printers").locator("summary").click();
      await page.getByTestId("button-batch-printer-picker").click();
      await search.fill("wondermakers"); await checkFamily();
      await page.getByTestId("option-printer-wondermaker-zr").click();
      await page.getByTestId("batch-remove-wondermaker-zr").waitFor();
      console.log(`PASS ${device}: family shortcut, five search spellings, three distinct targets, resetting the search, other brands and batch selection`);
    } finally {await browser.close();}
  }
} finally {await server?.close();}
