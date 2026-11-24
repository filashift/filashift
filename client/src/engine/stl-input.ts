import {strFromU8,strToU8,zipSync} from "fflate";

// STL is geometry, not a project. Wrap the mesh as a single-material source so
// the same destination preset and placement logic as project conversion applies.
export function stlProject(bytes: Uint8Array): Uint8Array {
  if(bytes.length>16*1048576)throw Error("STL input exceeds the 16 MiB limit.");
  const vertices:string[]=[], faces:string[]=[], seen=new Map<string,number>();let minZ=Infinity;
  function triangle(coords:number[]) {
    if(faces.length>=100000)throw Error("This STL exceeds the mobile limit of 100,000 triangles.");
    if(coords.length!==9 || !coords.every(x=>Number.isFinite(x)&&Math.abs(x)<1e7))throw Error("Invalid STL vertex coordinates.");
    const ids:number[]=[];
    for(let i=0;i<9;i+=3){
      const [x,y,z]=coords.slice(i,i+3), key=`${x},${y},${z}`;
      minZ=Math.min(minZ,z);
      let n=seen.get(key);
      if(n===undefined){n=vertices.length;seen.set(key,n);vertices.push(`<vertex x="${x}" y="${y}" z="${z}"/>`)}
      ids.push(n);
    }
    faces.push(`<triangle v1="${ids[0]}" v2="${ids[1]}" v3="${ids[2]}"/>`);
  }
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const count=bytes.length>=84?dv.getUint32(80,true):0;
  if(count && 84+count*50===bytes.length){
    if(count>100000)throw Error("This STL exceeds the mobile limit of 100,000 triangles.");
    for(let i=0;i<count;i++)triangle(Array.from({length:9},(_,j)=>dv.getFloat32(96+i*50+j*4,true)));
  }else{
    const text=strFromU8(bytes).trim(); if(!/^solid(?:\s|$)/i.test(text)||!/\bendsolid\b/i.test(text))throw Error("Not a complete binary or ASCII STL.");
    const facets=text.matchAll(/\bfacet\s+normal\b([\s\S]*?)\bendfacet\b/gi);
    for (const f of facets) {
      const vs=[...f[1].matchAll(/\bvertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/gi)];
      if(vs.length!==3)throw Error("Invalid STL facet.");
      triangle(vs.flatMap(v=>v.slice(1).map(Number)));
    }
    if((text.match(/\bfacet\s+normal\b/gi)||[]).length!==faces.length)throw Error("Incomplete STL facet.");
  }
  if(!faces.length)throw Error("The STL contains no triangles.");
  const xml=`<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices>${vertices.join("")}</vertices><triangles>${faces.join("")}</triangles></mesh></object></resources><build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 ${-minZ}" printable="1"/></build></model>`;
  return zipSync({
    "[Content_Types].xml":strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),
    "_rels/.rels":strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
    "3D/3dmodel.model":strToU8(xml),
    "Metadata/model_settings.config":strToU8('<config><object id="1"><metadata key="name" value="Imported STL"/><metadata key="extruder" value="1"/></object><plate><metadata key="plater_id" value="1"/><model_instance><metadata key="object_id" value="1"/><metadata key="instance_id" value="0"/></model_instance></plate></config>'),
    // Reference XY frame only; replaced by the destination machine. The placement
    // engine requires a source frame to translate world-space bounds onto a bed.
    "Metadata/project_settings.config":strToU8(JSON.stringify({filament_type:["PLA"],filament_colour:["#B0B0B0"],layer_height:"0.2",printable_area:["0x0","256x0","256x256","0x256"]}))
  },{level:1});
}
