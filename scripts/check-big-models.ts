// Big-model safety and speed check (Node, no private files needed).
// npx tsx scripts/check-big-models.ts [--tris 300000] [--keep DIR]
// 1. ZIP writer: streamed and buffered entries unzip to the same bytes as fflate's reference, raw-copied
//    source entries keep their bytes, edited entries are recompressed, CRCs are checked.
// 2. Paint scan: eachPaint/scanPaint agree with a plain regex reference.
// 3. Large-model warning thresholds.
// 4. A synthetic painted project (scripts/make-stress-3mf.ts, multi-plate) is analysed and converted to
//    the Bambu X1 Carbon, Snapmaker U1 and Prusa MK4S MMU3 (PrusaSlicer output). Every output must
//    reopen, keep every triangle and painted triangle, be deterministic apart from timestamps, and stay
//    within generous time and memory budgets (scaled by triangle count) so regressions are caught.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { readArchive } from "../client/src/engine/archive";
import { Streamed, writeZip, crc32 } from "../client/src/engine/zip-out";
import { eachPaint, scanPaint } from "../client/src/engine/paint";
import { analyze, convert, defaultMapping } from "../client/src/engine/engine";
import { bigModelWarning, ANY_DEVICE_TRIANGLES, SMALL_DEVICE_TRIANGLES } from "../client/src/lib/big-model";
import { loadPrusa } from "./prusa-data";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const TRIS = +opt("tris", "300000");
const dir = args.includes("--keep") ? opt("keep", "") : mkdtempSync(join(tmpdir(), "fs-big-"));
const ok = (m: string) => console.log(`ok  ${m}`);

// ---------- 1. ZIP writer ----------
{
  const text = "<vertex x=\"1.5\" y=\"2\" z=\"3\"/>\n".repeat(200000) + "é✓";
  const small = strToU8("<?xml version=\"1.0\"?><x/>");
  const st = new Streamed(4);
  for (let i = 0; i < text.length; i += 70001) st.push(text.slice(i, i + 70001));
  const out = writeZip({ "3D/big.model": st, "a/ü.txt": small, "b/stored": [small, { level: 0 }], "empty": new Uint8Array(0) }, 6);
  const u = unzipSync(out);
  assert.equal(strFromU8(u["3D/big.model"]), text);
  assert.deepEqual(u["a/ü.txt"], small);
  assert.deepEqual(u["b/stored"], small);
  assert.equal(u["empty"].length, 0);
  assert.deepEqual(Object.keys(u), ["3D/big.model", "a/ü.txt", "b/stored", "empty"]);
  // CRC against fflate's reference zip (same algorithm, read back from its central directory)
  const ref = zipSync({ x: small });
  const crcRef = new DataView(ref.buffer).getUint32(14, true);
  assert.equal(crc32(small) >>> 0, crcRef >>> 0);
  // raw copy: untouched source entries reuse their compressed bytes; a changed entry is recompressed
  const srcZip = zipSync({ "keep.model": strToU8(text), "edit.config": small }, { level: 6 });
  const src = readArchive(srcZip);
  const edited = strToU8("changed");
  const out2 = writeZip({ "keep.model": src["keep.model"], "edit.config": edited }, 6);
  const u2 = unzipSync(out2);
  assert.equal(strFromU8(u2["keep.model"]), text);
  assert.equal(strFromU8(u2["edit.config"]), "changed");
  const csize = (z: Uint8Array) => new DataView(z.buffer, z.byteOffset).getUint32(18, true);
  assert.equal(csize(out2), csize(srcZip), "raw-copied entry should keep its compressed size");
  // a copy of the bytes that was modified in place must not be raw-copied with a stale CRC
  const mutated = src["keep.model"]; mutated[0] ^= 1;
  assert.equal(unzipSync(writeZip({ k: mutated }))["k"][0], mutated[0]);
  ok("ZIP writer: streamed, buffered, stored, empty, UTF-8 names, raw copy, recompress on change");
}

// ---------- 2. Paint scan ----------
{
  const tris: string[] = [];
  for (let i = 0; i < 5000; i++) tris.push(`<triangle v1="0" v2="1" v3="2"${i % 3 ? ` paint_color="${["4", "8", "0C", "1C", "3", "xyz"][i % 6]}"` : ""}/>`);
  const t = tris.join("\n");
  const ref = (t.match(/paint_color="[0-9A-Fa-f]*"/g) || []).length; // non-hex values are not paint (as on master)
  let n = 0; eachPaint(t, () => n++);
  assert.equal(n, ref);
  const sp = scanPaint(t);
  const total = [...sp.counts.values()].reduce((a, b) => a + b, 0);
  assert.ok(total > 0);
  ok(`paint scan: ${ref} attributes seen once each, ${sp.bad} malformed`);
}

// ---------- 3. Warning thresholds ----------
{
  assert.equal(bigModelWarning(100_000, 5e6, true), null);
  assert.equal(bigModelWarning(SMALL_DEVICE_TRIANGLES, 5e6, false), null);
  assert.match(bigModelWarning(SMALL_DEVICE_TRIANGLES, 5e6, true)!, /^Large project for this device \(about 600 thousand triangles\)/);
  assert.match(bigModelWarning(ANY_DEVICE_TRIANGLES + 1, 5e6, false)!, /^Very large project \(about 3\.0 million triangles\)/);
  assert.match(bigModelWarning(undefined, 80 * 1048576, true)!, /\(a 80 MB file\)/);
  ok("large-model warning thresholds");
}

// ---------- 4. Synthetic big project ----------
const file = join(dir, `stress_${TRIS}.3mf`);
const g = spawnSync(process.execPath, ["--import", "tsx", "scripts/make-stress-3mf.ts", file, "--tris", String(TRIS), "--plates", "3", "--objects", "2", "--paint", "0.7", "--template", "none"], { encoding: "utf8" });
assert.equal(g.status, 0, g.stderr);
const generated = +(/: (\d+) triangles/.exec(g.stdout)?.[1] || 0);
const bytes = new Uint8Array(readFileSync(file));
const countIn = (entries: Record<string, Uint8Array>, re: RegExp) => {
  let n = 0;
  for (const [k, v] of Object.entries(entries)) if (/\.model$/i.test(k)) n += (strFromU8(v).match(re) || []).length;
  return n;
};
const srcPainted = countIn(unzipSync(bytes), /<triangle [^>]*paint_color="[^"]+"/g);
const scale = Math.max(1, TRIS / 300000);
const budget = { analyse: 6000 * scale, convert: 8000 * scale, prusa: 15000 * scale, heapMB: 900 * scale };
const t0 = performance.now();
const L = analyze(bytes, "stress.3mf");
const tA = performance.now() - t0;
assert.ifError(L.analysis.error);
assert.equal(L.analysis.triangles, generated);
assert.equal(L.analysis.plates.length, 3);
assert.ok(L.analysis.hasPaint);
assert.ok(tA < budget.analyse, `analyse took ${tA | 0} ms (budget ${budget.analyse})`);
ok(`analyse ${generated} triangles, 3 plates: ${tA | 0} ms`);

for (const target of ["bambu-lab-x1-carbon", "snapmaker-u1", "prusa-mk4s-mmu3+prusa"]) {
  const [id, mode] = target.split("+");
  const P = JSON.parse(readFileSync(`client/public/profiles/${id}.json`, "utf8"));
  const prusa = mode === "prusa" ? loadPrusa(id) : undefined;
  const opts = { map: defaultMapping(L.analysis, P.slots), keepSpeeds: false, recenter: true, ...(prusa ? { output: "prusa" as const, prusa } : {}) };
  const t1 = performance.now();
  const r = convert(L, P, opts);
  const tC = performance.now() - t1;
  const heap = process.memoryUsage().heapUsed / 1048576;
  const out = readArchive(r.bytes);
  const tris = countIn(out, /<triangle /g);
  const painted = countIn(out, prusa ? /<triangle [^>]*slic3rpe:mmu_segmentation="[^"]+"/g : /<triangle [^>]*paint_color="[^"]+"/g);
  assert.equal(tris, generated, `${target}: triangles`);
  assert.equal(painted, srcPainted, `${target}: painted triangles`);
  // deterministic apart from timestamps
  const again = readArchive(convert(L, P, opts).bytes);
  const clean = (s: string) => s.replace(/(Creation|Modification)Date">[^<]*/g, "").replace(/ on \d{4}-\d\d-\d\d at [\d:]+ UTC/g, "");
  assert.deepEqual(Object.keys(again), Object.keys(out));
  for (const k of Object.keys(out)) assert.equal(clean(strFromU8(again[k])), clean(strFromU8(out[k])), `${target}: ${k} not deterministic`);
  const lim = prusa ? budget.prusa : budget.convert;
  assert.ok(tC < lim, `${target}: convert took ${tC | 0} ms (budget ${lim})`);
  assert.ok(heap < budget.heapMB, `${target}: heap ${heap | 0} MB (budget ${budget.heapMB})`);
  ok(`${target}: ${tC | 0} ms, ${(r.bytes.length / 1048576).toFixed(1)} MB, all ${tris} triangles and ${painted} painted kept, deterministic`);
}
if (!args.includes("--keep")) rmSync(dir, { recursive: true, force: true });
console.log("Big-model checks passed.");
