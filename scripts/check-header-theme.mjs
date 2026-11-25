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
      await p.goto(`${base}/?lang=en`);
      await check("en",osDark);
      await p.getByTestId("button-theme").click();
      await check("en",!osDark);
      for (const lang of ["es","de","fr","en"]) {
        // The language selector is a compact menu: open it, then pick the language.
        await p.getByTestId("button-lang").click();
        await Promise.all([p.waitForNavigation(),p.getByTestId(`button-lang-${lang}`).click()]);
        await check(lang,!osDark);
      }
      await p.getByTestId("nav-faq").click();
      await p.waitForURL("**/faq");
      await check("en",!osDark);
      await p.reload();
      await check("en",!osDark);
      assert.equal(await p.evaluate(()=>localStorage.getItem("filashift-theme")),osDark?"light":"dark");
      console.log(`PASS ${profile}: ${osDark?"light":"dark"} override, all four languages, header order, navigation and reload`);
      await ctx.close();
    }
    await browser.close(); browser=null;
  }
} finally { await browser?.close(); await server?.close(); }
