import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT, trReport } from "@/lib/i18n";
import { ProjectWorker } from "@/lib/project-worker";
import { defaultMapping } from "@/engine/mapping";
import type { Analysis, ConvertReport, PrinterProfile } from "@/engine/types";
import { DownloadSummary } from "./download-summary";
import evidence from "../../public/samples/test-results.json";
const destinations = evidence.results;

export function SampleProject() {
  const T=useT(), lang=T.lang;
  const [pick,setPick]=useState(0), [busy,setBusy]=useState(false), [error,setError]=useState(false);
  const [done,setDone]=useState<{url:string; report:ConvertReport; source:Analysis}|null>(null);
  const active=useRef<AbortController>(), worker=useRef<ProjectWorker>(), blob=useRef("");
  const {id,slicer,version}=destinations[pick];
  function clear() {
    active.current?.abort(); worker.current?.stop();
    if(blob.current) URL.revokeObjectURL(blob.current);
    blob.current="";
  }
  useEffect(()=>()=>clear(),[]);
  async function run() {
    clear(); setDone(null); setError(false); setBusy(true);
    const ctl=new AbortController(); active.current=ctl;
    try {
      const responses=await Promise.all(["./samples/filashift-nameplate.3mf",`./profiles/${id}.json`].map(url=>fetch(url,{signal:ctl.signal})));
      if(responses.some(r=>!r.ok)) throw Error();
      const [file,profile]:[Blob,PrinterProfile]=await Promise.all([responses[0].blob(),responses[1].json()]);
      if(ctl.signal.aborted) return;
      const w=new ProjectWorker(new File([file],"filashift-nameplate.3mf")); worker.current=w;
      const {analysis}=await w.run({kind:"inspect"},()=>{});
      const r=await w.run({kind:"convert",profile,options:{map:defaultMapping(analysis,profile.slots),keepSpeeds:false,recenter:true}},()=>{});
      if(ctl.signal.aborted) return;
      blob.current=URL.createObjectURL(new Blob([new Uint8Array(r.bytes)],{type:"application/octet-stream"}));
      setDone({url:blob.current,report:r.report,source:analysis});
    } catch { if(!ctl.signal.aborted) setError(true); }
    finally { if(!ctl.signal.aborted) {worker.current?.stop();setBusy(false);} }
  }
  return <details className="rounded-xl border border-card-border bg-card p-4 text-sm" translate="no" data-testid="sample-panel">
    <summary className="cursor-pointer font-semibold text-primary">{T("Try a sample project")}</summary>
    <p className="my-3">{T("Convert our two-color FS nameplate without uploading a file. Choose a destination tested with this exact sample.")}</p>
    <a className="mb-3 inline-block text-primary underline" href="./samples/filashift-nameplate.3mf" download>{T("Download the PrusaSlicer original (.3mf)")}</a>
    <div className="flex flex-wrap items-end gap-2"><label className="grid gap-1">{T("Destination printer")}
      <select className="rounded border bg-background p-2" data-testid="sample-target" value={pick} disabled={busy} onChange={e=>{clear();setDone(null);setError(false);setPick(Number(e.target.value));}}>
        {destinations.map((d,i)=><option value={i} key={d.id}>{d.model}</option>)}</select></label>
      <Button disabled={busy} onClick={run} data-testid="sample-run">{busy?(T("Converting…")):(T("Convert sample"))}</Button></div>
    {error&&<p role="alert">{T("Could not convert the sample. Please try again.")}</p>}
    {done&&<div aria-live="polite" className="mt-4 space-y-2 border-t pt-3" data-testid="sample-result">
      <p><b>{T("Stayed the same: ")}</b>{T("the plate, the FS lettering, and both PLA colors.")}</p>
      <DownloadSummary report={done.report} source={done.source} />
      <p><b>{T("Check next: ")}</b>{T("In {slicer}, use File → Open Project (not Import). Check the two color assignments and first layer before printing.",{slicer})}</p>
      {done.report.lines.filter(l=>l.level==="warn").map((l,i)=><p key={i} className="text-xs">{trReport(lang,l.text)}</p>)}
      <a className="inline-block rounded bg-primary px-3 py-2 font-medium text-primary-foreground" href={done.url} download={done.report.outputName} data-testid="sample-download">{T("Download converted project (.3mf)")}</a>
      <p className="text-xs text-muted-foreground">{T("Sample sliced in the destination software.")} {slicer} {version} · {evidence.date}. <a href="./samples/test-results.json" className="underline">{T("View test record")}</a></p>
    </div>}
  </details>;
}
