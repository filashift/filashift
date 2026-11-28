// Run after npm run build. No external traffic.
// 2.2: QIDI re-export entry on /faq and the FlashPrint note in the MakerWorld to Flashforge guide, en/es/de/fr.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { preview } from "vite";

const L = {
  "": ["QIDI Studio closes when I open a file I converted with FilaShift. What should I do?", "Reload FilaShift and convert the original file again.", "Can I open the converted file in FlashPrint?", "FlashPrint 5.8.7"],
  "/es": ["QIDI Studio se cierra al abrir un archivo que convertí con FilaShift. ¿Qué hago?", "Vuelve a cargar FilaShift y convierte de nuevo el archivo original.", "¿Puedo abrir el archivo convertido en FlashPrint?", "FlashPrint 5.8.7"],
  "/de": ["QIDI Studio schließt sich, wenn ich eine mit FilaShift konvertierte Datei öffne. Was soll ich tun?", "Laden Sie FilaShift neu und konvertieren Sie die Originaldatei erneut.", "Kann ich die konvertierte Datei in FlashPrint öffnen?", "FlashPrint 5.8.7"],
  "/fr": ["QIDI Studio se ferme quand j'ouvre un fichier converti avec FilaShift. Que faire ?", "Rechargez FilaShift et convertissez à nouveau le fichier d'origine.", "Puis-je ouvrir le fichier converti dans FlashPrint ?", "FlashPrint 5.8.7"],
};
const server = await preview({ configFile: false, build: { outDir: "dist/public" }, preview: { host: "127.0.0.1", port: 0 } });
const browser = await chromium.launch({ executablePath: process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome` });
const ld = (page, type) => page.evaluate((type) => [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => { const j = JSON.parse(s.textContent); return j["@graph"] || [j]; }).filter((j) => j["@type"] === type), type);
try {
  const root = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const [prefix, [qq, qa, fq, fa]] of Object.entries(L)) {
    const page = await browser.newPage({ viewport: { width: 390, height: 850 }, serviceWorkers: "block" });
    await page.addInitScript(() => { window.__PRERENDER = true; });
    const external = [];
    page.on("request", (r) => { if (new URL(r.url()).hostname !== "127.0.0.1") external.push(r.url()); });
    await page.goto(`${root}${prefix}/faq`);
    const trig = page.getByRole("button", { name: qq });
    await trig.waitFor();
    await trig.click();
    assert(await page.getByText(qa).isVisible());
    const faq = (await ld(page, "FAQPage"))[0];
    assert(faq.mainEntity.some((e) => e.name === qq && e.acceptedAnswer.text.startsWith(qa)), "QIDI entry in FAQPage JSON-LD");
    assert.equal(faq.mainEntity.filter((e) => /QIDI/.test(e.name)).length, 1);
    await page.goto(`${root}${prefix}/guides/makerworld-to-flashforge`);
    await page.getByText(fq, { exact: true }).first().waitFor();
    assert(await page.getByText(new RegExp(fa.replace(/\./g, "\\."))).first().isVisible() || (await page.content()).includes(fa));
    const gfaq = (await ld(page, "FAQPage"))[0];
    assert(gfaq && gfaq.mainEntity.some((e) => e.name === fq), "FlashPrint entry in guide FAQPage JSON-LD");
    await page.goto(`${root}${prefix}/guides/makerworld-to-creality`);
    await page.locator("main h1").waitFor();
    assert(!(await page.content()).includes("FlashPrint 5.8.7"), "FlashPrint note only on the Flashforge guide");
    assert.deepEqual(external, []);
    console.log(`PASS ${prefix || "/en"}: QIDI re-export FAQ entry (page + JSON-LD), FlashPrint note in the Flashforge guide only`);
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
