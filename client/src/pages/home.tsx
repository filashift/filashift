import { useJsonLd, usePageMeta } from "@/lib/seo";
import { tr, useLang } from "@/lib/i18n";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeftRight, Check, Cpu, Download, FolderOpen, Layers, Loader2, Lock, Printer, ShieldCheck, Sparkles, Tag, Upload, X } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PrinterPicker, slotLabel, TestedNote } from "@/components/printer-picker";
import { FileCard, type Job } from "@/components/file-card";
import { SampleProject } from "@/components/sample-project";
import { openPrinterRequest } from "@/components/printer-request";
import type { BatchItem } from "@/components/batch-panel";
import { ColourPreviewDialog, previewRows, type PreviewRequest } from "@/components/colour-preview";
import type { PreviewMesh } from "@/engine/preview-mesh";
import { ProjectWorker } from "@/lib/project-worker";
import { defaultMapping, planPauses } from "@/engine/mapping";
import type { ConvertOptions, PrinterIndexEntry, PrinterProfile } from "@/engine/types";
import type { PrusaData } from "@/engine/prusa-out";
import { cn } from "@/lib/utils";

const DEFAULT_PRINTER = "flashforge-creator-5-pro";
/** batch limits: files in the list and printers per batch (the main target counts as one) */
export const MAX_FILES = 10;
export const MAX_PRINTERS = 10;
const QUICK = [DEFAULT_PRINTER, "snapmaker-u1", "flashforge-ad5x", "flashforge-creator-5", "bambu-lab-x1-carbon", "bambu-lab-a1", "bambu-lab-p1s", "creality-k2-plus"];

const profileCache = new Map<string, Promise<PrinterProfile>>();
function getProfile(id: string) {
  if (!profileCache.has(id)) {
    profileCache.set(
      id,
      fetch(`./profiles/${id}.json`).then((r) => {
        if (!r.ok) throw new Error(`Could not load the ${id} profile.`);
        return r.json();
      }),
    );
  }
  return profileCache.get(id)!;
}

const jsonCache = new Map<string, Promise<any>>();
function getJson(path: string) {
  if (!jsonCache.has(path)) {
    const p = fetch(path).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${path}.`);
      return r.json();
    });
    p.catch(() => jsonCache.delete(path));
    jsonCache.set(path, p);
  }
  return jsonCache.get(path)!;
}
// PrusaSlicer system presets for a Prusa target (built by scripts/build_prusa_profiles.py)
async function getPrusaData(id: string): Promise<PrusaData> {
  const [common, target] = await Promise.all([getJson("./profiles/prusa/_common.json"), getJson(`./profiles/prusa/${id}.json`)]);
  return { common, target };
}

// only needed once a visitor adds extra printers
const BatchPanel = lazy(() => import("@/components/batch-panel").then((m) => ({ default: m.BatchPanel })));

let seq = 0;

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** One ZIP of converted files, built in the browser (3MF is already compressed, so entries are stored). */
async function zipFiles(files: { name: string; blob: Blob; folder?: string }[]): Promise<Blob> {
  const { zipSync } = await import("fflate");
  const used = new Set<string>();
  const z: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const f of files) {
    const base = (f.folder ? `${f.folder.replace(/[\\/:*?"<>|]+/g, "_")}/` : "") + f.name.replace(/[\\/:*?"<>|]+/g, "_");
    let name = base;
    for (let i = 2; used.has(name.toLowerCase()); i++) name = base.replace(/(\.3mf)?$/i, ` (${i})$1`);
    used.add(name.toLowerCase());
    z[name] = [new Uint8Array(await f.blob.arrayBuffer()), { level: 0 }];
  }
  return new Blob([zipSync(z)], { type: "application/zip" });
}

/** Mobile and low-memory devices draw fewer triangles in the 3D preview. */
function previewBudget() {
  try {
    const small = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    return small || mem <= 4 ? 150_000 : 300_000;
  } catch {
    return 150_000;
  }
}

export default function Home() {
  usePageMeta("FilaShift — Free 3MF converter for Bambu Lab, Flashforge, Creality, Prusa and more");
  const [printers, setPrinters] = useState<PrinterIndexEntry[]>([]);
  // ?printer=<id> (used by the guides) preselects the target printer
  const [targetId, setTargetId] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search || window.location.hash.split("?")[1] || "").get("printer");
      return q && /^[a-z0-9-]+$/.test(q) ? q : DEFAULT_PRINTER;
    } catch {
      return DEFAULT_PRINTER;
    }
  });
  const [nozzle, setNozzle] = useState("0.4");
  const lastBase = useRef("");
  const [profile, setProfile] = useState<PrinterProfile | null>(null);
  const [slots, setSlots] = useState(4);
  const [keepSpeeds, setKeepSpeeds] = useState(false);
  const [recenter, setRecenter] = useState(true);
  const [outFor, setOutFor] = useState<"prusa" | "orca">("prusa");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drag, setDrag] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [zipping, setZipping] = useState(false);
  const batchRef = useRef(batch);
  batchRef.current = batch;
  const batchStop = useRef(false);
  const [preview, setPreview] = useState<PreviewRequest | null>(null);
  const meshCache = useRef<{ id: string; mesh: PreviewMesh } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const jobsRef = useRef(jobs);
  const pool = useRef(new Map<string,ProjectWorker>()).current;
  const mounted = useRef(true);
  useEffect(()=>{
    mounted.current=true;
    return ()=>{mounted.current=false;pool.forEach(p=>p.stop());pool.clear();for(const j of jobsRef.current){
      if(j.thumbUrl) URL.revokeObjectURL(j.thumbUrl);
      if(j.result) URL.revokeObjectURL(j.result.url);
    }batchStop.current=true;for(const b of batchRef.current)if(b.result)URL.revokeObjectURL(b.result.url);};
  },[pool]);
  jobsRef.current = jobs;
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    fetch("./profiles/index.json")
      .then((r) => r.json())
      .then(setPrinters)
      .catch(() => setLoadErr("The printer list could not be loaded. Refresh the page to try again."));
  }, []);

  const target = printers.find((p) => p.id === targetId);
  useEffect(() => {
    if (printers.length && !target) setTargetId(DEFAULT_PRINTER);
  }, [printers, target]);
  const nozzles = target?.nozzles || ["0.4"];
  useEffect(() => {
    if (target && !nozzles.includes(nozzle)) setNozzle("0.4");
  }, [targetId, printers]);
  const nz = nozzles.includes(nozzle) ? nozzle : "0.4";
  const profileId = nz === "0.4" ? targetId : `${targetId}-n${nz.replace(".", "")}`;

  useEffect(() => {
    let live = true;
    setProfile(null);
    getProfile(profileId)
      .then((p) => {
        if (!live) return;
        setProfile(p);
        // switching only the nozzle keeps a slot count the visitor changed
        if (lastBase.current !== (p.base || p.id)) setSlots(p.slots);
        lastBase.current = p.base || p.id;
      })
      .catch((e) => live && setLoadErr(e.message));
    return () => {
      live = false;
    };
  }, [profileId]);

  // reset mappings when the target or slot count changes
  useEffect(() => {
    setJobs((js) =>
      js.map((j) => {
        if (!j.analysis || j.analysis.error) return j;
        if (j.result) URL.revokeObjectURL(j.result.url);
        return { ...j, map: defaultMapping(j.analysis, slots), pauses: false, result: undefined, status: j.status === "converting" ? "converting" : j.status === "error" ? "error" : "ready" };
      }),
    );
  }, [slots, targetId, nz]);

  const patch = (id: string, p: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...p } : j)));
  const prusaChoice = !!target?.prusa && !target?.prusaOnly;
  const usePrusa = !!target?.prusaOnly || (!!target?.prusa && outFor === "prusa");
  const settingsKey=JSON.stringify([profileId,slots,keepSpeeds,recenter,usePrusa]);
  const activeSettings=useRef(settingsKey); activeSettings.current=settingsKey;

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const all = Array.from(list).filter((f) => /\.(3mf|stl)$/i.test(f.name));
      const rejected = Array.from(list).length - all.length;
      const room = Math.max(0, MAX_FILES - jobsRef.current.length);
      const files = all.slice(0, room);
      const over = all.length - files.length;
      if (over) setLoadErr(`Up to ${MAX_FILES} files at a time: ${over} file${over > 1 ? "s were" : " was"} not added. Remove a file to add another.`);
      else if (rejected) setLoadErr(`${rejected} file${rejected > 1 ? "s were" : " was"} skipped: choose an editable .3mf or .stl, not G-code or a link.`);
      else setLoadErr("");
      for (const f of files) {
        if(!mounted.current) break;
        const id = `f${++seq}`;
        const session=new ProjectWorker(f);
        pool.set(id,session);
        jobsRef.current = [...jobsRef.current, { id, name: f.name, size: f.size, status: "reading", map: [] }];
        setJobs((js) => [...js, { id, name: f.name, size: f.size, status: "reading", map: [] }]);
        try {
          // Keep at most one idle unpacked source; older jobs can reopen their local File.
          pool.forEach((p,key)=>{if(key!==id && !p.busy)p.stop()});
          const {analysis:a,thumbnail}=await session.run({kind:"inspect"},stage=>patch(id,{stage}));
          if(!pool.has(id))continue;
          const thumbUrl=thumbnail?URL.createObjectURL(thumbnail):undefined;
          patch(id, {
            analysis: a,
            stage: undefined,
            thumbUrl,
            status: a.error ? "error" : "ready",
            map: a.error ? [] : defaultMapping(a, slotsRef.current),
          });
        } catch (e: any) {
          if(e?.name!=="AbortError")patch(id, { stage:undefined,status: "error", error: `Could not read this file: ${e?.message || e}` });
        }
      }
    },
    [],
  );
  const runConvert = async (id: string) => {
    const job = jobsRef.current.find((j) => j.id === id);
    const session = pool.get(id);
    if (!job || !session || session.busy || !profile || settingsKey!==activeSettings.current) return;
    patch(id, { status: "converting", error: undefined });
    try {
      const plan = job.pauses && job.analysis ? planPauses(job.analysis, slots) : null;
      const base: ConvertOptions = plan ? { map: plan.map, keepSpeeds, recenter, slotColors: plan.slotColors, pauses: plan.changes } : { map: job.map, keepSpeeds, recenter };
      const options: ConvertOptions = usePrusa ? { ...base, output: "prusa", prusa: await getPrusaData(profileId) } : base;
      if(settingsKey!==activeSettings.current){patch(id,{status:"ready",stage:undefined});return}
      const res = await session.run({kind:"convert",profile:{...profile,slots},options},stage=>patch(id,{stage}));
      session.stop();
      if(!pool.has(id))return;
      if(settingsKey!==activeSettings.current){patch(id,{status:"ready",stage:undefined});return}
      const blob = new Blob([res.bytes], { type: "model/3mf" });
      const url = URL.createObjectURL(blob);
      patch(id, { status: "done",stage:undefined, result: { url, blob, name: res.report.outputName, size: res.bytes.length, report: res.report } });
    } catch (e: any) {
      patch(id, { stage:undefined,status: "ready", error: e?.name==="AbortError" ? undefined : `Conversion failed: ${e?.message || e}` });
    }
  };

  const convertAll = async () => {
    for (const j of jobsRef.current) {
      if (j.status === "ready" && j.analysis && (j.analysis.kind === "bambu" || j.analysis.kind === "orca")) await runConvert(j.id);
    }
  };

  const downloadAll = async () => {
    const files = jobsRef.current.flatMap((j) => (j.result?.blob ? [{ name: j.result.name, blob: j.result.blob }] : []));
    if (!files.length) return;
    setZipping(true);
    try {
      saveBlob(await zipFiles(files), `FilaShift ${files.length} files.zip`);
    } catch (e: any) {
      setLoadErr(`The ZIP could not be built: ${e?.message || e}`);
    } finally {
      setZipping(false);
    }
  };

  // ---- batch: every convertible file × [main target, ...extra printers] ----
  const convertible = jobs.filter((j) => j.analysis && !j.analysis.error && (j.analysis.kind === "bambu" || j.analysis.kind === "orca") && j.status !== "reading");
  const extras = extraIds.filter((id) => id !== targetId && printers.some((p) => p.id === id));
  const batchOn = extras.length > 0;
  const batchKey = JSON.stringify([settingsKey, outFor, extras, convertible.map((j) => [j.id, j.map, !!j.pauses])]);
  const clearBatch = () => {
    for (const b of batchRef.current) if (b.result) URL.revokeObjectURL(b.result.url);
    batchRef.current = [];
    setBatch([]);
  };
  // any change to files, printers, mapping or settings makes earlier batch results stale
  useEffect(() => {
    if (batchRunning) {
      batchStop.current = true;
      pool.forEach((p) => p.busy && p.stop());
    }
    clearBatch();
  }, [batchKey]);
  const patchItem = (key: string, p: Partial<BatchItem>) => {
    batchRef.current = batchRef.current.map((b) => (b.key === key ? { ...b, ...p } : b));
    setBatch(batchRef.current);
  };
  const runBatch = async () => {
    if (batchRunning || !profile || !target) return;
    clearBatch();
    const key0 = batchKey;
    const files = convertible;
    const targets = [{ id: targetId, main: true }, ...extras.map((id) => ({ id, main: false }))];
    const label = (id: string) => printers.find((p) => p.id === id)?.model || id;
    const items: BatchItem[] = files.flatMap((j) =>
      targets.map((t) => ({ key: `${j.id}:${t.id}`, jobId: j.id, fileName: j.name, targetId: t.id, target: t.main && nz !== "0.4" ? `${label(t.id)} · ${nz} mm` : label(t.id), status: "queued" as const })),
    );
    batchRef.current = items;
    setBatch(items);
    batchStop.current = false;
    setBatchRunning(true);
    try {
      for (const j of files) {
        const session = pool.get(j.id);
        for (const t of targets) {
          const key = `${j.id}:${t.id}`;
          if (batchStop.current || !session) {
            patchItem(key, { status: "cancelled" });
            continue;
          }
          patchItem(key, { status: "converting", stage: undefined });
          try {
            const a = j.analysis!;
            let prof: PrinterProfile, options: ConvertOptions;
            const entry = printers.find((p) => p.id === t.id)!;
            if (t.main) {
              const plan = j.pauses ? planPauses(a, slots) : null;
              const base: ConvertOptions = plan ? { map: plan.map, keepSpeeds, recenter, slotColors: plan.slotColors, pauses: plan.changes } : { map: j.map, keepSpeeds, recenter };
              prof = { ...profile, slots };
              options = usePrusa ? { ...base, output: "prusa", prusa: await getPrusaData(profileId) } : base;
            } else {
              prof = await getProfile(t.id);
              const base: ConvertOptions = { map: defaultMapping(a, prof.slots), keepSpeeds, recenter };
              const prusa = !!entry.prusaOnly || (!!entry.prusa && outFor === "prusa");
              options = prusa ? { ...base, output: "prusa", prusa: await getPrusaData(t.id) } : base;
            }
            if (batchStop.current) {
              patchItem(key, { status: "cancelled" });
              continue;
            }
            const res = await session.run({ kind: "convert", profile: prof, options }, (stage) => patchItem(key, { stage }));
            if (batchStop.current && !mounted.current) return;
            const blob = new Blob([res.bytes], { type: "model/3mf" });
            patchItem(key, { status: "done", stage: undefined, result: { url: URL.createObjectURL(blob), blob, name: res.report.outputName, size: res.bytes.length, report: res.report } });
          } catch (e: any) {
            patchItem(key, e?.name === "AbortError" ? { status: "cancelled", stage: undefined } : { status: "error", stage: undefined, error: `Conversion failed: ${e?.message || e}` });
          }
        }
        // free the unpacked project before the next file
        session?.stop();
      }
    } finally {
      if (mounted.current) setBatchRunning(false);
      if (key0 !== batchKeyRef.current) clearBatch();
    }
  };
  const batchKeyRef = useRef(batchKey);
  batchKeyRef.current = batchKey;
  const stopBatch = () => {
    batchStop.current = true;
    pool.forEach((p) => p.busy && p.stop());
  };
  const zipBatch = async () => {
    const done = batchRef.current.filter((b) => b.result);
    if (!done.length) return;
    setZipping(true);
    try {
      saveBlob(await zipFiles(done.map((b) => ({ name: b.result!.name, blob: b.result!.blob, folder: b.target }))), `FilaShift batch ${done.length} files.zip`);
    } catch (e: any) {
      setLoadErr(`The ZIP could not be built: ${e?.message || e}`);
    } finally {
      setZipping(false);
    }
  };

  // ---- before/after colour preview ----
  const loadMesh = useCallback(async (jobId: string): Promise<PreviewMesh> => {
    if (meshCache.current?.id === jobId) return meshCache.current.mesh;
    const session = pool.get(jobId);
    if (!session) throw new Error("The file is no longer loaded.");
    if (session.busy) throw new Error("The file is busy. Try again when the current step has finished.");
    meshCache.current = null; // keep at most one preview mesh in memory
    try {
      const mesh = await session.run({ kind: "preview", budget: previewBudget() }, (stage) => patch(jobId, { stage }));
      meshCache.current = { id: jobId, mesh };
      return mesh;
    } finally {
      patch(jobId, { stage: undefined });
    }
  }, []);
  const openPreview = (j: Job) => {
    if (!j.analysis) return;
    setPreview({
      jobId: j.id,
      fileName: j.name,
      target: j.result?.report.target || target?.model || "",
      rows: previewRows(j.analysis, j.map, { report: j.result?.report, pauses: j.pauses, slots }),
    });
  };
  const openBatchPreview = (b: BatchItem) => {
    const j = jobsRef.current.find((x) => x.id === b.jobId);
    if (!j?.analysis || !b.result) return;
    setPreview({ jobId: j.id, fileName: j.name, target: b.target, rows: previewRows(j.analysis, j.map, { report: b.result.report, slots }) });
  };

  const removeJob = (id: string) => {
    const j = jobsRef.current.find((x) => x.id === id);
    if (j?.thumbUrl) URL.revokeObjectURL(j.thumbUrl);
    if (j?.result) URL.revokeObjectURL(j.result.url);
    pool.get(id)?.stop();pool.delete(id);
    if (meshCache.current?.id === id) meshCache.current = null;
    setJobs((js) => js.filter((x) => x.id !== id));
  };

  const pending = jobs.filter((j) => j.status === "ready" && j.analysis && ["bambu", "orca"].includes(j.analysis.kind)).length;
  const done = jobs.filter((j) => j.result).length;
  const quick = QUICK.map((id) => printers.find((p) => p.id === id)).filter(Boolean) as PrinterIndexEntry[];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <Hero
        printers={printers.length || 237}
        brands={new Set(printers.map((p) => p.vendor)).size || 16}
        onChoose={() => inputRef.current?.click()}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Stepper
          steps={[
            { label: "Add a project", short: "Add file", detail: jobs.length ? `${jobs.length} file${jobs.length > 1 ? "s" : ""} added` : "Choose a 3MF or STL", done: jobs.length > 0, target: "add" },
            { label: "Pick your printer", short: "Printer", detail: target ? target.model : "Choose a target", done: jobs.length > 0 && !!profile, target: "settings" },
            { label: "Convert and download", short: "Convert", detail: done ? `${done} ready to download` : "Map colors, then convert", done: done > 0, target: "files" },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="order-2 min-w-0 space-y-4 lg:order-1">
            <details className="rounded-xl border border-card-border bg-card p-4 text-sm" data-testid="mobile-import-help">
              <summary className="cursor-pointer font-semibold">Start with a download from a printer app</summary>
              <ul className="mt-3 space-y-2">
                <li><strong>Bambu Handy:</strong> Open the shared MakerWorld listing, select the print profile and choose Download 3MF.</li>
                <li><strong>Flash Studio:</strong> Save the editable 3MF or STL if the listing offers it. If it only offers Print, get the original file from the creator. A print-history job is not a model file.</li>
                <li><strong>Prusa App:</strong> In EasyPrint, use the orange project menu to download the 3MF, not G-code.</li>
              </ul>
              <p className="mt-3">Save to Files, then choose the file here. A model-page link alone is not a project. STL import starts a new single-material project; STL has no source colors or settings.</p>
            </details>
            <label
              id="add"
              htmlFor="file-input"
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex scroll-mt-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card px-6 text-center transition-colors",
                jobs.length ? "py-6" : "py-14",
                drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40",
              )}
              data-testid="dropzone"
            >
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-6 w-6 text-primary" />
              </span>
              <span className="font-medium">{jobs.length ? "Add another 3MF or STL" : "Choose a 3MF project or STL model"}</span>
              <span className="mt-1 text-sm text-muted-foreground">or click to choose files · several at once is fine</span>
              <span className="mt-1 text-xs text-muted-foreground">STL: up to 16 MiB and 100,000 triangles · dimensions assumed to be in millimeters</span>
              <span className="mt-3 font-mono text-xs text-muted-foreground">MakerWorld · Printables · Bambu Studio · OrcaSlicer · PrusaSlicer · Creality Print · ElegooSlicer · Anycubic Slicer Next · Orca-Flashforge · Snapmaker Orca</span>
              <input
                id="file-input"
                ref={inputRef}
                type="file"
                accept=".3mf,.stl"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
                data-testid="input-file"
              />
            </label>

            <SampleProject />
            {loadErr && (
              <p className="text-sm text-destructive" data-testid="text-load-error">
                {loadErr}
              </p>
            )}

            <div id="files" className="scroll-mt-24" />
            {jobs.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-auto text-sm text-muted-foreground">
                  {`${jobs.length} files · ${done} converted`}
                </span>
                <Button size="sm" onClick={convertAll} disabled={!pending || !profile} data-testid="button-convert-all">
                  {`Convert all (${pending})`}
                </Button>
                <Button size="sm" variant="outline" onClick={downloadAll} disabled={!done || zipping} data-testid="button-download-all">
                  {zipping ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                  Download all (.zip)
                </Button>
              </div>
            )}

            {batchOn && convertible.length > 0 && (
              <Suspense fallback={null}>
              <BatchPanel
                items={batch}
                files={convertible.length}
                printers={extras.length + 1}
                running={batchRunning}
                zipping={zipping}
                onRun={runBatch}
                onCancel={stopBatch}
                onZip={zipBatch}
                onPreview={openBatchPreview}
              />
              </Suspense>
            )}

            {jobs.map((j) => (
              <FileCard
                key={j.id}
                job={j}
                bed={profile?.bed}
                onCancel={()=>{if(j.status==="reading")removeJob(j.id);else pool.get(j.id)?.stop()}}
                slots={slots}
                targetName={target?.model || ""}
                canConvert={!!profile && !batchRunning}
                onExport={async(fmt) => {
                  const session=pool.get(j.id);
                  if (!session || session.busy) throw new Error("The file is busy or no longer loaded.");
                  try{return await session.run({kind:fmt},stage=>patch(j.id,{stage}))}
                  finally{session.stop();patch(j.id,{stage:undefined})}
                }}
                onPauses={(on) =>
                  setJobs((js) =>
                    js.map((x) => {
                      if (x.id !== j.id || !x.analysis) return x;
                      const plan = on ? planPauses(x.analysis, slots) : null;
                      return { ...x, pauses: !!plan, map: plan ? plan.map : defaultMapping(x.analysis, slots) };
                    }),
                  )
                }
                onMap={(fi, s) =>
                  setJobs((js) =>
                    js.map((x) => {
                      if (x.id !== j.id) return x;
                      const m = x.map.slice();
                      m[fi - 1] = s;
                      return { ...x, map: m, pauses: false };
                    }),
                  )
                }
                onConvert={() => runConvert(j.id)}
                onPreview={() => openPreview(j)}
                onRemove={() => removeJob(j.id)}
                onReset={() => {
                  if (j.result) URL.revokeObjectURL(j.result.url);
                  patch(j.id, { result: undefined, status: "ready" });
                }}
              />
            ))}

          </div>

          <aside id="settings" className="order-1 min-w-0 scroll-mt-24 lg:order-2">
            <div className="space-y-5 rounded-xl border border-card-border bg-card p-4 shadow-sm lg:sticky lg:top-20">
              <div>
                <h2 className="mb-2 text-sm font-medium">Target printer</h2>
                <PrinterPicker printers={printers} value={targetId} onChange={setTargetId} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {quick.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setTargetId(p.id)}
                      aria-pressed={p.id === targetId}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        p.id === targetId ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                      )}
                      data-testid={`chip-printer-${p.id}`}
                    >
                      {p.model.replace(/^(Snapmaker|Flashforge|Bambu Lab) /, "")}
                    </button>
                  ))}
                </div>
                {target && <TestedNote id={target.id} model={target.model} slicer={target.slicer} output={usePrusa ? "PrusaSlicer" : target.slicer} />}
                {target?.vendor === "WonderMaker" && <div data-testid="wondermaker-limits" className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {target.id !== "wondermaker-zr-ultra" && <p>Wonderprint-Orca 2.3.2: unverified. Use OrcaSlicer 2.5.2 for converted projects.</p>}
                  {target.id === "wondermaker-zr" && <p>Base ZR: four colors share one nozzle. The two-color PLA bookmark sliced; a mixed PLA/PETG test was rejected because the filament temperatures differed too much.</p>}
                  <a className="text-primary underline" href="./samples/wondermaker-results.json">WonderMaker test results</a>
                </div>}
                {target?.id === "wondermaker-zr-ultra" && <aside className="mt-3 rounded-lg border p-3 text-sm" data-testid="wondermaker-check">
                  <strong>Before slicing on the ZR Ultra</strong>
                  <p>Use standard OrcaSlicer 2.5.2 for converted projects. Wonderprint-Orca 2.3.2 is not supported for this workflow.</p>
                  <p>Open the 3MF as a project. Select the plate fitted to your printer, check the first-layer bed temperature for your filament, and match each preview color to the loaded toolhead. This profile is for the ZR Ultra with four 0.4 mm nozzles, not the Ultra S.</p>
                </aside>}
                <BatchPrinters printers={printers} main={targetId} extras={extras} onChange={setExtraIds} disabled={batchRunning} />
              </div>

              {nozzles.length > 1 && (
                <div>
                  <h2 className="mb-2 text-sm font-medium">Nozzle</h2>
                  <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Nozzle diameter">
                    {nozzles.map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={d === nz}
                        onClick={() => setNozzle(d)}
                        className={cn(
                          "rounded-md px-3 py-1 font-mono text-xs transition-colors",
                          d === nz ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                        data-testid={`nozzle-${d}`}
                      >
                        {d} mm
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">The nozzle fitted to your printer. Layer height and line widths follow it.</p>
                </div>
              )}

              {prusaChoice && (
                <div>
                  <h2 className="mb-2 text-sm font-medium">Output for</h2>
                  <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Output for">
                    {(["prusa", "orca"] as const).map((o) => (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={o === outFor}
                        onClick={() => setOutFor(o)}
                        className={cn(
                          "rounded-md px-3 py-1 text-xs transition-colors",
                          o === outFor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                        data-testid={`output-${o}`}
                      >
                        {o === "prusa" ? "PrusaSlicer" : "OrcaSlicer"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="slots" className="text-sm font-medium">
                  Filament slots
                </Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    id="slots"
                    type="number"
                    min={1}
                    max={16}
                    value={slots}
                    onChange={(e) => {
                      const n = Math.max(1, Math.min(16, parseInt(e.target.value) || 1));
                      setSlots(n);
                    }}
                    className="w-20 font-mono"
                    data-testid="input-slots"
                  />
                  <span className="text-xs text-muted-foreground">
                    {target ? `Default: ${slotLabel(target)}. Change it if you added an AMS, toolhead or multi-material unit.` : ""}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <Label htmlFor="keep-speeds" className="text-sm font-normal leading-snug">
                    Keep the designer's speeds
                    <span className="block text-xs text-muted-foreground">Off: use your printer's speeds, but never faster than the designer chose.</span>
                  </Label>
                  <Switch id="keep-speeds" checked={keepSpeeds} onCheckedChange={setKeepSpeeds} data-testid="switch-keep-speeds" />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <Label htmlFor="recenter" className="text-sm font-normal leading-snug">
                    Center models on the new bed
                    <span className="block text-xs text-muted-foreground">Moves each plate's objects together, keeping their layout.</span>
                  </Label>
                  <Switch id="recenter" checked={recenter} onCheckedChange={setRecenter} data-testid="switch-recenter" />
                </div>
              </div>

              {target && (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-card-border pt-4 text-xs">
                  <dt className="text-muted-foreground">Build volume</dt>
                  <dd className="text-right font-mono">
                    {Math.round(target.bed[0])}×{Math.round(target.bed[1])}×{Math.round(target.height)} mm
                  </dd>
                  <dt className="text-muted-foreground">Open in</dt>
                  <dd className="text-right">{usePrusa ? "PrusaSlicer" : target.slicer}</dd>
                  <dt className="text-muted-foreground">Profile</dt>
                  <dd className="truncate text-right font-mono" title={profile?.machine || target.machine}>
                    {profile ? profile.machine : "loading…"}
                  </dd>
                </dl>
              )}
            </div>
          </aside>
        </div>
        <ColourPreviewDialog request={preview} onClose={() => setPreview(null)} load={loadMesh} />

        <HowItWorks />
        <Brands
          printers={printers}
          onPick={(id) => {
            setTargetId(id);
            document.getElementById("settings")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </main>

      <SiteFooter>
          <p>
            Always open the converted file in your slicer, check the preview and slice it yourself before printing. FilaShift adapts
            settings automatically and cannot guarantee every project prints the same on another machine.
          </p>
          <p>
            Printer, process and filament presets are derived from{" "}
            <a className="underline hover:text-foreground" href="https://github.com/SoftFever/OrcaSlicer" target="_blank" rel="noreferrer">
              OrcaSlicer
            </a>{" "}
            and{" "}
            <a className="underline hover:text-foreground" href="https://github.com/bambulab/BambuStudio" target="_blank" rel="noreferrer">
              Bambu Studio
            </a>{" "}
            system profiles (AGPL-3.0). Conversion approach informed by{" "}
            <a className="underline hover:text-foreground" href="https://github.com/iChristGit/3MF-to-AD5X" target="_blank" rel="noreferrer">
              3MF-to-AD5X
            </a>{" "}
            (MIT).
          </p>
      </SiteFooter>
    </div>
  );
}

function BatchPrinters({ printers, main, extras, onChange, disabled }: { printers: PrinterIndexEntry[]; main: string; extras: string[]; onChange: (ids: string[]) => void; disabled: boolean }) {
  const full = extras.length + 1 >= MAX_PRINTERS;
  return (
    <details className="mt-3 rounded-lg border border-card-border p-2.5 text-sm" open={extras.length > 0 || undefined} data-testid="batch-printers">
      <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium">
        <Layers className="h-4 w-4 text-primary" />
        Convert for more printers at once
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">{`Add up to ${MAX_PRINTERS - 1} more printers. Every file is converted for each one, and you can download them all as one ZIP.`}</p>
      {extras.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" data-testid="batch-printer-list">
          {extras.map((id) => {
            const p = printers.find((x) => x.id === id);
            return (
              <li key={id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/40 bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs">
                <span className="truncate" translate="no">{p?.model || id}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(extras.filter((x) => x !== id))}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50"
                  aria-label="Remove printer"
                  data-testid={`batch-remove-${id}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-2">
        {full ? (
          <p className="text-xs text-muted-foreground" data-testid="batch-printer-limit">{`That is the limit of ${MAX_PRINTERS} printers per batch. Remove one to add another.`}</p>
        ) : (
          !disabled && (
            <PrinterPicker
              printers={printers}
              value=""
              onChange={(id) => id !== main && !extras.includes(id) && onChange([...extras, id])}
              testId="button-batch-printer-picker"
              placeholder="Add a printer"
              exclude={[main, ...extras]}
            />
          )
        )}
      </div>
    </details>
  );
}

function Swoosh() {
  // echoes the swoosh rings of the JTS emblem
  return (
    <svg
      viewBox="0 0 800 420"
      className="pointer-events-none absolute -right-40 -top-10 h-[130%] w-auto opacity-70 sm:-right-24 md:right-0 md:opacity-100"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sw-blue" x1="0" x2="1">
          <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0" />
          <stop offset=".45" stopColor="hsl(var(--primary))" stopOpacity=".55" />
          <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity=".05" />
        </linearGradient>
        <linearGradient id="sw-steel" x1="0" x2="1">
          <stop offset="0" stopColor="#9aa0a8" stopOpacity="0" />
          <stop offset=".5" stopColor="#9aa0a8" stopOpacity=".55" />
          <stop offset="1" stopColor="#9aa0a8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M120 330 C 60 170, 260 40, 520 50 C 660 56, 760 110, 790 150" fill="none" stroke="url(#sw-blue)" strokeWidth="22" strokeLinecap="round" />
      <path d="M190 300 C 150 180, 310 90, 520 92 C 640 94, 720 130, 760 160" fill="none" stroke="url(#sw-steel)" strokeWidth="8" strokeLinecap="round" />
      <path d="M260 380 C 420 430, 660 400, 760 300" fill="none" stroke="url(#sw-blue)" strokeWidth="14" strokeLinecap="round" />
      <path d="M300 360 C 440 395, 620 380, 700 320" fill="none" stroke="url(#sw-steel)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function Hero({ printers, brands, onChoose }: { printers: number; brands: number; onChoose: () => void }) {
  const stats = [
    { icon: Printer, text: `${printers} printers` },
    { icon: Cpu, text: `${brands} brands` },
    { icon: Lock, text: "Runs in your browser" },
    { icon: Sparkles, text: "Free" },
  ];
  return (
    <section id="converter" tabIndex={-1} className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/[0.09] via-background to-background">
      <Swoosh />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-background/70 px-3 py-1 text-xs font-medium text-primary">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span className="sm:hidden">Any brand to any brand, both ways</span>
          <span className="hidden sm:inline">Bambu, Flashforge, Snapmaker, Creality, Prusa and back again</span>
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Convert any 3MF project for <span className="text-primary">any 3D printer</span>.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Drop a project from Bambu Studio, OrcaSlicer, PrusaSlicer, MakerWorld or Printables, choose the printer you own, and FilaShift swaps in its profiles
          while keeping the model, painted colors and print settings. Need a plain mesh? Export 3MF to STL or OBJ. Nothing is uploaded.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button size="lg" onClick={onChoose} data-testid="button-hero-choose">
            <Upload className="mr-2 h-4 w-4" />
            Choose 3MF files
          </Button>
          <Button size="lg" variant="outline" className="bg-background/70" asChild>
            <Link href="/filament" data-testid="link-hero-filament">
              <Tag className="mr-2 h-4 w-4" />
              Compare filament prices
            </Link>
          </Button>
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {stats.map((s) => (
            <li key={s.text} className="flex items-center gap-1.5">
              <s.icon className="h-4 w-4 text-primary" />
              {s.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Stepper({ steps }: { steps: { label: string; short: string; detail: string; done: boolean; target: string }[] }) {
  const current = steps.findIndex((s) => !s.done);
  return (
    <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Progress">
      {steps.map((s, i) => {
        const state = s.done ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s.label}>
            <button
              type="button"
              onClick={() => document.getElementById(s.target)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className={cn(
                "flex w-full flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors sm:flex-row sm:gap-3 sm:p-3 sm:text-left",
                state === "current" ? "border-primary/50 bg-primary/[0.06]" : "border-card-border bg-card hover:border-primary/30",
              )}
              aria-current={state === "current" ? "step" : undefined}
              data-testid={`step-${i + 1}`}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "current" && "border-2 border-primary text-primary",
                  state === "todo" && "border border-border text-muted-foreground",
                )}
              >
                {state === "done" ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium sm:hidden">{s.short}</span>
                <span className="hidden truncate text-sm font-medium sm:block">{s.label}</span>
                <span className="hidden truncate text-xs text-muted-foreground sm:block">{s.detail}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function SectionTitle({ id, kicker, title }: { id: string; kicker: string; title: string }) {
  return (
    <div id={id} tabIndex={-1} className="mb-4 scroll-mt-24">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-primary">{kicker}</div>
      <h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
    </div>
  );
}

function HowItWorks() {
  const lang = useLang(), L = (en: string) => tr(lang, en);
  useJsonLd("ld-howto", {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: L("How to convert a 3MF project for another 3D printer"),
    inLanguage: lang,
    totalTime: "PT2M",
    tool: [{ "@type": "HowToTool", name: L("FilaShift (free, in the browser)") }],
    step: [
      { "@type": "HowToStep", name: L("Drop the project"), text: L("Add a 3MF project from Bambu Studio, OrcaSlicer, PrusaSlicer, MakerWorld or Printables to FilaShift.") },
      { "@type": "HowToStep", name: L("Pick your printer"), text: L("Choose the printer you own and check how each color maps to your filament slots.") },
      { "@type": "HowToStep", name: L("Convert and download"), text: L("Convert, download the new 3MF and read the conversion report.") },
      { "@type": "HowToStep", name: L("Open, check and slice"), text: L("Open it in your slicer with File → Open Project (not Import), check the preview and slice.") },
    ],
  });
  const steps = [
    { icon: FolderOpen, title: "Drop the project", text: "3MF projects from Bambu Studio, OrcaSlicer and its forks, and PrusaSlicer, including MakerWorld and Printables downloads with several plates and painted colors." },
    { icon: Cpu, title: "Pick your printer", text: "Any of the supported printers, in either direction. Colors are matched to your slots, and extra colors share the closest slot." },
    { icon: ShieldCheck, title: "Review and print", text: "Open the new file with File → Open Project, check the warnings in the report, then slice." },
  ];
  return (
    <section className="mt-14">
      <SectionTitle id="how" kicker="How it works" title="How to convert a 3MF for another printer" />
      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={i} className="rounded-xl border border-card-border bg-card p-5">
            <div className="flex items-center gap-3">
              <span data-testid="how-step-number" aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold tabular-nums text-primary-foreground">{i + 1}</span>
              <h3 className="flex-1 text-base font-semibold">{s.title}</h3>
              <s.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function shortModel(model: string, brand: string) {
  const rest = model.replace(new RegExp(`^${brand} `, "i"), "");
  return rest.length < 3 ? model : rest;
}

function Brands({ printers, onPick }: { printers: PrinterIndexEntry[]; onPick: (id: string) => void }) {
  const byBrand = new Map<string, PrinterIndexEntry[]>();
  for (const p of printers) byBrand.set(p.vendor, [...(byBrand.get(p.vendor) || []), p]);
  const brands = [...byBrand.entries()].sort((a, b) => b[1].length - a[1].length);
  if (!brands.length) return null;
  return (
    <section className="mt-14">
      <SectionTitle id="printers" kicker="Supported printers" title={`${printers.length} printers from ${brands.length} brands`} />
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">Pick a brand to set its most popular model as your target, or search every model in the printer list.</p>
      <p className="-mt-2 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Link href="/tested" className="font-medium text-primary underline" data-testid="link-tested-results">See the slicer test results for every printer</Link>
        <button type="button" className="text-muted-foreground underline hover:text-foreground" onClick={() => openPrinterRequest()} data-testid="link-request-printer">Printer not listed? Request it</button>
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {brands.map(([brand, list]) => {
          const pick = list.find((p) => p.popular) || list[0];
          return (
            <button
              key={brand}
              type="button"
              onClick={() => onPick(pick.id)}
              className="group rounded-xl border border-card-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.04]"
              data-testid={`brand-${brand.toLowerCase()}`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{brand}</span>
                <span className="font-mono text-xs text-muted-foreground">{list.length}</span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground group-hover:text-primary">{shortModel(pick.model, brand)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
