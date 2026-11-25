/*
 * Native PrusaSlicer output: turns the Orca-format project produced by convert() into a PrusaSlicer 2.9
 * project 3MF (Metadata/Slic3r_PE.config + Slic3r_PE_model.config, one mesh per object with
 * slic3rpe:mmu_segmentation paint, Prusa_Slicer_custom_gcode_per_print_z.xml, wipe tower positions).
 *
 * Settings point at PrusaSlicer's own system presets (printer / print / filament, from the official
 * PrusaResearch.ini bundle, see scripts/build_prusa_profiles.py). The config is the full resolved
 * configuration PrusaSlicer itself writes into projects, so presets show as unmodified except for the
 * designer's choices we carry over (layer height, walls, infill, supports, ...) and the colours.
 */
import { strFromU8, strToU8, type Zippable } from "fflate";
import { Streamed, type OutFiles } from "./zip-out";
import type { ReportLine } from "./types";

export interface PrusaCommon {
  slicer: string;
  bundle: string;
  defaults: Record<string, string>;
  /** 1 = vector joined by ",", 2 = string vector (C-style quoted, joined by ";") */
  vector: Record<string, number>;
  filamentKeys: string[];
  extruderKeys: string[];
  printKeys: string[];
  printerKeys: string[];
}
export interface PrusaPrint { name: string; layer_height: number; default: boolean; filaments: string[]; condition: string; config: Record<string, string> }
export interface PrusaFilament { name: string; config: Record<string, string>; condition: string; prints_condition: string }
export interface PrusaTarget {
  id: string;
  printer: { name: string; config: Record<string, string> };
  prints: PrusaPrint[];
  filaments: Record<string, PrusaFilament>;
  extruders: number;
  bed: [number, number, number, number]; // minx, miny, w, h
  height: number;
  single_extruder_multi_material: boolean;
}
export interface PrusaData { common: PrusaCommon; target: PrusaTarget }

type Mat = number[]; // 3MF row-vector convention, 12 numbers
const IDENT: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const ap = (t: Mat, x: number, y: number, z: number): [number, number, number] => [
  x * t[0] + y * t[3] + z * t[6] + t[9],
  x * t[1] + y * t[4] + z * t[7] + t[10],
  x * t[2] + y * t[5] + z * t[8] + t[11],
];
/** p * a * b */
function mul(a: Mat, b: Mat): Mat {
  const r: Mat = new Array(12).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  const [tx, ty, tz] = ap(b, a[9], a[10], a[11]);
  r[9] = tx; r[10] = ty; r[11] = tz;
  return r;
}
const parseT = (s: string | undefined): Mat | null => {
  if (!s) return null;
  const t = s.trim().split(/\s+/).map(Number);
  return t.length === 12 && t.every(Number.isFinite) ? t : null;
};
const isIdent = (t: Mat) => t.every((v, i) => Math.abs(v - IDENT[i]) < 1e-12);
const num = (v: number) => {
  const r = Math.round(v * 1e9) / 1e9;
  return Object.is(r, -0) ? "0" : String(r);
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#10;/g, "\n").replace(/&#13;/g, "\r").replace(/&amp;/g, "&");
const attr = (tag: string, k: string) => new RegExp(`\\s${k.replace(/:/g, "\\:")}="([^"]*)"`).exec(tag)?.[1];

// ---------- PrusaSlicer config serialisation (escape_strings_cstyle & co) ----------
export function escapeStrings(v: string[]): string {
  return v
    .map((x) => ((v.length === 1 && x === "") || /[ ;\t\\"\r\n]/.test(x) ? `"${x.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"` : x))
    .join(";");
}
export function unescapeStrings(s: string): string[] {
  if (s === "") return [""];
  const out: string[] = [];
  let i = 0;
  const n = s.length;
  for (;;) {
    while (i < n && (s[i] === " " || s[i] === "\t")) i++;
    let cur = "";
    if (s[i] === '"') {
      i++;
      while (i < n && s[i] !== '"') {
        if (s[i] === "\\" && i + 1 < n) {
          i++;
          cur += s[i] === "n" ? "\n" : s[i] === "r" ? "\r" : s[i];
        } else cur += s[i];
        i++;
      }
      i++;
      while (i < n && s[i] !== ";") i++;
    } else {
      let j = s.indexOf(";", i);
      if (j < 0) j = n;
      cur = s.slice(i, j).trim();
      i = j;
    }
    out.push(cur);
    if (i >= n) break;
    i++;
    if (i >= n) { out.push(""); break; }
  }
  return out;
}
/** unescape_string_cstyle (scalar strings as stored in the ini) */
const unescapeScalar = (s: string) => s.replace(/\\(.)/g, (_m, c) => (c === "n" ? "\n" : c === "r" ? "\r" : c));
const escapeScalar = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r");

function splitVec(kind: number, s: string): string[] {
  return kind === 2 ? unescapeStrings(s) : s === "" ? [] : s.split(",");
}
function joinVec(kind: number, v: string[]): string {
  return kind === 2 ? escapeStrings(v) : v.join(",");
}

// ---------- Orca -> PrusaSlicer print setting names ----------
const FILL: Record<string, string> = { "zig-zag": "rectilinear", "aligned-rectilinear": "alignedrectilinear", "tri-hexagon": "stars", "3dhoneycomb": "3dhoneycomb", adaptivecubic: "adaptivecubic", supportcubic: "supportcubic", lightning: "lightning", gyroid: "gyroid", grid: "grid", line: "line", triangles: "triangles", cubic: "cubic", honeycomb: "honeycomb", concentric: "concentric", hilbertcurve: "hilbertcurve", archimedeanchords: "archimedeanchords", octagramspiral: "octagramspiral", zigzag: "zigzag" };
const SURF: Record<string, string> = { "zig-zag": "rectilinear", monotonic: "monotonic", monotonicline: "monotoniclines", alignedrectilinear: "alignedrectilinear", concentric: "concentric", hilbertcurve: "hilbertcurve", archimedeanchords: "archimedeanchords", octagramspiral: "octagramspiral" };
const SEAM: Record<string, string> = { back: "rear", aligned: "aligned", nearest: "nearest", random: "random" };
const truthy = (v: any) => ["1", "true"].includes(String(v));
const b01 = (v: any) => (truthy(v) ? "1" : "0");
const pctv = (v: string) => (/%$/.test(v) ? v : `${v}%`);
type ORule = (v: string, R: Record<string, any>) => [string, string][] | null;
/** Orca key -> PrusaSlicer keys. Only the designer's main choices; speeds, temperatures and tuning stay at the Prusa presets. */
const TO_PRUSA: Record<string, ORule> = {
  layer_height: (v) => [["layer_height", v]],
  initial_layer_print_height: (v) => [["first_layer_height", v]],
  wall_loops: (v) => [["perimeters", v]],
  top_shell_layers: (v) => [["top_solid_layers", v]],
  bottom_shell_layers: (v) => [["bottom_solid_layers", v]],
  sparse_infill_density: (v) => [["fill_density", pctv(v)]],
  sparse_infill_pattern: (v) => (FILL[v] ? [["fill_pattern", FILL[v]]] : null),
  top_surface_pattern: (v) => (SURF[v] ? [["top_fill_pattern", SURF[v]]] : null),
  bottom_surface_pattern: (v) => (SURF[v] ? [["bottom_fill_pattern", SURF[v]]] : null),
  enable_support: (v) => [["support_material", b01(v)]],
  support_type: (v) => [["support_material_auto", /auto/.test(v) ? "1" : "0"], ...(/tree/.test(v) ? ([["support_material_style", "organic"]] as [string, string][]) : [])],
  support_style: (v, R) => (/tree/.test(String(R.support_type ?? "")) ? null : [["support_material_style", v === "snug" ? "snug" : /tree|organic/.test(v) ? "organic" : "grid"]]),
  support_threshold_angle: (v) => [["support_material_threshold", v]],
  support_on_build_plate_only: (v) => [["support_material_buildplate_only", b01(v)]],
  raft_layers: (v) => [["raft_layers", v]],
  brim_type: (v) => (["outer_only", "inner_only", "outer_and_inner", "no_brim"].includes(v) ? [["brim_type", v]] : v === "brim_ears" ? [["brim_type", "outer_only"]] : null),
  brim_width: (v, R) => (R.brim_type === "auto_brim" ? null : [["brim_width", v]]),
  skirt_loops: (v) => [["skirts", v]],
  skirt_distance: (v) => [["skirt_distance", v]],
  skirt_height: (v) => [["skirt_height", v]],
  seam_position: (v) => (SEAM[v] ? [["seam_position", SEAM[v]]] : null),
  ironing_type: (v) => (v === "no ironing" ? [["ironing", "0"]] : ["top", "topmost", "solid"].includes(v) ? [["ironing", "1"], ["ironing_type", v]] : null),
  fuzzy_skin: (v) => (v === "none" ? [["fuzzy_skin", "none"]] : v === "external" ? [["fuzzy_skin", "external"]] : /all/.test(v) ? [["fuzzy_skin", "all"]] : null),
  spiral_mode: (v) => [["spiral_vase", b01(v)]],
  wall_sequence: (v) => [["external_perimeters_first", v === "outer wall/inner wall" ? "1" : "0"]],
};
export const PRUSA_CARRIED = Object.keys(TO_PRUSA);

// ---------- model parsing ----------
interface PObj { id: string; vtx?: string; tri?: string; comps: { objectid: string; path: string | null; t: Mat }[] }
function parseObjects(text: string): Map<string, PObj> {
  const out = new Map<string, PObj>();
  let pos = 0;
  for (;;) {
    const s = text.indexOf("<object", pos);
    if (s < 0) break;
    const tagEnd = text.indexOf(">", s);
    const tag = text.slice(s, tagEnd + 1);
    let end: number;
    if (tag.endsWith("/>")) end = tagEnd + 1;
    else {
      const e = text.indexOf("</object>", tagEnd);
      end = e < 0 ? text.length : e;
    }
    pos = end + 1;
    const id = /\bid="(\d+)"/.exec(tag)?.[1];
    if (!id) continue;
    const o: PObj = { id, comps: [] };
    const vs = text.indexOf("<vertices", tagEnd);
    if (vs >= 0 && vs < end) {
      const ve = text.indexOf("</vertices>", vs);
      o.vtx = text.slice(text.indexOf(">", vs) + 1, ve);
      const ts = text.indexOf("<triangles", ve);
      const te = text.indexOf("</triangles>", ts);
      o.tri = ts >= 0 && te >= 0 ? text.slice(text.indexOf(">", ts) + 1, te) : "";
    }
    const cs = text.indexOf("<components", tagEnd);
    if (cs >= 0 && cs < end) {
      const body = text.slice(cs, end);
      const cre = /<component\b([^>]*)\/?>/g;
      let c: RegExpExecArray | null;
      while ((c = cre.exec(body))) {
        const oid = /\bobjectid="(\d+)"/.exec(c[1])?.[1];
        if (!oid) continue;
        const path = /\bp:path="([^"]+)"/.exec(c[1])?.[1]?.replace(/^\//, "") ?? null;
        o.comps.push({ objectid: oid, path, t: parseT(/\btransform="([^"]+)"/.exec(c[1])?.[1]) || IDENT });
      }
    }
    out.set(id, o);
  }
  return out;
}

interface MsPart { subtype: string; meta: Record<string, string> }
interface MsObj { meta: Record<string, string>; parts: Map<string, MsPart> }
function metaPairs(block: string): Record<string, string> {
  const m: Record<string, string> = {};
  const re = /<metadata\s+key="([^"]+)"\s+value="([^"]*)"/g;
  let r: RegExpExecArray | null;
  while ((r = re.exec(block))) if (!(r[1] in m)) m[r[1]] = unesc(r[2]);
  return m;
}
function parseMs(xml: string): Map<string, MsObj> {
  const out = new Map<string, MsObj>();
  const re = /<object\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/object>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const parts = new Map<string, MsPart>();
    const pre = /<part\b([^>]*)>([\s\S]*?)<\/part>/g;
    let p: RegExpExecArray | null;
    while ((p = pre.exec(m[2]))) {
      const id = /\bid="(\d+)"/.exec(p[1])?.[1];
      if (id) parts.set(id, { subtype: /\bsubtype="([^"]+)"/.exec(p[1])?.[1] || "normal_part", meta: metaPairs(p[2]) });
    }
    out.set(m[1], { meta: metaPairs(m[2].split("<part")[0]), parts });
  }
  return out;
}

const VOLTYPE: Record<string, string> = { normal_part: "ModelPart", modifier_part: "ParameterModifier", negative_part: "NegativeVolume", support_blocker: "SupportBlocker", support_enforcer: "SupportEnforcer" };
const PAINT_ATTR: [RegExp, string][] = [
  [/\s(?:paint_color|slic3rpe:mmu_segmentation)="([^"]*)"/, "slic3rpe:mmu_segmentation"],
  [/\s(?:paint_supports|slic3rpe:custom_supports)="([^"]*)"/, "slic3rpe:custom_supports"],
  [/\s(?:paint_seam|slic3rpe:custom_seam)="([^"]*)"/, "slic3rpe:custom_seam"],
  [/\s(?:paint_fuzzy_skin|slic3rpe:fuzzy_skin)="([^"]*)"/, "slic3rpe:fuzzy_skin"],
];
const OBJ_SKIP = new Set(["name", "extruder", "face_count", "matrix", "source_file", "source_object_id", "source_volume_id", "source_offset_x", "source_offset_y", "source_offset_z", "mesh_stat"]);

export interface PrusaContext {
  data: PrusaData;
  /** output slot count of the Orca project */
  nOut: number;
  colours: string[];
  /** filament preset key (PLA, PETG, ...) per output slot */
  types: string[];
  /** layer height to aim for when picking the print preset */
  layerHeight: number;
  /** carry the designer's layer heights (false after a nozzle change: the preset's are used) */
  keepLayerHeight: boolean;
  /** Orca keys the designer set (null = unknown, compare every carried key) */
  designerKeys: Set<string> | null;
  usedSlots: number;
  plateIds: number[];
  /** Orca plate index of a build item, and the origin of that plate in Orca's plate grid */
  plateOf: (objectid: string, x: number, y: number) => number;
  orcaOrigin: (idx: number) => [number, number];
  title: string;
  info: (t: string) => void;
  warn: (t: string) => void;
  now?: Date;
}

/** PrusaSlicer 2.9 bed grid (MultipleBeds::get_bed_translation, BedsGrid::index2grid_coords) */
function bedTranslation(idx: number, w: number, h: number): [number, number] {
  if (idx <= 0) return [0, 0];
  let id = idx + 1, a = 1;
  while ((a + 1) * (a + 1) < id) a++;
  id -= a * a;
  let x = a, y = a;
  if (id <= a) y = id - 1;
  else x = id - a - 1;
  const gap = Math.min(100, Math.hypot(w, h) * 0.3);
  return [x * (w + gap), y * (h + gap)];
}

function pickPrint(t: PrusaTarget, lh: number, filNames: string[], soluble: boolean): PrusaPrint {
  const score = (p: PrusaPrint) => {
    let s = Math.abs(p.layer_height - lh) * 100;
    const n = p.name.toUpperCase();
    if (p.default) s -= 0.3;
    if (/SPEED|QUALITY/.test(n)) s -= 0.2;
    if (/SOLUBLE/.test(n)) s += soluble ? -0.1 : 3;
    if (/DETAIL|ULTRADETAIL/.test(n)) s += 0.1;
    if (!filNames.every((f) => p.filaments.includes(f))) s += 5;
    return s;
  };
  return t.prints.slice().sort((a, b) => score(a) - score(b))[0];
}

export function buildPrusaConfig(R: Record<string, any>, ctx: PrusaContext) {
  const { common, target } = ctx.data;
  const V = common.vector;
  const C: Record<string, string> = { ...common.defaults, ...target.printer.config };
  const N = Math.max(target.extruders, ctx.nOut);
  const fils = Array.from({ length: N }, (_, j) => target.filaments[ctx.types[j] ?? ""] || target.filaments[ctx.types[0] ?? ""] || target.filaments.PLA);
  const soluble = ctx.types.some((t) => /PVA|BVOH|SUPPORT/.test(t));
  const print = pickPrint(target, ctx.layerHeight, [...new Set(fils.map((f) => f.name))], soluble);
  Object.assign(C, print.config);
  if (N > target.extruders) {
    for (const k of common.extruderKeys) {
      if (!V[k] || C[k] === undefined) continue;
      const v = splitVec(V[k], C[k]);
      while (v.length < N) v.push(v[v.length - 1] ?? "");
      C[k] = joinVec(V[k], v);
    }
  }
  for (const k of common.filamentKeys) {
    const vals = fils.map((f) => f.config[k] ?? common.defaults[k]);
    if (vals.some((x) => x === undefined)) continue;
    if (V[k]) C[k] = V[k] === 2 ? vals.join(";") : vals.join(",");
    else C[k] = vals[0];
  }
  // colours
  const presetCols = splitVec(2, C.filament_colour || "");
  const cols = Array.from({ length: N }, (_, j) => ctx.colours[j] || presetCols[j] || "#FFFFFF");
  C.filament_colour = escapeStrings(cols);
  const extCols = splitVec(2, C.extruder_colour || "");
  if (extCols.some((c) => c !== "")) C.extruder_colour = escapeStrings(cols);
  // the designer's main choices
  const changed: string[] = [];
  const carry = (orcaKey: string) => {
    const rule = TO_PRUSA[orcaKey];
    let v = R[orcaKey];
    if (!rule || v === undefined || v === null) return;
    if (Array.isArray(v)) v = v[0];
    const out = rule(String(v), R);
    if (!out) return;
    for (const [k, val] of out) {
      if (C[k] === undefined || C[k] === val) continue;
      if (/^(layer_height|first_layer_height)$/.test(k) && Math.abs(parseFloat(C[k]) - parseFloat(val)) < 1e-6) continue;
      if (k === "fill_density" && Math.abs(parseFloat(C[k]) - parseFloat(val)) < 1e-6) continue;
      C[k] = val;
      changed.push(k);
    }
  };
  for (const k of PRUSA_CARRIED) {
    const lhKey = k === "layer_height" || k === "initial_layer_print_height";
    if (lhKey ? ctx.keepLayerHeight : !ctx.designerKeys || ctx.designerKeys.has(k)) carry(k);
  }
  if (truthy(Array.isArray(R.enable_support) ? R.enable_support[0] : R.enable_support) && C.support_material !== "1") {
    carry("enable_support");
    carry("support_type");
  }
  // MMU / multi-tool: the wipe tower needs relative extrusion
  if (N > 1 && truthy(C.wipe_tower) && C.use_relative_e_distances !== "1") {
    C.use_relative_e_distances = "1";
    changed.push("use_relative_e_distances");
  }
  // purge volumes: N x N
  const wv = splitVec(1, C.wiping_volumes_matrix || "");
  if (wv.length !== N * N) C.wiping_volumes_matrix = Array.from({ length: N * N }, (_, i) => (Math.floor(i / N) === i % N ? "0" : "140")).join(",");
  // ids, as PresetBundle::full_fff_config writes them
  C.print_settings_id = print.name;
  C.printer_settings_id = target.printer.name;
  C.filament_settings_id = escapeStrings(fils.map((f) => f.name));
  C.physical_printer_settings_id = "";
  C.printer_technology = "FFF";
  C.compatible_printers_condition_cummulative = escapeStrings([unescapeScalar(print.condition || ""), ...fils.map((f) => unescapeScalar(f.condition || ""))]);
  C.compatible_prints_condition_cummulative = escapeStrings(fils.map((f) => unescapeScalar(f.prints_condition || "")));
  return { C, print, fils, N, changed };
}

function serializeConfig(C: Record<string, string>, tower: { x: number; y: number }, ver: string, now: Date) {
  const d = now.toISOString();
  let out = `; generated by PrusaSlicer ${ver} on ${d.slice(0, 10)} at ${d.slice(11, 19)} UTC\n\n`;
  const all = { ...C, wipe_tower_x: num(tower.x), wipe_tower_y: num(tower.y), wipe_tower_rotation_angle: "0" };
  for (const k of Object.keys(all).sort()) out += `; ${k} = ${all[k as keyof typeof all]}\n`;
  return out;
}

/** Orca-format project files (as built by convert) -> PrusaSlicer project files */
export function toPrusa(files: Zippable, R: Record<string, any>, ctx: PrusaContext): { files: OutFiles; print: string; filaments: string[]; printer: string; changed: string[] } {
  const { common, target } = ctx.data;
  const ver = common.slicer.replace(/^PrusaSlicer\s*/, "") || "2.9.7";
  const get = (name: string): Uint8Array | undefined => {
    const k = Object.keys(files).find((f) => f.toLowerCase() === name.toLowerCase());
    if (!k) return undefined;
    const v = files[k] as any;
    return v instanceof Uint8Array ? v : Array.isArray(v) ? v[0] : undefined;
  };
  const rootText = strFromU8(get("3D/3dmodel.model")!);
  const cache = new Map<string, Map<string, PObj>>();
  const objsIn = (path: string | null): Map<string, PObj> => {
    const p = path || "3D/3dmodel.model";
    if (!cache.has(p)) {
      const u = get(p);
      cache.set(p, u ? (p === "3D/3dmodel.model" ? parseObjects(rootText.slice(0, rootText.indexOf("<build") >= 0 ? rootText.indexOf("<build") : undefined)) : parseObjects(strFromU8(u))) : new Map());
    }
    return cache.get(p)!;
  };
  const ms = parseMs(get("Metadata/model_settings.config") ? strFromU8(get("Metadata/model_settings.config")!) : "");
  const { C, print, fils, N, changed } = buildPrusaConfig(R, ctx);

  // build items
  const b = rootText.indexOf("<build");
  const items: { oid: string; t: Mat; printable: string }[] = [];
  if (b >= 0) {
    const re = /<item\b([^>]*)\/?>/g;
    const seg = rootText.slice(b);
    let m: RegExpExecArray | null;
    while ((m = re.exec(seg))) {
      const oid = /\bobjectid="(\d+)"/.exec(m[1])?.[1];
      if (oid) items.push({ oid, t: parseT(/\btransform="([^"]+)"/.exec(m[1])?.[1]) || IDENT, printable: /\bprintable="0"/.test(m[1]) ? "0" : "1" });
    }
  }

  interface Vol { o: PObj; t: Mat; partId: string }
  const volsOf = (o: PObj, path: string | null, t: Mat, out: Vol[], depth = 0, partId?: string) => {
    if (depth > 8) return;
    if (o.vtx !== undefined) out.push({ o, t, partId: partId ?? o.id });
    for (const c of o.comps) {
      const sub = objsIn(c.path ?? path).get(c.objectid);
      if (sub) volsOf(sub, c.path ?? path, mul(c.t, t), out, depth + 1, depth === 0 ? c.objectid : partId);
    }
  };

  const [bminx, bminy, bw, bh] = target.bed;
  const build: string[] = [];
  const instCount = new Map<string, number>();
  for (const it of items) instCount.set(it.oid, (instCount.get(it.oid) || 0) + 1);
  type Painted = { mmu: boolean; sup: boolean; seam: boolean; fuzzy: boolean };
  // The object meshes are written straight into a deflate stream (`sink`), so a big model never exists
  // as one string. The XML header lists which paint kinds occur, which is only certain after the
  // triangles are read: start with a cheap guess and redo the pass in the rare case it was wrong.
  const writeObjects = (sink: (s: string) => void) => {
  let mcfg = `<?xml version="1.0" encoding="UTF-8"?>\n<config>\n`;
  const outId = new Map<string, number>();
  const objVolT = new Map<string, Mat>(); // per output object: transform folded into the instance
  const objBox = new Map<string, number[]>(); // per output object: 3D bbox of its mesh in object coords [x0,y0,z0,x1,y1,z1]
  const painted: Painted = { mmu: false, sup: false, seam: false, fuzzy: false };
  let dropped = 0;
  const droppedKeys = new Set<string>();
  const overrides = (meta: Record<string, string>, type: "object" | "volume", pad: string) => {
    let s = "";
    for (const [k, v] of Object.entries(meta)) {
      if (OBJ_SKIP.has(k)) continue;
      const rule = TO_PRUSA[k];
      const out = rule ? rule(v, meta) : null;
      if (!out) { droppedKeys.add(k); continue; }
      for (const [pk, pv] of out) s += `${pad}<metadata type="${type}" key="${pk}" value="${esc(pv)}"/>\n`;
    }
    return s;
  };
  let nextId = 1;
  let triTotal = 0;
  for (const it of items) {
    if (outId.has(it.oid)) continue;
    const root = objsIn(null).get(it.oid);
    if (!root) { dropped++; continue; }
    const vols: Vol[] = [];
    volsOf(root, null, IDENT, vols);
    if (!vols.length) { dropped++; continue; }
    const id = nextId++;
    outId.set(it.oid, id);
    const single = vols.length === 1;
    objVolT.set(it.oid, single ? vols[0].t : IDENT);
    const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    const grow = (x: number, y: number, z: number) => {
      if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (z < bb[2]) bb[2] = z;
      if (x > bb[3]) bb[3] = x; if (y > bb[4]) bb[4] = y; if (z > bb[5]) bb[5] = z;
    };
    let vbase = 0, tbase = 0;
    const msObj = ms.get(it.oid);
    const name = msObj?.meta.name || `Object ${id}`;
    mcfg += ` <object id="${id}" instances_count="${instCount.get(it.oid) || 1}">\n  <metadata type="object" key="name" value="${esc(name)}"/>\n`;
    const oext = msObj?.meta.extruder;
    if (oext && +oext > 0) mcfg += `  <metadata type="object" key="extruder" value="${Math.min(+oext, N)}"/>\n`;
    if (msObj) mcfg += overrides(msObj.meta, "object", "  ");
    sink(`  <object id="${id}" type="model">\n   <mesh>\n    <vertices>\n`);
    // vertices of every volume first, then their triangles (PrusaSlicer keeps one mesh per object)
    const nvs: number[] = [];
    for (const v of vols) {
      const bake = !single && !isIdent(v.t);
      let nv = 0;
      let parts: string[] = [];
      const flush = () => { if (parts.length >= 4096) { sink(parts.join("")); parts = []; } };
      if (bake) {
        const vre = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"\s*\/>/g;
        let m: RegExpExecArray | null;
        while ((m = vre.exec(v.o.vtx!))) {
          const [x, y, z] = ap(v.t, +m[1], +m[2], +m[3]);
          grow(x, y, z);
          parts.push(`     <vertex x="${num(x)}" y="${num(y)}" z="${num(z)}"/>\n`);
          nv++;
          flush();
        }
      } else {
        const vre = /<vertex\b[^>]*\/>/g;
        let m: RegExpExecArray | null;
        while ((m = vre.exec(v.o.vtx!))) {
          parts.push("     " + m[0] + "\n"); nv++;
          const c = /x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/.exec(m[0]);
          if (c) grow(+c[1], +c[2], +c[3]);
          flush();
        }
      }
      sink(parts.join(""));
      nvs.push(nv);
    }
    sink(`    </vertices>\n    <triangles>\n`);
    vols.forEach((v, vi) => {
      const nv = nvs[vi];
      const tre = /<triangle\b([^>]*?)\/>/g;
      let m: RegExpExecArray | null;
      let nt = 0;
      let parts: string[] = [];
      while ((m = tre.exec(v.o.tri!))) {
        const a = m[1];
        const v1 = +(/\bv1="(\d+)"/.exec(a)?.[1] ?? 0) + vbase, v2 = +(/\bv2="(\d+)"/.exec(a)?.[1] ?? 0) + vbase, v3 = +(/\bv3="(\d+)"/.exec(a)?.[1] ?? 0) + vbase;
        let extra = "";
        for (const [re, nm] of PAINT_ATTR) {
          const pm = re.exec(a);
          if (pm && pm[1]) {
            extra += ` ${nm}="${pm[1]}"`;
            if (nm.endsWith("mmu_segmentation")) painted.mmu = true;
            else if (nm.endsWith("supports")) painted.sup = true;
            else if (nm.endsWith("seam")) painted.seam = true;
            else painted.fuzzy = true;
          }
        }
        parts.push(`     <triangle v1="${v1}" v2="${v2}" v3="${v3}"${extra}/>\n`);
        nt++;
        if (parts.length >= 4096) { sink(parts.join("")); parts = []; }
      }
      sink(parts.join(""));
      if (!nt) return;
      const part = msObj?.parts.get(v.partId);
      const pm = part?.meta || {};
      const vt = VOLTYPE[part?.subtype || "normal_part"] || "ModelPart";
      mcfg += `  <volume firstid="${tbase}" lastid="${tbase + nt - 1}">\n`;
      mcfg += `   <metadata type="volume" key="name" value="${esc(pm.name || name)}"/>\n`;
      if (vt === "ParameterModifier") mcfg += `   <metadata type="volume" key="modifier" value="1"/>\n`;
      mcfg += `   <metadata type="volume" key="volume_type" value="${vt}"/>\n`;
      const t = single ? IDENT : v.t;
      const M4 = [t[0], t[3], t[6], t[9], t[1], t[4], t[7], t[10], t[2], t[5], t[8], t[11], 0, 0, 0, 1];
      mcfg += `   <metadata type="volume" key="matrix" value="${M4.map(num).join(" ")}"/>\n`;
      if (pm.extruder && +pm.extruder > 0) mcfg += `   <metadata type="volume" key="extruder" value="${Math.min(+pm.extruder, N)}"/>\n`;
      mcfg += overrides(pm, "volume", "   ");
      mcfg += `   <mesh edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>\n  </volume>\n`;
      vbase += nv;
      tbase += nt;
    });
    triTotal += tbase;
    if (bb[0] <= bb[3]) objBox.set(it.oid, bb);
    mcfg += ` </object>\n`;
    sink(`    </triangles>\n   </mesh>\n  </object>\n`);
  }
  mcfg += `</config>\n`;
  return { mcfg, outId, objVolT, objBox, painted, dropped, droppedKeys, triTotal };
  };
  const meta = (k: string, v: string) => ` <metadata name="${k}">${esc(v)}</metadata>\n`;
  const rootHead = (painted: Painted) =>
    `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:slic3rpe="http://schemas.slic3r.org/3mf/2017/06">\n` +
    meta("slic3rpe:Version3mf", "1") +
    (painted.sup ? meta("slic3rpe:FdmSupportsPaintingVersion", "1") : "") +
    (painted.seam ? meta("slic3rpe:SeamPaintingVersion", "1") : "") +
    (painted.fuzzy ? meta("slic3rpe:FuzzySkinPaintingVersion", "1") : "") +
    (painted.mmu ? meta("slic3rpe:MmPaintingVersion", "1") : "") +
    meta("Title", ctx.title) + meta("Designer", "") + meta("Description", ctx.title) + meta("Copyright", "") + meta("LicenseTerms", "") + meta("Rating", "") +
    meta("CreationDate", (ctx.now || new Date()).toISOString().slice(0, 10)) + meta("ModificationDate", (ctx.now || new Date()).toISOString().slice(0, 10)) +
    meta("Application", `PrusaSlicer-${ver}`) +
    ` <resources>\n`;
  // guess the paint kinds from the triangle text of the volumes that will be written
  const guess: Painted = { mmu: false, sup: false, seam: false, fuzzy: false };
  {
    const seen = new Set<string>();
    const kinds: [keyof Painted, RegExp][] = [["mmu", /\s(?:paint_color|slic3rpe:mmu_segmentation)="[^"]/], ["sup", /\s(?:paint_supports|slic3rpe:custom_supports)="[^"]/], ["seam", /\s(?:paint_seam|slic3rpe:custom_seam)="[^"]/], ["fuzzy", /\s(?:paint_fuzzy_skin|slic3rpe:fuzzy_skin)="[^"]/]];
    for (const it of items) {
      const root = objsIn(null).get(it.oid);
      if (!root || seen.has(it.oid)) continue;
      seen.add(it.oid);
      const vols: Vol[] = [];
      volsOf(root, null, IDENT, vols);
      for (const v of vols) for (const [k, re] of kinds) if (!guess[k] && re.test(v.o.tri || "")) guess[k] = true;
    }
  }
  const same = (a: Painted, b: Painted) => a.mmu === b.mmu && a.sup === b.sup && a.seam === b.seam && a.fuzzy === b.fuzzy;
  let modelOut = new Streamed(4);
  modelOut.push(rootHead(guess));
  let W = writeObjects((t) => modelOut.push(t));
  if (!same(W.painted, guess)) {
    const exact = W.painted;
    modelOut = new Streamed(4);
    modelOut.push(rootHead(exact));
    W = writeObjects((t) => modelOut.push(t));
  }
  const { mcfg, outId, objVolT, objBox, dropped, droppedKeys, triTotal } = W;

  // instances, moved from Orca's plate grid to PrusaSlicer's bed grid
  const nPlates = Math.max(1, ctx.plateIds.length);
  const bedRects: number[][][] = Array.from({ length: nPlates }, () => []); // bed-local XY footprints per bed
  for (const it of items) {
    const id = outId.get(it.oid);
    if (!id) continue;
    const t = mul(objVolT.get(it.oid) || IDENT, it.t);
    const idx = Math.max(0, Math.min(nPlates - 1, ctx.plateOf(it.oid, it.t[9], it.t[10])));
    const [ox, oy] = ctx.orcaOrigin(idx);
    const [bx, by] = bedTranslation(idx, bw, bh);
    t[9] += bx - ox;
    t[10] += by - oy;
    const b = objBox.get(it.oid);
    if (b) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const cx of [b[0], b[3]]) for (const cy of [b[1], b[4]]) for (const cz of [b[2], b[5]]) {
        const [px, py] = ap(t, cx, cy, cz);
        x0 = Math.min(x0, px - bx); y0 = Math.min(y0, py - by); x1 = Math.max(x1, px - bx); y1 = Math.max(y1, py - by);
      }
      bedRects[idx].push([x0, y0, x1, y1]);
    }
    build.push(`  <item objectid="${id}" transform="${t.map(num).join(" ")}" printable="${it.printable}"/>\n`);
  }
  if (dropped) ctx.warn(`${dropped} object(s) without geometry were left out of the PrusaSlicer project.`);
  if (droppedKeys.size) ctx.info(`Per-object settings without a PrusaSlicer equivalent were left at the preset values: ${[...droppedKeys].slice(0, 8).join(", ")}${droppedKeys.size > 8 ? ` and ${droppedKeys.size - 8} more` : ""}.`);

  modelOut.push(` </resources>\n <build>\n${build.join("")} </build>\n</model>\n`);
  modelOut.finish();

  // wipe tower per bed (bed-local position)
  const towerX = Array.isArray(R.wipe_tower_x) ? R.wipe_tower_x : R.wipe_tower_x !== undefined ? [R.wipe_tower_x] : [];
  const towerY = Array.isArray(R.wipe_tower_y) ? R.wipe_tower_y : R.wipe_tower_y !== undefined ? [R.wipe_tower_y] : [];
  // PrusaSlicer's tower is wider than Orca's (wipe_tower_width, 60 mm on Prusa MMU/XL presets) and its corner is
  // wipe_tower_x/y, so check the spot the converter chose against the objects with PrusaSlicer's footprint and move it
  // to the nearest free spot (or the least-overlapping one) when it would hit the model
  const towerOn = N > 1 && truthy(C.wipe_tower);
  const brim = (parseFloat(C.wipe_tower_brim_width || "2") || 2) + 3;
  const twW = (parseFloat(C.wipe_tower_width || "60") || 60) + 2 * brim, twD = 30 + 2 * brim;
  let towerMoved = 0, towerHit = 0;
  const towers = Array.from({ length: nPlates }, (_, i) => {
    const x = parseFloat(towerX[Math.min(i, towerX.length - 1)]), y = parseFloat(towerY[Math.min(i, towerY.length - 1)]);
    const want = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : { x: bminx + bw * 0.7, y: bminy + bh * 0.6 };
    if (!towerOn || !bedRects[i].length) return want;
    const rects = bedRects[i].map((r) => [r[0] - 3, r[1] - 3, r[2] + 3, r[3] + 3]);
    const overlap = (cx: number, cy: number) =>
      rects.reduce((a, r) => a + Math.max(0, Math.min(cx - brim + twW, r[2]) - Math.max(cx - brim, r[0])) * Math.max(0, Math.min(cy - brim + twD, r[3]) - Math.max(cy - brim, r[1])), 0);
    const xlo = bminx + brim + 2, xhi = bminx + bw - twW + brim - 2, ylo = bminy + brim + 2, yhi = bminy + bh - twD + brim - 2;
    if (xhi < xlo || yhi < ylo) return want;
    const cl = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
    const w0 = { x: cl(want.x, xlo, xhi), y: cl(want.y, ylo, yhi) };
    if (w0.x === want.x && w0.y === want.y && overlap(w0.x, w0.y) === 0) return want;
    let best = w0, bo = overlap(w0.x, w0.y), bd = 0;
    for (let cx = xlo; cx <= xhi + 0.01; cx += 5) for (let cy = ylo; cy <= yhi + 0.01; cy += 5) {
      const o = overlap(cx, cy), d = Math.hypot(cx - want.x, cy - want.y);
      if (o < bo - 1e-6 || (Math.abs(o - bo) <= 1e-6 && d < bd)) { best = { x: cx, y: cy }; bo = o; bd = d; }
    }
    // no free spot (model larger than the bed): keep the converter's least-overlap spot
    if (bo > 0) { towerHit++; return want; }
    if (best.x !== want.x || best.y !== want.y) towerMoved++;
    return { x: +best.x.toFixed(2), y: +best.y.toFixed(2) };
  });
  if (towerHit) ctx.warn(`PrusaSlicer's wipe tower has no free spot beside the model on ${towerHit} bed${towerHit > 1 ? "s" : ""}; it was placed where it overlaps least. Scale or rearrange the model in PrusaSlicer before slicing.`);
  else if (towerMoved) ctx.info(`The wipe tower was moved to a free spot on ${towerMoved} bed${towerMoved > 1 ? "s" : ""} to fit PrusaSlicer's ${parseFloat(C.wipe_tower_width || "60") || 60} mm tower.`);
  const wt = `<?xml version="1.0" encoding="utf-8"?>\n` + towers.map((t, i) => `<wipe_tower_information bed_idx="${i}" position_x="${num(t.x)}" position_y="${num(t.y)}" rotation_deg="0"/>`).join("\n") + "\n";

  // colour changes / pauses / custom G-code per layer
  let cg = "";
  const cgXml = get("Metadata/custom_gcode_per_layer.xml");
  let nCodes = 0;
  if (cgXml) {
    const mode = N === 1 ? "SingleExtruder" : ctx.usedSlots > 1 ? "MultiExtruder" : "MultiAsSingle";
    const beds: string[] = [];
    const txt = strFromU8(cgXml);
    const pre = /<plate>([\s\S]*?)<\/plate>/g;
    let m: RegExpExecArray | null;
    const byBed = new Map<number, string[]>();
    while ((m = pre.exec(txt))) {
      const pid = +(/<plate_info\s+id="(\d+)"/.exec(m[1])?.[1] ?? 1);
      const bed = Math.max(0, ctx.plateIds.indexOf(pid));
      const codes: string[] = byBed.get(bed) || [];
      const lre = /<layer\b([^>]*)\/>/g;
      let l: RegExpExecArray | null;
      while ((l = lre.exec(m[1]))) {
        const a = l[1];
        const z = attr(a, "top_z") ?? "0";
        let type = +(attr(a, "type") ?? 4);
        const ext = Math.max(1, Math.min(N, +(attr(a, "extruder") ?? 1)));
        const color = unesc(attr(a, "color") ?? "");
        let extra = unesc(attr(a, "extra") ?? "");
        let gcode = unesc(attr(a, "gcode") ?? "");
        // pauses FilaShift planned for a filament swap, and plain M600 codes, become PrusaSlicer colour changes
        if ((type === 1 && /^Load #/.test(extra)) || (type === 4 && /^\s*M600\s*$/i.test(gcode))) { type = 0; extra = ""; }
        if (type === 0) gcode = unescapeScalar(C.color_change_gcode || "M600");
        else if (type === 1) gcode = unescapeScalar(C.pause_print_gcode || "M601");
        else if (type === 3) gcode = unescapeScalar(C.template_custom_gcode || "");
        else if (type === 2) gcode = "tool_change";
        else extra = extra || gcode;
        if (type === 4) gcode = extra;
        codes.push(`<code print_z="${z}" type="${type}" extruder="${mode === "SingleExtruder" ? 1 : ext}" color="${esc(color)}" extra="${esc(extra)}" gcode="${esc(gcode).replace(/\n/g, "&#10;")}"/>`);
        nCodes++;
      }
      byBed.set(bed, codes);
    }
    if (nCodes) {
      if (!byBed.has(0)) byBed.set(0, []);
      for (const [bed, codes] of [...byBed].sort((x, y) => x[0] - y[0])) {
        if (bed !== 0 && !codes.length) continue;
        beds.push(`<custom_gcodes_per_print_z bed_idx="${bed}">\n${codes.map((c) => c + "\n").join("")}<mode value="${mode}"/>\n</custom_gcodes_per_print_z>`);
      }
      cg = `<?xml version="1.0" encoding="utf-8"?>\n${beds.join("\n")}\n`;
    }
  }

  const out: OutFiles = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n <Default Extension="png" ContentType="image/png"/>\n</Types>`),
    "3D/3dmodel.model": modelOut,
    "Metadata/Slic3r_PE.config": strToU8(serializeConfig(C, towers[0], ver, ctx.now || new Date())),
    "Metadata/Slic3r_PE_model.config": strToU8(mcfg),
    "Metadata/Prusa_Slicer_wipe_tower_information.xml": strToU8(wt),
  };
  if (cg) out["Metadata/Prusa_Slicer_custom_gcode_per_print_z.xml"] = strToU8(cg);
  const thumbName = Object.keys(files).find((f) => /^Metadata\/plate_1\.png$/i.test(f)) || Object.keys(files).find((f) => /^Metadata\/(thumbnail|plate_\d+)\.png$/i.test(f));
  const thumb = thumbName ? get(thumbName) : undefined;
  let rels = `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n`;
  if (thumb) {
    out["Metadata/thumbnail.png"] = [thumb, { level: 0 }];
    rels += ` <Relationship Target="/Metadata/thumbnail.png" Id="rel-2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"/>\n`;
  }
  out["_rels/.rels"] = strToU8(rels + "</Relationships>");
  if (nCodes) ctx.info(`${nCodes} layer change${nCodes > 1 ? "s" : ""} (colour change, pause or custom G-code) written for PrusaSlicer; filament swaps use PrusaSlicer's colour change (M600).`);
  void triTotal;
  return { files: out, print: print.name, filaments: fils.slice(0, Math.max(1, ctx.nOut)).map((f) => f.name), printer: target.printer.name, changed };
}
