import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { analyze, convert } from "../client/src/engine/engine";

const dir = "client/public/profiles";
const profile = (id: string) => JSON.parse(readFileSync(`${dir}/${id}.json`, "utf8"));
const sample = "filashift-nameplate.3mf";
const loaded = analyze(readFileSync(`client/public/samples/${sample}`), sample);
assert.equal(loaded.analysis.filaments.length, 2);
function settings(p: Parameters<typeof convert>[1], map: number[]) {
  const r = convert(loaded, p, { map, recenter: true, keepSpeeds: false });
  return JSON.parse(strFromU8(unzipSync(r.bytes)["Metadata/project_settings.config"]));
}
const files = readdirSync(dir).filter(f => /^qidi-.*\.json$/.test(f));
assert.ok(files.length);
for (const f of files) {
  const p = profile(f.slice(0, -5));
  for (const map of [[1, 1], [1, 2], [4, 1]]) {
    const s = settings(p, map);
    assert.equal(s.filament_type.length, Math.max(...map, p.minFilaments || 0), f);
    assert.deepEqual(s.filament_shrink, s.filament_type.map(() => "100%"), f);
    const preset = settings({ ...p, vendor: "Control" }, map).filament_prime_volume;
    const expected = s.filament_type.map((_: unknown, j: number) => {
      const value = Array.isArray(preset) ? preset[j] : preset;
      return value == null || value === "" ? "45" : String(value);
    });
    assert.deepEqual(s.filament_prime_volume, expected, f);
  }
}
const q2 = profile("qidi-q2");
q2.machineValues.filament_shrink = ["99.5%", "101%"];
q2.machineValues.filament_prime_volume = ["30", 0];
assert.deepEqual(settings(q2, [1, 4]).filament_shrink, ["99.5%", "101%", "100%", "100%"]);
assert.deepEqual(settings(q2, [1, 4]).filament_prime_volume, ["30", "0", "45", "45"]);
const other = profile("flashforge-ad5x");
assert.equal(settings(other, [1, 4]).filament_shrink, undefined);
assert.equal(settings(other, [1, 4]).filament_prime_volume, other.machineValues.filament_prime_volume);
console.log(`PASS: ${files.length} Qidi profiles, 3 slot layouts each; destination values preserved and non-Qidi control unchanged.`);
