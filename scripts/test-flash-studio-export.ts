import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { analyze, convert, defaultMapping } from "../client/src/engine/engine";

const dir = "client/public/profiles";
const sample = "filashift-nameplate.3mf";
const loaded = analyze(readFileSync(`client/public/samples/${sample}`), sample);
const comment = "; estimated printing time (normal mode) = {print_time_day}d {print_time_hour}h {print_time_minute}m {print_time_sec}s";
function exported(p: Parameters<typeof convert>[1]) {
  const result = convert(loaded, p, { map: defaultMapping(loaded.analysis, p.slots), keepSpeeds: false, recenter: true });
  return JSON.parse(strFromU8(unzipSync(result.bytes)["Metadata/project_settings.config"]));
}
let affected = 0, unchanged = 0;
for (const file of readdirSync(dir).filter(f => /^flashforge-.*\.json$/.test(f))) {
  const p = JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
  const s = exported(p);
  const original = p.machineValues.file_start_gcode;
  assert.equal(s.file_start_gcode, original === comment ? "" : original, file);
  assert.equal(s.machine_start_gcode, p.machineValues.machine_start_gcode, file);
  assert.equal(s.machine_end_gcode, p.machineValues.machine_end_gcode, file);
  original === comment ? affected++ : unchanged++;
}
assert.ok(affected && unchanged);
const base = JSON.parse(readFileSync(`${dir}/flashforge-ad5x.json`, "utf8"));
for (const [vendor, value] of [["Flashforge", `${comment}\nG28`], ["Flashforge", "; custom comment"], ["Other", comment]]) {
  const p = structuredClone(base);
  p.vendor = vendor;
  p.machineValues.file_start_gcode = value;
  assert.equal(exported(p).file_start_gcode, value);
}
console.log(`PASS: ${affected} corrected, ${unchanged} unchanged; machine start/end, custom and non-Flashforge controls passed.`);
