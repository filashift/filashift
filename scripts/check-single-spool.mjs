// Real project -> finder in a separate tab -> exact merchant variants, no checkout or tracking requests.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {chromium} from "playwright-core";
const base=process.env.BASE||"https://filashift.com";
const data=process.env.FEED?JSON.parse(await readFile(process.env.FEED)) : await (await fetch(base+"/data/filament.json")).json();
const byUrl=new Map(data.items.map(i=>[i.u,i]));
const b=await chromium.launch({executablePath:process.env.CHROME||`${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try {
  for(const width of [390,1280]){
    const ctx=await b.newContext({viewport:{width,height:850},serviceWorkers:"block"});
    if(base.includes("127.0.0.1")) await ctx.addInitScript(()=>{window.__PRERENDER=true});
    for(const [name,file] of [["filament",process.env.FEED],["config",process.env.CONFIG]]) if(file)
      await ctx.route(`**/data/${name}.json`,r=>r.fulfill({path:file,contentType:"application/json"}));
    const p=await ctx.newPage(); await p.goto(base);
    await p.getByTestId("chip-printer-flashforge-creator-5-pro").waitFor();
    await p.getByTestId("input-file").setInputFiles(process.env.SAMPLE||"/tmp/x1c_painted_pla.3mf");
    await p.locator('[data-testid^="button-convert-f"]').first().click();
    const shop=p.locator('[data-testid^="shop-f"][data-testid$="-single"]').first();
    const popup=p.waitForEvent("popup"); await shop.click(); const finder=await popup;
    await finder.getByTestId("text-updated").waitFor(); await finder.getByTestId("offer-1").waitFor();
    const params=new URL(finder.url()).searchParams;
    assert.equal(params.get("f"),"PLA");assert.equal(params.get("d"),"1.75");assert.match(params.get("color"),/^e63a2e$/i);
    assert.equal(await finder.getByTestId("select-pack").innerText(),"Single spool");assert.equal(await finder.getByTestId("select-sort").innerText(),"Lowest total price");
    const offers=async page=>Promise.all((await page.locator('[data-testid^="link-offer-"]').all()).map(async a=>{
      const url=new URL(await a.getAttribute("href"));const dest=url.searchParams.has("u")?new URL(url.searchParams.get("u")):url;
      const row=byUrl.get(`${dest.origin}${dest.pathname}?variant=${dest.searchParams.get("variant")}`);assert(row);return row;
    }));
    const rows=await offers(finder); assert(rows.length);assert(rows.every((i,j)=>i.ok&&i.d===1.75&&i.f==="PLA"&&i.form==="spool"&&i.n===1&&i.kg<=1.25&&(!j||i.p>=rows[j-1].p)));
    assert(await p.locator('[data-testid^="button-download-f"]').first().isVisible());
    await finder.getByTestId("clear-project-colour").click();
    const allSpools=await offers(finder);assert(allSpools.length>=rows.length);
    const bulkPopup=p.waitForEvent("popup");await p.locator('[data-testid^="shop-f"][data-testid$="-bulk"]').first().click();
    const bulk=await bulkPopup;await bulk.getByTestId("text-updated").waitFor();assert.equal(await bulk.getByTestId("select-pack").innerText(),"Bulk, 2 kg and up");assert.equal(await bulk.getByTestId("select-sort").innerText(),"Lowest price per kg");
    assert.equal(new URL(bulk.url()).searchParams.get("color"),params.get("color"));assert((await offers(bulk)).every(i=>i.kg>=2));
    await finder.goto(`${base}/filament?pack=single&d=2.85&f=PLA&t=absent-test-subtype&color=0000ff`);await finder.getByTestId("text-updated").waitFor();
    assert.match(await finder.getByTestId("text-count").innerText(),/^0 results/);assert.equal(await finder.getByTestId("select-diameter").innerText(),"2.85 mm");
    console.log(`${width}px: conversion, separate shopping tabs, exact variants, total-price order, bulk and empty states passed (${rows.length} color matches checked)`);await ctx.close();
  }
}finally{await b.close();}
