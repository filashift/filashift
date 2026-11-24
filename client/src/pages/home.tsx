import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FolderOpen, Lock, Moon, Sun, Upload, Cpu, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PrinterPicker, slotLabel } from "@/components/printer-picker";
import { FileCard, type Job } from "@/components/file-card";
import { analyze, convert, defaultMapping, type Loaded } from "@/engine/engine";
import type { PrinterIndexEntry, PrinterProfile } from "@/engine/types";
import { cn } from "@/lib/utils";

const DEFAULT_PRINTER = "snapmaker-u1";
// public source repository (AGPL-3.0). Set VITE_SOURCE_URL at build time; the link is hidden until then.
const SOURCE_URL: string = (import.meta as any).env?.VITE_SOURCE_URL || "";
const COMPANY = "Jackson Technology Solutions LLC, a subsidiary of Jackson Consolidated Group of Companies LLC";
const QUICK = ["snapmaker-u1", "flashforge-ad5x", "flashforge-creator-5", "bambu-lab-x1-carbon", "bambu-lab-a1", "bambu-lab-p1s", "creality-k2-plus"];

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-label="FilaShift logo">
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <path d="M7 20h11M7 15h14M7 10h9" className="stroke-primary-foreground" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M20 21.5l5-4-5-4" fill="none" className="stroke-primary-foreground" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const loadedFiles = new Map<string, Loaded>();
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

let seq = 0;
const tick = () => new Promise((r) => setTimeout(r, 30));

export default function Home() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [printers, setPrinters] = useState<PrinterIndexEntry[]>([]);
  const [targetId, setTargetId] = useState(DEFAULT_PRINTER);
  const [profile, setProfile] = useState<PrinterProfile | null>(null);
  const [slots, setSlots] = useState(4);
  const [keepSpeeds, setKeepSpeeds] = useState(false);
  const [recenter, setRecenter] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drag, setDrag] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    fetch("./profiles/index.json")
      .then((r) => r.json())
      .then(setPrinters)
      .catch(() => setLoadErr("The printer list could not be loaded. Refresh the page to try again."));
  }, []);

  const target = printers.find((p) => p.id === targetId);

  useEffect(() => {
    let live = true;
    setProfile(null);
    getProfile(targetId)
      .then((p) => {
        if (!live) return;
        setProfile(p);
        setSlots(p.slots);
      })
      .catch((e) => live && setLoadErr(e.message));
    return () => {
      live = false;
    };
  }, [targetId]);

  // reset mappings when the target or slot count changes
  useEffect(() => {
    setJobs((js) =>
      js.map((j) => {
        if (!j.analysis || j.analysis.error) return j;
        if (j.result) URL.revokeObjectURL(j.result.url);
        return { ...j, map: defaultMapping(j.analysis, slots), result: undefined, status: j.status === "error" ? j.status : "ready" };
      }),
    );
  }, [slots, targetId]);

  const patch = (id: string, p: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...p } : j)));

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const files = Array.from(list).filter((f) => /\.3mf$/i.test(f.name));
      const rejected = Array.from(list).length - files.length;
      if (rejected) setLoadErr(`${rejected} file${rejected > 1 ? "s were" : " was"} skipped: only .3mf projects are supported.`);
      else setLoadErr("");
      for (const f of files) {
        const id = `f${++seq}`;
        setJobs((js) => [...js, { id, name: f.name, size: f.size, status: "reading", map: [] }]);
        await tick();
        try {
          const bytes = new Uint8Array(await f.arrayBuffer());
          const L = analyze(bytes, f.name);
          loadedFiles.set(id, L);
          const a = L.analysis;
          let thumbUrl: string | undefined;
          if (a.thumbnail && L.entries[a.thumbnail]) {
            thumbUrl = URL.createObjectURL(new Blob([L.entries[a.thumbnail]], { type: "image/png" }));
          }
          patch(id, {
            analysis: a,
            thumbUrl,
            status: a.error ? "error" : "ready",
            map: a.error ? [] : defaultMapping(a, slotsRef.current),
          });
        } catch (e: any) {
          patch(id, { status: "error", error: `Could not read this file: ${e?.message || e}` });
        }
      }
    },
    [],
  );
  const runConvert = async (id: string) => {
    const job = jobsRef.current.find((j) => j.id === id);
    const L = loadedFiles.get(id);
    if (!job || !L || !profile) return;
    patch(id, { status: "converting", error: undefined });
    await tick();
    try {
      const res = convert(L, { ...profile, slots }, { map: job.map, keepSpeeds, recenter });
      const url = URL.createObjectURL(new Blob([res.bytes], { type: "model/3mf" }));
      patch(id, { status: "done", result: { url, name: res.report.outputName, size: res.bytes.length, report: res.report } });
    } catch (e: any) {
      patch(id, { status: "ready", error: `Conversion failed: ${e?.message || e}` });
    }
  };

  const convertAll = async () => {
    for (const j of jobsRef.current) {
      if (j.status === "ready" && j.analysis && (j.analysis.kind === "bambu" || j.analysis.kind === "orca")) await runConvert(j.id);
    }
  };

  const downloadAll = async () => {
    for (const j of jobsRef.current) {
      if (!j.result) continue;
      const a = document.createElement("a");
      a.href = j.result.url;
      a.download = j.result.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 400));
    }
  };

  const removeJob = (id: string) => {
    const j = jobsRef.current.find((x) => x.id === id);
    if (j?.thumbUrl) URL.revokeObjectURL(j.thumbUrl);
    if (j?.result) URL.revokeObjectURL(j.result.url);
    loadedFiles.delete(id);
    setJobs((js) => js.filter((x) => x.id !== id));
  };

  const pending = jobs.filter((j) => j.status === "ready" && j.analysis && ["bambu", "orca"].includes(j.analysis.kind)).length;
  const done = jobs.filter((j) => j.result).length;
  const quick = QUICK.map((id) => printers.find((p) => p.id === id)).filter(Boolean) as PrinterIndexEntry[];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight">FilaShift</span>
            <span className="text-xs text-muted-foreground">by JTS</span>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="mr-1 hidden h-3.5 w-3.5 sm:block" />
            <span className="mr-2 hidden sm:inline">Files stay on your device</span>
            <Button size="icon" variant="ghost" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" data-testid="button-theme">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <section className="mb-8 max-w-2xl">
          <h1 className="text-xl font-bold tracking-tight">Move a 3MF project to a different printer</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Drop a project from any Bambu Studio or Orca-family slicer, choose the printer you own, and map the colours to its slots.
            It works in every direction: Bambu to Flashforge, Snapmaker, Creality or Prusa, and back to Bambu again.
            FilaShift swaps in that printer's profiles, keeps the designer's model, painting and print settings, and removes
            anything unsafe for your machine. Everything runs in this browser tab.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="order-2 min-w-0 space-y-4 lg:order-1">
            <label
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
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-colors",
                jobs.length ? "py-6" : "py-14",
                drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40",
              )}
              data-testid="dropzone"
            >
              <Upload className="mb-3 h-7 w-7 text-primary" />
              <span className="font-medium">{jobs.length ? "Add more 3MF projects" : "Drop your 3MF project here"}</span>
              <span className="mt-1 text-sm text-muted-foreground">or click to choose files · several at once is fine</span>
              <span className="mt-3 font-mono text-xs text-muted-foreground">MakerWorld · Bambu Studio · OrcaSlicer · Creality Print · Orca-Flashforge · Snapmaker Orca</span>
              <input
                id="file-input"
                ref={inputRef}
                type="file"
                accept=".3mf"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
                data-testid="input-file"
              />
            </label>

            {loadErr && (
              <p className="text-sm text-destructive" data-testid="text-load-error">
                {loadErr}
              </p>
            )}

            {jobs.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-auto text-sm text-muted-foreground">
                  {jobs.length} files · {done} converted
                </span>
                <Button size="sm" onClick={convertAll} disabled={!pending || !profile} data-testid="button-convert-all">
                  Convert all ({pending})
                </Button>
                <Button size="sm" variant="outline" onClick={downloadAll} disabled={!done} data-testid="button-download-all">
                  <Download className="mr-1.5 h-4 w-4" />
                  Download all
                </Button>
              </div>
            )}

            {jobs.map((j) => (
              <FileCard
                key={j.id}
                job={j}
                slots={slots}
                targetName={target?.model || ""}
                canConvert={!!profile}
                onMap={(fi, s) =>
                  setJobs((js) =>
                    js.map((x) => {
                      if (x.id !== j.id) return x;
                      const m = x.map.slice();
                      m[fi - 1] = s;
                      return { ...x, map: m };
                    }),
                  )
                }
                onConvert={() => runConvert(j.id)}
                onRemove={() => removeJob(j.id)}
                onReset={() => {
                  if (j.result) URL.revokeObjectURL(j.result.url);
                  patch(j.id, { result: undefined, status: "ready" });
                }}
              />
            ))}

            {!jobs.length && <HowItWorks />}
          </div>

          <aside className="order-1 lg:order-2">
            <div className="space-y-5 rounded-xl border border-card-border bg-card p-4 lg:sticky lg:top-6">
              <div>
                <h2 className="mb-2 text-sm font-medium">Target printer</h2>
                <PrinterPicker printers={printers} value={targetId} onChange={setTargetId} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {quick.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setTargetId(p.id)}
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
              </div>

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
                    Centre models on the new bed
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
                  <dd className="text-right">{target.slicer}</dd>
                  <dt className="text-muted-foreground">Profile</dt>
                  <dd className="truncate text-right font-mono" title={target.machine}>
                    {profile ? target.machine : "loading…"}
                  </dd>
                </dl>
              )}
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs text-muted-foreground sm:px-6">
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
            (MIT). Not affiliated with Bambu Lab, Snapmaker, Flashforge, Creality, Prusa or MakerWorld.
          </p>
          <p>
            {SOURCE_URL && (
              <>
                FilaShift is free software under the AGPL-3.0.{" "}
                <a className="underline hover:text-foreground" href={SOURCE_URL} target="_blank" rel="noreferrer" data-testid="link-source">
                  Source code on GitHub
                </a>
                .{" "}
              </>
            )}
            © {new Date().getFullYear()} {COMPANY}.
          </p>
        </div>
      </footer>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: FolderOpen, title: "Drop the project", text: "3MF projects from Bambu Studio, OrcaSlicer and its forks, including MakerWorld downloads with several plates and painted colours." },
    { icon: Cpu, title: "Pick your printer", text: "225 printers from 15 brands, in either direction. Colours are matched to your slots, and extra colours share the closest slot." },
    { icon: ShieldCheck, title: "Review and print", text: "Open the new file with File → Open Project, check the warnings in the report, then slice." },
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {steps.map((s, i) => (
        <li key={i} className="rounded-xl border border-card-border bg-card p-4">
          <s.icon className="mb-3 h-5 w-5 text-primary" />
          <div className="text-sm font-medium">
            <span className="mr-1.5 font-mono text-muted-foreground">{i + 1}</span>
            {s.title}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}
