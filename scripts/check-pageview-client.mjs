// Exercise deployed client code, intercepting ALL counter calls before they reach the server.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const browser = await chromium.launch({executablePath:process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try {
  for (const mode of ["normal","dnt","gpc","automation"]) {
    const ctx=await browser.newContext({serviceWorkers:"block"});
    await ctx.addInitScript(mode=>{
      Object.defineProperties(navigator,{
        webdriver:{get:()=>mode==="automation"}, doNotTrack:{get:()=>mode==="dnt"?"1":null},
        globalPrivacyControl:{get:()=>mode==="gpc"},
      });
    },mode);
    await ctx.addCookies([{name:"qa",value:"excluded",url:"https://filashift.com"}]);
    const events=[];
    await ctx.route("**/api/page-view**", async route=>{
      const r=route.request();
      events.push({url:r.url(), method:r.method(),body:r.postData(),headers:await r.allHeaders()});
      await route.fulfill({status:204});
    });
    const p=await ctx.newPage();
    await p.goto("https://filashift.com/?lang=en",{waitUntil:"networkidle"});
    await p.getByTestId("nav-guides").click();
    await p.getByTestId("topic-shop").click();
    await p.evaluate(()=>history.pushState({}, "", `${location.pathname}?lang=en#test`));
    assert.equal(new URL(p.url()).pathname,"/guides");
    await p.waitForLoadState("networkidle");
    await p.reload({waitUntil:"networkidle"});
    assert.equal(events.length,mode==="normal"?3:0, mode);
    for (const e of events) {
      assert.equal(e.url,"https://filashift.com/api/page-view");
      assert.equal(e.method,"POST"); assert.equal(e.body,null);
      assert.equal(e.headers.cookie,undefined); assert.equal(e.headers.referer,undefined);
    }
    await ctx.close();
    console.log(`PASS ${mode}: ${events.length} intercepted views; none sent to production`);
  }
} finally { await browser.close(); }
