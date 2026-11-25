import assert from "node:assert/strict";
import { chromium, webkit, devices } from "playwright-core";
import { preview } from "vite";

const server = process.env.BASE ? null : await preview({configFile:false,build:{outDir:"dist/public"},preview:{host:"127.0.0.1",port:0}});
const base = process.env.BASE || `http://127.0.0.1:${server.httpServer.address().port}`;
const labels = {
  en:["Converter","How it works","Printers","Filament prices","Guides","FAQ"],
  es:["Convertidor","Cómo funciona","Impresoras","Precios de filamento","Guías","Preguntas"],
  de:["Konverter","So funktioniert's","Drucker","Filamentpreise","Anleitungen","FAQ"],
  fr:["Convertisseur","Fonctionnement","Imprimantes","Prix du filament","Guides","FAQ"]
};
let browser;
try {
  for (const [engine, profile] of [[chromium,"Desktop Chrome"],[webkit,"iPhone 13"]]) {
    browser = await engine.launch(engine === chromium ? {executablePath:process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`} : {});
    for (const osDark of [false,true]) {
      const ctx = await browser.newContext({...devices[profile],colorScheme:osDark?"dark":"light",serviceWorkers:"block"});
      if (server) await ctx.addInitScript(()=>{window.__PRERENDER=true;});
      const p = await ctx.newPage();
      const check = async (lang,dark) => {
        await p.waitForFunction(({lang,dark,names}) =>
          document.documentElement.lang === lang &&
          document.documentElement.classList.contains("dark") === dark &&
          document.querySelector('[data-testid="button-theme"]')?.getAttribute("aria-pressed") === String(dark) &&
          JSON.stringify(Array.from(document.querySelectorAll("header nav [data-testid]"), n=>n.textContent.trim())) === JSON.stringify(names),
          {lang,dark,names:labels[lang]});
      };
      // header section jumps (How it works / Printers / Converter) on the home page of the current language
      const jumps = async () => { for (const section of ["how","printers","how","printers"]) {
        await p.getByTestId(`nav-${section}`).click();
        await p.waitForFunction(id => {
          const el = document.getElementById(id), h = document.querySelector("header");
          if (!el || !h || document.activeElement !== el) return false;
          const y = el.getBoundingClientRect().top;
          return y >= h.getBoundingClientRect().bottom-1 && y < window.innerHeight;
        },section);
        await p.getByTestId("nav-converter").click();
        await p.waitForFunction(() => window.scrollY <= 1 && document.activeElement?.id === "converter");
      } };
      await p.goto(`${base}/?lang=en`);
      await check("en",osDark);
      await p.getByTestId("brand-wondermaker").click();
      const preflight = p.getByTestId("wondermaker-check");
      await preflight.waitFor();
      assert.match(await preflight.innerText(), /OrcaSlicer 2\.5\.2/);
      assert.match(await preflight.innerText(), /not the Ultra S/);
      if (!osDark) {
        for (const [lang, [row, pla, phrase]] of Object.entries({
          en:["OrcaSlicer-tested","OrcaSlicer-verified for PLA","OrcaSlicer-tested. No physical print verified."],
          es:["Probado en OrcaSlicer","Verificado en OrcaSlicer para PLA","Probado en OrcaSlicer. No se ha verificado ninguna impresión física."],
          de:["Mit OrcaSlicer getestet","Für PLA in OrcaSlicer verifiziert","Mit OrcaSlicer getestet. Kein Druck am Gerät bestätigt."],
          fr:["Testé avec OrcaSlicer","Vérifié dans OrcaSlicer pour le PLA","Testé avec OrcaSlicer. Aucune impression physique vérifiée."]
        })) {
          const prefix = lang === "en" ? "" : `/${lang}`;
          await p.goto(`${base}${prefix}/tested`);
          await p.getByTestId("input-tested-search").fill("WonderMaker");
          const ultra = p.getByTestId("row-tested-wondermaker-zr-ultra");
          await ultra.getByText(row,{exact:true}).waitFor();
          const zr = p.getByTestId("row-tested-wondermaker-zr");
          await zr.getByText(pla,{exact:true}).waitFor();
          assert.equal(await zr.getByText(row,{exact:true}).count(),0);
          for (const id of ["wondermaker-zr","wondermaker-zr-ultra","wondermaker-zr-ultra-s"]) {
            assert.ok(!(await p.getByTestId(`row-tested-${id}`).innerText()).includes(phrase), `${lang} ${id} row still has the physical-print phrase`);
          }
          if (lang === "en") {
            assert.doesNotMatch(await zr.innerText(), /Not yet passed/);
            assert.match(await zr.innerText(), /original PLA\/PETG sample did not/);
            assert.match(await zr.innerText(), /2 of 3 slice tests passed/);
          }
          assert.ok(!(await p.getByTestId("row-tested-wondermaker-zr-ultra-s").innerText()).includes(row));
          await ultra.getByRole("link").first().click();
          const badge = p.getByTestId("badge-tested-wondermaker-zr-ultra");
          await badge.filter({hasText:row}).waitFor();
          assert.ok(!(await badge.innerText()).includes(phrase));
          await badge.click();
          assert.match(await p.getByTestId("text-tested-note").innerText(), /OrcaSlicer 2\.5\.2/);
        }
      }
      for (const id of ["wondermaker-zr","wondermaker-zr-ultra-s"]) {
        await p.goto(`${base}/?printer=${id}&lang=en`);
        const limits = p.getByTestId("wondermaker-limits");
        await limits.waitFor();
        assert.match(await limits.innerText(), /Wonderprint-Orca 2\.3\.2: unverified/);
        assert.match(await p.getByTestId("text-tested-note").locator("summary").innerText(), id.endsWith("-s") ? /Slicer-tested/ : /OrcaSlicer-verified for PLA/);
      }
      await jumps();
      await p.getByTestId("button-theme").click();
      await check("en",!osDark);
      for (const lang of ["es","de","fr","en"]) {
        // The language selector is a compact menu: open it, then pick the language.
        await p.getByTestId("button-lang").click();
        await Promise.all([p.waitForNavigation(),p.getByTestId(`button-lang-${lang}`).click()]);
        await check(lang,!osDark);
        if (lang === "en") continue;
        // localized home (/es/, /de/, /fr/): same jumps, and from another page they return to the prefixed home
        assert.equal(new URL(p.url()).pathname,`/${lang}/`);
        await jumps();
        await p.getByTestId("nav-faq").click();
        await p.waitForURL(`**/${lang}/faq`);
        await p.getByTestId("nav-printers").click();
        await p.waitForFunction(() => document.activeElement?.id === "printers" && window.scrollY > 0);
        assert.equal(new URL(p.url()).pathname,`/${lang}/`);
        await check(lang,!osDark);
      }
      await p.getByTestId("nav-faq").click();
      await p.waitForURL("**/faq");
      await check("en",!osDark);
      await p.reload();
      await check("en",!osDark);
      await p.getByTestId("nav-printers").click();
      await p.waitForFunction(() => document.activeElement?.id === "printers" && window.scrollY > 0);
      assert.equal(await p.evaluate(()=>localStorage.getItem("filashift-theme")),osDark?"light":"dark");
      console.log(`PASS ${profile}: ${osDark?"light":"dark"} override, all four languages, header order, section jumps on /, /es/, /de/, /fr/, navigation and reload`);
      await ctx.close();
    }
    await browser.close(); browser=null;
  }
} finally { await browser?.close(); await server?.close(); }
