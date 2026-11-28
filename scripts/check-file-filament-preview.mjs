// Run after npm run build. 2.2 item 2: filament mapping preview (UI only).
//   node scripts/check-file-filament-preview.mjs [OUT_DIR]
// en/es/de/fr at 320 and 780 px: each source filament shows its file number and named parts beside the
// destination slot selector; a keyboard-only remap of filament 2 from slot 2 to slot 3 leaves the source
// identity unchanged; no horizontal overflow; no third-party requests. With OUT_DIR, the remapped export
// (en, 780 px) is saved as OUT_DIR/creator-5-pro-remap.3mf so Ops/Dev can compare it with the 2.1 build
// using scripts/compare-3mf.ts.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2];
const LANGS = [["", "File filament", "Slots are project assignments."], ["/es", "Filamento del archivo", "Las ranuras son asignaciones del proyecto."], ["/de", "Filament in der Datei", "Die Plätze sind Zuordnungen im Projekt."], ["/fr", "Filament du fichier", "Les emplacements sont des affectations du projet."]];
const server = await preview({ configFile: false, build: { outDir: "dist/public" }, preview: { host: "127.0.0.1", port: 0 } });
const b = await chromium.launch({ executablePath: process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome` });
try {
  const root = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const width of [320, 780]) for (const [prefix, label, note] of LANGS) {
    const p = await b.newPage({ viewport: { width, height: 900 }, serviceWorkers: "block", acceptDownloads: true });
    await p.addInitScript(() => { window.__PRERENDER = true; });
    const external = [];
    p.on("request", (r) => { const u = new URL(r.url()); if (!["127.0.0.1", ""].includes(u.hostname) && !u.protocol.startsWith("blob") && !u.protocol.startsWith("data")) external.push(r.url()); });
    await p.goto(`${root}${prefix}/?printer=flashforge-creator-5-pro`);
    await p.getByTestId("input-file").setInputFiles("client/public/samples/filashift-nameplate.3mf");
    const row = (n) => p.locator(`[data-testid^="file-filament-"][data-testid$="-${n}"]`);
    for (const [n, name] of [[1, "Nameplate"], [2, "FS lettering"]]) {
      await row(n).waitFor();
      assert.equal((await row(n).innerText()).trim(), `${label} ${n}: ${name}`);
    }
    assert.match(await p.getByTestId("physical-slot-note").innerText(), new RegExp(note.replace(/\./g, "\\.")));
    // wait until the printer profile has loaded (convert enabled): a profile load resets mappings
    await p.waitForFunction(() => { const b = document.querySelector('[data-testid^="button-convert-"]'); return b && !b.disabled; });
    await p.waitForLoadState("networkidle");
    const select = p.locator('[data-testid^="select-slot-"]').nth(1);
    assert.match(await select.innerText(), /2/);
    // keyboard only: focus the trigger, open, move down one, choose
    await select.focus();
    await p.keyboard.press("Enter");
    await p.getByRole("listbox").waitFor();
    // Radix moves focus to the checked option once the listbox is positioned
    await p.waitForFunction(() => document.activeElement?.getAttribute("role") === "option" && document.activeElement.getAttribute("aria-selected") === "true");
    await p.keyboard.press("ArrowDown");
    await p.waitForFunction(() => /3/.test(document.activeElement?.textContent || ""));
    await p.keyboard.press("Enter");
    await p.getByRole("listbox").waitFor({ state: "detached" });
    for (let i = 0; i < 20 && !/3/.test(await select.innerText()); i++) await p.waitForTimeout(100);
    assert.match(await select.innerText(), /Slot 3|3/, `remap 2→3 (${width} px ${prefix || "/en"}): selector reads "${await select.innerText()}"`);
    assert(await select.evaluate((el) => el === document.activeElement), "focus returns to the slot selector");
    assert.equal((await row(2).innerText()).trim(), `${label} 2: FS lettering`, "source identity unchanged after remap");
    const chip = (n) => p.locator(`[data-testid^="slot-preview-"][data-testid$="-${n}"]`);
    assert.match(await chip(3).innerText(), /PLA/, "slot 3 now holds filament 2");
    assert.match(await chip(2).innerText(), /empty|vac|leer|vide/i, "slot 2 is now empty");
    // both rows side by side with their selector, and the page does not scroll sideways
    for (const n of [0, 1]) {
      const li = p.locator('[data-testid^="row-filament-"]').nth(n), s = p.locator('[data-testid^="select-slot-"]').nth(n);
      const [lb, sb] = [await li.boundingBox(), await s.boundingBox()];
      assert(sb.x + sb.width <= lb.x + lb.width + 0.5 && sb.y < lb.y + lb.height, `row ${n + 1}: selector inside its row`);
    }
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 0, `no horizontal overflow at ${width} px (got ${overflow})`);
    if (out && !prefix && width === 780) {
      await p.locator('[data-testid^="button-convert-"]').first().click();
      const dl = p.waitForEvent("download");
      await p.locator('[data-testid^="button-download-"]').first().click();
      mkdirSync(out, { recursive: true });
      await (await dl).saveAs(`${out}/creator-5-pro-remap.3mf`);
    }
    assert.deepEqual(external, []);
    console.log(`PASS ${prefix || "/en"} @${width}px: file filament labels beside slots; keyboard remap 2→3 keeps source identity; no overflow`);
    await p.close();
  }
} finally { await b.close(); await server.close(); }
