// npx tsx scripts/matrix.ts outdir src1.3mf:name ... -- target1 target2 ...
// OUTPUT=prusa: PrusaSlicer projects for printers with PrusaSlicer presets (others stay Orca/Bambu)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { analyze, convert, defaultMapping } from "../client/src/engine/engine";
import { loadPrusa } from "./prusa-data";
const args = process.argv.slice(2);
const out = args.shift()!;
const sep = args.indexOf("--");
const srcs = args.slice(0, sep), tgts = args.slice(sep + 1);
mkdirSync(out, { recursive: true });
for (const s of srcs) {
  const [file, name] = s.split(":");
  for (const t of tgts) {
    const L = analyze(new Uint8Array(readFileSync(file)), name + ".3mf");
    const P = JSON.parse(readFileSync(`client/public/profiles/${t}.json`, "utf8"));
    try {
      const map = defaultMapping(L.analysis, P.slots);
      const prusa = process.env.OUTPUT === "prusa" || P.prusaOnly ? loadPrusa(t) : undefined;
      const r = convert(L, P, { map, keepSpeeds: false, recenter: true, ...(prusa ? { output: "prusa" as const, prusa } : {}) });
      writeFileSync(`${out}/${name}__${t}.3mf`, r.bytes);
      writeFileSync(`${out}/${name}__${t}.json`, JSON.stringify({ app: L.analysis.app, kind: L.analysis.kind, slicer: prusa ? "PrusaSlicer" : P.slicer, map, slots: P.slots, extruders: P.extruders, lines: r.report.lines }, null, 1));
    } catch (e: any) {
      console.log("FAIL", name, t, e.message);
    }
  }
}
