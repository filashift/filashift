/**
 * 3MF → STL / OBJ export. Runs in the browser like the converter.
 * - Resolves build items and components (including Bambu/Orca split models in 3D/Objects/*.model)
 *   and bakes every transform, so parts land exactly where they sit on the plate.
 * - Converts the model's unit to millimetres.
 * - STL: one binary STL per plate (several plates → a .zip). STL has no colour, so the report says so.
 * - OBJ: one .obj + .mtl with a group per object/part and a material per filament colour
 *   (part colours are kept; painted-on colours are not, because OBJ has no per-triangle paint).
 */
import { strToU8, zipSync } from "fflate";
import { loadSettings, normalizeColor, readZip, type Entries } from "./engine";
import { isPrusaProject, prusaToOrca } from "./prusa";

type Mat = number[];
const IDENT: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const UNIT: Record<string, number> = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };
const dec = new TextDecoder();

function parseT(s: string | undefined): Mat | null {
  if (!s) return null;
  const t = s.trim().split(/\s+/).map(Number);
  return t.length === 12 && t.every(Number.isFinite) ? t : null;
}
const ap = (t: Mat, x: number, y: number, z: number): [number, number, number] => [
  x * t[0] + y * t[3] + z * t[6] + t[9],
  x * t[1] + y * t[4] + z * t[7] + t[10],
  x * t[2] + y * t[5] + z * t[8] + t[11],
];
function mul(a: Mat, b: Mat): Mat {
  const r: Mat = new Array(12).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  const [x, y, z] = ap(b, a[9], a[10], a[11]);
  r[9] = x;
  r[10] = y;
  r[11] = z;
  return r;
}
const attr = (tag: string, k: string) => new RegExp(`\\b${k}="([^"]*)"`).exec(tag)?.[1];

interface Obj {
  name: string;
  verts?: Float64Array;
  tris?: Uint32Array;
  comps: { id: string; path: string | null; t: Mat }[];
  type: string;
}
type ModelFile = { scale: number; objs: Map<string, Obj>; text: string };

function parseModel(text: string): ModelFile {
  const unit = /<model\b[^>]*\bunit="([^"]+)"/.exec(text)?.[1] || "millimeter";
  const objs = new Map<string, Obj>();
  let pos = 0;
  for (;;) {
    const s = text.indexOf("<object", pos);
    if (s < 0) break;
    const te = text.indexOf(">", s);
    const tag = text.slice(s, te + 1);
    const e = text.indexOf("</object>", te);
    const end = e < 0 ? text.length : e;
    const body = text.slice(te + 1, end);
    pos = end + 9;
    const id = attr(tag, "id");
    if (!id) continue;
    const o: Obj = { name: attr(tag, "name") || `Object ${id}`, comps: [], type: attr(tag, "type") || "model" };
    if (body.includes("<vertex")) {
      const vs: number[] = [];
      const vre = /<vertex\b([^>]*)\/?>/g;
      let m: RegExpExecArray | null;
      while ((m = vre.exec(body))) vs.push(+(attr(m[1], "x") || 0), +(attr(m[1], "y") || 0), +(attr(m[1], "z") || 0));
      const ts: number[] = [];
      const tre = /<triangle\b([^>]*)\/?>/g;
      while ((m = tre.exec(body))) ts.push(+(attr(m[1], "v1") || 0), +(attr(m[1], "v2") || 0), +(attr(m[1], "v3") || 0));
      o.verts = Float64Array.from(vs);
      o.tris = Uint32Array.from(ts);
    }
    const cre = /<component\b([^>]*)\/?>/g;
    let c: RegExpExecArray | null;
    while ((c = cre.exec(body))) {
      const oid = attr(c[1], "objectid");
      if (oid) o.comps.push({ id: oid, path: (attr(c[1], "p:path") || "").replace(/^\//, "") || null, t: parseT(attr(c[1], "transform")) || IDENT });
    }
    objs.set(id, o);
  }
  return { scale: UNIT[unit] ?? 1, objs, text };
}

export interface MeshPart {
  name: string; // "Object / part"
  filament: number; // 1-based, 0 = unknown
  tris: Float32Array; // 9 floats per triangle, mm, world coordinates
}
export interface MeshPlate {
  id: number;
  name: string;
  parts: MeshPart[];
}
export interface MeshResult {
  plates: MeshPlate[];
  colours: string[];
  triangles: number;
  painted: boolean;
  modifiers: number;
}

/** Read every printable mesh of a 3MF, grouped by plate. */
export function extractMeshes(input: Uint8Array | Entries): MeshResult {
  let e: Entries = input instanceof Uint8Array ? readZip(input) : input;
  if (input instanceof Uint8Array && isPrusaProject(e)) {
    try {
      e = prusaToOrca(e).entries;
    } catch {
      /* fall back to the raw meshes */
    }
  }
  const find = (n: string) => Object.keys(e).find((k) => k.toLowerCase() === n.toLowerCase());
  const rootName = find("3D/3dmodel.model");
  if (!rootName) throw new Error("The file has no 3D/3dmodel.model part, so it is not a 3MF file.");
  const files = new Map<string, ModelFile>();
  const getFile = (p: string): ModelFile | null => {
    const k = find(p);
    if (!k) return null;
    if (!files.has(k)) files.set(k, parseModel(dec.decode(e[k])));
    return files.get(k)!;
  };
  const root = getFile(rootName)!;

  // Bambu / Orca metadata: part names, extruders and plates
  const ms = find("Metadata/model_settings.config");
  const objName = new Map<string, string>();
  const objExt = new Map<string, number>(), partExt = new Map<string, number>(), partName = new Map<string, string>(), partType = new Map<string, string>();
  const plateOf = new Map<string, number>();
  const plateNames = new Map<number, string>();
  if (ms) {
    const x = dec.decode(e[ms]);
    const ore = /<object\s+id="(\d+)"[^>]*>([\s\S]*?)<\/object>/g;
    let m: RegExpExecArray | null;
    while ((m = ore.exec(x))) {
      const head = m[2].split("<part")[0];
      const oe = /key="extruder"\s+value="(\d+)"/.exec(head)?.[1];
      if (oe) objExt.set(m[1], +oe);
      const on = /key="name"\s+value="([^"]*)"/.exec(head)?.[1];
      if (on) objName.set(m[1], on);
      const pre = /<part\s+id="(\d+)"\s+subtype="([^"]+)"[^>]*>([\s\S]*?)<\/part>/g;
      let p: RegExpExecArray | null;
      while ((p = pre.exec(m[2]))) {
        const k = `${m[1]}:${p[1]}`;
        partType.set(k, p[2]);
        const pe = /key="extruder"\s+value="(\d+)"/.exec(p[3])?.[1];
        if (pe) partExt.set(k, +pe);
        const pn = /key="name"\s+value="([^"]*)"/.exec(p[3])?.[1];
        if (pn) partName.set(k, pn);
      }
    }
    const plre = /<plate>([\s\S]*?)<\/plate>/g;
    let i = 0;
    while ((m = plre.exec(x))) {
      i++;
      const pid = +(/key="plater_id"\s+value="(\d+)"/.exec(m[1])?.[1] || i);
      plateNames.set(pid, /key="plater_name"\s+value="([^"]*)"/.exec(m[1])?.[1] || "");
      const ire = /key="object_id"\s+value="(\d+)"/g;
      let o: RegExpExecArray | null;
      while ((o = ire.exec(m[1]))) plateOf.set(o[1], pid);
    }
  }
  const S = loadSettings(e) || {};
  const colours: string[] = (Array.isArray(S.filament_colour) ? S.filament_colour : []).map((c: string) => normalizeColor(c));

  const plates = new Map<number, MeshPlate>();
  let triangles = 0, modifiers = 0, painted = false;
  const bi = root.text.indexOf("<build");
  const ire = /<item\b([^>]*)>/g;
  ire.lastIndex = bi < 0 ? root.text.length : bi;
  let it: RegExpExecArray | null;
  while ((it = ire.exec(root.text))) {
    const oid = attr(it[1], "objectid");
    if (!oid || attr(it[1], "printable") === "0") continue;
    const top = root.objs.get(oid);
    if (!top) continue;
    const pid = plateOf.get(oid) ?? 1;
    if (!plates.has(pid)) plates.set(pid, { id: pid, name: plateNames.get(pid) || "", parts: [] });
    const plate = plates.get(pid)!;
    const walk = (file: ModelFile, id: string, t: Mat, depth: number, label: string, partKey: string | null) => {
      const o = file.objs.get(id);
      if (!o || depth > 16 || o.type === "support" || o.type === "other") return;
      const ptype = partKey ? partType.get(partKey) : undefined;
      if (ptype && ptype !== "normal_part") {
        modifiers++;
        return;
      }
      if (o.verts && o.tris && o.tris.length) {
        const sc = file.scale, n = o.tris.length / 3;
        const out = new Float32Array(n * 9);
        for (let i = 0; i < n * 3; i++) {
          const v = o.tris[i] * 3;
          const [x, y, z] = ap(t, o.verts[v], o.verts[v + 1], o.verts[v + 2]);
          out[i * 3] = x * sc;
          out[i * 3 + 1] = y * sc;
          out[i * 3 + 2] = z * sc;
        }
        triangles += n;
        const ext = (partKey && partExt.get(partKey)) || objExt.get(oid) || 0;
        plate.parts.push({ name: label, filament: ext, tris: out });
        if (!painted && file.text.includes("paint_color=")) painted = true;
      }
      for (const c of o.comps) {
        const f = c.path ? getFile(c.path) : file;
        if (!f) continue;
        const k = `${oid}:${c.id}`;
        const pn = partName.get(k);
        const own = o.comps.length > 1 && pn && pn !== label ? `${label} / ${pn}` : label;
        walk(f, c.id, mul(c.t, t), depth + 1, own, depth === 0 ? k : partKey);
      }
    };
    walk(root, oid, parseT(attr(it[1], "transform")) || IDENT, 0, objName.get(oid) || top.name, null);
  }
  const list = [...plates.values()].filter((p) => p.parts.length).sort((a, b) => a.id - b.id);
  if (!list.length) throw new Error("No printable meshes were found in this file.");
  return { plates: list, colours, triangles, painted, modifiers };
}

function centre(parts: MeshPart[]): [number, number, number] {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of parts)
    for (let i = 0; i < p.tris.length; i += 3) {
      const x = p.tris[i], y = p.tris[i + 1], z = p.tris[i + 2];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (z < z0) z0 = z;
    }
  return [(x0 + x1) / 2, (y0 + y1) / 2, z0];
}

function stl(parts: MeshPart[], title: string): Uint8Array {
  const n = parts.reduce((s, p) => s + p.tris.length / 9, 0);
  const buf = new ArrayBuffer(84 + n * 50);
  const dv = new DataView(buf);
  const head = strToU8(`FilaShift STL export: ${title}`.slice(0, 79));
  new Uint8Array(buf, 0, head.length).set(head);
  dv.setUint32(80, n, true);
  const [cx, cy, cz] = centre(parts);
  let o = 84;
  for (const p of parts) {
    const t = p.tris;
    for (let i = 0; i < t.length; i += 9) {
      const ax = t[i] - cx, ay = t[i + 1] - cy, az = t[i + 2] - cz;
      const bx = t[i + 3] - cx, by = t[i + 4] - cy, bz = t[i + 5] - cz;
      const qx = t[i + 6] - cx, qy = t[i + 7] - cy, qz = t[i + 8] - cz;
      let nx = (by - ay) * (qz - az) - (bz - az) * (qy - ay);
      let ny = (bz - az) * (qx - ax) - (bx - ax) * (qz - az);
      let nz = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax);
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      for (const v of [nx, ny, nz, ax, ay, az, bx, by, bz, qx, qy, qz]) {
        dv.setFloat32(o, v, true);
        o += 4;
      }
      o += 2;
    }
  }
  return new Uint8Array(buf);
}

function obj(parts: MeshPart[], colours: string[], base: string): { obj: Uint8Array; mtl: Uint8Array } {
  const [cx, cy, cz] = centre(parts);
  const L: string[] = [`# FilaShift OBJ export`, `mtllib ${base}.mtl`];
  const used = new Set<number>();
  let vi = 1;
  for (const p of parts) {
    L.push(`o ${p.name.replace(/\s+/g, "_")}`);
    const t = p.tris;
    for (let i = 0; i < t.length; i += 3) L.push(`v ${(t[i] - cx).toFixed(4)} ${(t[i + 1] - cy).toFixed(4)} ${(t[i + 2] - cz).toFixed(4)}`);
    used.add(p.filament);
    L.push(`usemtl filament_${p.filament || 1}`);
    for (let i = 0; i < t.length / 3; i += 3) L.push(`f ${vi + i} ${vi + i + 1} ${vi + i + 2}`);
    vi += t.length / 3;
  }
  const M: string[] = ["# FilaShift materials (one per filament)"];
  for (const f of [...used].map((x) => x || 1).sort((a, b) => a - b)) {
    const hex = colours[f - 1] || "#B0B0B0";
    const [r, g, b] = [1, 3, 5].map((k) => (parseInt(hex.slice(k, k + 2), 16) / 255).toFixed(4));
    M.push(`newmtl filament_${f}`, `Kd ${r} ${g} ${b}`, `Ka 0 0 0`, `Ks 0 0 0`, `d 1`, `illum 1`, "");
  }
  return { obj: strToU8(L.join("\n") + "\n"), mtl: strToU8(M.join("\n")) };
}

export interface ExportResult {
  blob: Blob;
  fileName: string;
  lines: { level: "ok" | "info" | "warn"; text: string }[];
}

export function exportMesh(input: Uint8Array | Entries, fileName: string, format: "stl" | "obj"): ExportResult {
  const m = extractMeshes(input);
  const base = fileName.replace(/\.3mf$/i, "").replace(/[^\w.\- ]+/g, "_") || "model";
  const lines: ExportResult["lines"] = [];
  const nParts = m.plates.reduce((s, p) => s + p.parts.length, 0);
  const many = m.plates.length > 1;
  const plateBase = (p: MeshPlate) => (many ? `${base} - plate ${p.id}${p.name ? ` (${p.name.replace(/[^\w.\- ]+/g, "_")})` : ""}` : base);
  let blob: Blob, out: string;
  if (format === "stl") {
    if (many) {
      const z: Record<string, Uint8Array> = {};
      for (const p of m.plates) z[`${plateBase(p)}.stl`] = stl(p.parts, plateBase(p));
      blob = new Blob([zipSync(z, { level: 6 })], { type: "application/zip" });
      out = `${base} - STL.zip`;
    } else {
      blob = new Blob([stl(m.plates[0].parts, base)], { type: "model/stl" });
      out = `${base}.stl`;
    }
  } else {
    const z: Record<string, Uint8Array> = {};
    for (const p of m.plates) {
      const b = plateBase(p);
      const r = obj(p.parts, m.colours, b);
      z[`${b}.obj`] = r.obj;
      z[`${b}.mtl`] = r.mtl;
    }
    blob = new Blob([zipSync(z, { level: 6 })], { type: "application/zip" });
    out = `${base} - OBJ.zip`;
  }
  lines.push({
    level: "ok",
    text: `Exported ${m.triangles.toLocaleString("en-US")} triangles from ${nParts} part${nParts === 1 ? "" : "s"}${many ? ` on ${m.plates.length} plates (one file per plate)` : ""} as ${format.toUpperCase()}, in millimetres, with the parts in their plate positions.`,
  });
  if (format === "stl") lines.push({ level: "info", text: "STL stores shape only: colours, filament assignments, plates and print settings are not included. Use OBJ to keep part colours, or convert the 3MF instead to keep everything." });
  else lines.push({ level: "info", text: "OBJ keeps one colour per part (from its filament) in the .mtl file. Print settings are not included." });
  if (m.painted) lines.push({ level: "warn", text: "This project has painted-on colours. STL and OBJ cannot store painting, so painted areas export in the part's base colour. Convert the 3MF to keep painting." });
  if (m.modifiers) lines.push({ level: "info", text: `Skipped ${m.modifiers} modifier, negative or support-blocker volume${m.modifiers === 1 ? "" : "s"}, which only affect slicing.` });
  return { blob, fileName: out, lines };
}
