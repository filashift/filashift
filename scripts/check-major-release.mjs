// BASE, SAMPLE (multi-color Bambu), LARGE_SAMPLE (multi-MB), MULTIPLATE and CHROME are configurable.
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { unzipSync,zipSync,strFromU8,strToU8 } from "fflate";
const base=process.env.BASE||"https://filashift.com", small=process.env.SAMPLE||"/tmp/x1c_painted_pla.3mf";
const large=process.env.LARGE_SAMPLE||"/tmp/NYC MakerWorld.3mf", multi=process.env.MULTIPLATE||"/tmp/badge_2plates.3mf";
const b=await chromium.launch({executablePath:process.env.CHROME||`${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try{
for(const mobile of [false,true]){
 const ctx=await b.newContext({viewport:{width:mobile?390:1280,height:850},serviceWorkers:"block"});
 if(base.includes("localhost")||base.includes("127.0.0.1"))await ctx.addInitScript(()=>{window.__PRERENDER=true});
 const p=await ctx.newPage(),errs=[],posts=[],assets=[];
 p.on("pageerror",e=>errs.push(e.message));ctx.on("request",r=>{if(r.method()==="POST")posts.push(r.url());assets.push(r.url())});
 if(mobile){const cdp=await ctx.newCDPSession(p);await cdp.send("Emulation.setCPUThrottlingRate",{rate:4})}
 await p.addInitScript(()=>{window.tasks=[];new PerformanceObserver(l=>window.tasks.push(...l.getEntries().map(x=>[x.startTime,x.duration]))).observe({type:"longtask",buffered:true})});
 await p.goto(`${base}/?printer=flashforge-ad5x&lang=${mobile?"es":"en"}`,{waitUntil:"networkidle"});
 assert.match(await p.getByTestId("major-release").innerText(),/2\.1/);
 assert(!assets.some(s=>/\/(?:converter\.worker|assistant)-/.test(s)));
 const load=path=>p.getByTestId("input-file").setInputFiles(path);
 const btn=()=>p.locator('[data-testid^="button-convert-f"]').first();
 const dl=()=>p.locator('[data-testid^="button-download-f"]').first();
 await load(large);await btn().waitFor();
 await btn().click();await p.getByTestId("cancel-operation").click();await p.waitForFunction(()=>!document.querySelector('[data-testid="cancel-operation"]'));
 assert.equal(await dl().count(),0);assert(await btn().isEnabled());
 const start=await p.evaluate(()=>performance.now());await btn().click();await dl().waitFor({timeout:90000});
 const end=await p.evaluate(()=>performance.now());await p.waitForTimeout(100);
 console.log(`${mobile?"4x CPU mobile layout":"desktop"} retry incl. re-read: ${Math.round(end-start)}ms; longest UI task:`,await p.evaluate(t=>Math.max(0,...window.tasks.filter(x=>x[0]>=t).map(x=>x[1])),start));
 await p.locator('[data-testid^="button-remove-f"]').click();await load(small);await btn().waitFor();
 assert.match(await p.getByTestId("preflight").innerText(),mobile?/Placa 1/:/Plate 1/);
 for(const fmt of ["stl","obj"]){
   const [d]=await Promise.all([p.waitForEvent("download"),p.locator(`[data-testid^=button-export-${fmt}-]`).click()]);assert((await stat(await d.path())).size>0)
 }
 await btn().click();await dl().waitFor();
 const [d]=await Promise.all([p.waitForEvent("download"),dl().click()]);assert((await stat(await d.path())).size>0);
 await p.locator('[data-testid^="button-remove-f"]').click();await load(multi);await btn().waitFor();
 assert((await p.getByTestId("preflight").locator("li").count())>=2);
 // Controlled fixture: plate 1 has a known oversized bounding box; plate 2
 // has neither saved dimensions nor geometry in a unit we can verify.
 const entries=unzipSync(await readFile(multi));
 for(const name of Object.keys(entries))if(/^Metadata\/plate_\d+\.json$/.test(name))delete entries[name];
 entries["Metadata/plate_1.json"]=strToU8(JSON.stringify({bbox_objects:[{bbox:[0,0,900,900]}]}));
 const root="3D/3dmodel.model";
 entries[root]=strToU8(strFromU8(entries[root]).replace(/<model\b([^>]*)>/,(_,a)=>`<model${a.replace(/\sunit="[^"]*"/,"")} unit="inch">`));
 await p.locator('[data-testid^="button-remove-f"]').click();
 await load({name:"preflight.3mf",mimeType:"application/octet-stream",buffer:Buffer.from(zipSync(entries,{level:1}))});await btn().waitFor();
 const rows=p.getByTestId("preflight").locator("li");
 assert.match(await rows.first().innerText(),mobile?/Supera la cama/:/Exceeds the bed/);
 assert.match(await rows.nth(1).innerText(),mobile?/Sin medidas fiables/:/Footprint not verified/);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 await p.getByRole("button",{name:mobile?"Pregunta a FilaShift":"Ask FilaShift",exact:true}).click();await p.getByRole("dialog").locator("textarea").waitFor();
 assert(assets.some(s=>/\/assistant-/.test(s)));assert.deepEqual(errs,[]);assert.deepEqual(posts,[]);
 await ctx.close();
}
}finally{await b.close()}
