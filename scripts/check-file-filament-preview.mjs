// Run after npm run build. Optional screenshot is local only.
import assert from "node:assert/strict";
import {chromium} from "playwright-core";
import {preview} from "vite";
const server=await preview({configFile:false,build:{outDir:"dist/public"},preview:{host:"127.0.0.1",port:0}});
const b=await chromium.launch({executablePath:process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try {
  for(const [prefix,label] of [["","File filament"],["/es","Filamento del archivo"],["/de","Filament in der Datei"],["/fr","Filament du fichier"]]){
    const p=await b.newPage({viewport:{width:780,height:850},serviceWorkers:"block"});
    await p.addInitScript(()=>{window.__PRERENDER=true});
    await p.goto(`http://127.0.0.1:${server.httpServer.address().port}${prefix}/?printer=flashforge-creator-5-pro`);
    await p.getByTestId("input-file").setInputFiles("client/public/samples/filashift-nameplate.3mf");
    for(const [n,name] of [[1,"Nameplate"],[2,"FS lettering"]]){
      const row=p.getByTestId(`file-filament-${n}`); await row.waitFor();
      assert((await row.innerText()).includes(`${label} ${n}: ${name}`));
    }
    assert(await p.getByTestId("physical-slot-note").isVisible());
    const select=p.locator('[data-testid^="select-slot-"]').nth(1);
    assert.match(await select.innerText(),/2/);
    await select.click(); await p.getByRole("option").filter({hasText:/3/}).first().click();
    assert.match(await select.innerText(),/3/);
    assert((await p.getByTestId("file-filament-2").innerText()).includes("FS lettering"));
    if(!prefix && process.env.SHOT) await p.getByTestId("file-filament-2").locator("xpath=ancestor::ul[1]/..").screenshot({path:process.env.SHOT});
    console.log(`PASS ${prefix||"/en"}: two named assignments; destination remap leaves file identity intact`);
    await p.close();
  }
} finally {await b.close(); await server.close();}
