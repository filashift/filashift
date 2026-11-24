// BASE=http://localhost:4173 node scripts/check-assistant.mjs (CHROME may override executable).
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const browser=await chromium.launch({executablePath:process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try {
  for(const es of [false,true]){
    const ctx=await browser.newContext({viewport:{width:es?375:1280,height:800},serviceWorkers:"block"});
    if(["localhost","127.0.0.1"].includes(new URL(process.env.BASE||"http://localhost:4173").hostname))
      await ctx.addInitScript(()=>{window.__PRERENDER=true});
    if(!es)await ctx.addInitScript(()=>Object.defineProperty(window,"LanguageModel",{configurable:true,value:{
      availability:async()=>"available",create:async()=>({prompt:async()=>"Local test explanation",destroy:()=>{window.testDestroyed=true}})
    }}));
    const page=await ctx.newPage(),errors=[],network=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto((process.env.BASE||"http://localhost:4173")+`/?lang=${es?"es":"en"}`,{waitUntil:"networkidle"});
    const trigger=page.getByRole("button",{name:es?"Pregunta a FilaShift":"Ask FilaShift",exact:true});
    await trigger.click();
    const d=page.getByRole("dialog"),input=d.locator("textarea");
    page.on("request",r=>network.push(r.url()));
    await input.fill("zzzzzz");
    await d.locator('button[type="submit"]').click();
    await d.getByText(es?"No encontré una guía relacionada.":"I couldn’t match that to a guide.",{exact:false}).waitFor();
    await input.fill(es?"El modelo es más grande que la cama":"Why did my STL lose its colors?");
    await d.locator('button[type="submit"]').click();
    const links=d.locator('a[href*="guides/"]');await links.first().waitFor();
    const excerpts=await d.locator("[aria-live]").innerText();
    assert.match(excerpts,es?/cama/i:/STL/);
    if(!es){
      await d.getByRole("button",{name:"Explain with on-device AI"}).click();
      await d.getByText("Local test explanation").waitFor();
      assert(await page.evaluate(()=>window.testDestroyed));
    }
    assert.deepEqual(network,[]);
    await links.first().click();
    await trigger.click(); assert.equal(await input.inputValue(),"");
    await d.getByRole("link",{name:es?"Privacidad":"Privacy"}).click();
    await page.getByRole("heading",{name:es?"Pregunta a FilaShift: ayuda privada":"Ask FilaShift: private visitor help"}).waitFor();
    assert.deepEqual(errors,[]);
    console.log(`${es?"ES mobile":"EN desktop"} passed; questions caused no network requests.`);
    await ctx.close();
  }
}finally{await browser.close()}
