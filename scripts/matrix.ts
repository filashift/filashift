// npx tsx scripts/matrix.ts outdir src1.3mf:name ... -- target1 target2 ...
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { analyze, convert, defaultMapping } from "../client/src/engine/engine";
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
      const r = convert(L, P, { map, keepSpeeds: false, recenter: true });
      writeFileSync(`${out}/${name}__${t}.3mf`, r.bytes);
      writeFileSync(`${out}/${name}__${t}.json`, JSON.stringify({ app: L.analysis.app, kind: L.analysis.kind, slicer: P.slicer, map, lines: r.report.lines }, null, 1));
    } catch (e: any) {
      console.log("FAIL", name, t, e.message);
    }
  }
}
