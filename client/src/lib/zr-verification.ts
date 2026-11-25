import evidence from "../../public/samples/wondermaker-results.json";

export const ZR_PLA_LABEL = "OrcaSlicer-verified for PLA";
export const ZR_MIX_NOTE = "The PLA sample sliced successfully. The original PLA/PETG sample did not: its preset temperatures conflict. FilaShift shows which filament to review before slicing.";

// A scoped finding for one recorded test run, not an override of the matrix verdict.
export function verifiedZrPla(id: string, slicer: string, version: string | undefined,
  row: {passed: number; tests: number; ok: boolean} | undefined, date: string | undefined) {
  const has = (project: string, rc: number) => evidence.cases.some(c => c.printer === "WonderMaker ZR" && c.project === project && c.returnCode === rc);
  return id === "wondermaker-zr" && slicer === "OrcaSlicer" && `${slicer} ${version}` === evidence.destination &&
    date === evidence.testedOn && row?.ok === false && row.passed === 2 && row.tests === 3 && has("ad5x", 0) && has("x1c", -62);
}
