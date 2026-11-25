// Development functional test; start with npm run build.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { preview } from "vite";

const server = await preview({ configFile: false, build: { outDir: "dist/public" }, preview: { host: "127.0.0.1", port: 0 } });
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome` });
try {
  for (const [prefix, decision, diagnostic] of [
    ["", "no conversion is needed", "assigned to the same filament slot"],
    ["/es", "no necesitas convertir nada", "misma ranura de filamento"],
    ["/de", "keine Konvertierung nötig", "demselben Filamentplatz"],
    ["/fr", "aucune conversion n’est nécessaire", "même emplacement de filament"],
  ]) {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    const errors = [];
    p.on("pageerror", e => errors.push(e.message));
    await p.addInitScript(() => { window.__PRERENDER = true; });
    await p.goto(`${base}${prefix}/guides`);
    await p.getByTestId("slicer-first-link").click();
    await p.waitForURL(`${base}${prefix}/faq?topic=slicer-first`);
    const answer = p.getByRole("region").filter({ hasText: decision });
    await answer.waitFor();
    assert.match(await answer.innerText(), /3MF/);
    assert.match(await answer.innerText(), /STL/);
    await p.reload();
    await answer.waitFor();
    const schema = JSON.parse(await p.locator("#ld-faq").textContent());
    assert.equal(schema.mainEntity[0].acceptedAnswer.text, (await answer.innerText()).trim());
    await p.getByTestId("faq-4").click();
    assert.equal(await p.getByTestId("faq-slicer-first").getAttribute("aria-expanded"), "false");
    await p.getByRole("region").filter({ hasText: "MakerWorld" }).waitFor();
    await p.goto(`${base}${prefix}/guides/multicolor-3mf`);
    await p.getByText(diagnostic, { exact: false }).first().waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS ${prefix || "/en"}: guide link, open answer, reload, schema, related FAQ, one-color recovery`);
    await p.close();
  }
} finally {
  await browser.close();
  await server.close();
}
