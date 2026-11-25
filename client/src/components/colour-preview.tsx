// Dialog shell for the before/after colour preview. The three.js viewer is a separate chunk,
// fetched the first time a visitor opens a preview.
import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Analysis, ConvertReport } from "@/engine/types";
import type { PreviewMesh } from "@/engine/preview-mesh";
import type { PreviewRow } from "@/components/model-viewer";
import { planPauses } from "@/engine/mapping";

const ModelViewer = lazy(() => import("@/components/model-viewer"));

export interface PreviewRequest {
  jobId: string;
  fileName: string;
  target: string;
  rows: PreviewRow[];
}

/** Before/after colour per used source filament: from the converted report when there is one, else from the current mapping. */
export function previewRows(a: Analysis, map: number[], opts: { report?: ConvertReport; pauses?: boolean; slots: number }): PreviewRow[] {
  const used = a.filaments.filter((f) => f.used || !a.usedKnown);
  const plan = opts.pauses && !opts.report ? planPauses(a, opts.slots) : null;
  const m = plan ? plan.map : map;
  return used.map((f) => {
    const slot = m[f.index - 1] || 1;
    let after: string | undefined;
    if (opts.report) after = opts.report.filaments.find((x) => x.from.includes(f.index))?.color ?? opts.report.filaments.find((x) => x.slot === slot)?.color;
    else if (plan) after = f.color; // a pause swaps the slot to this colour
    else after = a.filaments.find((x) => m[x.index - 1] === slot && (x.used || !a.usedKnown))?.color;
    return { fil: f.index, type: f.type, before: f.color, after: after || f.color, slot };
  });
}

export function ColourPreviewDialog({
  request,
  onClose,
  load,
}: {
  request: PreviewRequest | null;
  onClose: () => void;
  load: (jobId: string) => Promise<PreviewMesh>;
}) {
  const [mesh, setMesh] = useState<PreviewMesh | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!request) return;
    let live = true;
    setMesh(null);
    setErr("");
    load(request.jobId).then(
      (m) => live && setMesh(m),
      (e) => live && setErr(e?.name === "AbortError" ? "Preview cancelled." : `The preview could not be prepared: ${e?.message || e}`),
    );
    return () => {
      live = false;
    };
  }, [request, load]);
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto p-4 sm:p-6" data-testid="dialog-preview">
        <DialogHeader>
          <DialogTitle>Before and after colours</DialogTitle>
          <DialogDescription>
            <span translate="no">{request?.fileName}</span>
          </DialogDescription>
        </DialogHeader>
        {err ? (
          <p className="text-sm text-destructive" data-testid="preview-error">
            {err}
          </p>
        ) : !mesh || !request ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status" data-testid="preview-loading">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing 3D preview
          </p>
        ) : (
          <Suspense
            fallback={
              <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading 3D viewer
              </p>
            }
          >
            <ModelViewer mesh={mesh} rows={request.rows} beforeLabel="Original" afterLabel={`Converted · ${request.target}`} />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  );
}
