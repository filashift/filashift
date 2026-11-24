// npx tsx scripts/roundtrip.ts in.3mf outdir step1 step2 ...   step = printerId[:m1,m2,...]  (printerId+prusa = PrusaSlicer project)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { analyze, convert, defaultMapping } from "../client/src/engine/engine";
import { loadPrusa } from "./prusa-data";
import { unzipSync, strFromU8 } from "fflate";
const [, , input, out, ...steps] = process.argv;
mkdirSync(out, { recursive: true });
const paintSig = (b: Uint8Array) => {
  // every painted triangle's paint string (Orca paint_color or PrusaSlicer mmu_segmentation), as a sorted multiset,
  // since PrusaSlicer projects keep all meshes in one file and objects may be reordered
  const e = unzipSync(b);
  const all = Object.keys(e).filter((k) => k.endsWith(".model")).flatMap((k) => (strFromU8(e[k]).match(/(?:paint_color|slic3rpe:mmu_segmentation)="[^"]*"/g) || []).map((x) => x.slice(x.indexOf('"'))));
  return all.sort().join(",");
};
const settings = (b: Uint8Array) => {
  const e = unzipSync(b);
  if (e["Metadata/project_settings.config"]) return JSON.parse(strFromU8(e["Metadata/project_settings.config"]));
  const c: Record<string, string> = {};
  for (const m of strFromU8(e["Metadata/Slic3r_PE.config"]).matchAll(/^; (\w+) = (.*)$/gm)) c[m[1]] = m[2];
  return { wall_loops: c.perimeters, sparse_infill_density: c.fill_density, filament_colour: c.filament_colour, filament_type: c.filament_type, curr_bed_type: "-" };
};
const orig = new Uint8Array(readFileSync(input));
let cur = orig, name = "rt";
steps.forEach((st, i) => {
  const [pid0, m] = st.split(":");
  const pid = pid0.replace(/\+prusa$/, "");
  const prusa = pid0.endsWith("+prusa") ? loadPrusa(pid) : undefined;
  const L = analyze(cur, `${name}.3mf`);
  const P = JSON.parse(readFileSync(`client/public/profiles/${pid}.json`, "utf8"));
  const map = m ? m.split(",").map(Number) : defaultMapping(L.analysis, P.slots);
  const r = convert(L, P, { map, keepSpeeds: false, recenter: true, ...(prusa ? { output: "prusa" as const, prusa } : {}) });
  name = `${i + 1}_${pid}`;
  writeFileSync(`${out}/${name}.3mf`, r.bytes);
  writeFileSync(`${out}/${name}.json`, JSON.stringify({ slicer: prusa ? "PrusaSlicer" : P.slicer, map, from: L.analysis.sourceSlicer, lines: r.report.lines }, null, 1));
  const s = settings(r.bytes);
  console.log(`step ${i + 1} ${L.analysis.sourceSlicer} (${L.analysis.sourcePrinterModel}) -> ${P.model} map=${map} wall=${s.wall_loops} infill=${s.sparse_infill_density} cols=${s.filament_colour} types=${s.filament_type} bed=${s.curr_bed_type}`);
  cur = r.bytes;
});
console.log(`paint identical to original: ${paintSig(cur) === paintSig(orig)} (${paintSig(orig).split(",").filter(Boolean).length} painted triangles)`);
