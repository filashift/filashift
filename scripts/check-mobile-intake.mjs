// BASE=http://127.0.0.1:8885 node scripts/check-mobile-intake.mjs
// Pass BROWSER=chromium instead of the default WebKit; provide private fixtures
// with BAMBU, FLASH, PRUSA and STL. Nothing is uploaded to a vendor.
import {webkit,chromium} from "playwright-core";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {unzipSync,strFromU8} from "fflate";
const base=process.env.BASE||"http://127.0.0.1:8885";
const engine=process.env.BROWSER==="chromium"?chromium:webkit;
const b=await engine.launch(engine===chromium?{executablePath:`${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`}:{});
try{
  for(const [file,printer] of [
    [process.env.BAMBU||"/tmp/x1c_painted_pla.3mf","flashforge-ad5x"],
    [process.env.FLASH||"/tmp/ad5x_project.3mf","bambu-lab-x1-carbon"],
    [process.env.PRUSA||"/tmp/ps/prusa_sign_pla.3mf","bambu-lab-x1-carbon"],
    [process.env.STL||"/tmp/fs-ios-qa/plate-2.stl",process.env.STL_TARGET||"flashforge-ad5x"]
  ]){
    const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
    const writes=[],errors=[];p.on("request",r=>{if(!["GET","HEAD"].includes(r.method()))writes.push(r.method())});
    p.on("pageerror",err=>errors.push(err.message));
    await p.goto(`${base}/?printer=${printer}`);
    await p.getByTestId("mobile-import-help").locator("summary").click();
    await p.getByTestId("input-file").setInputFiles(file);
    await p.locator('[data-testid^="button-convert-f"]').first().click({timeout:60000});
    const [download]=await Promise.all([p.waitForEvent("download",{timeout:60000}),p.locator('[data-testid^="button-download-f"]').first().click({timeout:60000})]);
    const entries=unzipSync(new Uint8Array(await readFile(await download.path())));
    if(process.env.STL_OUT && /\.stl$/i.test(file))await download.saveAs(process.env.STL_OUT);
    assert(Object.keys(entries).includes("3D/3dmodel.model"));
    const settings=JSON.parse(strFromU8(entries["Metadata/project_settings.config"]));
    assert.match(settings.printer_model,printer==="flashforge-ad5x"?/AD5X/:/X1 Carbon/i);
    assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    console.log(`${engine.name()}: ${file} -> ${settings.printer_model}; download verified, no upload requests`);
    await p.close();
  }
}finally{await b.close()}
