import assert from "node:assert/strict";
import {chromium} from "playwright-core";
import {preview} from "vite";

const server = await preview({configFile:false,build:{outDir:"dist/public"},preview:{host:"127.0.0.1",port:0}});
const base=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try {
  for(const [lang,label] of Object.entries({en:"OrcaSlicer-verified for PLA",es:"Verificado en OrcaSlicer para PLA",de:"Für PLA in OrcaSlicer verifiziert",fr:"Vérifié dans OrcaSlicer pour le PLA"})) {
    const page=await browser.newPage({serviceWorkers:"block"});
    await page.addInitScript(()=>{window.__PRERENDER=true;});
    await page.goto(`${base}${lang==="en"?"":"/"+lang}/tested?q=WonderMaker`);
    const row=page.getByTestId("row-tested-wondermaker-zr");
    await row.getByText(label,{exact:true}).waitFor();
    assert.match(await row.innerText(),/PLA\/PETG/);
    if(lang==="en") assert.match(await row.innerText(), /2 of 3 slice tests passed/);
    assert.ok(!(await page.getByTestId("row-tested-wondermaker-zr-ultra").innerText()).includes(label));
    assert.ok(!(await page.getByTestId("row-tested-wondermaker-zr-ultra-s").innerText()).includes(label));
    await row.getByRole("link",{name:"WonderMaker ZR",exact:true}).click();
    const badge=page.getByTestId("badge-tested-wondermaker-zr");
    await badge.waitFor();
    assert.ok((await badge.innerText()).includes(label));
    await badge.click();
    assert.match(await page.getByTestId("text-tested-note").innerText(), /PLA\/PETG/);
    await page.close();
  }
  // A different slicer version cannot inherit the material-specific claim.
  const fallback=await browser.newPage({serviceWorkers:"block"});
  await fallback.addInitScript(()=>{window.__PRERENDER=true;});
  await fallback.route("**/profiles/tested.json",async route=>{
    const doc=await (await route.fetch()).json();
    doc.slicers.OrcaSlicer="unverified-version";
    await route.fulfill({json:doc});
  });
  await fallback.goto(`${base}/tested?q=WonderMaker`);
  const row=fallback.getByTestId("row-tested-wondermaker-zr");
  await row.getByText("Partial pass",{exact:true}).waitFor();
  assert.doesNotMatch(await row.innerText(),/OrcaSlicer-verified for PLA/);
  await row.getByRole("link",{name:"WonderMaker ZR",exact:true}).click();
  await fallback.getByTestId("badge-tested-wondermaker-zr").filter({hasText:"Partial pass"}).waitFor();
  await fallback.close();
  console.log("Verified base ZR row and converter details in EN/ES/DE/FR, Ultra profiles unchanged, and partial-result fallback for a different slicer version.");
} finally {await browser.close();await server.close();}
