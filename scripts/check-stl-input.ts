import assert from "node:assert/strict";
import {strToU8,unzipSync,strFromU8} from "fflate";
import {stlProject} from "../client/src/engine/stl-input";
const points=[[0,0,0],[0,10,0],[10,0,0],[0,0,10]];
const triangles=[[0,1,2],[0,2,3],[2,1,3],[1,0,3]];
const asc="solid tetra\n"+triangles.map(t=>"facet normal 0 0 0\nouter loop\n"+
  t.map(i=>"vertex "+points[i].join(" ")).join("\n")+"\nendloop\nendfacet").join("\n")+"\nendsolid tetra";
const bin=new Uint8Array(84+50*triangles.length),v=new DataView(bin.buffer);v.setUint32(80,4,true);
triangles.forEach((t,i)=>t.flatMap(j=>points[j]).forEach((x,k)=>v.setFloat32(96+50*i+4*k,x,true)));
const model=(b:Uint8Array)=>strFromU8(unzipSync(stlProject(b))["3D/3dmodel.model"]);
assert.equal(model(strToU8(asc)),model(bin));assert.equal(model(bin).match(/<triangle /g)?.length,4);
assert.throws(()=>stlProject(bin.subarray(0,bin.length-1)));
v.setFloat32(96,NaN,true);assert.throws(()=>stlProject(bin),/Invalid STL vertex/);
assert.throws(()=>stlProject(strToU8("<html>Download model</html>")));
assert.throws(()=>stlProject(strToU8("G28\nM104 S200")));
assert.throws(()=>stlProject(new Uint8Array(16*1048576+1)),/16 MiB/);
console.log("ASCII and binary tetrahedron geometry matches; invalid, truncated, non-model and oversized inputs rejected.");
