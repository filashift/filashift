// Check the English copy users read, including search and accessibility text.
// URLs, CSS selectors, slicer keys and manufacturer-provided data are not copy.
// Run after npm run build and node scripts/prerender.mjs.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const root = "dist/public";
const pages = [];
function visit(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (path.endsWith(".html")) pages.push(path);
  }
}
visit(root);
const british = /\b(?:[a-z]*colour(?:s|ed|ing)?|centres?|centred|centerd|(?:milli|centi|kilo)?metres?|behaviours?|favourites?|recognis(?:e|ed|es|ing)|cancell(?:ed|ing)|labell(?:ed|ing)|grey|catalogue|aluminium|fibres?)\b/i;
const b = await chromium.launch({ executablePath: process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome` });
try {
  const p = await b.newPage();
  let checked = 0;
  for (const file of pages) {
    const lines = await p.evaluate(html => {
      const d = new DOMParser().parseFromString(html, "text/html");
      if (d.documentElement.lang.split("-")[0] !== "en") return null;
      const copy = [d.title];
      for (const s of d.querySelectorAll("script[type='application/ld+json']")) {
        JSON.stringify(JSON.parse(s.textContent), (k, v) => {
          if (["description","name","headline","text"].includes(k) && typeof v === "string") copy.push(v);
          return v;
        });
      }
      d.querySelectorAll("script,style,code,pre").forEach(el => el.remove());
      copy.push(d.body.textContent);
      for (const a of ["aria-label","alt","placeholder","title"]) {
        for (const el of d.querySelectorAll(`[${a}]`)) copy.push(el.getAttribute(a));
      }
      for (const el of d.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"]')) copy.push(el.content);
      return copy;
    }, readFileSync(file, "utf8"));
    if (!lines) continue;
    checked++;
    for (const line of lines) {
      const match = british.exec(line);
      assert.ok(!match, `${file}: ${match && line.slice(Math.max(0, match.index - 28), match.index + 50)}`);
    }
  }
  assert.ok(checked >= 20, `Expected the prerendered English pages, found ${checked}`);
  console.log(`PASS US English: ${checked} pages, including accessibility text, search metadata and structured data`);
} finally { await b.close(); }
