import { analyze, convert, type Loaded } from "./engine";
import { exportMesh } from "./export";
import { stlProject } from "./stl-input";
import { buildPreview } from "./preview-mesh";
import type { PrinterProfile, ConvertOptions } from "./types";
type Request = { file: File; kind: "inspect" | "convert" | "stl" | "obj" | "preview"; profile?:PrinterProfile; options?:ConvertOptions; budget?:number };
let loaded: Loaded | undefined;
const stage = (stage:string) => self.postMessage({stage});
self.onmessage = async ({data}:MessageEvent<Request>) => {
  try {
    if (!loaded) {
      stage("Reading project");
      const mesh=/\.stl$/i.test(data.file.name);
      if(mesh&&data.file.size>16*1048576)throw Error("STL input exceeds the 16 MiB limit.");
      const bytes=new Uint8Array(await data.file.arrayBuffer());
      loaded = analyze(mesh?stlProject(bytes):bytes,data.file.name.replace(/\.stl$/i,".3mf"),stage);
      if(mesh){
        loaded.analysis.sourceSlicer="STL";
        loaded.analysis.notes.unshift("STL geometry only. Units assumed millimeters; a neutral PLA slot was assigned. Check scale and choose your material before printing.");
      }
      if (loaded.analysis.error) throw Error(loaded.analysis.error);
    }
    if (data.kind==="inspect") {
      const thumb=loaded.analysis.thumbnail && loaded.entries[loaded.analysis.thumbnail];
      self.postMessage({value:{analysis:loaded.analysis,thumbnail:thumb ? new Blob([thumb],{type:"image/png"}) : undefined}});
    } else if (data.kind==="convert") {
      stage("Applying printer settings");
      const r=convert(loaded,data.profile!,data.options!,()=>stage("Packaging download"));
      self.postMessage({value:r}, {transfer:[r.bytes.buffer]});
    } else if (data.kind==="preview") {
      stage("Preparing 3D preview");
      const p=buildPreview(loaded.entries,data.budget);
      self.postMessage({value:p},{transfer:p.plates.flatMap(x=>[x.pos.buffer,x.fil.buffer])});
    } else {
      stage(data.kind==="stl"?"Exporting STL":"Exporting OBJ");
      self.postMessage({value:exportMesh(loaded.entries,data.file.name,data.kind)});
    }
  } catch(e) {
    self.postMessage({error:e instanceof RangeError ? "Not enough memory for this project. Try a smaller file or a device with more memory." : String(e instanceof Error ? e.message : e)});
  }
};
