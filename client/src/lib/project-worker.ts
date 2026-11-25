import type { Analysis, ConvertOptions, ConvertResult, PrinterProfile } from "@/engine/types";
import type { ExportResult } from "@/engine/export";
import type { PreviewMesh } from "@/engine/preview-mesh";
type Payload = {kind:"inspect"|"convert"|"stl"|"obj"|"preview";profile?:PrinterProfile;options?:ConvertOptions;budget?:number};
export class ProjectWorker {
  private worker?:Worker;
  private abort?:()=>void;
  get busy(){return !!this.abort}
  constructor(private file:File){}
  run(p:{kind:"inspect"},stage:(s:string)=>void):Promise<{analysis:Analysis;thumbnail?:Blob}>;
  run(p:{kind:"convert";profile:PrinterProfile;options:ConvertOptions},stage:(s:string)=>void):Promise<ConvertResult>;
  run(p:{kind:"stl"|"obj"},stage:(s:string)=>void):Promise<ExportResult>;
  run(p:{kind:"preview";budget:number},stage:(s:string)=>void):Promise<PreviewMesh>;
  async run(p:Payload,stage:(s:string)=>void):Promise<any>{
    if(this.busy) throw Error("Another operation is still running.");
    this.worker ??= new Worker(new URL("../engine/converter.worker.ts",import.meta.url),{type:"module"});
    const w=this.worker;
    return new Promise((resolve,reject)=>{
      this.abort=()=>{this.abort=undefined;reject(new DOMException("Canceled","AbortError"))};
      const finish=()=>{this.abort=undefined;w.onmessage=null;w.onerror=null};
      w.onmessage=({data})=>{
        if(data.stage){stage(data.stage);return}
        finish();
        if(data.error){this.stop();reject(Error(data.error))}else resolve(data.value);
      };
      w.onerror=e=>{finish();this.stop();reject(Error(e.message||"Could not start background processing."))};
      try{w.postMessage({...p,file:this.file})}catch(e){finish();this.stop();reject(e)}
    });
  }
  stop(){this.worker?.terminate();this.worker=undefined;this.abort?.()}
}
