import { analyze, convert, type Loaded } from "./engine";
import { exportMesh } from "./export";
import type { PrinterProfile, ConvertOptions } from "./types";
type Request = { file: File; kind: "inspect" | "convert" | "stl" | "obj"; profile?:PrinterProfile; options?:ConvertOptions };
let loaded: Loaded | undefined;
const stage = (stage:string) => self.postMessage({stage});
self.onmessage = async ({data}:MessageEvent<Request>) => {
  try {
    if (!loaded) {
      stage("Reading project");
      loaded = analyze(new Uint8Array(await data.file.arrayBuffer()), data.file.name);
      if (loaded.analysis.error) throw Error(loaded.analysis.error);
    }
    if (data.kind==="inspect") {
      const thumb=loaded.analysis.thumbnail && loaded.entries[loaded.analysis.thumbnail];
      self.postMessage({value:{analysis:loaded.analysis,thumbnail:thumb ? new Blob([thumb],{type:"image/png"}) : undefined}});
    } else if (data.kind==="convert") {
      stage("Applying printer settings");
      const r=convert(loaded,data.profile!,data.options!,()=>stage("Packaging download"));
      self.postMessage({value:r}, {transfer:[r.bytes.buffer]});
    } else {
      stage(data.kind==="stl"?"Exporting STL":"Exporting OBJ");
      self.postMessage({value:exportMesh(loaded.entries,data.file.name,data.kind)});
    }
  } catch(e) {
    self.postMessage({error:e instanceof RangeError ? "Not enough memory for this project. Try a smaller file or a device with more memory." : String(e instanceof Error ? e.message : e)});
  }
};
