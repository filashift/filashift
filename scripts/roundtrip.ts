// npx tsx scripts/roundtrip.ts in.3mf outdir step1 step2 ...   step = printerId[:m1,m2,...]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { analyze, convert, defaultMapping } from "../client/src/engine/engine";
import { unzipSync, strFromU8 } from "fflate";
const [, , input, out, ...steps] = process.argv;
mkdirSync(out, { recursive: true });
const paintSig = (b: Uint8Array) => {
  const e = unzipSync(b);
  return Object.keys(e).filter((k) => k.endsWith(".model")).sort().map((k) => (strFromU8(e[k]).match(/paint_color="[^"]*"/g) || []).join(",")).join("|");
};
const settings = (b: Uint8Array) => JSON.parse(strFromU8(unzipSync(b)["Metadata/project_settings.config"]));
const orig = new Uint8Array(readFileSync(input));
let cur = orig, name = "rt";
steps.forEach((st, i) => {
  const [pid, m] = st.split(":");
  const L = analyze(cur, `${name}.3mf`);
  const P = JSON.parse(readFileSync(`client/public/profiles/${pid}.json`, "utf8"));
  const map = m ? m.split(",").map(Number) : defaultMapping(L.analysis, P.slots);
  const r = convert(L, P, { map, keepSpeeds: false, recenter: true });
  name = `${i + 1}_${pid}`;
  writeFileSync(`${out}/${name}.3mf`, r.bytes);
  writeFileSync(`${out}/${name}.json`, JSON.stringify({ slicer: P.slicer, map, from: L.analysis.sourceSlicer, lines: r.report.lines }, null, 1));
  const s = settings(r.bytes);
  console.log(`step ${i + 1} ${L.analysis.sourceSlicer} (${L.analysis.sourcePrinterModel}) -> ${P.model} map=${map} wall=${s.wall_loops} infill=${s.sparse_infill_density} cols=${s.filament_colour} types=${s.filament_type} bed=${s.curr_bed_type}`);
  cur = r.bytes;
});
console.log("paint identical to original:", paintSig(cur) === paintSig(orig));
