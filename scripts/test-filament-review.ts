// Local functional check. npm exec tsx scripts/test-filament-review.ts
import assert from "node:assert/strict";
import { reviewSlots } from "../client/src/engine/filament-review";
import { REPORT_DE } from "../client/src/lib/report-de";
import { REPORT_ES } from "../client/src/lib/report-es";
import { REPORT_FR } from "../client/src/lib/report-fr";
assert.deepEqual(reviewSlots([]), []);
assert.deepEqual(reviewSlots([[1, 3], [2, 3], [3, 4]]), [3]);
assert.deepEqual(reviewSlots([[1, 2]]), [1, 2]);
assert.deepEqual(reviewSlots([[4, 3], [1, 2]]), [1, 2, 3, 4]);
assert.deepEqual(reviewSlots([[1, 2], [2, 3], [1, 3]]), [1, 2, 3]);
import { readFileSync } from "node:fs";
if (process.argv[2]) {
  const lines = JSON.parse(readFileSync(process.argv[2], "utf8")).lines.map((l: {text:string})=>l.text);
  const actions = lines.filter((s:string)=>/^(Review filament|If a preset is wrong:|If the mix is intentional:)/.test(s));
  assert.equal(actions.length,3);
  assert.match(actions[0],/^Review filament 3 \(PETG\) in OrcaSlicer\./);
  for(const en of actions) for(const rules of [REPORT_ES,REPORT_DE,REPORT_FR]) {
    const rule=rules.find(([re])=>re.test(en));
    assert.ok(rule); assert.notEqual(en.replace(rule[0],rule[1] as never), en);
  }
}
console.log("Filament review checks passed.");
