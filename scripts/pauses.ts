// npx tsx scripts/pauses.ts outdir file.3mf:name target...
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { analyze, convert, planPauses } from "../client/src/engine/engine";
const [out, src, ...tgts] = process.argv.slice(2);
const [file, name] = src.split(":");
mkdirSync(out, { recursive: true });
for (const t of tgts) {
  const L = analyze(new Uint8Array(readFileSync(file)), name + ".3mf");
  const P = JSON.parse(readFileSync(`client/public/profiles/${t}.json`, "utf8"));
  if (process.env.SLOTS) P.slots = +process.env.SLOTS;
  const plan = planPauses(L.analysis, P.slots);
  console.log(t, P.slots, "stacks", JSON.stringify(L.analysis.stacks?.map((s) => [s.plate, s.fil, +s.z0.toFixed(2), +s.z1.toFixed(2)])), "plan", JSON.stringify(plan));
  if (!plan) continue;
  const r = convert(L, P, { map: plan.map, keepSpeeds: false, recenter: true, slotColors: plan.slotColors, pauses: plan.changes });
  writeFileSync(`${out}/${name}__${t}.3mf`, r.bytes);
  writeFileSync(`${out}/${name}__${t}.json`, JSON.stringify({ slicer: P.slicer, lines: r.report.lines }, null, 1));
}
