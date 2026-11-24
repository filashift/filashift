import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileBox,
  FolderOpen,
  Info,
  Layers,
  Loader2,
  Paintbrush,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { planPauses } from "@/engine/engine";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Analysis, ConvertReport } from "@/engine/types";
import type { ExportResult } from "@/engine/export";
import { cn } from "@/lib/utils";
import { ProjectFilament } from "@/components/project-filament";
import { conversionDetails, openReport } from "@/components/report-dialog";

export interface Job {
  id: string;
  name: string;
  size: number;
  status: "reading" | "ready" | "converting" | "done" | "error";
  analysis?: Analysis;
  thumbUrl?: string;
  map: number[];
  /** print extra colours by pausing for filament swaps (see planPauses) */
  pauses?: boolean;
  error?: string;
  result?: { url: string; name: string; size: number; report: ConvertReport };
}

const KIND_LABEL: Record<string, string> = {
  bambu: "Bambu Studio project",
  orca: "OrcaSlicer project",
  prusa: "PrusaSlicer project",
  plain: "Geometry-only 3MF",
  invalid: "Unreadable file",
};

export function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function Swatch({ color, className, dashed }: { color?: string; className?: string; dashed?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 shrink-0 rounded-full border border-black/15 dark:border-white/20",
        dashed && "border-dashed bg-transparent",
        className,
      )}
      style={dashed ? undefined : { background: color }}
      aria-hidden
    />
  );
}

export function slotColors(a: Analysis, map: number[], slots: number) {
  const out: { color?: string; type?: string; from: number[] }[] = Array.from({ length: slots }, () => ({ from: [] }));
  a.filaments.forEach((f) => {
    const s = map[f.index - 1];
    if (!s || s > slots) return;
    const o = out[s - 1];
    if (!o.from.length) {
      o.color = f.color;
      o.type = f.type;
    }
    o.from.push(f.index);
  });
  return out;
}

export function FileCard({
  job,
  slots,
  targetName,
  canConvert,
  onMap,
  onPauses,
  onConvert,
  onRemove,
  onReset,
  onExport,
}: {
  job: Job;
  slots: number;
  targetName: string;
  canConvert: boolean;
  onMap: (filamentIndex: number, slot: number) => void;
  onPauses: (on: boolean) => void;
  onExport: (fmt: "stl" | "obj") => ExportResult;
  onConvert: () => void;
  onRemove: () => void;
  onReset: () => void;
}) {
  const a = job.analysis;
  const convertible = !!a && !a.error && (a.kind === "bambu" || a.kind === "orca");
  const sc = a ? slotColors(a, job.map, slots) : [];
  const usedCount = a ? a.filaments.filter((f) => f.used).length : 0;
  const overSlots = !!a && convertible && usedCount > slots;
  const plan = overSlots ? planPauses(a!, slots) : null;

  return (
    <article className="overflow-hidden rounded-xl border border-card-border bg-card" data-testid={`card-file-${job.id}`}>
      <header className="flex items-start gap-3 border-b border-card-border p-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-card-border bg-muted">
          {job.thumbUrl ? (
            <img src={job.thumbUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <FileBox className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium" title={job.name} data-testid={`text-filename-${job.id}`}>
            {job.name}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {job.status === "reading" ? "Reading…" : a ? (convertible && a.sourceSlicer ? `${a.sourceSlicer.replace(/\s[\d.]+$/, "")} project` : KIND_LABEL[a.kind]) : ""}
            {a?.sourceSlicer && /\d/.test(a.sourceSlicer) ? <span className="font-mono text-xs"> · v{a.sourceSlicer.match(/[\d.]+$/)?.[0]}</span> : null}
          </p>
          {a && convertible && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {a.sourcePrinterModel && (
                <Badge variant="secondary" className="font-normal" data-testid={`text-source-printer-${job.id}`}>
                  From {a.sourcePrinterModel}
                </Badge>
              )}
              <Badge variant="secondary" className="font-normal">
                <Layers className="mr-1 h-3 w-3" />
                {`${a.plates.length} plate${a.plates.length === 1 ? "" : "s"} · ${a.objectCount} object${a.objectCount === 1 ? "" : "s"}`}
              </Badge>
              {a.hasPaint && (
                <Badge variant="secondary" className="font-normal">
                  <Paintbrush className="mr-1 h-3 w-3" />
                  Painted
                </Badge>
              )}
              <Badge variant="secondary" className="font-mono font-normal">
                {fmtSize(job.size)}
              </Badge>
            </div>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Remove file" data-testid={`button-remove-${job.id}`}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      {(job.error || a?.error) && (
        <div className="flex gap-2 p-4 text-sm text-destructive" data-testid={`text-error-${job.id}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{job.error || a?.error}</p>
        </div>
      )}

      {a && !a.error && !convertible && (
        <div className="flex gap-2 p-4 text-sm" data-testid={`text-unsupported-${job.id}`}>
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p>{a.notes[0]}</p>
        </div>
      )}

      {a && convertible && !job.result && (
        <div className="p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h4 className="text-sm font-medium">Filament → slot</h4>
            <span className="text-xs text-muted-foreground">
              {`${usedCount} of ${a.filaments.length} used${a.usedKnown ? "" : " (assumed)"}`}
            </span>
          </div>
          <ul className="space-y-2">
            {a.filaments.map((f) => {
              const v = job.map[f.index - 1] || 0;
              return (
                <li key={f.index} className="flex items-center gap-3" data-testid={`row-filament-${job.id}-${f.index}`}>
                  <span className="w-5 text-right font-mono text-xs text-muted-foreground">{f.index}</span>
                  <Swatch color={f.color} className="h-5 w-5" />
                  <div className={cn("min-w-0 flex-1", !f.used && "opacity-60")}>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-medium">{f.type}</span>
                      <span className="font-mono text-xs text-muted-foreground">{f.color}</span>
                      {!f.used && <span className="text-xs text-muted-foreground">· unused</span>}
                    </div>
                    {f.preset && <div className="truncate text-xs text-muted-foreground">{f.preset}</div>}
                  </div>
                  <Select value={String(v)} onValueChange={(s) => onMap(f.index, parseInt(s))}>
                    <SelectTrigger className="h-9 w-[132px] shrink-0" data-testid={`select-slot-${job.id}-${f.index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: slots }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          Slot {i + 1}
                        </SelectItem>
                      ))}
                      {!f.used && <SelectItem value="0">Remove</SelectItem>}
                    </SelectContent>
                  </Select>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 rounded-lg bg-muted/60 p-3">
            <div className="mb-2 text-xs text-muted-foreground">{targetName} slots</div>
            <div className="flex flex-wrap gap-2">
              {sc.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
                    s.from.length ? "border-card-border bg-card" : "border-dashed text-muted-foreground",
                  )}
                  data-testid={`slot-preview-${job.id}-${i + 1}`}
                >
                  <Swatch color={s.color} dashed={!s.from.length} className="h-3.5 w-3.5" />
                  <span className="font-mono">{i + 1}</span>
                  {s.from.length ? (
                    <span>
                      {s.type}
                      {s.from.length > 1 && <span className="text-muted-foreground"> ×{s.from.length}</span>}
                    </span>
                  ) : (
                    <span>empty</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {overSlots && (
            <div className="mt-3 rounded-lg border border-card-border p-3 text-sm" data-testid={`panel-pauses-${job.id}`}>
              {plan ? (
                <label className="flex items-start gap-3">
                  <Switch checked={!!job.pauses} onCheckedChange={onPauses} className="mt-0.5" data-testid={`switch-pauses-${job.id}`} />
                  <span>
                    <span className="font-medium">{`Print all ${usedCount} colours with filament-change pauses`}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {`The colours never share a layer, so the printer can pause ${plan.changes.length} time${plan.changes.length > 1 ? "s" : ""} for you to swap filament instead of merging colours${
                        job.pauses
                          ? `: ${plan.changes
                              .slice(0, 3)
                              .map((c) => `slot ${c.slot} → ${c.color} from ${c.z.toFixed(1)} mm`)
                              .join(", ")}${plan.changes.length > 3 ? "…" : ""}.`
                          : "."
                      }`}
                    </span>
                  </span>
                </label>
              ) : (
                <p className="flex gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{`This project uses ${usedCount} colours on ${slots} slot${slots > 1 ? "s" : ""}. Some colours print on the same layers${a!.hasPaint ? " or are painted" : ""}, so pauses cannot replace the missing slots; the closest colours share a slot instead.`}</span>
                </p>
              )}
            </div>
          )}

          {a.notes.length > 0 && (
            <ul className="mt-3 space-y-1">
              {a.notes.map((n, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {n}
                </li>
              ))}
            </ul>
          )}

          <Button
            className="mt-4 w-full"
            onClick={onConvert}
            disabled={!canConvert || job.status === "converting"}
            data-testid={`button-convert-${job.id}`}
          >
            {job.status === "converting" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            <span>{`Convert for ${targetName || "printer"}`}</span>
          </Button>
        </div>
      )}

      {job.result && <ResultPanel job={job} onReset={onReset} />}

      {a && !a.error && job.status !== "reading" && <MeshExport job={job} onExport={onExport} />}

      {a && (
        <div className="border-t border-card-border px-4 py-2 text-right">
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            data-testid={`button-report-${job.id}`}
            onClick={() =>
              openReport(
                conversionDetails({
                  file: job.name,
                  source: a.sourceSlicer || KIND_LABEL[a.kind],
                  sourcePrinter: a.sourcePrinterModel,
                  target: job.result?.report.target || targetName,
                  plates: a.plates?.length,
                  objects: a.objectCount,
                  painted: a.hasPaint,
                  filaments: usedCount,
                  error: job.error || a.error,
                  warnings: job.result?.report.lines.filter((l) => l.level === "warn").map((l) => l.text),
                }),
              )
            }
          >
            Something not right? Report a problem
          </button>
        </div>
      )}
    </article>
  );
}

function MeshExport({ job, onExport }: { job: Job; onExport: (fmt: "stl" | "obj") => ExportResult }) {
  const [busy, setBusy] = useState<"" | "stl" | "obj">("");
  const [res, setRes] = useState<{ lines: ExportResult["lines"]; err?: string } | null>(null);
  const run = async (fmt: "stl" | "obj") => {
    setBusy(fmt);
    await new Promise((r) => setTimeout(r, 30));
    try {
      const r = onExport(fmt);
      const url = URL.createObjectURL(r.blob);
      const el = document.createElement("a");
      el.href = url;
      el.download = r.fileName;
      document.body.appendChild(el);
      el.click();
      el.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setRes({ lines: r.lines });
    } catch (e: any) {
      setRes({ lines: [], err: `Export failed: ${e?.message || e}` });
    }
    setBusy("");
  };
  return (
    <div className="border-t border-card-border px-4 py-3" data-testid={`panel-export-${job.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto text-xs text-muted-foreground">Just need the model?</span>
        {(["stl", "obj"] as const).map((f) => (
          <Button key={f} size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled={!!busy} onClick={() => run(f)} data-testid={`button-export-${f}-${job.id}`}>
            {busy === f ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {f === "stl" ? "Export STL" : "Export OBJ"}
          </Button>
        ))}
      </div>
      {res && (
        <ul className="mt-2 space-y-1" data-testid={`text-export-${job.id}`}>
          {res.err && <li className="text-xs text-destructive">{res.err}</li>}
          {res.lines.map((l, i) => (
            <li key={i} className={cn("flex gap-2 text-xs", l.level === "warn" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
              {l.level === "ok" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> : l.level === "warn" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
              {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultPanel({ job, onReset }: { job: Job; onReset: () => void }) {
  const r = job.result!;
  const rep = r.report;
  const [open, setOpen] = useState(false);
  const warns = rep.lines.filter((l) => l.level === "warn");
  return (
    <div className="p-4" data-testid={`panel-result-${job.id}`}>
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-medium">{`Ready for ${rep.target}`}</p>
          <p className="truncate font-mono text-xs text-muted-foreground" title={r.name}>
            {r.name} · {fmtSize(r.size)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1" data-testid={`button-download-${job.id}`}>
          <a href={r.url} download={r.name}>
            <Download className="mr-2 h-4 w-4" />
            Download 3MF
          </a>
        </Button>
        <Button variant="outline" onClick={onReset} data-testid={`button-adjust-${job.id}`}>
          Adjust mapping
        </Button>
      </div>

      <div className="mt-3 flex gap-2 rounded-lg border border-card-border bg-muted/50 p-2.5 text-xs leading-snug" data-testid={`tip-open-project-${job.id}`}>
        <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          <span className="font-medium">Open it as a project:</span>{" "}
          <span>In your slicer use File → Open Project. Dragging it onto the plate or importing it as a model leaves the converted settings behind.</span>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {rep.filaments.map((f) => (
          <div key={f.slot} className="flex items-center gap-1.5 rounded-md border border-card-border px-2 py-1 text-xs">
            <Swatch color={f.color} className="h-3.5 w-3.5" />
            <span className="font-mono">{f.slot}</span>
            <span title={f.preset}>{f.preset}</span>
          </div>
        ))}
      </div>

      <ProjectFilament needs={rep.filaments.map((f) => ({ color: f.color, type: f.type, slot: f.slot }))} testId={`shop-${job.id}`} />

      <ul className="mt-4 space-y-2" data-testid={`list-report-${job.id}`}>
        {warns.map((l, i) => (
          <li key={"w" + i} className="flex gap-2 rounded-md bg-amber-500/10 p-2 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {l.text}
          </li>
        ))}
        {rep.lines
          .filter((l) => l.level !== "warn")
          .map((l, i) => (
            <li key={"i" + i} className="flex gap-2 text-sm">
              {l.level === "ok" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span>{l.text}</span>
            </li>
          ))}
      </ul>

      <Collapsible open={open} onOpenChange={setOpen} className="mt-4 rounded-lg border border-card-border">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between px-3 py-2 text-sm hover-elevate" data-testid={`button-details-${job.id}`}>
            <span>
              Settings details{" "}
              <span className="text-muted-foreground">
                {`· ${rep.kept.length} kept · ${rep.replaced.length} adapted · ${rep.speeds.length} speed changes`}
              </span>
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 border-t border-card-border p-3 text-xs">
          <Detail title="Speed and acceleration changes" items={rep.speeds} />
          <Detail title="Adapted to the printer" items={rep.replaced} />
          <Detail title="Designer settings kept" items={rep.kept} />
          <Detail title="Taken from the printer profile instead" items={rep.discarded} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function Detail({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-1 font-medium">
        {title} <span className="font-normal text-muted-foreground">({items.length})</span>
      </div>
      <div className="max-h-40 overflow-auto rounded bg-muted/60 p-2 font-mono leading-relaxed text-muted-foreground">
        {items.join(", ")}
      </div>
    </div>
  );
}
