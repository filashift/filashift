// Localized URLs for search engines: /es/, /de/ and /fr/ copies of every public page, see "Localized URLs and hreflang"
// in OPERATIONS.md.
//
//   npm run build && node scripts/prerender.mjs && node scripts/check-seo-locales.mjs   (serves dist/public)
//   BASE=https://filashift.com node scripts/check-seo-locales.mjs                       (a running site)
//   SHOTS=/tmp/shots node scripts/check-seo-locales.mjs                                 (also save screenshots)
//
// Raw HTML (no JavaScript) of every localized route in all 4 languages: status 200, <html lang>, a title and
// description that differ from English and contain none of the English strings the gap finder looks for, a self
// canonical, the reciprocal hreflang set (en, es, de, fr, x-default), og:locale and JSON-LD that parses and has no
// untranslated dictionary strings. Then sitemap.xml (every locale URL with alternates and lastmod) and, in Chromium,
// no horizontal overflow at 390 px, the language menu going to the matching locale path, internal links keeping the
// prefix, the path winning over ?lang= and /source staying unprefixed. Exits 1 on any failure.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SITE = "https://filashift.com";
const LANGS = ["en", "es", "de", "fr"];
const OG = { en: "en_US", es: "es_ES", de: "de_DE", fr: "fr_FR" };
const guides = readFileSync(join(ROOT, "client/src/lib/guides.ts"), "utf8").match(/slug: "([a-z0-9-]+)"/g).map((s) => s.slice(7, -1));
const ROUTES = ["/", "/filament", "/faq", "/guides", ...guides.map((g) => `/guides/${g}`), "/tested", "/about", "/contact", "/creators", "/privacy", "/terms"];
const SAME_TITLE = new Set(["/fr/contact"]); // "Contact" is the French word too
const at = (r, l) => (l === "en" ? r : `/${l}${r}`);
const abs = (p) => SITE + (/^\/((es|de|fr)\/)?$/.test(p) ? p : p.replace(/\/$/, ""));
const dicts = Object.fromEntries(["es", "de", "fr"].map((l) => [l, JSON.parse(readFileSync(join(ROOT, `client/src/lib/${l}.json`), "utf8"))]));
// Same English-word heuristic as scripts/check-i18n-gaps.mjs (keep the two lists in step).
const EN = new Set("the and your you with this that these those are is was will would should could from not before after each which when what where how have has been only into than then there their they them it's don't can't doesn't isn't won't here more about other printer printers file files colour colours color colors print printed prints printing slicing sliced settings setting choose open download downloads upload convert converted conversion page select shows show keep kept lost every any some our we us".split(" "));
const englishish = (s) => {
  const words = s.toLowerCase().match(/[a-z']+/g) || [];
  const hits = words.filter((w) => EN.has(w)).length;
  return hits >= 2 && hits / words.length >= 0.25;
};
// an exact English UI string whose translation differs (the gap finder's "exact" rule)
const englishKey = (lang, s) => dicts[lang][s] !== undefined && dicts[lang][s] !== s;
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

const { preview } = await import("vite");
// vite preview with the Caddyfile's page rules: /<route> serves /<route>/index.html, anything else 404.html with 404
const DIST = join(ROOT, "dist/public");
const caddyRules = {
  name: "caddy-like-pages",
  configurePreviewServer(srv) {
    srv.middlewares.use((req, res, next) => {
      const u = new URL(req.url, "http://x");
      const p = decodeURIComponent(u.pathname);
      if (/^\/(es|de|fr)$/.test(p)) { res.statusCode = 301; res.setHeader("Location", `${p}/${u.search}`); return res.end(); }
      const file = join(DIST, p);
      if (!file.startsWith(DIST)) return next();
      if (existsSync(file) && statSync(file).isFile()) return next();
      const index = join(file, "index.html");
      if (existsSync(index)) { req.url = (p.endsWith("/") ? p : p + "/") + "index.html" + u.search; return next(); }
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html");
      res.end(readFileSync(join(DIST, "404.html")));
    });
  },
};
const server = process.env.BASE ? null : await preview({ configFile: false, plugins: [caddyRules], build: { outDir: DIST }, preview: { host: "127.0.0.1", port: 0 } });
const base = (process.env.BASE || `http://127.0.0.1:${server.httpServer.address().port}`).replace(/\/$/, "");

const unent = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
function parse(html) {
  const attr = (tag, name) => unent(tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? "");
  const tags = (re) => [...html.matchAll(re)].map((m) => m[0]);
  const metas = tags(/<meta\b[^>]*>/g), links = tags(/<link\b[^>]*>/g);
  const metaBy = (k, v) => metas.filter((m) => attr(m, k) === v).map((m) => attr(m, "content"));
  return {
    lang: attr(html.match(/<html\b[^>]*>/)?.[0] ?? "", "lang"),
    title: unent(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""),
    desc: metaBy("name", "description")[0] ?? "",
    ogLocale: metaBy("property", "og:locale"),
    ogUrl: metaBy("property", "og:url")[0] ?? "",
    canonical: links.filter((l) => attr(l, "rel") === "canonical").map((l) => attr(l, "href")),
    alternates: links.filter((l) => attr(l, "rel") === "alternate" && attr(l, "hreflang")).map((l) => [attr(l, "hreflang"), attr(l, "href")]),
    ld: [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]),
  };
}
const strings = (v, out = []) => {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
};

// ---------- raw HTML of every localized route in every language ----------
const pages = new Map();
for (const r of ROUTES) {
  for (const l of LANGS) {
    const p = at(r, l);
    const res = await fetch(base + p, { redirect: "manual" });
    check(res.status === 200, `${p}: status ${res.status}`);
    pages.set(p, parse(await res.text()));
  }
}
let ldBlocks = 0;
for (const r of ROUTES) {
  const en = pages.get(r);
  const want = [...LANGS.map((l) => [l, abs(at(r, l))]), ["x-default", abs(r)]];
  for (const l of LANGS) {
    const p = at(r, l), h = pages.get(p);
    check(h.lang === l, `${p}: <html lang="${h.lang}">`);
    check(h.canonical.length === 1 && h.canonical[0] === abs(p), `${p}: canonical ${JSON.stringify(h.canonical)}`);
    check(h.ogUrl === abs(p), `${p}: og:url ${h.ogUrl}`);
    check(h.ogLocale.length === 1 && h.ogLocale[0] === OG[l], `${p}: og:locale ${JSON.stringify(h.ogLocale)}`);
    check(JSON.stringify(h.alternates) === JSON.stringify(want), `${p}: hreflang ${JSON.stringify(h.alternates)}`);
    // reciprocal: every alternate names this page back with the same language code
    for (const [hl, href] of h.alternates) {
      if (hl === "x-default") continue;
      const other = pages.get(href.slice(SITE.length) || "/");
      check(other?.alternates.some(([x, y]) => x === l && y === abs(p)), `${p}: ${href} does not link back with hreflang=${l}`);
    }
    check(h.ld.length > 0, `${p}: no JSON-LD`);
    for (const block of h.ld) {
      ldBlocks++;
      let data;
      try { data = JSON.parse(block); } catch (e) { check(false, `${p}: JSON-LD does not parse (${e.message})`); continue; }
      check(data["@context"] === "https://schema.org", `${p}: JSON-LD without schema.org context`);
      if (l !== "en") for (const s of strings(data)) check(!englishKey(l, s), `${p}: JSON-LD still English: ${s.slice(0, 80)}`);
    }
    if (l === "en") continue;
    check(h.title !== en.title || SAME_TITLE.has(p), `${p}: title same as English (${h.title})`);
    check(h.desc && h.desc !== en.desc, `${p}: description same as English`);
    for (const [k, v] of [["title", h.title], ["description", h.desc]]) {
      check(!englishish(v), `${p}: ${k} looks English: ${v}`);
      check(!englishKey(l, v) && !englishKey(l, v.replace(/ [—|] FilaShift$/, "")), `${p}: ${k} is an untranslated string: ${v}`);
    }
  }
}
console.log(`raw HTML: ${ROUTES.length} routes × ${LANGS.length} languages, ${ldBlocks} JSON-LD blocks`);

// ---------- not indexed: /source, 404 ----------
const src = parse(await (await fetch(base + "/source")).text());
check(src.alternates.length === 0, "/source must not have hreflang alternates");
const probe = await fetch(base + "/no-such-page-" + Date.now());
if (probe.status === 404) {
  // needs a server with real 404s (Caddy, or the Caddy-like preview above)
  for (const p of ["/it/", "/xx/guides", "/de/no-such-page", "/de/source"]) check((await fetch(base + p)).status === 404, `${p}: expected 404`);
  console.log("404s: unknown /xx/ paths and unlocalized routes return 404");
} else check(false, `${base} answers unknown paths with ${probe.status}, expected 404`);

// ---------- sitemap ----------
const sitemap = await (await fetch(base + "/sitemap.xml")).text();
check(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'), "sitemap.xml without xhtml namespace");
const entries = new Map([...sitemap.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?([\s\S]*?)<\/url>/g)].map((m) => [m[1], { lastmod: m[2], alt: [...m[3].matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((x) => [x[1], x[2]]) }]));
for (const r of ROUTES) {
  const want = [...LANGS.map((l) => [l, abs(at(r, l))]), ["x-default", abs(r)]];
  const lastmods = new Set();
  for (const l of LANGS) {
    const e = entries.get(abs(at(r, l)));
    check(!!e, `sitemap.xml: missing ${abs(at(r, l))}`);
    if (!e) continue;
    check(JSON.stringify(e.alt) === JSON.stringify(want), `sitemap.xml: alternates for ${abs(at(r, l))}`);
    if (r.startsWith("/guides/")) check(/^\d{4}-\d{2}-\d{2}$/.test(e.lastmod ?? ""), `sitemap.xml: no lastmod for ${abs(at(r, l))}`);
    lastmods.add(e.lastmod);
  }
  check(lastmods.size === 1, `sitemap.xml: lastmod differs between languages for ${r}`);
}
for (const loc of entries.keys()) check(!/\/(es|de|fr)\/source|404/.test(loc), `sitemap.xml lists ${loc}`);
console.log(`sitemap: ${entries.size} URLs`);

// ---------- browser: 390 px overflow, language menu, prefixed links ----------
const { chromium } = await import("playwright-core");
const executablePath = [process.env.CHROME, `${homedir()}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`, "/usr/bin/chromium"].find((p) => p && existsSync(p));
const browser = await chromium.launch({ executablePath });
const shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
try {
  const ctx = await browser.newContext({ serviceWorkers: "block", locale: "en-US", viewport: { width: 390, height: 844 } });
  // path routing (as on filashift.com) for local servers
  if (["127.0.0.1", "localhost"].includes(new URL(base).hostname)) await ctx.addInitScript(() => { window.__PRERENDER = true; });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  const settle = async (lang) => {
    await page.waitForFunction((l) => document.documentElement.lang === l && document.querySelector("h1"), lang, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(250);
  };
  const sample = ["/", "/guides", "/guides/3mf-to-stl", "/guides/filament-buying-guide-five-printers", "/tested", "/filament", "/faq", "/about", "/privacy", "/terms", "/contact", "/creators"];
  for (const r of sample) {
    for (const l of LANGS) {
      const p = at(r, l);
      await page.goto(base + p, { waitUntil: "networkidle" });
      await settle(l);
      const st = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        alts: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
      }));
      check(st.lang === l, `${p} (390 px, after JS): lang ${st.lang}`);
      check(st.over <= 0, `${p}: horizontal overflow ${st.over}px at 390`);
      check(st.canonical === abs(p) && st.alts === 5, `${p} (after JS): canonical ${st.canonical}, ${st.alts} alternates`);
    }
  }
  console.log(`browser: ${sample.length} routes × 4 languages at 390 px without overflow`);
  // the language menu goes to the same page in the other language
  const menu = async (from, to, expectPath) => {
    await page.goto(base + from, { waitUntil: "networkidle" });
    await settle(from.match(/^\/(es|de|fr)(\/|$)/)?.[1] ?? "en");
    await page.getByTestId("button-lang").click();
    await Promise.all([page.waitForURL((u) => u.pathname === expectPath, { timeout: 15000 }).catch(() => {}), page.getByTestId(`button-lang-${to}`).click()]);
    await settle(to);
    const u = new URL(page.url());
    check(u.pathname === expectPath && !u.searchParams.has("lang"), `menu ${from} -> ${to}: ${u.pathname}${u.search}`);
    check((await page.locator("html").getAttribute("lang")) === to, `menu ${from} -> ${to}: html lang`);
  };
  await menu("/", "de", "/de/");
  await menu("/de/", "fr", "/fr/");
  await menu("/guides/3mf-to-stl", "es", "/es/guides/3mf-to-stl");
  await menu("/es/guides/3mf-to-stl", "fr", "/fr/guides/3mf-to-stl");
  await menu("/fr/guides/3mf-to-stl", "en", "/guides/3mf-to-stl");
  await menu("/de/filament?pack=single", "es", "/es/filament");
  check(new URL(page.url()).searchParams.get("pack") === "single", "menu keeps other query parameters");
  console.log("language menu: matching locale paths");
  // internal links keep the prefix; /source stays unprefixed (not localized)
  await ctx.clearCookies();
  await page.goto(base + "/de/", { waitUntil: "networkidle" });
  await settle("de");
  await page.getByTestId("nav-faq").click();
  await page.waitForURL((u) => u.pathname === "/de/faq", { timeout: 10000 }).catch(() => {});
  check(new URL(page.url()).pathname === "/de/faq", `nav from /de/ went to ${new URL(page.url()).pathname}`);
  await page.getByTestId("link-home").click();
  await page.waitForURL((u) => u.pathname === "/de/", { timeout: 10000 }).catch(() => {});
  check(new URL(page.url()).pathname === "/de/", `home link from /de/faq went to ${new URL(page.url()).pathname}`);
  check((await page.getByTestId("footer-guides").getAttribute("href")) === "/de/guides", "footer link without /de prefix");
  check((await page.getByTestId("link-source").getAttribute("href")) === "/source", "source link should stay /source");
  // the path wins over ?lang=, and ?lang= still works on English URLs
  await page.goto(base + "/fr/faq?lang=es", { waitUntil: "networkidle" });
  await settle("fr");
  check((await page.locator("html").getAttribute("lang")) === "fr", "/fr/faq?lang=es is not French");
  await page.evaluate(() => localStorage.removeItem("filashift-lang"));
  await page.goto(base + "/faq?lang=de", { waitUntil: "networkidle" });
  await settle("de");
  check((await page.locator("html").getAttribute("lang")) === "de", "/faq?lang=de is not German");
  console.log("links: prefix kept, path wins over ?lang=, ?lang= still works");
  if (shots) {
    for (const [w, h] of [[1280, 900], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h });
      for (const l of ["de", "fr"]) {
        for (const [r, name] of [["/", "home"], ["/guides/3mf-to-stl", "guide"]]) {
          await page.goto(base + at(r, l), { waitUntil: "networkidle" });
          await settle(l);
          await page.screenshot({ path: join(shots, `${name}-${l}-${w}.png`), fullPage: false });
        }
      }
    }
    console.log(`screenshots in ${shots}`);
  }
  for (const e of errors) check(false, `page error ${e}`);
  await ctx.close();
} finally {
  await browser.close();
  server?.httpServer.close();
}

if (fails.length) {
  console.log(`\n${fails.length} failure(s):`);
  for (const f of fails) console.log("  " + f);
  process.exit(1);
}
console.log("PASS localized URLs: html lang, translated title/description, canonical, hreflang, JSON-LD, sitemap, 390 px, language menu");
assert.ok(true);
