import assert from "node:assert/strict";
import {chromium} from "playwright-core";
import {preview} from "vite";
const s=await preview({configFile:false,build:{outDir:"dist/public"},preview:{host:"127.0.0.1",port:0}});
const b=await chromium.launch({executablePath:process.env.CHROME||`${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try{
 for(const [lang,w] of [["en",1280],["es",320],["de",390],["fr",320]]){
  const p=await b.newPage({viewport:{width:w,height:900},serviceWorkers:"block"});
  await p.addInitScript(()=>{window.__PRERENDER=true});
  const prefix=lang==="en"?"":`/${lang}`;
  await p.goto(`http://127.0.0.1:${s.httpServer.address().port}${prefix}/guides/makerworld-to-flashforge`);
  const demo=p.getByTestId("flashforge-nameplate-demo");await demo.scrollIntoViewIfNeeded();
  for(const img of await demo.locator("img").all())assert.ok(await img.evaluate(async el=>{await el.decode();return el.naturalWidth>500}));
  assert.equal(await demo.locator("figcaption").count(),2);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),w);
  await demo.getByRole("link").focus();await demo.getByRole("link").press("Enter");
  const panel=p.getByTestId("sample-panel");await panel.getByTestId("sample-run").waitFor();
  assert.equal(await panel.evaluate(e=>e.open),true);assert.equal(await p.locator("html").getAttribute("lang"),lang);
  await p.getByTestId("sample-run").click();await p.getByTestId("sample-download").waitFor();
  assert.match(await p.getByTestId("sample-result").innerText(),/#1E7FD8/i);
  await p.close();console.log(`PASS ${lang}: images, width, keyboard sample link, sample result`);
 }
}finally{await b.close();await s.close()}
