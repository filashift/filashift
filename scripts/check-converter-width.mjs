import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const server=process.env.BASE ? null : await preview({configFile:false,build:{outDir:"dist/public"},preview:{host:"127.0.0.1",port:0}});
const base=process.env.BASE || `http://127.0.0.1:${server.httpServer.address().port}`;
const executablePath=[process.env.CHROME,`${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`,"/usr/bin/chromium","/usr/bin/google-chrome"].find(p=>p && existsSync(p));
let browser;
try {
  browser=await chromium.launch({executablePath});
  for(const lang of ["en","es"]){
    const ctx=await browser.newContext({...devices["Pixel 7"],serviceWorkers:"block"});
    if(server) await ctx.addInitScript(()=>{window.__PRERENDER=true;});
    const page=await ctx.newPage();
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    for(const width of [320,360,375,390,430]){
      await page.setViewportSize({width,height:844});
      await page.goto(`${base}/?lang=${lang}`);
      const picker=page.getByTestId("button-printer-picker");
      await page.getByTestId("text-tested-note").waitFor();
      await page.evaluate(()=>document.fonts.ready);
      const fits=async(state)=>{
        const sizes=await page.evaluate(()=>{
          const bounds=Array.from(document.querySelectorAll('#settings,[data-testid="button-printer-picker"],[data-testid="dropzone"],[data-testid="how-step-number"],[data-state="open"][role="dialog"]'),el=>{
            const {left,right}=el.getBoundingClientRect();return [el.getAttribute("data-testid")||el.id||el.role,left,right];
          });
          return {pageWidth:document.documentElement.scrollWidth,bounds};
        });
        assert.equal(sizes.pageWidth,width,`${lang} ${width}px ${state}: document is ${sizes.pageWidth}px`);
        for(const [name,left,right] of sizes.bounds)assert(left>=-1&&right<=width+1,`${lang} ${width}px ${state}: ${name} outside viewport (${left},${right})`);
      };
      await fits("initial");
      await picker.tap();
      const search=page.getByTestId("input-printer-search");
      await search.waitFor();
      await search.fill("Snapmaker U1");
      await fits("picker open");
      await page.getByRole("option",{name:/Snapmaker U1/i}).first().tap();
      assert.match(await picker.innerText(),/Snapmaker U1/i);
      await fits("printer selected");
      assert.deepEqual(errors,[]);
      console.log(`PASS ${lang} ${width}px: page, controls, badges and picker`);
    }
    await ctx.close();
  }
}finally{await browser?.close();await server?.close();}
