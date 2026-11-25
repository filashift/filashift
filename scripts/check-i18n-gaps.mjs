// Find translation gaps for every non-English site language (es, de, fr).
//
//   node scripts/check-i18n-gaps.mjs                 static checks + browser pass, all languages
//   node scripts/check-i18n-gaps.mjs --static        dictionaries/patterns/guides only (no browser, no build needed)
//   node scripts/check-i18n-gaps.mjs --lang=de       limit to one language (repeatable: --lang=de --lang=fr)
//   BASE=https://… node scripts/check-i18n-gaps.mjs  browser pass against a running site instead of dist/public
//
// Static checks: every key in any dictionary (es/de/fr.json) exists in all of them with the same {placeholders};
// the report rules (REPORT_*) and UI pattern rules (*-patterns.ts) use identical regexes in every language;
// every guide has a translation with the same number of steps, sections, list items and FAQ entries.
// Browser pass: visits every prerendered route (at its /es/, /de/ or /fr/ URL; /source and 404 with ?lang=) plus the converter flow (uploads ~/td/x1c_paint.3mf or $SAMPLE_3MF,
// converts it and expands the conversion report) and lists visible text nodes, title/description and
// placeholder/aria-label/title/alt attributes that are still English. Exits 1 when any gap is found, so it can be
// re-run as a top-up after other branches add strings.
import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const LIB = join(ROOT, "client/src/lib");
const args = process.argv.slice(2);
const staticOnly = args.includes("--static");
const langArgs = args.filter((a) => a.startsWith("--lang=")).map((a) => a.slice(7));
const ALL = ["es", "de", "fr"];
const langs = langArgs.length ? langArgs : ALL;
for (const l of langs) assert(ALL.includes(l), `unknown language ${l}`);
const gaps = [];
const gap = (lang, where, text) => gaps.push({ lang, where, text: String(text).replace(/\s+/g, " ").trim().slice(0, 160) });

// ---------- static checks ----------
const dicts = Object.fromEntries(ALL.map((l) => [l, JSON.parse(readFileSync(join(LIB, `${l}.json`), "utf8"))]));
const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const allKeys = new Set(ALL.flatMap((l) => Object.keys(dicts[l])));
for (const key of allKeys) {
  for (const l of langs) {
    const v = dicts[l][key];
    if (v === undefined) gap(l, `${l}.json missing key`, key);
    else if (!v.trim()) gap(l, `${l}.json empty value`, key);
    else if (holes(v) !== holes(key)) gap(l, `${l}.json placeholder mismatch {${holes(key)}} vs {${holes(v)}}`, key);
  }
}

// Bundle the TypeScript modules once so their regexes and guide objects can be compared.
const { build } = await import("esbuild");
// inside the repo (removed afterwards) so the bundle resolves react & co. from node_modules
const tmp = mkdtempSync(join(ROOT, ".i18n-gaps-"));
const entry = join(tmp, "entry.ts");
const out = join(tmp, "out.mjs");
writeFileSync(
  entry,
  `export { REPORTS, UI_PATTERNS } from ${JSON.stringify(join(LIB, "i18n.tsx"))};
import ${JSON.stringify(join(LIB, "es-patterns.ts"))};
import ${JSON.stringify(join(LIB, "de-patterns.ts"))};
import ${JSON.stringify(join(LIB, "fr-patterns.ts"))};
export { GUIDES } from ${JSON.stringify(join(LIB, "guides.ts"))};
export { GUIDE_TEXT } from ${JSON.stringify(join(LIB, "guides-local.ts"))};`,
);
let mod;
try {
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: "esm", platform: "node", logLevel: "error",
    jsx: "automatic", alias: { "@": join(ROOT, "client/src") }, loader: { ".json": "json" }, packages: "external",
  });
  mod = await import(pathToFileURL(out).href);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
const sig = (rules) => rules.map(([re]) => `${re.source}/${re.flags}`);
for (const [name, table] of [["REPORT", mod.REPORTS], ["UI pattern", mod.UI_PATTERNS]]) {
  const ref = sig(table.es);
  for (const l of langs) {
    const mine = sig(table[l]);
    for (const r of ref) if (!mine.includes(r)) gap(l, `${name} rule missing in ${l}`, r);
    for (const r of mine) if (!ref.includes(r)) gap(l, `${name} rule only in ${l} (add it to the other languages)`, r);
  }
}
const shape = (g) => JSON.stringify({ steps: g.steps.length, faq: g.faq.length, sections: g.sections.map((s) => [s.p?.length ?? 0, s.list?.length ?? 0, s.warning?.items.length ?? 0]) });
for (const g of mod.GUIDES) {
  for (const l of langs) {
    const t = mod.GUIDE_TEXT[l]?.[g.slug];
    if (!t) { gap(l, "guide missing", g.slug); continue; }
    if (shape(t) !== shape(g)) gap(l, `guide structure differs from English`, g.slug);
    for (const k of ["title", "meta", "desc", "intro"]) if (t[k] === g[k]) gap(l, `guide ${k} still English`, g.slug);
  }
}
console.log(`static: ${allKeys.size} dictionary keys, ${mod.REPORTS.es.length} report rules, ${mod.UI_PATTERNS.es.length} UI patterns, ${mod.GUIDES.length} guides checked`);

// ---------- browser pass ----------
if (!staticOnly) {
  const { chromium } = await import("playwright-core");
  const { preview } = await import("vite");
  const sample = process.env.SAMPLE_3MF || `${homedir()}/td/x1c_paint.3mf`;
  const server = process.env.BASE ? null : await preview({ configFile: false, build: { outDir: join(ROOT, "dist/public") }, preview: { host: "127.0.0.1", port: 0 } });
  const base = process.env.BASE || `http://127.0.0.1:${server.httpServer.address().port}`;
  const executablePath = [process.env.CHROME, `${homedir()}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`, "/usr/bin/chromium"].find((p) => p && existsSync(p));
  const routes = ["/", "/filament", "/faq", "/guides", ...mod.GUIDES.map((g) => `/guides/${g.slug}`), "/about", "/contact", "/creators", "/privacy", "/terms", "/source", "/missing-page"];
  const UNPREFIXED = new Set(["/source", "/missing-page"]);
  // Words that are English and (almost) never appear in Spanish, German or French UI text.
  const EN = new Set("the and your you with this that these those are is was will would should could from not before after each which when what where how have has been only into than then there their they them it's don't can't doesn't isn't won't here more about other printer printers file files colour colours color colors print printed prints printing slicing sliced settings setting choose open download downloads upload convert converted conversion page select shows show keep kept lost every any some our we us".split(" "));
  // Text that is the same in every language (brands, units, codes) and need not be translated.
  const NEUTRAL = /^(FilaShift|FAQ|OK|PLA|PETG|ABS|ASA|TPU|PVA|STL|OBJ|3MF|AMS|CFS|IFS|G-code|OrcaSlicer|Bambu Studio|PrusaSlicer|MakerWorld|Printables|Amazon|GitHub|AGPL-3\.0|JTS|[A-Z]{2}|[\d\s.,:×x/%°+\-–—()#$€£@|·•→←]+|.*\.(3mf|stl|obj|zip|mtl))$/i;
  const englishish = (s) => {
    if (NEUTRAL.test(s)) return false;
    const words = s.toLowerCase().match(/[a-z']+/g) || [];
    const hits = words.filter((w) => EN.has(w)).length;
    return hits >= 2 && hits / words.length >= 0.25;
  };
  const collect = (page) =>
    page.evaluate(() => {
      const skip = (el) => { for (let e = el; e; e = e.parentElement) { if (/^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE|TEXTAREA)$/.test(e.tagName) || e.getAttribute("translate") === "no") return true; } return false; };
      const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return (r.width > 0 || r.height > 0 || el.closest("details")) && cs.visibility !== "hidden"; };
      const out = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const v = n.nodeValue.replace(/\s+/g, " ").trim();
        if (v && /[A-Za-z]/.test(v) && !skip(n.parentElement) && visible(n.parentElement)) out.push(["text", v]);
      }
      for (const el of document.body.querySelectorAll("[placeholder],[aria-label],[title],[alt]")) {
        if (el.getAttribute("translate") === "no" || skip(el.parentElement)) continue;
        for (const a of ["placeholder", "aria-label", "title", "alt"]) { const v = el.getAttribute(a); if (v && /[A-Za-z]/.test(v)) out.push([`@${a}`, v.trim()]); }
      }
      out.push(["<title>", document.title]);
      const d = document.querySelector('meta[name="description"]')?.content; if (d) out.push(["<meta description>", d]);
      return { lang: document.documentElement.lang, items: out };
    });
  const browser = await chromium.launch({ executablePath });
  try {
    for (const lang of langs) {
      const dict = dicts[lang];
      const seen = new Set();
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block", locale: "en-US" });
      if (server) await ctx.addInitScript(() => { window.__PRERENDER = true; });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const scan = async (where) => {
        await page.waitForTimeout(150);
        const { lang: htmlLang, items } = await collect(page);
        if (htmlLang !== lang) gap(lang, `${where} html lang`, htmlLang);
        for (const [kind, v] of items) {
          const k = `${kind}|${v}`;
          if (seen.has(k)) continue;
          seen.add(k);
          const exact = dict[v] !== undefined && dict[v] !== v;
          if (exact || englishish(v)) gap(lang, `${where} ${kind}`, v);
        }
      };
      for (const route of routes) {
        // retry once if the page has not settled on the right route and language (slow first load)
        for (let attempt = 0; attempt < 2; attempt++) {
          // public pages have their own /es/, /de/ and /fr/ URLs; /source and the 404 page keep ?lang=
          const url = UNPREFIXED.has(route) ? `${route}?lang=${lang}` : `/${lang}${route}`;
          await page.goto(`${base}${url}`, { waitUntil: "networkidle" });
          const want = url.split("?")[0];
          const ok = await page.waitForFunction(({ lang, route, want }) => document.documentElement.lang === lang && (route === "/missing-page" || location.pathname.replace(/\/$/, "") === want.replace(/\/$/, "")), { lang, route, want }, { timeout: 5000 }).then(() => true, () => false);
          if (ok) break;
        }
        await page.waitForTimeout(300);
        // open collapsed content so it is checked too
        await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
        await scan(route);
      }
      // Converter flow with a real project and its conversion report.
      if (existsSync(sample)) {
        await page.goto(`${base}/${lang}/`, { waitUntil: "networkidle" });
        await page.getByTestId("button-lang").click();
        await scan("/ language menu");
        await page.keyboard.press("Escape");
        // visitor helper ("Ask"): open it and ask a question so its answer is checked as well
        const ask = page.locator("header button:has(svg.lucide-message-circle)").first();
        if (await ask.count()) {
          await ask.click();
          const box = page.locator('[role="dialog"] textarea, [role="dialog"] input[type="text"], [role="dialog"] input:not([type])').first();
          await box.waitFor({ timeout: 10000 }).catch(() => gap(lang, "/ helper", "helper input not found"));
          if (await box.count()) { await box.fill("colors missing after opening"); await box.press("Enter"); await page.waitForTimeout(800); }
          await scan("/ helper");
          await page.keyboard.press("Escape");
        } else gap(lang, "/ helper", "helper button not found");
        await page.getByTestId("button-printer-picker").click();
        await page.getByTestId("input-printer-search").waitFor();
        await scan("/ printer picker");
        await page.keyboard.press("Escape");
        await page.getByTestId("input-file").setInputFiles(sample);
        const convert = page.locator('[data-testid^="button-convert-"]').first();
        await convert.waitFor({ timeout: 60000 });
        await page.waitForTimeout(500);
        await scan("/ file loaded");
        await convert.click();
        await page.locator('[data-testid^="button-download-"]').first().waitFor({ timeout: 120000 });
        const report = page.locator('[data-testid^="button-report-"]').first();
        if (await report.count()) await report.click().catch(() => {});
        await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
        await page.locator('[data-testid^="list-report-"]').first().waitFor({ timeout: 10000 }).catch(() => gap(lang, "/ converted", "conversion report list not found"));
        await scan("/ converted + report");
      } else {
        console.warn(`WARN ${sample} not found: converter flow skipped (set SAMPLE_3MF)`);
      }
      for (const e of errors) gap(lang, "page error", e);
      console.log(`browser ${lang}: ${routes.length} routes + converter flow, ${seen.size} distinct strings checked`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    await server?.close();
  }
}

if (gaps.length) {
  console.log(`\n${gaps.length} translation gap(s):`);
  for (const g of gaps) console.log(`  [${g.lang}] ${g.where}: ${g.text}`);
  process.exit(1);
}
console.log(`PASS i18n gaps: ${langs.join(", ")} have no untranslated strings`);
