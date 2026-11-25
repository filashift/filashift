// Prerender the public routes of dist/public into static HTML so search engines and link previews see the real
// page text, titles and JSON-LD without running JavaScript. React re-renders over it on load.
// Usage: node scripts/prerender.mjs   (after `npm run build`; needs Chrome/Chromium, set CHROME=/path if not found)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const ROOT = path.resolve("dist/public");
const SITE = "https://filashift.com";
const guides = fs.readFileSync("client/src/lib/guides.ts", "utf8").match(/slug: "([a-z0-9-]+)"/g).map((s) => s.slice(7, -1));
const EN_ROUTES = ["/", "/filament", "/faq", "/guides", ...guides.map((g) => `/guides/${g}`), "/tested", "/about", "/contact", "/creators", "/privacy", "/terms", "/source", "/404"];
// Every public, indexable route also exists at /es/…, /de/… and /fr/…, rendered in that language (see i18n.tsx
// localePath). /source and the 404 page stay English-only and get no hreflang.
const LOCALES = ["es", "de", "fr"];
const NOT_LOCALIZED = new Set(["/source", "/404"]);
const LOCALIZED = EN_ROUTES.filter((r) => !NOT_LOCALIZED.has(r));
const localeRoute = (r, lang) => (lang === "en" ? r : `/${lang}${r}`);
const ROUTES = [...EN_ROUTES, ...LOCALES.flatMap((l) => LOCALIZED.map((r) => localeRoute(r, l)))];
const langOf = (route) => /^\/(es|de|fr)(\/|$)/.exec(route)?.[1] ?? "en";
const baseRoute = (route) => (langOf(route) === "en" ? route : route.slice(3) || "/");
// home pages keep their slash (https://filashift.com/de/), every other page has none (…/de/guides)
const url = (r) => SITE + (/^\/((es|de|fr)\/)?$/.test(r) ? r : r.replace(/\/$/, ""));

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
const shell = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"); // pristine SPA shell, read before anything is overwritten
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const f = path.join(ROOT, p);
  if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
    return fs.createReadStream(f).pipe(res);
  }
  if (p.startsWith("/data/")) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(shell);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const guess = [process.env.CHROME, path.join(os.homedir(), ".cache/ms-playwright/chromium-1217/chrome-linux64/chrome"), "/usr/bin/chromium", "/usr/bin/google-chrome"].find((p) => p && fs.existsSync(p));
const browser = await chromium.launch(guess ? { executablePath: guess } : {});
const ctx = await browser.newContext({ serviceWorkers: "block", colorScheme: "light", locale: "en-US", viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => {
  window.__PRERENDER = true;
  try {
    localStorage.setItem("filashift-lang", "en");
  } catch {}
});

const out = [];
const modified = new Map();
const untranslated = [];
const SAME_TITLE = new Set(["/fr/contact"]); // "Contact" is also the French word
const enHead = new Map(); // English title + description per route, to prove the other languages differ
for (const route of ROUTES) {
  const lang = langOf(route), plain = baseRoute(route), localized = !NOT_LOCALIZED.has(plain);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.waitForSelector("h1", { timeout: 15000 });
  if (localized) await page.waitForFunction((href) => document.querySelector('link[rel="canonical"]')?.href === href, url(route), { timeout: 15000 });
  await page.waitForTimeout(300);
  if (errs.length) throw new Error(`${route}: ${errs.join("; ")}`);
  if (plain.startsWith("/guides/")) {
    const date = await page.locator("article time[datetime]").getAttribute("datetime");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new Error(`Missing editorial date: ${route}`);
    modified.set(route, date);
  }
  let { html, head } = await page.evaluate((lang) => {
    document.documentElement.classList.remove("dark");
    document.documentElement.lang = lang;
    const head = {
      lang: document.documentElement.lang,
      title: document.title,
      desc: document.querySelector('meta[name="description"]')?.content || "",
      canonical: document.querySelector('link[rel="canonical"]')?.href || "",
      alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [l.hreflang, l.href]),
    };
    return { html: "<!doctype html>\n" + document.documentElement.outerHTML, head };
  }, lang);
  if (localized) {
    // the HTML itself must already be in the page's language with a self canonical and the full hreflang set
    const want = [...["en", ...LOCALES].map((l) => [l, url(localeRoute(plain, l))]), ["x-default", url(plain)]];
    if (head.canonical !== url(route)) throw new Error(`${route}: canonical ${head.canonical}`);
    if (JSON.stringify(head.alternates) !== JSON.stringify(want)) throw new Error(`${route}: hreflang ${JSON.stringify(head.alternates)}`);
    if (lang === "en") enHead.set(plain, head);
    else {
      const en = enHead.get(plain);
      if (!en || (head.title === en.title && !SAME_TITLE.has(route)) || head.desc === en.desc) untranslated.push(`${route}: ${head.title === en?.title ? "title " + head.title : ""} ${head.desc === en?.desc ? "desc " + head.desc : ""}`);
    }
  }
  // the inline script writes <base href="/"> at runtime; drop the copy it wrote during prerendering
  html = html.replace(/(<\/script>)\s*<base href="\/">/, "$1");
  // nested pages are only served on filashift.com, so their asset URLs can be absolute
  if (route !== "/") html = html.replace(/(^|[\s"',])\.\/(?=[\w./-]+\.(?:js|css|webp|png|svg|woff2|json|webmanifest)\b)/g, "$1/");
  // lazy-route preloads injected while rendering carry the temporary server origin; make them site-relative
  html = html.split(base + "/").join(route === "/" ? "./" : "/");
  if (html.includes("127.0.0.1")) throw new Error(`${route}: prerendered HTML still references the local render server`);
  const file = route === "/" ? "index.html" : route === "/404" ? "404.html" : path.join(route.slice(1), "index.html");
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), html);
  out.push(route);
  console.log(`${route.padEnd(48)} ${head.title}`);
  await page.close();
}
await browser.close();
server.close();
if (untranslated.length) throw new Error(`title/description still English:\n${untranslated.join("\n")}`);

// sitemap + robots: every language version is listed, each with the full set of xhtml:link alternates
const entry = (route) => {
  const plain = baseRoute(route);
  const alt = NOT_LOCALIZED.has(plain)
    ? ""
    : [...["en", ...LOCALES].map((l) => [l, url(localeRoute(plain, l))]), ["x-default", url(plain)]]
        .map(([l, h]) => `\n    <xhtml:link rel="alternate" hreflang="${l}" href="${h}"/>`)
        .join("");
  return `  <url><loc>${url(route)}</loc>${modified.has(route) ? `<lastmod>${modified.get(route)}</lastmod>` : ""}${alt}${alt ? "\n  " : ""}</url>`;
};
const urls = out.filter((r) => r !== "/404").map(entry).join("\n");
fs.writeFileSync(
  path.join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`prerendered ${out.length} routes, wrote sitemap.xml and robots.txt`);
