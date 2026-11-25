// Browser timing and peak memory for big projects, through the real UI and worker.
// node scripts/bench-browser.mjs FILE.3mf [printer-id ...]      env: DIST=dist/public  THROTTLE=4  BASE=
// For every printer: load the site, pick the printer, add the file (time to "ready" = read + analyse),
// convert (time to the download button), and sample the browser's total RSS (all its processes)
// every 100 ms; peak minus the idle level after page load is reported. Prusa printers use the default
// PrusaSlicer output. CPU throttling uses Chromium's DevTools emulation, which Chromium only supports
// for pages ("Operation is only supported for pages, not workers"), so with THROTTLE>1 the converter
// worker script is run on the page's main thread through a stand-in Worker class (same bundle, same
// messages; the UI just blocks while it works). THREAD=worker keeps the real worker (unthrottled).
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { preview } from "vite";

const [file, ...printers] = process.argv.slice(2);
if (!file) throw Error("usage: bench-browser.mjs FILE.3mf [printer ...]");
const rate = +(process.env.THROTTLE || 4);
const server = process.env.BASE ? null : await preview({ configFile: false, build: { outDir: process.env.DIST || "dist/public" }, preview: { host: "127.0.0.1", port: 0 } });
const base = process.env.BASE || `http://127.0.0.1:${server.httpServer.address().port}`;
const executablePath = [process.env.CHROME, `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`, "/usr/bin/chromium"].find((p) => p && existsSync(p));
const bs = await chromium.launchServer({ executablePath });
const root = bs.process().pid;
const tree = () => {
  // pids in the browser's process tree, total RSS in MB
  const kids = new Map();
  for (const d of (globalThis.process.platform === "linux" ? readdirProc() : [])) {
    try { const st = readFileSync(`/proc/${d}/stat`, "utf8"); const pp = +st.slice(st.lastIndexOf(")") + 2).split(" ")[1]; if (!kids.has(pp)) kids.set(pp, []); kids.get(pp).push(+d); } catch { /* gone */ }
  }
  let rss = 0;
  const walk = (p) => { try { rss += +readFileSync(`/proc/${p}/statm`, "utf8").split(" ")[1] * 4096; } catch { /* gone */ } for (const k of kids.get(p) || []) walk(k); };
  walk(root);
  return rss / 1048576;
};
import { readdirSync } from "node:fs";
function readdirProc() { return readdirSync("/proc").filter((d) => /^\d+$/.test(d)); }

const browser = await chromium.connect(bs.wsEndpoint());
try {
  for (const printer of printers.length ? printers : ["bambu-lab-x1-carbon"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const throttle = async (target) => { const s = await ctx.newCDPSession(target); await s.send("Emulation.setCPUThrottlingRate", { rate }); };
    page.on("worker", (w) => { throttle(w).catch(() => {}); });
    if (rate > 1) await throttle(page);
    if (rate > 1 && process.env.THREAD !== "worker") await page.addInitScript(() => {
      // Stand-in Worker: runs the converter bundle (a classic IIFE using `self`) on the main thread.
      window.Worker = class {
        constructor(url) {
          this.onmessage = null; this.onerror = null;
          const me = this;
          this.ready = fetch(url).then((r) => r.text()).then((code) => {
            const scope = { onmessage: null, postMessage: (m) => setTimeout(() => me.onmessage?.({ data: m })) };
            new Function("self", code)(scope);
            this.scope = scope;
          });
        }
        postMessage(m) { this.ready.then(() => setTimeout(() => this.scope.onmessage({ data: m }))).catch((e) => this.onerror?.(e)); }
        terminate() {}
      };
    });
    await page.goto(`${base}/?lang=en`);
    await page.getByTestId("text-tested-note").waitFor();
    await page.getByTestId("button-printer-picker").click();
    const profile = JSON.parse(readFileSync(`client/public/profiles/${printer}.json`, "utf8"));
    await page.getByTestId("input-printer-search").fill(profile.model);
    await page.getByTestId(`option-printer-${printer}`).first().click();
    await page.waitForTimeout(500);
    const idle = tree();
    let peak = idle, on = true;
    const sampler = (async () => { while (on) { peak = Math.max(peak, tree()); await new Promise((r) => setTimeout(r, 100)); } })();
    const t0 = Date.now();
    await page.getByTestId("input-file").setInputFiles(file);
    const conv = page.locator('[data-testid^="button-convert-f"]').first();
    await conv.waitFor({ timeout: 600000 });
    await page.waitForFunction(() => { const b = document.querySelector('[data-testid^="button-convert-f"]'); return b && !b.disabled; }, null, { timeout: 600000 });
    const tA = Date.now() - t0;
    const peakA = peak;
    const t1 = Date.now();
    await conv.click();
    await page.locator('[data-testid^="button-download-f"]').first().waitFor({ timeout: 600000 });
    const tC = Date.now() - t1;
    on = false;
    await sampler;
    const err = await page.locator('[role="alert"]').allInnerTexts().catch(() => []);
    console.log(JSON.stringify({ file: file.split("/").pop(), printer, throttle: rate, thread: rate > 1 && process.env.THREAD !== "worker" ? "main" : "worker", readyMs: tA, convertMs: tC, peakAnalyseMB: Math.round(peakA - idle), peakMB: Math.round(peak - idle), errors: [...errors, ...err.filter((t) => /fail|memory/i.test(t))] }));
    await ctx.close();
  }
} finally {
  await browser.close();
  await bs.close();
  await server?.close();
}
