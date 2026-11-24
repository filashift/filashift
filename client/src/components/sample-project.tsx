import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLang, trReport } from "@/lib/i18n";
import { ProjectWorker } from "@/lib/project-worker";
import { defaultMapping } from "@/engine/mapping";
import type { ConvertReport, PrinterProfile } from "@/engine/types";
import evidence from "../../public/samples/test-results.json";
const destinations = evidence.results;

export function SampleProject() {
  const lang=useLang(), es=lang==="es";
  const [pick,setPick]=useState(0), [busy,setBusy]=useState(false), [error,setError]=useState(false);
  const [done,setDone]=useState<{url:string; report:ConvertReport}|null>(null);
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
      setDone({url:blob.current,report:r.report});
    } catch { if(!ctl.signal.aborted) setError(true); }
    finally { if(!ctl.signal.aborted) {worker.current?.stop();setBusy(false);} }
  }
  return <details className="rounded-xl border border-card-border bg-card p-4 text-sm" translate="no" data-testid="sample-panel">
    <summary className="cursor-pointer font-semibold text-primary">{es?"Probar un proyecto de ejemplo":"Try a sample project"}</summary>
    <p className="my-3">{es?"Convierte nuestra placa «FS» de dos colores sin subir archivos. Elige un destino probado para esta placa.":"Convert our two-color FS nameplate without uploading a file. Choose a destination tested with this exact sample."}</p>
    <a className="mb-3 inline-block text-primary underline" href="./samples/filashift-nameplate.3mf" download>{es?"Descargar el original de PrusaSlicer (.3mf)":"Download the PrusaSlicer original (.3mf)"}</a>
    <div className="flex flex-wrap items-end gap-2"><label className="grid gap-1">{es?"Impresora de destino":"Destination printer"}
      <select className="rounded border bg-background p-2" data-testid="sample-target" value={pick} disabled={busy} onChange={e=>{clear();setDone(null);setError(false);setPick(Number(e.target.value));}}>
        {destinations.map((d,i)=><option value={i} key={d.id}>{d.model}</option>)}</select></label>
      <Button disabled={busy} onClick={run} data-testid="sample-run">{busy?(es?"Convirtiendo…":"Converting…"):(es?"Convertir ejemplo":"Convert sample")}</Button></div>
    {error&&<p role="alert">{es?"No se pudo convertir. Vuelve a intentarlo.":"Could not convert the sample. Please try again."}</p>}
    {done&&<div aria-live="polite" className="mt-4 space-y-2 border-t pt-3" data-testid="sample-result">
      <p><b>{es?"Se conservó: ":"Stayed the same: "}</b>{es?"la placa, las letras FS y los dos colores PLA.":"the plate, the FS lettering, and both PLA colors."}</p>
      <p><b>{es?"Cambió: ":"Changed: "}</b>{done.report.target} · {done.report.process}</p>
      <p>{done.report.filaments.filter(f=>f.from.length).map(f=>`${es?"Posición":"Slot"} ${f.slot}: ${f.type} ${f.color}`).join(" · ")}</p>
      <p><b>{es?"Revisa: ":"Check next: "}</b>{es?`En ${slicer}, usa Archivo → Abrir proyecto (no Importar). Comprueba los dos colores y la primera capa antes de imprimir.`:`In ${slicer}, use File → Open Project (not Import). Check the two color assignments and first layer before printing.`}</p>
      {done.report.lines.filter(l=>l.level==="warn").map((l,i)=><p key={i} className="text-xs">{trReport(lang,l.text)}</p>)}
      <a className="inline-block rounded bg-primary px-3 py-2 font-medium text-primary-foreground" href={done.url} download={done.report.outputName} data-testid="sample-download">{es?"Descargar proyecto convertido (.3mf)":"Download converted project (.3mf)"}</a>
      <p className="text-xs text-muted-foreground">{es?"Ejemplo laminado en el programa de destino; sin prueba de impresión física.":"Sample sliced in the destination software; not physically printed."} {slicer} {version} · {evidence.date}. <a href="./samples/test-results.json" className="underline">{es?"Ver prueba":"View test record"}</a></p>
    </div>}
  </details>;
}
