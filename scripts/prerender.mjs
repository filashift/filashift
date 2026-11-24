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
const ROUTES = ["/", "/filament", "/faq", "/guides", ...guides.map((g) => `/guides/${g}`), "/about", "/contact", "/creators", "/privacy", "/terms", "/404"];

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
for (const route of ROUTES) {
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.waitForSelector("h1", { timeout: 15000 });
  await page.waitForTimeout(300);
  if (errs.length) throw new Error(`${route}: ${errs.join("; ")}`);
  if (route.startsWith("/guides/")) {
    const date = await page.locator("article time[datetime]").getAttribute("datetime");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new Error(`Missing editorial date: ${route}`);
    modified.set(route, date);
  }
  let html = await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.lang = "en";
    return "<!doctype html>\n" + document.documentElement.outerHTML;
  });
  // the inline script writes <base href="/"> at runtime; drop the copy it wrote during prerendering
  html = html.replace(/(<\/script>)\s*<base href="\/">/, "$1");
  // nested pages are only served on filashift.com, so their asset URLs can be absolute
  if (route !== "/") html = html.replace(/(^|[\s"',])\.\/(?=[\w./-]+\.(?:js|css|webp|png|svg|woff2|json|webmanifest)\b)/g, "$1/");
  const file = route === "/" ? "index.html" : route === "/404" ? "404.html" : path.join(route.slice(1), "index.html");
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), html);
  const title = await page.title();
  out.push(route);
  console.log(`${route.padEnd(40)} ${title}`);
  await page.close();
}
await browser.close();
server.close();

// sitemap + robots
const urls = out
  .filter((r) => r !== "/404")
  .map((r) => `  <url><loc>${SITE}${r === "/" ? "/" : r}</loc>${modified.has(r) ? `<lastmod>${modified.get(r)}</lastmod>` : ""}</url>`)
  .join("\n");
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`prerendered ${out.length} routes, wrote sitemap.xml and robots.txt`);
