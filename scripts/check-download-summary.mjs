// Run after npm run build. Uses the local sample, the browser and no external service.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { preview } from "vite";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
const s=await preview({configFile:false,build:{outDir:"dist/public"},preview:{host:"127.0.0.1",port:0}});
const b=await chromium.launch({executablePath:process.env.CHROME||`${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
const sample="client/public/samples/filashift-nameplate.3mf";
const byPrefix=(p,s)=>p.locator(`[data-testid^="${s}"]`);
async function exported(p,link){
  await link.focus();
  const [d]=await Promise.all([p.waitForEvent("download"),link.press("Enter")]);
  const entries=unzipSync(await readFile(await d.path()));
  const xml=strFromU8(entries["Metadata/model_settings.config"]);
  const slots=[...xml.matchAll(/<object\b[^>]*>([\s\S]*?)<\/object>/g)].map(m=>Number(/key="extruder" value="(\d+)"/.exec(m[1])?.[1]));
  return {slots,entries};
}
try {
  for(const [lang,title,width] of [["en","What changed?",1280],["es","¿Qué cambió?",320],["de","Was hat sich geändert?",390],["fr","Qu’est-ce qui a changé ?",320]]){
    const p=await b.newPage({viewport:{width,height:850},serviceWorkers:"block"});
    await p.addInitScript(()=>{window.__PRERENDER=true});
    await p.goto(`http://127.0.0.1:${s.httpServer.address().port}/?lang=${lang}&printer=flashforge-creator-5-pro`);
    await p.getByTestId("sample-panel").locator("summary").click();
    await p.getByTestId("sample-run").click();
    const samplePanel=p.getByTestId("sample-result");
    await samplePanel.getByRole("heading",{name:title}).waitFor();
    assert.match(await samplePanel.getByTestId("summary-slot-2").innerText(),/FS lettering/);
    const normal=await exported(p,p.getByTestId("sample-download"));
    assert.deepEqual(normal.slots,[1,2]);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);
    if(lang==="en"){
      const input=p.getByTestId("input-file");
      await input.setInputFiles(sample);
      const card=byPrefix(p,"card-file-").first();
      await byPrefix(card,"select-slot-").nth(1).click();
      await p.getByRole("option",{name:"Slot 1",exact:true}).click();
      await byPrefix(card,"button-convert-").click();
      const summary=card.getByTestId("download-summary");
      await summary.waitFor();assert.match(await summary.innerText(),/Shared slot 1:.*Nameplate.*FS lettering/);
      if(process.env.SHOT) await summary.screenshot({path:process.env.SHOT,animations:"disabled"});
      assert.deepEqual((await exported(p,byPrefix(card,"button-download-"))).slots,[1,1]);
      await byPrefix(card,"button-details-").click();await byPrefix(card,"button-adjust-").click();
      assert.equal(await summary.count(),0);
      await p.getByTestId("batch-printers").locator("summary").click();
      await p.getByTestId("button-batch-printer-picker").click();
      await p.getByTestId("input-printer-search").fill("Snapmaker U1");
      await p.getByTestId("option-printer-snapmaker-u1").first().click();
      await p.getByTestId("batch-convert").click();
      for(const [i,slots] of [[0,[1,1]],[1,[1,2]]]){
        const item=p.getByTestId(`batch-item-${i}`);
        await item.getByTestId("download-summary").waitFor();
        assert.equal((await item.getByTestId("summary-slot-1").innerText()).includes("Shared slot"),i===0);
        assert.deepEqual((await exported(p,p.getByTestId(`batch-download-${i}`))).slots,slots);
      }
      // Mark a triangle in the real sample output as painted; do not invent part-level proof for it.
      const mesh=Object.keys(normal.entries).find(k=>k.endsWith(".model")&&/<triangle\s/.test(strFromU8(normal.entries[k])));
      assert.ok(mesh);normal.entries[mesh]=strToU8(strFromU8(normal.entries[mesh]).replace(/<triangle\s/,'<triangle paint_color="0C" '));
      await input.setInputFiles({name:"painted.3mf",mimeType:"application/octet-stream",buffer:Buffer.from(zipSync(normal.entries))});
      const painted=byPrefix(p,"card-file-").filter({hasText:"painted.3mf"});
      await byPrefix(painted,"button-convert-").click();
      const box=painted.getByTestId("download-summary");await box.waitFor();
      assert.match(await box.innerText(),/Part assignments are not verified/);
      assert.doesNotMatch(await box.innerText(),/FS lettering/);
      const out=await exported(p,byPrefix(painted,"button-download-"));
      assert.ok(Object.keys(out.entries).some(k=>k.endsWith(".model")&&strFromU8(out.entries[k]).includes("paint_color=")));
    }
    await p.close();console.log(`PASS ${lang} (${width}px): localized result, keyboard download, exported slots and viewport`);
  }
} finally {await b.close();await s.close();}
