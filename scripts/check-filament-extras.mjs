// Per-colour "Find matching filament" hand-off, colour-closeness order, honest no-match state,
// and private "Watch this search" price notes (localStorage only) on the built site.
//   node scripts/check-filament-extras.mjs                 # deterministic fixture feed
//   FEED=/tmp/filament.json node scripts/check-filament-extras.mjs   # local copy of the live feed
//   SHOTS=/tmp/shots/feat/filament-extras node scripts/check-filament-extras.mjs   # also save screenshots
// BASE= unset serves dist/public with vite preview (like release.sh). The cheaper feed is derived from FEED.
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { chromium } from "playwright-core";
import { preview } from "vite";

const WATCH_KEY = "filashift-watched-searches";
const spool = (o) => ({ b: "Fixture", r: "Fixture", v: "", x: [], f: "PLA", m: "PLA", d: 1.75, kg: 1, n: 1, form: "spool", was: null, ok: true, ...o, ppk: o.ppk ?? o.p });
const fixture = () => {
  const items = [
    spool({ r: "Store A", t: "Silk PLA Silver", c: ["Silver"], x: ["#c4c4c4"], m: "PLA Silk", p: 21.99, u: "https://a.example.invalid/p/silk-silver?variant=1" }),
    spool({ r: "Store B", t: "Silk PLA Grey", c: ["Grey"], x: ["#9a9a9a"], m: "PLA Silk", p: 18.99, u: "https://b.example.invalid/p/silk-grey?variant=2" }),
    spool({ r: "Store C", t: "Silk PLA Gold", c: ["Gold"], x: ["#c9a227"], m: "PLA Silk", p: 15.99, u: "https://c.example.invalid/p/silk-gold?variant=3" }),
    spool({ r: "Store A", t: "PLA Blue", c: ["Blue"], x: ["#1e7fd8"], p: 16.99, u: "https://a.example.invalid/p/pla-blue?variant=4" }),
    spool({ r: "Store B", t: "PLA Sky Blue", c: ["Sky Blue"], p: 14.99, u: "https://b.example.invalid/p/pla-sky?variant=5" }),
    spool({ r: "Store C", t: "PLA Red", c: ["Red"], x: ["#e43b2f"], p: 17.49, u: "https://c.example.invalid/p/pla-red?variant=6" }),
    spool({ r: "Store A", t: "PLA Orange", c: ["Orange"], x: ["#f27a1a"], p: 13.99, u: "https://a.example.invalid/p/pla-orange?variant=7" }),
    spool({ r: "Store B", t: "PLA-CF Black", c: ["Black"], x: ["#141414"], m: "PLA-CF", p: 29.99, u: "https://b.example.invalid/p/plcf-black?variant=8" }),
    spool({ r: "Store C", t: "PLA Red 3 kg", c: ["Red"], x: ["#d42a2a"], kg: 3, n: 3, form: "pack", p: 44.97, ppk: 14.99, u: "https://c.example.invalid/p/pla-red-3?variant=9" }),
  ];
  return { schema: 2, updated: new Date().toISOString(), count: items.length, stores: { "Store A": 3, "Store B": 3, "Store C": 3 }, items };
};
const feed = process.env.FEED ? JSON.parse(await readFile(process.env.FEED, "utf8")) : fixture();
feed.updated = new Date().toISOString(); // keep "updated N min ago" stable for screenshots
// Every offer $3/kg cheaper: the lowest price per kg of any search drops by exactly $3.00.
const cheaper = { ...feed, items: feed.items.map((i) => ({ ...i, ppk: Math.round((i.ppk - 3) * 100) / 100, p: Math.round((i.p - 3 * i.kg) * 100) / 100 })) };

// Project fixture: the bundled PrusaSlicer nameplate with a Silk preset in slot 1 and a plain PLA in slot 2.
const zip = unzipSync(new Uint8Array(await readFile("client/public/samples/filashift-nameplate.3mf")));
zip["Metadata/Slic3r_PE.config"] = strToU8(strFromU8(zip["Metadata/Slic3r_PE.config"])
  .replace(/^; filament_settings_id = .*$/m, '; filament_settings_id = "Generic PLA Silk @PGIS";"Prusament PLA @PGIS"')
  .replace(/^; (extruder|filament)_colour = .*$/gm, "; $1_colour = #C0C0C0;#1E7FD8"));
const project = { name: "silk-nameplate.3mf", mimeType: "application/octet-stream", buffer: Buffer.from(zipSync(zip)) };

const server = process.env.BASE ? null : await preview({ configFile: false, build: { outDir: "dist/public" }, preview: { host: "127.0.0.1", port: 0 } });
const base = process.env.BASE || `http://127.0.0.1:${server.httpServer.address().port}`;
const origin = new URL(base).origin;
const shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const executablePath = [process.env.CHROME, `${homedir()}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`, "/usr/bin/chromium", "/usr/bin/google-chrome"].find((p) => p && existsSync(p));
const browser = await chromium.launch({ executablePath });

async function context(width, data = feed) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "en-US", serviceWorkers: "block" });
  ctx.setDefaultTimeout(15000);
  if (!process.env.BASE) await ctx.addInitScript(() => { window.__PRERENDER = true; });
  const state = { data, requests: [], errors: [] };
  await ctx.route("**/data/filament.json", (r) => r.fulfill({ json: state.data }));
  await ctx.route("**/data/config.json", (r) => r.fulfill({ json: {} }));
  ctx.on("request", (r) => state.requests.push([r.method(), r.url()]));
  ctx.on("page", (p) => p.on("pageerror", (e) => state.errors.push(e.message)));
  return { ctx, state };
}
function assertPrivate(state, what) {
  const foreign = state.requests.filter(([m, u]) => !u.startsWith(origin) && !u.startsWith("blob:") && !u.startsWith("data:"));
  assert.deepEqual(foreign, [], `${what}: third-party requests`);
  assert.deepEqual(state.requests.filter(([m]) => m !== "GET"), [], `${what}: non-GET requests`);
  assert.deepEqual(state.errors, [], `${what}: page errors`);
}
const noOverflow = async (page, what) => assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${what}: horizontal overflow`);
const shot = async (page, name) => shots && page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });

async function convert(page, printerId, query) {
  await page.goto(`${base}/`);
  await page.getByTestId("button-printer-picker").click();
  await page.getByTestId("input-printer-search").fill(query);
  await page.getByTestId(`option-printer-${printerId}`).first().click();
  await page.getByTestId("input-file").setInputFiles(project);
  await page.locator('[data-testid^="button-convert-"]').first().click();
  await page.locator('[data-testid^="shop-"][data-testid$="-row-0-find"]').waitFor();
}

try {
  // 1. Converter hand-off: every colour row gets a "Find matching filament" link with material, subtype, diameter, colour, feeder.
  for (const [width, lang] of [[1280, "en"], [390, "es"], [390, "en"], [1280, "es"]]) {
    const { ctx, state } = await context(width, feed);
    const page = await ctx.newPage();
    if (lang === "es") await page.addInitScript(() => localStorage.setItem("filashift-lang", "es"));
    await convert(page, "bambu-lab-x1-carbon", "X1 Carbon");
    const rows = page.locator('[data-testid^="shop-"][data-testid*="-row-"][data-testid$="-find"]');
    assert.equal(await rows.count(), 2, "one find link per colour");
    const params = await Promise.all((await rows.all()).map(async (a) => new URL(await a.getAttribute("href"), base).searchParams));
    assert.deepEqual(Object.fromEntries(params[0]), { f: "PLA", d: "1.75", color: "c0c0c0", t: "PLA Silk", feeder: "ams", pack: "single", sort: "colour" });
    assert.deepEqual(Object.fromEntries(params[1]), { f: "PLA", d: "1.75", color: "1e7fd8", feeder: "ams", pack: "single", sort: "colour" });
    const single = new URL(await page.locator('[data-testid$="-row-0-single"]').getAttribute("href"), base).searchParams;
    assert.equal(single.get("t"), "PLA Silk"); assert.equal(single.get("feeder"), "ams"); assert.equal(single.get("sort"), null);
    const feederText = await page.locator('[data-testid$="-row-0-feeder"]').innerText();
    assert.equal(feederText, lang === "es" ? "Comprobación de bobina: AMS original de Bambu Lab" : "Reel size check: original Bambu Lab AMS");
    assert.equal(await page.locator('[data-testid$="-row-0-find"]').innerText(), lang === "es" ? "Buscar filamento a juego" : "Find matching filament");
    await noOverflow(page, `converter ${width}`);
    await page.locator('[data-testid$="-row-0-find"]').scrollIntoViewIfNeeded();
    if (shots) await page.locator('[data-testid^="shop-"][data-testid$="-toggle"]').first().locator("..").screenshot({ path: `${shots}/converter-${width}-${lang}.png` });
    const popup = page.waitForEvent("popup");
    await page.locator('[data-testid$="-row-0-find"]').click();
    const finder = await popup;
    await finder.getByTestId("offer-1").waitFor();
    assert.equal(await finder.getByTestId("select-sort").innerText(), lang === "es" ? "Color más parecido" : "Closest colour");
    assert.equal(await finder.getByTestId("select-type").innerText(), "PLA Silk");
    assert.equal(await finder.getByTestId("feeder").inputValue(), "ams");
    const des = await finder.locator('[data-testid^="colour-"]').evaluateAll((els) => els.map((e) => Number(e.dataset.de)));
    assert(des.length > 0 && des.every((d, i) => !i || Math.round(d * 2) >= Math.round(des[i - 1] * 2)), `colour order ${des}`);
    assert(des.every((d) => d <= 25), "offers past ΔE 25 must be hidden");
    assertPrivate(state, `converter ${width}`);
    console.log(`PASS ${width}px ${lang}: 2/2 colours carry f/t/d/color/feeder; finder sorted by ΔE (${des.slice(0, 4).map((d) => d.toFixed(1)).join(", ")}…)`);
    await ctx.close();
  }
  // Snapmaker U1 target carries the U1 reel label; a non-AMS target carries none.
  for (const [id, q, feeder] of [["snapmaker-u1", "Snapmaker U1", "u1"], ["bambu-lab-a1", "Bambu Lab A1", null]]) {
    const { ctx, state } = await context(1280, feed);
    const page = await ctx.newPage();
    await convert(page, id, q);
    const p = new URL(await page.locator('[data-testid$="-row-0-find"]').getAttribute("href"), base).searchParams;
    assert.equal(p.get("feeder"), feeder, id);
    assertPrivate(state, id);
    console.log(`PASS ${id}: feeder=${feeder}`);
    await ctx.close();
  }

  // 2. Honest colour states (fixture feed, deterministic).
  {
    const { ctx, state } = await context(390, fixture());
    const page = await ctx.newPage();
    await page.goto(`${base}/filament?pack=single&f=PLA&t=PLA-CF&color=ff00ff`);
    await page.getByTestId("no-close-colour").waitFor();
    assert.equal(await page.locator('[data-testid^="offer-"]').count(), 0);
    await shot(page, "finder-no-close-390-en");
    await page.getByTestId("show-all-colours").click();
    await page.getByTestId("offer-1").waitFor();
    assert.equal(await page.getByTestId("no-close-colour").count(), 0);
    await page.goto(`${base}/filament?pack=single&f=PLA&t=PLA&color=e6004c&sort=colour`); // only red/orange within ΔE 25, none within 12
    await page.getByTestId("offer-1").waitFor();
    assert.match(await page.getByTestId("no-close-colour").innerText(), /nearest ones are listed/);
    assert.match(await page.getByTestId("colour-1").innerText(), /Noticeably different/);
    await page.goto(`${base}/filament?pack=single&f=PLA&color=e63a2e&sort=colour`);
    await page.getByTestId("offer-1").waitFor();
    assert.equal(await page.getByTestId("no-close-colour").count(), 0);
    assert.match(await page.getByTestId("colour-1").innerText(), /^Very close\s*ΔE 0\.\d/);
    assertPrivate(state, "colour states");
    console.log("PASS colour states: no match (empty), only distant matches, very close match");
    await ctx.close();
  }

  // 3. Watch this search: save, cheaper feed on return, list with remove and clear-all, EN/ES, 320/390/1280.
  for (const [width, lang] of [[320, "en"], [390, "es"], [1280, "en"], [1280, "es"], [390, "en"]]) {
    const { ctx, state } = await context(width, feed);
    const page = await ctx.newPage();
    const url = `${base}/filament?pack=single&f=PLA&d=1.75&color=e63a2e&sort=ppk${lang === "es" ? "&lang=es" : ""}`;
    await page.goto(url);
    await page.getByTestId("offer-1").waitFor();
    assert.equal(await page.getByTestId("watched-list").count(), 0);
    await page.getByTestId("watch-search").click();
    const saved = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), WATCH_KEY));
    assert.equal(saved.length, 1);
    // sorted by price per kg: the first offer within ΔE 12 is the lowest close match
    const rows = await page.locator('[data-testid^="offer-"]').evaluateAll((els) => els.map((e) => ({
      de: Number(e.querySelector('[data-testid^="colour-"]')?.dataset.de ?? 99), ppk: Number(e.querySelector(".font-mono.text-sm").textContent.replace(/[^\d.]/g, "")) })));
    const firstClose = rows.find((r) => r.de <= 12);
    assert(firstClose, "a close match exists");
    assert.equal(saved[0].ppk, firstClose.ppk, "saved price is the lowest price per kg among close colour matches");
    assert.deepEqual(saved[0].s, { f: "PLA", t: "all", b: "all", d: "1.75", pack: "single", color: "#e63a2e", q: "", stock: true });
    assert(Math.abs(Date.parse(saved[0].at) - Date.now()) < 60000);
    assert.equal(await page.getByTestId("watch-status-current").getAttribute("data-state"), "same");
    // a second, different search
    await page.getByRole("button", { name: lang === "es" ? "Comparar precios por volumen" : "Compare bulk prices", exact: true }).click();
    await page.getByTestId("watch-search").click();
    assert.equal(JSON.parse(await page.evaluate((k) => localStorage.getItem(k), WATCH_KEY)).length, 2);

    // return visit with the cheaper feed
    state.data = cheaper;
    await page.goto(url);
    await page.getByTestId("offer-1").waitFor();
    const was = saved[0].ppk.toFixed(2), now = (Math.round((saved[0].ppk - 3) * 100) / 100).toFixed(2);
    const expected = lang === "es" ? `Más barato que cuando la guardaste (antes $${was}/kg, ahora $${now}/kg)` : `Cheaper than when you saved it (was $${was}/kg, now $${now}/kg)`;
    assert.equal(await page.getByTestId("watch-status-current").innerText(), expected);
    assert.equal(await page.getByTestId("watched-list").locator('[data-testid^="watched-status-"][data-state="cheaper"]').count(), 2);
    assert.equal(await page.getByTestId("watched-list").getByText(expected, { exact: true }).count(), 1);
    if (lang === "es") {
      assert.equal(await page.getByRole("heading", { name: "Búsquedas seguidas" }).count(), 1);
      assert.equal(await page.getByTestId("unwatch-search").innerText(), "Dejar de seguir");
      assert.match(await page.getByTestId("watched-0").innerText(), /Guardada el \d{4}-\d\d-\d\d/);
    }
    await noOverflow(page, `watch ${width} ${lang}`);
    await shot(page, `finder-watch-${width}-${lang}`);
    // "Show" restores the bulk search
    await page.getByTestId("watched-open-0").click();
    assert.equal(await page.getByTestId("select-pack").innerText(), lang === "es" ? "Packs de 2 kg o más" : "Bulk, 2 kg and up");
    await page.getByTestId("watched-remove-0").click();
    assert.equal(await page.getByTestId("watched-list").locator("li").count(), 1);
    assert.equal(JSON.parse(await page.evaluate((k) => localStorage.getItem(k), WATCH_KEY)).length, 1);
    await page.getByTestId("watched-clear").click();
    assert.equal(await page.getByTestId("watched-list").count(), 0);
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), WATCH_KEY), null);
    const dataFetches = state.requests.filter(([, u]) => u.includes("/data/")).map(([, u]) => new URL(u).pathname);
    assert(dataFetches.every((p) => p === "/data/filament.json" || p === "/data/config.json"), dataFetches.join());
    assertPrivate(state, `watch ${width} ${lang}`);
    console.log(`PASS ${width}px ${lang}: watch saved $${was}/kg, cheaper feed shows now $${now}/kg, show/remove/clear-all, no overflow`);
    await ctx.close();
  }

  // 4. Privacy page mentions the local storage in both languages.
  {
    const { ctx } = await context(390, feed);
    const page = await ctx.newPage();
    await page.goto(`${base}/privacy`);
    assert.match(await page.locator("main").innerText(), /Watch this search.*only on that device/s);
    await page.goto(`${base}/privacy?lang=es`);
    assert.match(await page.locator("main").innerText(), /Seguir esta búsqueda.*solo en ese dispositivo/s);
    console.log("PASS privacy text EN/ES");
    await ctx.close();
  }
} finally {
  await browser.close();
  await server?.close();
}
