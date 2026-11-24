import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { readArchive } from "../client/src/engine/archive";
// Small normal fixtures and an injected low budget exercise the production boundary
// without allocating gigabytes or checking private corpus files into the repo.
const model=strToU8("model data ".repeat(11000)),meta=strToU8("settings");
for (const level of [0,6] as const) {
  const bytes=zipSync({"3D/model":model,"Metadata/settings":meta},{level});
  const exact=model.length+meta.length;
  const entries=readArchive(bytes,exact);
  assert.deepEqual(entries["3D/model"],model);
  assert.deepEqual(entries["Metadata/settings"],meta);
  assert.throws(()=>readArchive(bytes,exact-1),/2 GB/);
  assert.throws(()=>readArchive(bytes.subarray(0,bytes.length>>1)));
}
console.log("Stored and deflated archives, exact-limit acceptance, over-limit rejection, truncated input: passed.");
