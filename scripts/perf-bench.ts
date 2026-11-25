// Time and peak memory of analyse + convert for big projects, in Node.
// npx tsx scripts/perf-bench.ts FILE.3mf [target ...]       (target suffix "+prusa" = PrusaSlicer output)
// ROOT=/path/to/other/checkout compares another engine build (e.g. master). Each case runs in its own
// child process so peak RSS (maxRSS) belongs to that case alone. Output: one JSON line per case.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.env.ROOT || ".");
if (process.argv[2] === "--case") {
  const [, , , file, target] = process.argv;
  const { analyze, convert, defaultMapping } = await import(`${root}/client/src/engine/engine.ts`);
  const { loadPrusa } = await import(`${root}/scripts/prusa-data.ts`);
  const bytes = new Uint8Array(readFileSync(file));
  const heap = () => Math.round(process.memoryUsage().heapUsed / 1048576);
  const t0 = performance.now();
  const L = analyze(bytes, "bench.3mf");
  const t1 = performance.now();
  const res: Record<string, unknown> = { file: file.split("/").pop(), target: target || "-", analyzeMs: Math.round(t1 - t0), heapAfterAnalyzeMB: heap() };
  if (L.analysis.error) res.error = L.analysis.error;
  if (target && !L.analysis.error) {
    const [t, mode] = target.split("+");
    const P = JSON.parse(readFileSync(`${root}/client/public/profiles/${t}.json`, "utf8"));
    const map = defaultMapping(L.analysis, P.slots);
    const prusa = mode === "prusa" || P.prusaOnly ? loadPrusa(t) : undefined;
    const t2 = performance.now();
    const r = convert(L, P, { map, keepSpeeds: false, recenter: true, ...(prusa ? { output: "prusa", prusa } : {}) });
    res.convertMs = Math.round(performance.now() - t2);
    res.outMB = +(r.bytes.length / 1048576).toFixed(2);
  }
  res.maxRssMB = Math.round(process.resourceUsage().maxRSS / 1024);
  console.log(JSON.stringify(res));
} else {
  const [file, ...targets] = process.argv.slice(2);
  if (!file) throw Error("usage: perf-bench.ts FILE.3mf [target ...]");
  for (const t of targets.length ? targets : [""]) {
    const p = spawnSync(process.execPath, ["--import", "tsx", "--max-old-space-size=4096", new URL(import.meta.url).pathname, "--case", resolve(file), t], { encoding: "utf8", env: process.env });
    process.stdout.write(p.stdout || "");
    if (p.status) process.stderr.write(p.stderr);
  }
}
