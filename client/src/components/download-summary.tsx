import type { Analysis, ConvertReport } from "@/engine/types";
import { trReport, useT } from "@/lib/i18n";

/** Output slots come from the completed report, never the editable mapping controls. */
export function DownloadSummary({ report, source }: { report: ConvertReport; source?: Analysis }) {
  const T = useT();
  const groups = report.filaments.filter(f => f.from.length)
    .sort((a, b) => Number(b.from.length > 1) - Number(a.from.length > 1));
  const warnings = report.lines.filter(l => l.level === "warn");
  return <section translate="no" aria-label={T("What changed?")} data-testid="download-summary"
    className="my-3 min-w-0 space-y-2 rounded-lg border border-card-border bg-muted/40 p-3 text-sm [overflow-wrap:anywhere]">
    <h4 className="font-semibold">{T("What changed?")}</h4>
    {warnings.length > 0 && <p className="text-amber-900 dark:text-amber-200">
      <strong>{T("Needs your attention")} ({warnings.length}): </strong>{trReport(T.lang, warnings[0].text)}
    </p>}
    {groups.length > 0 && <ul className="space-y-1">{groups.map(f =>
      <li key={f.slot} data-testid={`summary-slot-${f.slot}`}>
        <strong>{T(f.from.length > 1 ? "Shared slot" : "Slot")} {f.slot}</strong>
        {": "}{f.from.map(i => {
          const fil = source?.filaments.find(s => s.index === i);
          return [T("File filament") + " " + i, source?.partLabels?.[i]?.join(", "), fil?.color].filter(Boolean).join(" · ");
        }).join(" + ")}
      </li>)}</ul>}
    {!!source?.hasPaint || !source?.usedKnown || !groups.length ? <p>{T("Part assignments are not verified here. Inspect the sliced preview.")}</p> : null}
    <p><strong>{T("Target profile")}: </strong>{report.target} · {report.process}</p>
    {report.discarded.length > 0 && <p className="text-xs"><strong>{T("Taken from the printer profile instead")}: </strong>
      {report.discarded.slice(0, 3).join(", ")}{report.discarded.length > 3 ? "…" : ""}</p>}
    <p className="text-xs text-muted-foreground">{T("Before printing, check the loaded spools, slot assignments, and first layer in your slicer.")}</p>
  </section>;
}
