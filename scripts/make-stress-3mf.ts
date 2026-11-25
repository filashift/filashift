// Synthetic stress project for performance work: many painted triangles on several plates.
// npx tsx scripts/make-stress-3mf.ts OUT.3mf [--tris 800000] [--plates 3] [--objects 2] [--paint 0.7] [--template ~/td/x1c_paint.3mf]
// Deterministic (seeded). Each object is a closed UV sphere (2*lon*(lat-1) triangles) living in its own
// 3D/Objects/object_N.model file, like Bambu Studio writes them. Paint strings are random Bambu
// paint_color trees (up to depth 3, states 1-4) on the given share of triangles. The settings come from
// the template project (default: the 4-filament x1c_paint fixture, Bambu X1 Carbon); when that file does
// not exist (or --template none), a minimal built-in 4-filament X1 Carbon project header is used.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";

const args = process.argv.slice(2);
const out = args.shift();
if (!out) throw Error("usage: make-stress-3mf.ts OUT.3mf [--tris N] [--plates P] [--objects K] [--paint F] [--template FILE]");
const opt = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const TRIS = +opt("tris", "800000"), PLATES = +opt("plates", "3"), PER = +opt("objects", "2"), PAINT = +opt("paint", "0.7");
const template = opt("template", `${homedir()}/td/x1c_paint.3mf`).replace(/^~/, homedir());

let seed = 0x9e3779b9;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e9) / 1e9; };
const HEX = "0123456789ABCDEF";
// one paint tree in tree order (root first), returned as the reversed hex string Bambu stores
function paintTree(depth: number): string {
  const nib: number[] = [];
  const node = (d: number) => {
    if (d < depth && rnd() < 0.45) {
      const split = 1 + Math.floor(rnd() * 3); // 1..3 split sides -> split+1 children
      nib.push(split | (Math.floor(rnd() * 3) << 2));
      for (let i = 0; i <= split; i++) node(d + 1);
      return;
    }
    const st = rnd() < 0.25 ? 0 : 1 + Math.floor(rnd() * 4);
    if (st < 3) nib.push(st << 2);
    else { nib.push(12); nib.push(st - 3); }
  };
  node(0);
  let s = "";
  for (let i = nib.length - 1; i >= 0; i--) s += HEX[nib[i]];
  return s;
}

const nObj = PLATES * PER;
const perObj = Math.ceil(TRIS / nObj);
// 2*lon*(lat-1) ~ perObj with lon = 2*lat
const lat = Math.max(3, Math.round(Math.sqrt(perObj / 4)) + 1), lon = 2 * lat;
const R = 30;
function sphere(objId: number): string {
  const v: string[] = [];
  const f = (x: number) => String(Math.round(x * 1e6) / 1e6);
  v.push(`     <vertex x="0" y="0" z="${f(R)}"/>\n`);
  for (let i = 1; i < lat; i++) {
    const th = (Math.PI * i) / lat;
    for (let j = 0; j < lon; j++) {
      const ph = (2 * Math.PI * j) / lon;
      v.push(`     <vertex x="${f(R * Math.sin(th) * Math.cos(ph))}" y="${f(R * Math.sin(th) * Math.sin(ph))}" z="${f(R * Math.cos(th))}"/>\n`);
    }
  }
  v.push(`     <vertex x="0" y="0" z="${f(-R)}"/>\n`);
  const idx = (i: number, j: number) => 1 + (i - 1) * lon + (j % lon);
  const bottom = 1 + (lat - 1) * lon;
  const t: string[] = [];
  const tri = (a: number, b: number, c: number) => {
    const p = rnd() < PAINT ? ` paint_color="${paintTree(rnd() < 0.5 ? 0 : 3)}"` : "";
    t.push(`     <triangle v1="${a}" v2="${b}" v3="${c}"${p}/>\n`);
  };
  for (let j = 0; j < lon; j++) tri(0, idx(1, j), idx(1, j + 1));
  for (let i = 1; i < lat - 1; i++)
    for (let j = 0; j < lon; j++) { tri(idx(i, j), idx(i + 1, j), idx(i + 1, j + 1)); tri(idx(i, j), idx(i + 1, j + 1), idx(i, j + 1)); }
  for (let j = 0; j < lon; j++) tri(bottom, idx(lat - 1, j + 1), idx(lat - 1, j));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">\n <metadata name="BambuStudio:3mfVersion">1</metadata>\n <resources>\n  <object id="${objId}" p:UUID="${String(objId).padStart(8, "0")}-81cb-4c03-9d28-80fed5dfa1dc" type="model">\n   <mesh>\n    <vertices>\n${v.join("")}    </vertices>\n    <triangles>\n${t.join("")}    </triangles>\n   </mesh>\n  </object>\n </resources>\n <build/>\n</model>\n`;
}

// Without the private template (public checkouts), a minimal Bambu Studio project header is used.
const MINIMAL: Record<string, Uint8Array> = {
  "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n <Default Extension="png" ContentType="image/png"/>\n</Types>\n`),
  "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>\n`),
  "Metadata/project_settings.config": strToU8(JSON.stringify({
    version: "02.01.01.52", from: "project", printer_model: "Bambu Lab X1 Carbon", printer_settings_id: "Bambu Lab X1 Carbon 0.4 nozzle",
    print_settings_id: "0.20mm Standard @BBL X1C", layer_height: "0.2", printable_area: ["0x0", "256x0", "256x256", "0x256"], printable_height: "250",
    nozzle_diameter: ["0.4"], enable_support: "0", enable_prime_tower: "1",
    filament_colour: ["#FFFFFF", "#000000", "#FF0000", "#0000FF"], filament_type: ["PLA", "PLA", "PLA", "PLA"],
    filament_settings_id: Array(4).fill("Bambu PLA Basic @BBL X1C"), nozzle_temperature: Array(4).fill("220"),
  }, null, 4)),
};
const src = existsSync(template) ? unzipSync(new Uint8Array(readFileSync(template))) : MINIMAL;
const files: Record<string, Uint8Array> = {};
for (const k of ["[Content_Types].xml", "_rels/.rels", "Metadata/project_settings.config", "Metadata/cut_information.xml"]) if (src[k]) files[k] = src[k];
const S = JSON.parse(strFromU8(src["Metadata/project_settings.config"]));
const area = (S.printable_area as string[]).map((p) => p.split("x").map(Number));
const W = Math.max(...area.map((p) => p[0])), H = Math.max(...area.map((p) => p[1]));
const cols = Math.max(1, Math.ceil(Math.sqrt(PLATES) - 1e-9));
const nFil = (S.filament_colour as string[]).length;

let rootObjs = "", items = "", ms = "", rels = "", plates = "";
let triCount = 0;
for (let p = 0; p < PLATES; p++) {
  const ox = (p % cols) * W * 1.2, oy = -Math.floor(p / cols) * H * 1.2;
  let inst = "";
  for (let k = 0; k < PER; k++) {
    const n = p * PER + k + 1;
    const meshId = 2 * n - 1, objId = 2 * n;
    const path = `3D/Objects/object_${n}.model`;
    files[path] = strToU8(sphere(meshId));
    triCount += 2 * lon * (lat - 1);
    rels += ` <Relationship Target="/${path}" Id="rel-${n}" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n`;
    rootObjs += `  <object id="${objId}" p:UUID="${String(n).padStart(8, "0")}-61cb-4c03-9d28-80fed5dfa1dc" type="model">\n   <components>\n    <component p:path="/${path}" objectid="${meshId}" p:UUID="${String(n).padStart(4, "0")}0000-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>\n   </components>\n  </object>\n`;
    const x = ox + W / 2 + (k - (PER - 1) / 2) * 70, y = oy + H / 2;
    items += `  <item objectid="${objId}" p:UUID="${String(objId).padStart(8, "0")}-b1ec-4553-aec9-835e5b724bb4" transform="1 0 0 0 1 0 0 0 1 ${x} ${y} ${R}" printable="1"/>\n`;
    const ext = 1 + ((n - 1) % nFil);
    ms += `  <object id="${objId}">\n    <metadata key="name" value="sphere_${n}"/>\n    <metadata key="extruder" value="${ext}"/>\n    <part id="${meshId}" subtype="normal_part">\n      <metadata key="name" value="sphere_${n}"/>\n      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n    </part>\n  </object>\n`;
    inst += `    <model_instance>\n      <metadata key="object_id" value="${objId}"/>\n      <metadata key="instance_id" value="0"/>\n      <metadata key="identify_id" value="${100 + n}"/>\n    </model_instance>\n`;
  }
  plates += `  <plate>\n    <metadata key="plater_id" value="${p + 1}"/>\n    <metadata key="plater_name" value=""/>\n    <metadata key="locked" value="false"/>\n    <metadata key="filament_map_mode" value="Auto For Flush"/>\n${inst}  </plate>\n`;
}
const today = "2026-11-24";
files["3D/3dmodel.model"] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">\n <metadata name="Application">BambuStudio-02.09.01.70</metadata>\n <metadata name="BambuStudio:3mfVersion">1</metadata>\n <metadata name="CreationDate">${today}</metadata>\n <metadata name="Title">FilaShift stress test</metadata>\n <resources>\n${rootObjs} </resources>\n <build>\n${items} </build>\n</model>\n`);
files["3D/_rels/3dmodel.model.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n${rels}</Relationships>\n`);
files["Metadata/model_settings.config"] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>\n<config>\n${ms}${plates}  <assemble>\n  </assemble>\n</config>\n`);
const zip = zipSync(files, { level: 6, mtime: new Date("2026-11-24T00:00:00Z") });
writeFileSync(out, zip);
console.log(`${out}: ${triCount} triangles, ${nObj} objects on ${PLATES} plates, ${(zip.length / 1048576).toFixed(1)} MiB zipped`);
