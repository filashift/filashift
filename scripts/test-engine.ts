import { readFileSync, writeFileSync } from "node:fs";
import { analyze, convert, defaultMapping } from "../client/src/engine/engine";
import { paintStates, remapPaint } from "../client/src/engine/paint";
const [, , file, printerId, out] = process.argv;
// codec round trip
for (const c of ["8", "2C", "02C40C3", "0", "4", "FC3"]) {
  console.log("rt", c, paintStates(c), remapPaint(c, (s) => s), remapPaint(c, (s) => (s === 5 ? 1 : s)));
}
const bytes = new Uint8Array(readFileSync(file));
const t0 = Date.now();
const L = analyze(bytes, file.split("/").pop()!);
console.log(JSON.stringify({ ...L.analysis, plates: L.analysis.plates.length }, null, 1));
const P = JSON.parse(readFileSync(`client/public/profiles/${printerId}.json`, "utf8"));
const map = defaultMapping(L.analysis, P.slots);
console.log("map", map);
const r = convert(L, P, { map, keepSpeeds: false, recenter: true });
console.log(JSON.stringify({ ...r.report, kept: r.report.kept.length, replaced: r.report.replaced.length, discarded: r.report.discarded.length }, null, 1));
writeFileSync(out, r.bytes);
console.log("ms", Date.now() - t0, "bytes", r.bytes.length);
