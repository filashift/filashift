// Load the site with the CSP from deploy/Caddyfile.filashift injected and fail on any violation.
// Usage: node scripts/check-csp.mjs (fresh build in dist/public)  or  BASE=https://filashift.com node scripts/check-csp.mjs
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {chromium} from "playwright-core";
import {preview} from "vite";
// No BASE: serve the fresh build (dist/public) and also check the inline-script hash matches the policy.
const server=process.env.BASE ? null : await preview({configFile:false,build:{outDir:"dist/public"},preview:{host:"127.0.0.1",port:0}});
const base=process.env.BASE || `http://127.0.0.1:${server.httpServer.address().port}`;
const caddy=readFileSync(new URL("../deploy/Caddyfile.filashift",import.meta.url),"utf8");
const csp=caddy.match(/Content-Security-Policy "([^"]+)"/)[1];
if(!process.env.BASE){
  const html=readFileSync("dist/public/index.html","utf8");
  for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)){
    const h="'sha256-"+createHash("sha256").update(m[1]).digest("base64")+"'";
    assert(csp.includes(h),`inline script in index.html changed: put ${h} in the Caddyfile CSP script-src`);
  }
}
const pages=["/","/faq","/guides","/guides/3mf-to-stl","/guides/multicolor-3mf","/filament","/creators","/about","/privacy","/terms","/contact","/missing-page","/?lang=es"];
const b=await chromium.launch({executablePath:process.env.CHROME||`${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
const v=[];
try{
  const ctx=await b.newContext({serviceWorkers:"block",ignoreHTTPSErrors:true});
  await ctx.route("**/*",async r=>{const res=await r.fetch();const h={...res.headers(),"content-security-policy":csp};await r.fulfill({response:res,headers:h});});
  if(base.includes("127.0.0.1")) await ctx.addInitScript(()=>{window.__PRERENDER=true});
  await ctx.addInitScript(()=>document.addEventListener("securitypolicyviolation",e=>console.error("CSPV "+e.violatedDirective+" "+e.blockedURI+" "+(e.sourceFile||"")+":"+e.lineNumber)));
  const p=await ctx.newPage();
  p.on("console",m=>{if(/CSPV|Content Security Policy|Refused to/.test(m.text()))v.push(p.url()+" "+m.text())});
  for(const u of pages){await p.goto(base+u,{waitUntil:"networkidle"});}
  await p.goto(base+"/",{waitUntil:"networkidle"});
  await p.getByTestId("input-file").setInputFiles(process.env.SAMPLE||`${process.env.HOME}/td/x1c_paint.3mf`);
  await p.locator('[data-testid^="button-convert-f"]').first().click();
  const dl=p.waitForEvent("download");await p.locator('[data-testid^="button-download-f"]').first().click();const d=await dl;
  assert((await d.path()));
  await p.waitForTimeout(1500);
  console.log("CSP:",csp);
  assert.deepEqual(v,[],"CSP violations:\n"+v.join("\n"));
  console.log(`CSP check passed on ${pages.length} pages plus a conversion and download`);
}finally{await b.close();server?.httpServer.close();}
