// Batch conversion: every project × every chosen printer, converted one after another in the
// project's own worker, with per-item progress, report and download, plus one ZIP of everything.
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Download, Eye, Info, Layers, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Analysis, ConvertReport } from "@/engine/types";
import { DownloadSummary } from "./download-summary";
import { fmtSize } from "@/components/file-card";
import { cn } from "@/lib/utils";

export interface BatchItem {
  source?: Analysis;
  key: string;
  jobId: string;
  fileName: string;
  targetId: string;
  target: string;
  status: "queued" | "converting" | "done" | "error" | "cancelled";
  stage?: string;
  error?: string;
  result?: { url: string; blob: Blob; name: string; size: number; report: ConvertReport };
}

export function BatchPanel({
  items,
  files,
  printers,
  running,
  zipping,
  onRun,
  onCancel,
  onZip,
  onPreview,
}: {
  items: BatchItem[];
  files: number;
  printers: number;
  running: boolean;
  zipping: boolean;
  onRun: () => void;
  onCancel: () => void;
  onZip: () => void;
  onPreview: (item: BatchItem) => void;
}) {
  const total = files * printers;
  const done = items.filter((i) => i.status === "done").length;
  const finished = items.filter((i) => i.status !== "queued" && i.status !== "converting").length;
  const failed = items.filter((i) => i.status === "error").length;
  const pct = items.length ? Math.round((finished / items.length) * 100) : 0;
  return (
    <section className="overflow-hidden rounded-xl border border-primary/30 bg-card" data-testid="batch-panel">
      <header className="flex flex-wrap items-start gap-3 border-b border-card-border p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Layers className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">Batch conversion</h3>
          <p className="text-sm text-muted-foreground" data-testid="batch-summary">
            {`${files} file${files === 1 ? "" : "s"} × ${printers} printers = ${total} conversions`}
          </p>
        </div>
      </header>
      <div className="space-y-3 p-4">
        <p className="text-xs text-muted-foreground">
          The first printer uses your nozzle, slot and color choices. Each extra printer uses its 0.4 mm profile, its default slot count and automatic color matching.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {running ? (
            <Button size="sm" variant="outline" onClick={onCancel} data-testid="batch-cancel">
              <X className="mr-1.5 h-4 w-4" />
              Stop batch
            </Button>
          ) : (
            <Button size="sm" onClick={onRun} disabled={!total} data-testid="batch-convert">
              {`Convert all ${total}`}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onZip} disabled={!done || running || zipping} data-testid="batch-download-zip">
            {zipping ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
            Download all (.zip)
          </Button>
          {items.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground" role="status" data-testid="batch-progress-text">
              {`${finished} of ${items.length} done${failed ? ` · ${failed} failed` : ""}`}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} data-testid="batch-progress" />
          </div>
        )}
        {items.length > 0 && (
          <ul className="divide-y divide-card-border rounded-lg border border-card-border" data-testid="batch-items">
            {items.map((it, i) => (
              <BatchRow key={it.key} item={it} index={i} onPreview={() => onPreview(it)} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function BatchRow({ item, index, onPreview }: { item: BatchItem; index: number; onPreview: () => void }) {
  const [open, setOpen] = useState(false);
  const rep = item.result?.report;
  const warns = rep?.lines.filter((l) => l.level === "warn") || [];
  return (
    <li className="p-3 text-sm" data-testid={`batch-item-${index}`} data-status={item.status}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="shrink-0">
          {item.status === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : item.status === "converting" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : item.status === "error" ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <span className="block h-4 w-4 rounded-full border border-dashed border-muted-foreground/60" />
          )}
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate font-medium" title={item.fileName} translate="no">
            {item.fileName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            <span translate="no">{item.target}</span>
            {" · "}
            <span data-testid={`batch-status-${index}`}>
              {item.status === "converting"
                ? item.stage || "Converting"
                : item.status === "done"
                  ? `Ready · ${fmtSize(item.result!.size)}${warns.length ? ` · ${warns.length} warning${warns.length === 1 ? "" : "s"}` : ""}`
                  : item.status === "error"
                    ? "Failed"
                    : item.status === "cancelled"
                      ? "Stopped"
                      : "Waiting"}
            </span>
          </p>
        </div>
        {item.result && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={onPreview} data-testid={`batch-preview-${index}`}>
              <Eye className="mr-1 h-3.5 w-3.5" />
              Preview
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setOpen(!open)} aria-expanded={open} data-testid={`batch-report-${index}`}>
              Report
              <ChevronDown className={cn("ml-1 h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs">
              <a href={item.result.url} download={item.result.name} data-testid={`batch-download-${index}`}>
                <Download className="mr-1 h-3.5 w-3.5" />
                3MF
              </a>
            </Button>
          </div>
        )}
      </div>
      {rep && <DownloadSummary report={rep} source={item.source} />}
      {item.error && <p className="mt-2 text-xs text-destructive">{item.error}</p>}
      {open && rep && (
        <ul className="mt-3 space-y-1.5" data-testid={`batch-report-list-${index}`}>
          <li className="truncate font-mono text-xs text-muted-foreground" title={item.result!.name} translate="no">
            {item.result!.name}
          </li>
          {warns.map((l, i) => (
            <li key={"w" + i} className="flex gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {l.text}
            </li>
          ))}
          {rep.lines
            .filter((l) => l.level !== "warn")
            .map((l, i) => (
              <li key={"i" + i} className="flex gap-2 text-xs">
                {l.level === "ok" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                <span>{l.text}</span>
              </li>
            ))}
        </ul>
      )}
    </li>
  );
}
