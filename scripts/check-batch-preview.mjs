// Batch conversion + before/after 3D colour preview, against the built site (dist/public) or BASE.
// Usage: node scripts/check-batch-preview.mjs          (SHOTS=/dir saves screenshots; TD= test-corpus folder, default ~/td)
// Checks: single-file flow unchanged, 3 files × 3 printers batch with per-item status/report/download and a ZIP of all
// 9 projects, file/printer limits, lazy three.js chunk (not loaded until a preview opens), WebGL rendering of the
// painted colours before/after, the no-WebGL fallback, mobile 390/320 px layout in English and Spanish, no CSP
// violations (repo policy injected), no page errors and no request leaving the origin.
import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { inflateSync } from "node:zlib";
import { unzipSync } from "fflate";
import { chromium, webkit, devices } from "playwright-core";
import { preview } from "vite";

const TD = process.env.TD || `${homedir()}/td`;
const SHOTS = process.env.SHOTS || "";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const PAINT = `${TD}/x1c_paint.3mf`, MW = `${TD}/mw_1471152.3mf`, BADGE = `${TD}/badge_2plates.3mf`;
for (const f of [PAINT, MW, BADGE]) assert(existsSync(f), `missing test file ${f}`);
const server = process.env.BASE ? null : await preview({ configFile: false, build: { outDir: "dist/public" }, preview: { host: "127.0.0.1", port: 0 } });
const base = process.env.BASE || `http://127.0.0.1:${server.httpServer.address().port}`;
const origin = new URL(base).origin;
const csp = readFileSync(new URL("../deploy/Caddyfile.filashift", import.meta.url), "utf8").match(/Content-Security-Policy "([^"]+)"/)[1];
const executablePath = [process.env.CHROME, `${homedir()}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`, "/usr/bin/chromium", "/usr/bin/google-chrome"].find((p) => p && existsSync(p));

// ---- tiny PNG reader (8-bit RGB/RGBA, non-interlaced) for checking rendered colours ----
function png(buf) {
  let p = 8, w = 0, h = 0, ct = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; assert.equal(d[8], 8); assert.equal(d[12], 0); }
    if (type === "IDAT") idat.push(d);
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * bpp), stride = w * bpp;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, bpp, px: out };
}
// Saturated hue families present in a region (red, yellow, green, blue…), ignoring background, grid and shading.
function hues(img, x0, x1, y0, y1, min = 0.03) {
  const bins = new Map();
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * img.w + x) * img.bpp, r = img.px[i] / 255, g = img.px[i + 1] / 255, b = img.px[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn < 0.25 || mx < 0.2) continue;
    let hh = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
    hh = (hh * 60 + 360) % 360;
    const bin = Math.round(hh / 30) % 12;
    bins.set(bin, (bins.get(bin) || 0) + 1);
    n++;
  }
  return [...bins.entries()].filter(([, c]) => c > n * min).map(([b]) => b * 30).sort((a, b) => a - b);
}

let browser;
const results = [];
async function context(engine, opts, { noWebGL = false } = {}) {
  const ctx = await browser.newContext({ serviceWorkers: "block", acceptDownloads: true, ...opts });
  ctx.setDefaultTimeout(30000);
  const bad = [];
  await ctx.route("**/*", async (r) => {
    const u = r.request().url();
    if (!u.startsWith(origin) && !u.startsWith("data:") && !u.startsWith("blob:")) { bad.push(`external request ${u}`); return r.abort(); }
    if (!u.startsWith(origin)) return r.continue(); // data:/blob: (WebKit routes these too)
    if (r.request().method() !== "GET") { bad.push(`${r.request().method()} ${u}`); return r.abort(); }
    const res = await r.fetch();
    // WebKit honours upgrade-insecure-requests even on 127.0.0.1, which breaks the local http server; Chromium exempts localhost
    const policy = engine === webkit && !process.env.BASE ? csp.replace(/;?\s*upgrade-insecure-requests/, "") : csp;
    await r.fulfill({ response: res, headers: { ...res.headers(), "content-security-policy": policy } });
  });
  if (server) await ctx.addInitScript(() => { window.__PRERENDER = true; });
  await ctx.addInitScript(() => document.addEventListener("securitypolicyviolation", (e) => console.error(`CSPV ${e.violatedDirective} ${e.blockedURI}`)));
  if (noWebGL) await ctx.addInitScript(() => {
    const g = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/i.test(t) ? null : g.call(this, t, ...a); };
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => bad.push(`pageerror ${e.message}`));
  page.on("console", (m) => { if (/CSPV|Content Security Policy|Refused to/.test(m.text())) bad.push(m.text()); });
  return { ctx, page, bad };
}
const viewerLoaded = (page) => page.evaluate(() => performance.getEntriesByType("resource").some((e) => /model-viewer/.test(e.name)));
const shot = async (target, name) => { if (SHOTS) await target.screenshot({ path: `${SHOTS}/${name}.png` }); };
async function addPrinter(page, query, id) {
  const det = page.getByTestId("batch-printers");
  if (!(await det.evaluate((d) => d.open))) await det.locator("summary").click();
  await page.getByTestId("button-batch-printer-picker").click();
  await page.getByTestId("input-printer-search").fill(query);
  await page.getByTestId(`option-printer-${id}`).first().click();
}
async function openPreview(page, button) {
  await button.click();
  const dlg = page.getByTestId("dialog-preview");
  await dlg.waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="preview-viewport"][data-ready="1"]') || document.querySelector('[data-testid="preview-no-webgl"]') || document.querySelector('[data-testid="preview-error"]'));
  assert.equal(await page.getByTestId("preview-error").count(), 0, "preview error");
  await page.waitForTimeout(300);
  return dlg;
}

try {
  browser = await chromium.launch({ executablePath, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });

  // 1. single file, single printer: same flow as before, no batch UI
  {
    const { ctx, page, bad } = await context(chromium, { viewport: { width: 1280, height: 900 } });
    await page.goto(`${base}/?lang=en`);
    await page.getByTestId("input-file").setInputFiles(PAINT);
    await page.locator('[data-testid^="button-convert-f"]').first().click();
    const dl = page.waitForEvent("download");
    await page.locator('[data-testid^="button-download-f"]').first().click();
    assert.match((await dl).suggestedFilename(), /\.3mf$/);
    assert.equal(await page.getByTestId("batch-panel").count(), 0);
    assert.equal(await page.getByTestId("button-download-all").count(), 0);
    assert.equal(await viewerLoaded(page), false, "three.js chunk must not load before a preview is opened");
    assert.deepEqual(bad, []);
    results.push("PASS single file + single printer: convert and download unchanged, no batch UI, viewer chunk not loaded");
    await ctx.close();
  }

  // 2. batch 3 files × 3 printers, ZIP, per-item report and preview (desktop, English)
  {
    const { ctx, page, bad } = await context(chromium, { viewport: { width: 1280, height: 900 } });
    await page.goto(`${base}/?lang=en`);
    await page.getByTestId("input-file").setInputFiles([PAINT, MW, BADGE]);
    await page.locator('[data-testid^="button-convert-f"]').nth(2).waitFor();
    await addPrinter(page, "Snapmaker U1", "snapmaker-u1");
    await addPrinter(page, "Prusa CORE One", "prusa-core-one");
    assert.match(await page.getByTestId("batch-summary").innerText(), /3 files × 3 printers = 9 conversions/);
    await shot(page.getByTestId("batch-printers"), "en-1280-batch-printers");
    await page.getByTestId("batch-convert").click();
    await page.waitForFunction(() => /9 of 9 done/.test(document.querySelector('[data-testid="batch-progress-text"]')?.textContent || ""), null, { timeout: 120000 });
    const statuses = await page.locator('[data-testid^="batch-item-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-status")));
    assert.deepEqual(statuses, Array(9).fill("done"), `batch statuses ${statuses}`);
    await page.getByTestId("batch-report-0").click();
    await page.getByTestId("batch-report-list-0").waitFor();
    assert.match(await page.getByTestId("batch-report-list-0").innerText(), /Converted for/);
    const one = page.waitForEvent("download");
    await page.getByTestId("batch-download-4").click();
    assert.match((await one).suggestedFilename(), /\.3mf$/);
    const zd = page.waitForEvent("download");
    await page.getByTestId("batch-download-zip").click();
    const zip = await zd;
    assert.match(zip.suggestedFilename(), /\.zip$/);
    const entries = unzipSync(new Uint8Array(readFileSync(await zip.path())));
    const names = Object.keys(entries);
    assert.equal(names.length, 9, `zip entries: ${names}`);
    assert.equal(new Set(names.map((n) => n.split("/")[0])).size, 3, "one folder per printer");
    for (const n of names) {
      assert.match(n, /\.3mf$/);
      assert(Object.keys(unzipSync(entries[n])).some((k) => k.toLowerCase() === "3d/3dmodel.model"), `${n} is not a 3MF`);
    }
    assert.equal(names.filter((n) => /PrusaSlicer\.3mf$/.test(n)).length, 3, "Prusa printer gets PrusaSlicer output");
    await shot(page.getByTestId("batch-panel"), "en-1280-batch-panel");
    // multi-file "Download all" is a ZIP too
    assert.equal(await viewerLoaded(page), false);

    // preview of the 4-colour painted project, converted for the 1-filament CORE One: before shows 4 hues, after 1
    const dlg = await openPreview(page, page.getByTestId("batch-preview-2"));
    assert(await viewerLoaded(page), "viewer chunk loads when the preview opens");
    assert.equal(await page.getByTestId("preview-no-webgl").count(), 0, "WebGL should work in Chromium");
    const vp = page.getByTestId("preview-viewport");
    const img = png(await vp.screenshot());
    const left = hues(img, 0, img.w >> 1, 0, img.h), right = hues(img, img.w >> 1, img.w, 0, img.h);
    assert(left.length >= 4, `before view should show red, yellow, green and blue paint, got hues ${left}`);
    assert(right.length <= 2, `after view (1 slot) should show one colour, got hues ${right}`);
    await shot(dlg, "en-1280-preview-x1c-paint-coreone-both");
    await page.getByTestId("preview-mode-after").click();
    await page.waitForTimeout(200);
    await shot(dlg, "en-1280-preview-x1c-paint-coreone-after");
    await page.keyboard.press("Escape");
    results.push(`PASS batch 3×3: 9/9 converted, per-item report + download, ZIP with 9 valid 3MFs in 3 folders; preview hues before ${left} / after ${right}`);

    // file-card previews: MakerWorld model and the two-plate badge (plate switch)
    const cards = page.locator('[data-testid^="button-adjust-"]');
    void cards;
    let d2 = await openPreview(page, page.locator('[data-testid^="button-preview-"]').nth(1));
    const mwImg = png(await page.getByTestId("preview-viewport").screenshot());
    assert(hues(mwImg, 0, mwImg.w >> 1, 0, mwImg.h, 0.002).length >= 2, "MakerWorld model shows its colours (yellow body, orange beak)");
    await shot(d2, "en-1280-preview-mw1471152-both");
    await page.keyboard.press("Escape");
    d2 = await openPreview(page, page.locator('[data-testid^="button-preview-"]').nth(2));
    await shot(d2, "en-1280-preview-badge-plate1");
    await page.getByTestId("preview-plate-2").click();
    await page.waitForFunction(() => document.querySelector('[data-testid="preview-viewport"][data-ready="1"]'));
    await page.waitForTimeout(200);
    await shot(d2, "en-1280-preview-badge-plate2");
    await page.keyboard.press("Escape");
    assert.deepEqual(bad, []);
    results.push("PASS file-card previews: MakerWorld model and two-plate badge (plate switch), no CSP violations or external requests");
    await ctx.close();
  }

  // 3. limits: 10 files, 10 printers
  {
    const { ctx, page, bad } = await context(chromium, { viewport: { width: 1280, height: 900 } });
    await page.goto(`${base}/?lang=en`);
    const buf = readFileSync(PAINT);
    await page.getByTestId("input-file").setInputFiles(Array.from({ length: 12 }, (_, i) => ({ name: `paint-${i + 1}.3mf`, mimeType: "model/3mf", buffer: buf })));
    await page.getByTestId("text-load-error").waitFor();
    assert.match(await page.getByTestId("text-load-error").innerText(), /Up to 10 files at a time: 2 files were not added/);
    await page.waitForFunction(() => document.querySelectorAll('[data-testid^="card-file-"]').length >= 10);
    await page.waitForTimeout(300);
    assert.equal(await page.locator('[data-testid^="card-file-"]').count(), 10);
    const ids = ["snapmaker-u1", "flashforge-ad5x", "bambu-lab-x1-carbon", "bambu-lab-a1", "bambu-lab-p1s", "creality-k2-plus", "prusa-core-one", "elegoo-centauri-carbon-2", "anycubic-kobra-3"];
    const index = await (await page.request.get(`${base}/profiles/index.json`)).json();
    for (const id of ids) await addPrinter(page, index.find((p) => p.id === id).model, id);
    await page.getByTestId("batch-printer-limit").waitFor();
    assert.equal(await page.getByTestId("button-batch-printer-picker").count(), 0);
    assert.match(await page.getByTestId("batch-summary").innerText(), /10 files × 10 printers = 100 conversions/);
    assert.deepEqual(bad, []);
    results.push("PASS limits: 12 files dropped → 10 added with a message; 10 printers max with a message");
    await ctx.close();
  }

  // 4. no WebGL: graceful fallback with the colour list
  {
    const { ctx, page, bad } = await context(chromium, { viewport: { width: 1280, height: 900 } }, { noWebGL: true });
    await page.goto(`${base}/?lang=en`);
    await page.getByTestId("input-file").setInputFiles(PAINT);
    const dlg = await openPreview(page, page.locator('[data-testid^="button-preview-"]').first());
    await page.getByTestId("preview-no-webgl").waitFor();
    assert.equal(await page.getByTestId("preview-legend").locator("li").count(), 4);
    await shot(dlg, "en-1280-preview-no-webgl");
    assert.deepEqual(bad, []);
    results.push("PASS no-WebGL fallback: message and before/after colour list");
    await ctx.close();
  }

  // 5. mobile 390 px, English and Spanish (Chromium Pixel 7)
  for (const lang of ["en", "es"]) {
    const { ctx, page, bad } = await context(chromium, { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } });
    await page.goto(`${base}/?lang=${lang}`);
    await page.getByTestId("input-file").setInputFiles([PAINT, BADGE]);
    await page.locator('[data-testid^="button-convert-f"]').nth(1).waitFor();
    await addPrinter(page, "Snapmaker U1", "snapmaker-u1");
    await page.getByTestId("batch-convert").click();
    await page.waitForFunction(() => /4 (of|de) 4/.test(document.querySelector('[data-testid="batch-progress-text"]')?.textContent || ""), null, { timeout: 120000 });
    await page.getByTestId("batch-report-0").click();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.equal(width, 390, `${lang} 390px: page is ${width}px wide`);
    await shot(page.getByTestId("batch-printers"), `${lang}-390-batch-printers`);
    await shot(page.getByTestId("batch-panel"), `${lang}-390-batch-panel`);
    const text = await page.getByTestId("batch-panel").innerText();
    if (lang === "es") {
      assert.match(text, /Conversión por lotes/);
      assert.match(text, /Descargar todo \(\.zip\)/);
      for (const en of ["Batch conversion", "Download all", "Waiting", "Ready", "Report", "Preview"]) assert(!text.includes(en), `untranslated "${en}" in the Spanish batch panel`);
    }
    const dlg = await openPreview(page, page.locator('[data-testid^="button-preview-"]').first());
    const box = await dlg.boundingBox();
    assert(box.x >= 0 && box.x + box.width <= 391, `${lang} 390px: preview dialog outside the viewport`);
    const vt = await dlg.innerText();
    if (lang === "es") for (const en of ["Before and after colours", "Reset view", "Drag to rotate"]) assert(!vt.includes(en), `untranslated "${en}" in the Spanish preview`);
    await shot(dlg, `${lang}-390-preview-both`);
    await page.getByTestId("preview-mode-after").click();
    await page.waitForTimeout(200);
    await shot(dlg, `${lang}-390-preview-after`);
    await page.keyboard.press("Escape");
    if (lang === "es") {
      // desktop Spanish screenshots
      await page.setViewportSize({ width: 1280, height: 900 });
      await shot(page.getByTestId("batch-panel"), "es-1280-batch-panel");
      const d = await openPreview(page, page.locator('[data-testid^="button-preview-"]').first());
      await shot(d, "es-1280-preview-both");
      await page.keyboard.press("Escape");
    }
    assert.deepEqual(bad, []);
    results.push(`PASS mobile 390px ${lang}: batch 2×2, report, preview dialog inside the viewport${lang === "es" ? ", Spanish text" : ""}`);
    await ctx.close();
  }
  await browser.close();

  // 6. WebKit iPhone at 320 px: layout, preview renders or falls back, no errors
  browser = await webkit.launch();
  {
    const { ctx, page, bad } = await context(webkit, { ...devices["iPhone 13"], viewport: { width: 320, height: 700 } });
    await page.goto(`${base}/?lang=es`);
    await page.getByTestId("input-file").setInputFiles(PAINT);
    await addPrinter(page, "Snapmaker U1", "snapmaker-u1");
    await page.getByTestId("batch-panel").waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
    const dlg = await openPreview(page, page.locator('[data-testid^="button-preview-"]').first());
    const box = await dlg.boundingBox();
    assert(box.x >= 0 && box.x + box.width <= 321);
    const gl = (await page.getByTestId("preview-no-webgl").count()) ? "fallback" : "WebGL";
    await shot(dlg, "es-320-webkit-preview");
    assert.deepEqual(bad, []);
    results.push(`PASS WebKit 320px es: batch panel and preview (${gl}) fit, no errors`);
    await ctx.close();
  }
  for (const r of results) console.log(r);
} finally {
  await browser?.close();
  await server?.httpServer.close();
}
