// Run after npm run build. Prices and links are local test fixtures, not store quotes.
import assert from "node:assert/strict";
import {chromium} from "playwright-core";
import {preview} from "vite";

const cases = [
  [2,2,true],[3,3,true],[4,4,true],[5,5,true],[10,10,true],[1.5,3,true],
  [3.5,1,true,"unknown"],[1,1,false,"spool"],[2,1,false,"spool"],
  [undefined,2,false],[null,2,false],[0,2,false],[-1,2,false],
];
const items = cases.map(([kg,n,,form],i)=>({
  kg,n,form:form??"pack",t:`Fixture ${i}`,b:"Test",r:"Store",v:"",c:[],f:"PLA",m:"PLA",
  d:1.75,ok:true,p:46+i,ppk:11.5+i,was:80+i,u:`https://store.example.invalid/p/${i}`,
}));
const label = {en:k=>`${k} kg pack total:`,es:k=>`Total del pack de ${k} kg:`,
  de:k=>`Gesamtpreis für ${k} kg:`,fr:k=>`Total du lot de ${k} kg :`};
const srv=await preview({configFile:false,build:{outDir:"dist/public"},preview:{host:"127.0.0.1",port:0}});
const neutral={en:k=>`Total for ${k} kg:`,es:k=>`Total por ${k} kg:`,de:k=>`Gesamtpreis für ${k} kg:`,fr:k=>`Total pour ${k} kg :`};
const browser=await chromium.launch({executablePath:process.env.CHROME||`${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try {
  for (const lang of Object.keys(label)) for (const width of [320,390]) {
    const p=await browser.newPage({viewport:{width,height:800},serviceWorkers:"block"});
    await p.addInitScript(()=>{window.__PRERENDER=true});
    await p.route("**/data/filament.json",r=>r.fulfill({json:{schema:2,updated:new Date().toISOString(),stores:{Store:items.length},count:items.length,items}}));
    await p.route("**/data/config.json",r=>r.fulfill({json:{amazonTag:"fixture-only"}}));
    await p.goto(`http://127.0.0.1:${srv.httpServer.address().port}/${lang==="en"?"":`${lang}/`}filament`);
    await p.getByTestId(`offer-${items.length}`).waitFor();
    for(const [i,item] of items.entries()){
      const card=p.getByTestId(`offer-${i+1}`), hint=card.getByTestId("bulk-pack-total-label");
      const show=cases[i][2];
      assert.equal(await hint.count(),Number(show));
      if(show) assert.equal(await hint.innerText(),(item.form==="unknown"?neutral:label)[lang](item.kg.toLocaleString(lang)));
      const priceBlock=card.locator(".line-through").locator("../..");
      assert.equal(await card.locator(".line-through").innerText(),`$${item.was.toFixed(2)}`);
      assert.ok((await priceBlock.innerText()).includes(`$${item.ppk.toFixed(2)}/kg`));
      assert.ok((await priceBlock.innerText()).includes(`$${item.p.toFixed(2)}`));
      assert.equal(await card.getByTestId(`link-offer-${i+1}`).getAttribute("href"),item.u);
      assert.ok(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    }
    for(const pack of ["any","single","multi"]){
      await p.goto(`http://127.0.0.1:${srv.httpServer.address().port}/${lang==="en"?"":`${lang}/`}filament?pack=${pack}`);
      const a=p.getByTestId("link-amazon");await a.waitFor();
      await a.getByText({en:"(affiliate link)",es:"(enlace de afiliado)",de:"(Affiliate-Link)",fr:"(lien affilié)"}[lang],{exact:true}).waitFor();
      assert.match(await a.getAttribute("href"),/tag=fixture-only/);
      assert.match(await a.getAttribute("rel"),/sponsored/);
      assert.ok(await a.evaluate(el=>el.getBoundingClientRect().right<=innerWidth && el.scrollWidth<=el.clientWidth+1));
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await p.close();console.log(`PASS ${lang} ${width}px: ${items.length} offers`);
  }
}finally{await browser.close();await srv.close()}
