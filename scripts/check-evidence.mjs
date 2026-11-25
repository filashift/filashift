// Check public UI on desktop and emulated phone. Only shop edge cases use
// synthetic data. Set SAMPLE_OUTPUT to retain browser-generated slicer inputs.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir,writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";
import { preview } from "vite";
const server=process.env.BASE?null:await preview({configFile:false,build:{outDir:"dist/public"},preview:{host:"127.0.0.1",port:0}});
const base=process.env.BASE||`http://127.0.0.1:${server.httpServer.address().port}`;
const chrome=[process.env.CHROME,`${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`].find(x=>x&&existsSync(x));
const b=await chromium.launch({executablePath:chrome});
const targets=["flashforge-creator-5-pro","bambu-lab-x1-carbon","snapmaker-u1"];
try {
 const sampleScope={en:/Sample sliced in the destination software/,es:/Ejemplo laminado en el programa de destino/,de:/Beispiel in der Zielsoftware gesliced/,fr:/Exemple tranché dans le logiciel de destination/};
const evidenceScope={en:/These results apply to the sample projects/,es:/Estos resultados corresponden a los proyectos de muestra/,de:/Diese Ergebnisse gelten für die Beispielprojekte/,fr:/Ces résultats concernent les projets d’exemple/};
for(const [lang,width] of [["en",1280],["es",320],["de",390],["fr",320]]) {
  const ctx=await b.newContext({viewport:{width,height:900},serviceWorkers:"block"});
  try {
   if(server) await ctx.addInitScript(()=>{window.__PRERENDER=true;});
   const p=await ctx.newPage(), errors=[],posts=[];
   p.on("pageerror",e=>errors.push(e.message));p.on("request",r=>{if(r.method()==="POST")posts.push(r.url());});
   await p.goto(`${base}/?lang=${lang}`);
   const sample=p.getByTestId("sample-panel");
   await sample.locator("summary").click();
   const original=await ctx.request.get(new URL(await sample.locator("a[download]").getAttribute("href"),p.url()).href);
   assert.equal(createHash("sha256").update(await original.body()).digest("hex"),"0cb710127ae5e4541ee05ae3357788b661d1dc3fedd99a9759472c1c962d78ab");
   posts.length=0;
   for (const [i,id] of targets.entries()) {
    await p.getByTestId("sample-target").selectOption(String(i));
    await p.getByTestId("sample-run").click();
    const d=p.getByTestId("sample-download");await d.waitFor();
    const result=await p.getByTestId("sample-result").innerText();
    assert.match(result,/#ff8000/i);assert.match(result,/#1e7fd8/i);
    assert.match(result,sampleScope[lang]);
    const [file]=await Promise.all([p.waitForEvent("download"),d.click()]);
    assert.match(file.suggestedFilename(),/\.3mf$/);assert.equal(await file.failure(),null);
    if(process.env.SAMPLE_OUTPUT&&lang==="en"){
     const dir=process.env.SAMPLE_OUTPUT;await mkdir(dir,{recursive:true});
     await file.saveAs(`${dir}/demo__${id}.3mf`);
     await writeFile(`${dir}/demo__${id}.json`,JSON.stringify({slicer:i===1?"Bambu Studio":"OrcaSlicer"}));
    }
   }
   assert.deepEqual(posts.filter(s=>!new URL(s).pathname.includes("pageview")),[]);
   const evidence=p.getByTestId("text-tested-note");await evidence.locator("summary").click();
   assert.match(await evidence.innerText(),/OrcaSlicer 2\.5\.2/);
   assert.match(await evidence.innerText(),evidenceScope[lang]);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);
   const item={b:"Atomic Filament",r:"Atomic Filament",t:"Test PLA AMS Compatible",v:"1.75mm - 1KG AMS Compatible",kg:1,n:1,d:1.75,m:"PLA",f:"PLA",p:20,ppk:20,ok:true,c:[],form:"unknown",u:"https://atomicfilament.com/products/test?variant=1"};
   const items=[item,{...item,t:"Other",v:"1 kg"},{...item,t:"Refill",form:"refill"},{...item,t:"3.5KG Black PLA",v:"1.75mm - 3.5KG",kg:3.5}];
   await ctx.route("**/data/filament.json",r=>r.fulfill({json:{schema:2,updated:new Date().toISOString(),count:4,stores:{Atomic:4},items}}));
   await ctx.route("**/data/config.json",r=>r.fulfill({json:{}}));
   await p.goto(`${base}/filament?lang=${lang}`);
   await p.getByTestId("offer-1").waitFor();
   assert.equal(await p.getByTestId("reel-fit").count(),0);
   for (const feeder of ["ams","u1"]) {
    await p.getByTestId("feeder").selectOption(feeder);
    const states=await p.getByTestId("reel-fit").evaluateAll(els=>els.map(el=>el.dataset.status).sort());
    assert.deepEqual(states,["outside","refill","unknown",feeder==="ams"?"within":"outside"].sort());
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);
   }
   assert.deepEqual(errors,[]);console.log(`PASS ${lang} ${width}px: three local downloads, source checksum, destination evidence, four feeder classifications`);
  }finally{await ctx.close();}
 }
}finally{await b.close();await server?.close();}
