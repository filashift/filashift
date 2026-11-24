// load the PrusaSlicer preset data for a FilaShift printer id (see scripts/build_prusa_profiles.py)
import { readFileSync, existsSync } from "node:fs";
import type { PrusaData } from "../client/src/engine/prusa-out";
export function loadPrusa(id: string): PrusaData | undefined {
  const f = `client/public/profiles/prusa/${id}.json`;
  if (!existsSync(f)) return undefined;
  return { common: JSON.parse(readFileSync("client/public/profiles/prusa/_common.json", "utf8")), target: JSON.parse(readFileSync(f, "utf8")) };
}
