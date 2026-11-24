/*
 * PlateShift conversion engine.
 *
 * Retargets a Bambu Studio / OrcaSlicer style .3mf print project to another printer while
 * keeping the designer's print settings, colours and painting.
 *
 * Approach (credit: the MIT-licensed 3MF-to-AD5X project by iChristGit, which documents how
 * OrcaSlicer resolves project presets): OrcaSlicer loads a project's print / filament / printer
 * preset by name and, for every key NOT listed in `different_settings_to_system`, uses the
 * installed system preset's value. So we (1) point every preset name at a real system preset of
 * the target printer, (2) copy the author's print settings and list every copied key, and (3)
 * leave the printer slot empty so all machine settings come from the target's own profile.
 */
import { isPrusaProject, prusaToOrca } from "./prusa";
import { unzipSync, zipSync, strFromU8, strToU8, type Zippable } from "fflate";
import RULES from "../rules.json";
import SLICER_KEYS from "./slicer-keys.json";
import { scanPaint, remapPaintText } from "./paint";
import type {
  Analysis,
  ConvertOptions,
  ConvertReport,
  ConvertResult,
  Dict,
  PlateInfo,
  PrinterProfile,
  ProcessPreset,
  ReportLine,
  SourceFilament,
} from "./types";

const SETTINGS = "Metadata/project_settings.config";
const MODEL_SETTINGS = "Metadata/model_settings.config";
const ROOT_MODEL = "3D/3dmodel.model";

const S_PRINT = new Set<string>(RULES.PRINT_OPTS);
const S_FIL = new Set<string>(RULES.FILAMENT_OPTS);
const S_PRINTER = new Set<string>(RULES.PRINTER_OPTS);
const S_DISCARDED = new Set<string>(RULES.DISCARDED);
const S_REPLACED = new Set<string>(RULES.REPLACED);
const S_IDS = new Set<string>(RULES.IDS);
const S_CARRY = new Set<string>(RULES.CARRY_ANYWAY);
const S_EXTRA_PROC = new Set<string>(RULES.EXTRA_PROCESS);
const S_MOTION = new Set<string>(RULES.MOTION_KEYS);
const S_HANDLED = new Set<string>(RULES.HANDLED);
const S_NOT_SPEED = new Set<string>(RULES.NOT_SPEED);
const S_FIL_KEEP = new Set<string>(RULES.FILAMENT_KEEP);
const RENAMES: Record<string, string> = RULES.RENAMES;
const RANGES: Record<string, [number | null, number | null]> = RULES.RANGES as any;
const FIX_DEFAULT: Record<string, string> = RULES.FIX_DEFAULT;
const FIL_OVERRIDES: string[] = RULES.FIL_OVERRIDES;
const MOTION_RE = /(_speed|_acceleration|_jerk)$/;
const PLATE_KEYS: Record<string, string> = {
  "Textured PEI Plate": "textured_plate_temp",
  "High Temp Plate": "hot_plate_temp",
  "Cool Plate": "cool_plate_temp",
  "Engineering Plate": "eng_plate_temp",
  "Textured Cool Plate": "textured_cool_plate_temp",
  "Supertack Plate": "supertack_plate_temp",
};
const BED_RE = /(cool|hot|textured|textured_cool|supertack)_plate_temp(_initial_layer)?$/;
const TEMP_KEYS = new Set(["nozzle_temperature", "nozzle_temperature_initial_layer"]);
// Keys each destination slicer writes into its own project files (taken from projects saved by
// Bambu Studio 2.9 and OrcaSlicer 2.5). Anything else is a legacy or foreign key; some legacy keys
// make OrcaSlicer quietly reset the print settings to defaults, so they are never written.
const KEYSET = { bambu: new Set<string>(SLICER_KEYS.bambu), orca: new Set<string>(SLICER_KEYS.orca) };
const META_KEYS = new Set(["name", "from", "version", "different_settings_to_system", "print_compatible_printers", "inherits_group"]);
// Bambu Studio limits that differ from OrcaSlicer's
const BAMBU_RANGES: Record<string, [number | null, number | null]> = {
  top_color_penetration_layers: [1, null],
  bottom_color_penetration_layers: [1, null],
};
// What each slicer stamps into the files it saves. OrcaSlicer reads its own tag first and refuses
// files that claim a newer version than it has, so Orca outputs carry a conservative Orca tag.
export const STAMP = {
  bambu: { app: "BambuStudio-02.09.01.70", client: "02.09.01.70" },
  orca: { app: "BambuStudio-02.08.01.55", client: "02.08.01.55", orca: "2.3.1" },
};
export function targetFamily(profile: PrinterProfile): "bambu" | "orca" {
  return /bambu/i.test(profile.slicer) ? "bambu" : "orca";
}

const GCODE_CACHE_RE = /^Metadata\/plate_\d+\.(json|gcode)(\.md5)?$/;
const DROP_FILES = new Set(["Metadata/filament_sequence.json"]);

// ---------- small helpers ----------
const first = (v: any) => (Array.isArray(v) ? v[0] : v);
const num = (x: any): number | null => {
  if (x === null || x === undefined) return null;
  const n = parseFloat(String(x).replace(/%$/, ""));
  return Number.isFinite(n) ? n : null;
};
const fmt = (x: number, nd = 6) => {
  let s = x.toFixed(nd);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s === "" || s === "-0" ? "0" : s;
};
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
const dec = (u: Uint8Array) => strFromU8(u);

export function normalizeColor(c: string | undefined | null): string {
  if (!c) return "#FFFFFF";
  let s = String(c).trim();
  if (!s.startsWith("#")) s = "#" + s;
  if (/^#[0-9a-fA-F]{8}$/.test(s)) s = s.slice(0, 7);
  if (/^#[0-9a-fA-F]{3}$/.test(s)) s = "#" + s.slice(1).split("").map((ch) => ch + ch).join("");
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : "#FFFFFF";
}

function parseArea(area: any): { minx: number; miny: number; w: number; h: number } | null {
  if (!Array.isArray(area) || !area.length) return null;
  const pts = area.map((p: string) => String(p).split("x").map(Number));
  if (pts.some((p: number[]) => p.length < 2 || p.some((n) => !Number.isFinite(n)))) return null;
  const xs = pts.map((p: number[]) => p[0]);
  const ys = pts.map((p: number[]) => p[1]);
  const minx = Math.min(...xs);
  const miny = Math.min(...ys);
  return { minx, miny, w: Math.max(...xs) - minx, h: Math.max(...ys) - miny };
}

/** Origin of plate #idx (0-based) of n in the slicer's plate grid: cols = ceil(sqrt(n)), pitch = bed x 1.2, rows go to -Y. */
function plateOrigin(idx: number, n: number, w: number, h: number, gap = 0.2): [number, number] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(n) - 1e-9));
  return [(idx % cols) * w * (1 + gap), -Math.floor(idx / cols) * h * (1 + gap)];
}

/** Bambu 2.5+ stores filament vectors once per (filament, nozzle variant). Collapse to one value per filament. */
function filVector(v: any, nfil: number, selfIndex: string[], variants: string[]): any[] {
  if (!Array.isArray(v)) return Array(nfil).fill(v);
  if (v.length === selfIndex.length && selfIndex.length > nfil) {
    const out: any[] = [];
    for (let fid = 1; fid <= nfil; fid++) {
      const idx = selfIndex.map((s, j) => (parseInt(s) === fid ? j : -1)).filter((j) => j >= 0);
      const pick = idx.find((j) => variants[j] === "Direct Drive Standard") ?? idx[0] ?? 0;
      out.push(v[pick]);
    }
    return out;
  }
  const out = v.slice(0, nfil);
  while (out.length < nfil && out.length) out.push(out[out.length - 1]);
  return out;
}

// ---------- zip ----------
export type Entries = Record<string, Uint8Array>;

export function readZip(bytes: Uint8Array): Entries {
  const raw = unzipSync(bytes);
  const out: Entries = {};
  let total = 0;
  for (const [k, v] of Object.entries(raw)) {
    const p = k.replace(/\\/g, "/");
    if (p.endsWith("/") || p.startsWith("/") || p.includes("..")) continue;
    out[p] = v;
    total += v.length;
    if (total > 2_000_000_000) throw new Error("This file expands to more than 2 GB, which exceeds the safety limit.");
  }
  return out;
}

function findEntry(e: Entries, name: string): string | undefined {
  if (name in e) return name;
  const low = name.toLowerCase();
  return Object.keys(e).find((k) => k.toLowerCase() === low);
}

// ---------- model_settings.config ----------
interface MSPart {
  id: string;
  subtype: string;
  ext: number | null;
  name: string;
}
interface MSObject {
  id: string;
  name: string;
  ext: number | null;
  parts: MSPart[];
}

const posInt = (v: string | undefined | null) => {
  const n = v && /^\d+$/.test(v) ? parseInt(v) : 0;
  return n > 0 ? n : null;
};

function metaMap(block: string): Record<string, string> {
  const m: Record<string, string> = {};
  const re = /<metadata\s+key="([^"]+)"\s+value="([^"]*)"/g;
  let r: RegExpExecArray | null;
  while ((r = re.exec(block))) if (!(r[1] in m)) m[r[1]] = r[2];
  return m;
}

function parseModelSettings(xml: string): { objects: MSObject[]; plates: PlateInfo[] } {
  const objects: MSObject[] = [];
  const objRe = /<object\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/object>/g;
  let m: RegExpExecArray | null;
  while ((m = objRe.exec(xml))) {
    const body = m[2];
    const head = body.split("<part")[0];
    const md = metaMap(head);
    const parts: MSPart[] = [];
    const partRe = /<part\b([^>]*)>([\s\S]*?)<\/part>/g;
    let p: RegExpExecArray | null;
    while ((p = partRe.exec(body))) {
      const id = /\bid="(\d+)"/.exec(p[1])?.[1] ?? "";
      const subtype = /\bsubtype="([^"]+)"/.exec(p[1])?.[1] ?? "normal_part";
      const pm = metaMap(p[2]);
      parts.push({ id, subtype, ext: posInt(pm.extruder), name: pm.name || "" });
    }
    objects.push({ id: m[1], name: md.name || "", ext: posInt(md.extruder), parts });
  }
  const plates: PlateInfo[] = [];
  const plRe = /<plate>([\s\S]*?)<\/plate>/g;
  let i = 0;
  while ((m = plRe.exec(xml))) {
    i++;
    const block = m[1];
    const md = metaMap(block);
    const ids: string[] = [];
    const oRe = /key="object_id"\s+value="(\d+)"/g;
    let o: RegExpExecArray | null;
    while ((o = oRe.exec(block))) ids.push(o[1]);
    plates.push({
      id: parseInt(md.plater_id || String(i)) || i,
      name: md.plater_name || "",
      objectIds: ids,
      thumbnail: md.thumbnail_file || undefined,
    });
  }
  return { objects, plates };
}

// ---------- 3D model geometry (for bounding boxes) ----------
type Mat = number[]; // 12 numbers, 3MF row-vector convention
interface ModelObj {
  bbox: [number, number, number, number, number, number] | null;
  paint?: Set<number>;
  comps: { objectid: string; path: string | null; t: Mat | null }[];
}

function parseTransform(s: string | undefined): Mat | null {
  if (!s) return null;
  const t = s.trim().split(/\s+/).map(Number);
  return t.length === 12 && t.every(Number.isFinite) ? t : null;
}
const IDENT: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
function applyT(t: Mat, x: number, y: number, z: number): [number, number, number] {
  return [
    x * t[0] + y * t[3] + z * t[6] + t[9],
    x * t[1] + y * t[4] + z * t[7] + t[10],
    x * t[2] + y * t[5] + z * t[8] + t[11],
  ];
}
function mul(a: Mat, b: Mat): Mat {
  // p * a * b
  const r: Mat = new Array(12).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  const [tx, ty, tz] = applyT(b, a[9], a[10], a[11]);
  r[9] = tx;
  r[10] = ty;
  r[11] = tz;
  return r;
}

function parseModelObjects(text: string): Map<string, ModelObj> {
  const out = new Map<string, ModelObj>();
  let pos = 0;
  for (;;) {
    const s = text.indexOf("<object", pos);
    if (s < 0) break;
    const tagEnd = text.indexOf(">", s);
    const tag = text.slice(s, tagEnd + 1);
    const e = text.indexOf("</object>", tagEnd);
    const end = e < 0 ? text.length : e;
    const id = /\bid="(\d+)"/.exec(tag)?.[1];
    const body = text.slice(tagEnd + 1, end);
    pos = end + 9;
    if (!id) continue;
    let bbox: ModelObj["bbox"] = null;
    const vre = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
    let v: RegExpExecArray | null;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    while ((v = vre.exec(body))) {
      const x = +v[1], y = +v[2], z = +v[3];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
    }
    if (x0 !== Infinity) bbox = [x0, y0, z0, x1, y1, z1];
    const comps: ModelObj["comps"] = [];
    const cre = /<component\b([^>]*)\/?>/g;
    let c: RegExpExecArray | null;
    while ((c = cre.exec(body))) {
      const oid = /\bobjectid="(\d+)"/.exec(c[1])?.[1];
      if (!oid) continue;
      const path = /\bp:path="([^"]+)"/.exec(c[1])?.[1]?.replace(/^\//, "") ?? null;
      comps.push({ objectid: oid, path, t: parseTransform(/\btransform="([^"]+)"/.exec(c[1])?.[1]) });
    }
    let paint: Set<number> | undefined;
    if (body.includes("paint_color=") || body.includes("mmu_segmentation=")) {
      paint = new Set([...scanPaint(body).counts.keys()].filter((k) => k > 0));
    }
    out.set(id, { bbox, comps, paint });
  }
  return out;
}

interface BuildItem {
  objectid: string;
  t: Mat | null;
}
function parseBuildItems(rootText: string): BuildItem[] {
  const b = rootText.indexOf("<build");
  if (b < 0) return [];
  const seg = rootText.slice(b);
  const out: BuildItem[] = [];
  const re = /<item\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(seg))) {
    const oid = /\bobjectid="(\d+)"/.exec(m[1])?.[1];
    if (oid) out.push({ objectid: oid, t: parseTransform(/\btransform="([^"]+)"/.exec(m[1])?.[1]) });
  }
  return out;
}

/** World XY bbox of every build item (conservative: transformed local boxes). */
function itemBoxes(e: Entries, rootText: string): Map<string, [number, number, number, number]> {
  const cache = new Map<string, Map<string, ModelObj>>();
  const load = (path: string) => {
    if (!cache.has(path)) {
      const k = findEntry(e, path);
      cache.set(path, k ? parseModelObjects(dec(e[k])) : new Map());
    }
    return cache.get(path)!;
  };
  cache.set(ROOT_MODEL, parseModelObjects(rootText));
  const out = new Map<string, [number, number, number, number]>();
  const acc = (box: number[] | null, b: [number, number, number, number, number, number], t: Mat) => {
    for (const x of [b[0], b[3]])
      for (const y of [b[1], b[4]])
        for (const z of [b[2], b[5]]) {
          const [wx, wy] = applyT(t, x, y, z);
          if (!box) box = [wx, wy, wx, wy];
          else {
            box[0] = Math.min(box[0], wx);
            box[1] = Math.min(box[1], wy);
            box[2] = Math.max(box[2], wx);
            box[3] = Math.max(box[3], wy);
          }
        }
    return box;
  };
  const walkObj = (path: string, oid: string, t: Mat, box: number[] | null, depth: number): number[] | null => {
    const o = load(path).get(oid);
    if (!o || depth > 8) return box;
    if (o.bbox) box = acc(box, o.bbox, t);
    for (const c of o.comps) box = walkObj(c.path || path, c.objectid, mul(c.t || IDENT, t), box, depth + 1);
    return box;
  };
  for (const it of parseBuildItems(rootText)) {
    const b = walkObj(ROOT_MODEL, it.objectid, it.t || IDENT, null, 0);
    if (b) out.set(it.objectid, b as [number, number, number, number]);
  }
  return out;
}

// ---------- per-filament height ranges (for filament-change pauses) ----------
/** For each plate and used filament: the height band (relative to the object's bottom) it occupies. */
function filamentStacks(e: Entries, rootText: string, objects: MSObject[], plates: PlateInfo[]): Analysis["stacks"] {
  const cache = new Map<string, Map<string, ModelObj>>();
  const load = (path: string) => {
    if (!cache.has(path)) {
      const k = findEntry(e, path);
      cache.set(path, k ? parseModelObjects(dec(e[k])) : new Map());
    }
    return cache.get(path)!;
  };
  cache.set(ROOT_MODEL, parseModelObjects(rootText));
  const msById = new Map(objects.map((o) => [o.id, o]));
  const plateOf = new Map<string, number>();
  for (const p of plates) for (const id of p.objectIds) if (!plateOf.has(id)) plateOf.set(id, p.id);
  const out: NonNullable<Analysis["stacks"]> = [];
  const zr = (b: number[], t: Mat): [number, number] => {
    let z0 = Infinity, z1 = -Infinity;
    for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) {
      const w = applyT(t, x, y, z)[2];
      z0 = Math.min(z0, w); z1 = Math.max(z1, w);
    }
    return [z0, z1];
  };
  for (const it of parseBuildItems(rootText)) {
    const ms = msById.get(it.objectid);
    const root = load(ROOT_MODEL).get(it.objectid);
    if (!ms || !root) continue;
    const plate = plateOf.get(it.objectid) ?? plates[0]?.id ?? 1;
    const bands: { fil: number; z0: number; z1: number; mod: boolean }[] = [];
    const visit = (path: string, oid: string, t: Mat, partId: string | null, depth: number) => {
      const o = load(path).get(oid);
      if (!o || depth > 8) return;
      const pid = partId ?? (depth === 1 ? oid : null);
      const part = ms.parts.find((p) => p.id === pid);
      const sub = part?.subtype || "normal_part";
      if (o.bbox && sub !== "negative_part" && sub !== "support_blocker" && sub !== "support_enforcer") {
        const [z0, z1] = zr(o.bbox, t);
        const isMod = sub === "modifier_part";
        const ext = part?.ext || (isMod ? 0 : ms.ext || 1);
        if (ext) bands.push({ fil: ext, z0, z1, mod: isMod });
        // painted colours can be anywhere on the part: assume its whole height
        if (!isMod && o.paint) for (const st of o.paint) bands.push({ fil: st, z0, z1, mod: false });
      }
      for (const c of o.comps) visit(c.path || path, c.objectid, mul(c.t || IDENT, t), pid, depth + 1);
    };
    visit(ROOT_MODEL, it.objectid, it.t || IDENT, null, 0);
    const solid = bands.filter((b) => !b.mod);
    if (!solid.length) continue;
    const base = Math.min(...solid.map((b) => b.z0));
    for (const b of bands) out.push({ plate, fil: b.fil, z0: Math.max(0, b.z0 - base), z1: b.z1 - base });
  }
  return out;
}

export interface PausePlan {
  map: number[];
  slotColors: Record<number, string>;
  /** colour changes: on `plate`, slot `slot` switches to source filament `fil` from height `z` (object-relative) */
  changes: { plate: number; slot: number; fil: number; z: number; color: string }[];
}

/**
 * When a project uses more colours than the printer has slots, try to share slots between colours that
 * never print on the same layers (e.g. a base in one colour and lettering on top in another). Returns null
 * when the colours overlap in height and pauses cannot replace the missing slots.
 */
export function planPauses(a: Analysis, slots: number): PausePlan | null {
  const used = a.filaments.filter((f) => f.used);
  if (!a.usedKnown || !a.stacks || used.length <= slots || slots < 1) return null;
  const EPS = 0.05;
  // per filament per plate: merged band
  const band = new Map<number, Map<number, [number, number]>>();
  for (const s of a.stacks) {
    if (!used.some((f) => f.index === s.fil)) continue;
    const m = band.get(s.fil) || new Map();
    const b = m.get(s.plate);
    m.set(s.plate, b ? [Math.min(b[0], s.z0), Math.max(b[1], s.z1)] : [s.z0, s.z1]);
    band.set(s.fil, m);
  }
  const lowest = (f: number) => Math.min(...[...(band.get(f)?.values() || [])].map((b) => b[0]));
  const order = used.map((f) => f.index).filter((f) => band.has(f)).sort((x, y) => lowest(x) - lowest(y) || x - y);
  if (order.length !== used.length) return null;
  const slotFils: number[][] = Array.from({ length: slots }, () => []);
  const fits = (s: number, f: number) =>
    slotFils[s].every((g) => {
      for (const [pl, b] of band.get(f)!) {
        const c = band.get(g)!.get(pl);
        if (c && b[0] < c[1] - EPS && c[0] < b[1] - EPS) return false;
        // the later colour must start above the earlier one on this plate
        if (c && b[0] < c[0]) return false;
      }
      return true;
    });
  for (const f of order) {
    let s = slotFils.findIndex((x) => !x.length);
    if (s < 0) {
      // reuse the compatible slot whose last colour ends highest (shortest wait)
      let best = -1, bestTop = -Infinity;
      slotFils.forEach((x, i) => {
        if (!fits(i, f)) return;
        const top = Math.max(...x.flatMap((g) => [...band.get(g)!.values()].map((b) => b[1])));
        if (top > bestTop) { bestTop = top; best = i; }
      });
      s = best;
    }
    if (s < 0) return null;
    slotFils[s].push(f);
  }
  const map = a.filaments.map(() => 0);
  const slotColors: Record<number, string> = {};
  const changes: PausePlan["changes"] = [];
  const colorOf = (f: number) => a.filaments[f - 1]?.color || "#FFFFFF";
  slotFils.forEach((fs, i) => {
    fs.forEach((f) => (map[f - 1] = i + 1));
    if (!fs.length) return;
    slotColors[i + 1] = colorOf(fs[0]);
    const plates = new Set(fs.flatMap((f) => [...band.get(f)!.keys()]));
    for (const pl of plates) {
      const onPlate = fs.filter((f) => band.get(f)!.has(pl)).sort((x, y) => band.get(x)!.get(pl)![0] - band.get(y)!.get(pl)![0]);
      onPlate.forEach((f, k) => {
        if (k === 0 && f === fs[0]) return;
        changes.push({ plate: pl, slot: i + 1, fil: f, z: k === 0 ? 0 : band.get(f)!.get(pl)![0], color: colorOf(f) });
      });
    }
  });
  // a change at the very first layer is not a pause users can act on; give up in that case
  if (changes.some((c) => c.z < EPS)) return null;
  // unused filaments keep the default behaviour (dropped)
  return { map, slotColors, changes };
}

// ---------- analysis ----------
function readHead(u: Uint8Array, n = 6000) {
  return strFromU8(u.subarray(0, Math.min(n, u.length)));
}

function detectApp(e: Entries): string {
  const k = findEntry(e, ROOT_MODEL);
  if (!k) return "";
  const head = readHead(e[k]);
  const m = /name="Application">([^<]+)</.exec(head);
  return m ? m[1].trim() : "";
}

function metaValue(e: Entries, name: string): string {
  const k = findEntry(e, ROOT_MODEL);
  if (!k) return "";
  const m = new RegExp(`name="${name}">([^<]+)<`).exec(readHead(e[k]));
  return m ? m[1].trim() : "";
}

// Orca-family forks write their own Application name; OrcaSlicer itself writes a Bambu
// Application string plus a separate "OrcaSlicer" version tag.
const FORKS: [RegExp, string][] = [
  [/creality/i, "Creality Print"],
  [/flash|orca-ff|ffslicer/i, "Orca-Flashforge"],
  [/snapmaker/i, "Snapmaker Orca"],
  [/elegoo/i, "ElegooSlicer"],
  [/anycubic/i, "Anycubic Slicer Next"],
  [/qidi/i, "QIDI Studio"],
  [/prusa/i, "PrusaSlicer"],
  [/orca/i, "OrcaSlicer"],
  [/bambu/i, "Bambu Studio"],
];
export function slicerLabel(app: string, orcaTag: string): string {
  const ver = (s: string) => {
    const m = /(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?/.exec(s);
    return m ? `${+m[1]}.${+m[2]}.${+m[3]}` : "";
  };
  if (orcaTag && (!app || /bambu/i.test(app))) return `OrcaSlicer ${ver(orcaTag) || orcaTag}`.trim();
  for (const [re, label] of FORKS) if (re.test(app)) return `${label} ${ver(app)}`.trim();
  return app ? app.replace(/-/g, " ") : "";
}

export function loadSettings(e: Entries): Dict | null {
  const k = findEntry(e, SETTINGS);
  if (!k) return null;
  try {
    const j = JSON.parse(dec(e[k]));
    return j && typeof j === "object" && !Array.isArray(j) ? j : null;
  } catch {
    return null;
  }
}

const DEFAULT_PALETTE = ["#FFFFFF", "#161616", "#C12E1F", "#0A2989", "#F4EE2A", "#00AE42", "#FF6A13", "#8E9089"];

interface FilamentUse {
  used: Set<number> | null;
  why?: string;
  usage: Map<number, number>;
  hasPaint: boolean;
  paintStates: Set<number>;
}

function analyzeUse(e: Entries, S: Dict, nfil: number, objects: MSObject[], msXml: string): FilamentUse {
  const usage = new Map<number, number>();
  const add = (n: number, w: number) => usage.set(n, (usage.get(n) || 0) + w);
  const used = new Set<number>();
  const paintStates = new Set<number>();
  let hasPaint = false;
  let bad = 0;
  for (const k of Object.keys(e)) {
    if (!k.toLowerCase().endsWith(".model")) continue;
    const u = e[k];
    // quick byte check before decoding big meshes
    const t = dec(u);
    if (!t.includes("paint_color=") && !t.includes("mmu_segmentation=")) continue;
    hasPaint = true;
    const r = scanPaint(t);
    bad += r.bad;
    for (const [s, c] of r.counts) {
      if (s > 0) {
        paintStates.add(s);
        add(s, c);
      }
    }
  }
  for (const s of paintStates) used.add(s);
  for (const o of objects) {
    const parts = o.parts.length ? o.parts : [{ id: "", subtype: "normal_part", ext: null, name: o.name }];
    for (const p of parts) {
      if (p.subtype === "modifier_part") {
        if (p.ext) {
          used.add(p.ext);
          add(p.ext, 500);
        }
        continue;
      }
      if (p.subtype !== "normal_part") continue;
      const base = p.ext || o.ext || 1;
      used.add(base);
      add(base, 1000);
    }
  }
  const ovRe = new RegExp(`<metadata\\s+key="(?:${FIL_OVERRIDES.join("|")})"\\s+value="(\\d+)"`, "g");
  let m: RegExpExecArray | null;
  while ((m = ovRe.exec(msXml))) if (+m[1] > 0) used.add(+m[1]);
  const rangeRe = /opt_key="(?:extruder|wall_filament|sparse_infill_filament|solid_infill_filament)"\s*>\s*(\d+)\s*</g;
  while ((m = rangeRe.exec(msXml))) if (+m[1] > 0) used.add(+m[1]);
  for (const k of FIL_OVERRIDES) {
    const n = num(first(S[k]));
    if (n && n > 0) used.add(Math.round(n));
  }
  const cg = findEntry(e, "Metadata/custom_gcode_per_layer.xml");
  if (cg) {
    const xml = dec(e[cg]);
    const re = /<layer\b[^>]*\bextruder="(\d+)"/g;
    while ((m = re.exec(xml))) if (+m[1] > 0) used.add(+m[1]);
  }
  if (bad) return { used: null, why: "some painted-colour data could not be read", usage, hasPaint, paintStates };
  if (!objects.length) return { used: null, why: "the project has no object list", usage, hasPaint, paintStates };
  if ([...used].some((u) => u > nfil))
    return { used: null, why: "objects reference filaments that the project does not define", usage, hasPaint, paintStates };
  return { used, usage, hasPaint, paintStates };
}

export interface Loaded {
  entries: Entries;
  S: Dict | null;
  analysis: Analysis;
}

export function analyze(bytes: Uint8Array, fileName: string): Loaded {
  const base: Analysis = {
    fileName,
    fileSize: bytes.length,
    kind: "invalid",
    app: "",
    sourceSlicer: "",
    sourcePrinter: "",
    sourcePrinterModel: "",
    sourceBed: null,
    layerHeight: 0.2,
    supports: false,
    primeTower: false,
    hasPaint: false,
    hasSlicedGcode: false,
    colorChangeLayers: false,
    filaments: [],
    usedKnown: false,
    plates: [],
    objectCount: 0,
    notes: [],
  };
  let e: Entries;
  try {
    e = readZip(bytes);
  } catch (err: any) {
    base.error = "This does not look like a valid .3mf file (it could not be opened as a ZIP archive).";
    return { entries: {}, S: null, analysis: base };
  }
  if (!findEntry(e, ROOT_MODEL)) {
    base.error = "The file has no 3D/3dmodel.model part, so it is not a 3MF project.";
    return { entries: e, S: null, analysis: base };
  }
  const a = base;
  if (isPrusaProject(e)) {
    try {
      const t = prusaToOrca(e);
      e = t.entries;
      a.translatedFrom = { slicer: "PrusaSlicer", translated: t.translated, dropped: t.dropped };
      a.notes.push(...t.notes);
    } catch (err: any) {
      base.error = `This PrusaSlicer project could not be read (${err?.message || err}).`;
      return { entries: e, S: null, analysis: base };
    }
  }
  a.app = detectApp(e);
  const orcaTag = metaValue(e, "OrcaSlicer");
  a.sourceSlicer = slicerLabel(a.app, orcaTag);
  const S = loadSettings(e);
  const names = Object.keys(e);
  const isPrusa = names.some((n) => /Slic3r_PE\.config$|PrusaSlicer\.config$/i.test(n));
  const msKey = findEntry(e, MODEL_SETTINGS);
  if (S && Object.keys(S).length > 5) a.kind = /orca/i.test(a.app) && !/bambu/i.test(a.app) ? "orca" : "bambu";
  else if (isPrusa) a.kind = "prusa";
  else if (msKey) a.kind = "bambu";
  else a.kind = "plain";
  const isOrcaFamily = !!orcaTag || (!!a.app && !/^bambu/i.test(a.app));
  if (isOrcaFamily && a.kind === "bambu") a.kind = "orca";

  a.hasSlicedGcode = names.some((n) => /^Metadata\/plate_\d+\.gcode$/.test(n));
  const thumbs = ["Metadata/plate_1.png", "Metadata/thumbnail.png", "Metadata/plate_1_small.png", "Metadata/top_1.png"];
  a.thumbnail = thumbs.map((t) => findEntry(e, t)).find(Boolean);

  if (a.kind === "prusa" || a.kind === "plain") {
    a.notes.push(
      a.kind === "prusa"
        ? "This PrusaSlicer project has no readable objects or settings. Re-save it in PrusaSlicer 2.4 or newer (File → Save Project) and try again."
        : "This 3MF contains geometry only, with no slicer settings to carry over. Import it directly in your slicer and pick your printer there."
    );
    return { entries: e, S, analysis: a };
  }

  const SS: Dict = S || {};
  a.sourcePrinter = String(SS.printer_settings_id || "");
  a.sourcePrinterModel = String(SS.printer_model || "");
  const area = parseArea(SS.printable_area);
  a.sourceBed = area ? [area.w, area.h] : null;
  a.layerHeight = num(first(SS.layer_height)) || 0.2;
  a.supports = ["1", "true"].includes(String(first(SS.enable_support ?? "0")));
  a.primeTower = ["1", "true"].includes(String(first(SS.enable_prime_tower ?? "0")));

  const msXml = msKey ? dec(e[msKey]) : "";
  const { objects, plates } = parseModelSettings(msXml);
  a.objectCount = objects.length;
  a.plates = plates.length ? plates : [{ id: 1, name: "", objectIds: objects.map((o) => o.id) }];

  let colours: any[] = Array.isArray(SS.filament_colour) ? SS.filament_colour : [];
  let nfil = colours.length;
  const si: string[] = SS.filament_self_index || [];
  const fv: string[] = SS.filament_extruder_variant || [];
  if (si.length) nfil = Math.max(...si.map((s) => parseInt(s) || 1));
  if (!nfil) {
    const maxExt = Math.max(1, ...objects.flatMap((o) => [o.ext || 1, ...o.parts.map((p) => p.ext || 1)]));
    nfil = maxExt;
    a.notes.push("The project does not list its filaments; colours were assigned automatically.");
  }
  const selfIndex = si.length ? si : Array.from({ length: nfil }, (_, i) => String(i + 1));
  const variants = fv.length ? fv : Array(selfIndex.length).fill("Direct Drive Standard");
  colours = colours.length ? filVector(colours, nfil, selfIndex, variants) : DEFAULT_PALETTE.slice(0, nfil);
  const types = SS.filament_type ? filVector(SS.filament_type, nfil, selfIndex, variants) : Array(nfil).fill("PLA");
  const presets = SS.filament_settings_id ? filVector(SS.filament_settings_id, nfil, selfIndex, variants) : Array(nfil).fill("");

  const use = analyzeUse(e, SS, nfil, objects, msXml);
  try {
    a.stacks = filamentStacks(e, dec(e[findEntry(e, ROOT_MODEL)!]), objects, a.plates);
  } catch {
    a.stacks = undefined;
  }
  a.hasPaint = use.hasPaint;
  a.usedKnown = !!use.used;
  a.usedWhy = use.why;
  a.colorChangeLayers = !!findEntry(e, "Metadata/custom_gcode_per_layer.xml") &&
    /<layer\b/.test(dec(e[findEntry(e, "Metadata/custom_gcode_per_layer.xml")!]));
  a.filaments = Array.from({ length: nfil }, (_, i): SourceFilament => ({
    index: i + 1,
    color: normalizeColor(colours[i] ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]),
    type: String(types[i] ?? "PLA") || "PLA",
    preset: String(presets[i] ?? ""),
    used: use.used ? use.used.has(i + 1) : true,
    usage: use.usage.get(i + 1) || 0,
  }));
  if (a.hasSlicedGcode)
    a.notes.push("The file contains pre-sliced G-code for the original printer. It will be removed so it can never be sent to the wrong machine.");
  return { entries: e, S, analysis: a };
}

// ---------- filament & process matching ----------
export function matchFilamentType(type: string, profile: PrinterProfile): { key: string; exact: boolean } {
  const avail = profile.filaments;
  const t = (type || "PLA").toUpperCase().trim();
  if (avail[t]) return { key: t, exact: true };
  const baseT = t.split(/[-\s+]/)[0];
  const alias: Record<string, string> = { "PLA-S": "PLA", SUPPORT: "PLA", "PETG-HF": "PETG", "PET": "PETG", "PLA+": "PLA", PCTG: "PETG", "ABS-GF": "ABS", "TPU-AMS": "TPU" };
  const tries = [alias[t], t.replace(/-HF$|-HS$|\+$/, ""), baseT, alias[baseT]];
  for (const k of tries) if (k && avail[k]) return { key: k, exact: false };
  if (/PLA/.test(t) && avail.PLA) return { key: "PLA", exact: false };
  if (/PET/.test(t) && avail.PETG) return { key: "PETG", exact: false };
  if (/TPU|TPE/.test(t) && avail.TPU) return { key: "TPU", exact: false };
  if (/ABS/.test(t) && avail.ABS) return { key: "ABS", exact: false };
  if (/PA|NYLON/.test(t) && avail.PA) return { key: "PA", exact: false };
  return { key: avail.PLA ? "PLA" : Object.keys(avail)[0], exact: false };
}

export function pickProcess(profile: PrinterProfile, lh: number): ProcessPreset {
  const ps: ProcessPreset[] = profile.processes;
  let best = ps[0];
  let bestScore = Infinity;
  for (const p of ps) {
    const d = Math.abs(p.layer_height - lh);
    const pref = /standard/i.test(p.name) ? 0 : p.default ? 0.0001 : /optimal|quality|draft|fine/i.test(p.name) ? 0.0002 : 0.0003;
    const s = d + pref;
    if (s < bestScore - 1e-9) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}

// ---------- colour distance for auto-merge ----------
function hexToLab(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const lin = (c: number) => (c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92);
  r = lin(r); g = lin(g); b = lin(b);
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export function colorDistance(a: string, b: string) {
  const p = hexToLab(a), q = hexToLab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** Default mapping: used filaments get their own slots in order; when there are more than `slots`, the least-used ones are merged into the nearest kept colour. */
export function defaultMapping(a: Analysis, slots: number, pruneUnused = true): number[] {
  const fils = a.filaments;
  const map = fils.map(() => 0);
  const active = fils.filter((f) => f.used || !pruneUnused || !a.usedKnown);
  if (active.length <= slots) {
    active.forEach((f, i) => (map[f.index - 1] = i + 1));
    return map;
  }
  const keep = [...active].sort((x, y) => y.usage - x.usage || x.index - y.index).slice(0, slots).sort((x, y) => x.index - y.index);
  keep.forEach((f, i) => (map[f.index - 1] = i + 1));
  for (const f of active) {
    if (map[f.index - 1]) continue;
    let bi = 0, bd = Infinity;
    keep.forEach((k, i) => {
      const d = colorDistance(f.color, k.color);
      if (d < bd) { bd = d; bi = i; }
    });
    map[f.index - 1] = bi + 1;
  }
  return map;
}

// ---------- conversion ----------
function setMeta(xml: string, key: string, value: string | null): string {
  const re = new RegExp(`\\s*<metadata name="${key.replace(/[:]/g, "\\$&")}">[^<]*</metadata>`);
  if (re.test(xml)) return value === null ? xml.replace(re, "") : xml.replace(re, (m) => m.replace(/>[^<]*</, `>${value}<`));
  if (value === null) return xml;
  return xml.replace(/(<model\b[^>]*>)/, `$1\n <metadata name="${key}">${value}</metadata>`);
}

function stampModel(xml: string, fam: "bambu" | "orca"): string {
  const b = xml.indexOf("<resources");
  const head = b >= 0 ? xml.slice(0, b) : xml;
  const tail = b >= 0 ? xml.slice(b) : "";
  let h = setMeta(head, "Application", fam === "bambu" ? STAMP.bambu.app : STAMP.orca.app);
  h = setMeta(h, "OrcaSlicer", fam === "orca" ? STAMP.orca.orca : null);
  if (!/name="BambuStudio:3mfVersion"/.test(h)) h = setMeta(h, "BambuStudio:3mfVersion", "1");
  return h + tail;
}

function stampSliceInfo(xml: string, fam: "bambu" | "orca"): string {
  let x = xml.replace(/(<header_item key="X-BBL-Client-Version" value=")[^"]*(")/, `$1${fam === "bambu" ? STAMP.bambu.client : STAMP.orca.client}$2`);
  x = x.replace(/\s*<header_item key="OrcaSlicer-Version" value="[^"]*"\/>/, "");
  if (fam === "orca") x = x.replace(/(<header_item key="X-BBL-Client-Version"[^>]*\/>)/, `$1\n    <header_item key="OrcaSlicer-Version" value="${STAMP.orca.orca}"/>`);
  return x;
}

function buildDiffLists(copied: Set<string>, nfil: number, mach: Set<string> = new Set()): string[] {
  const proc = [...copied].filter((k) => S_PRINT.has(k) || S_EXTRA_PROC.has(k) || k === "best_object_pos").sort();
  const fil = [...copied].filter((k) => S_FIL.has(k)).sort();
  return [proc.join(";"), ...Array(nfil).fill(fil.join(";")), [...mach].sort().join(";")];
}

export function convert(loaded: Loaded, profile: PrinterProfile, opts: ConvertOptions): ConvertResult {
  const { entries: e, analysis: a } = loaded;
  if (a.kind !== "bambu" && a.kind !== "orca") throw new Error("Only Bambu Studio and Orca-family projects can be converted in this release.");
  const S: Dict = loaded.S || {};
  const lines: ReportLine[] = [];
  const kept: string[] = [], replaced: string[] = [], discarded: string[] = [], speeds: string[] = [];
  const warn = (t: string) => lines.push({ level: "warn", text: t });
  const info = (t: string) => lines.push({ level: "info", text: t });
  if (a.translatedFrom) {
    const tf = a.translatedFrom;
    info(`Translated from ${a.sourceSlicer || tf.slicer}: ${tf.translated.length} settings and features mapped to their Orca/Bambu names (layers, walls, infill, supports, brim, seam, ironing, prime tower, colours, temperatures).`);
    if (tf.dropped.length) info(`Not carried over from ${tf.slicer} (different units or no equivalent; the destination printer's defaults are used): ${tf.dropped.slice(0, 12).join(", ")}${tf.dropped.length > 12 ? ` and ${tf.dropped.length - 12} more` : ""}.`);
  }

  const nfil = a.filaments.length;
  const map = opts.map.slice(0, nfil);
  while (map.length < nfil) map.push(map.length + 1);

  // used filaments that were mapped to "drop" fall back to slot 1
  a.filaments.forEach((f) => {
    if (!map[f.index - 1] && (f.used || !a.usedKnown)) {
      map[f.index - 1] = 1;
      warn(`Filament ${f.index} is used by the model but had no slot; it was assigned to slot 1.`);
    }
  });
  const maxSlot = Math.max(1, ...map);
  const nOut = Math.max(maxSlot, profile.minFilaments || 0);
  const reps: (number | null)[] = Array.from({ length: nOut }, (_, j) => {
    const i = map.findIndex((s) => s === j + 1);
    return i >= 0 ? i + 1 : null;
  });
  const groups = Array.from({ length: nOut }, (_, j) => map.map((s, i) => (s === j + 1 ? i + 1 : 0)).filter(Boolean));
  const newIdx = (old: number) => (old > 0 && old <= nfil ? map[old - 1] || 1 : old > nfil ? 1 : 0);
  const identity = map.every((s, i) => s === i + 1) && nOut === nfil;
  if (nOut > profile.slots)
    warn(`${nOut} filament slots are in use but ${profile.model} is set up for ${profile.slots} (${profile.slotUnit}). Merge colours before slicing, or confirm you have more units connected.`);

  const si: string[] = S.filament_self_index || Array.from({ length: nfil }, (_, i) => String(i + 1));
  const fv: string[] = S.filament_extruder_variant || Array(si.length).fill("Direct Drive Standard");

  // output filament presets
  const outTypes: string[] = [];
  const outPresets = reps.map((r, j) => {
    const src = r ? a.filaments[r - 1] : null;
    const { key, exact } = matchFilamentType(src?.type || "PLA", profile);
    const p = profile.filaments[key];
    outTypes.push(src?.type || p.values.filament_type?.[0] || "PLA");
    if (src && !exact)
      info(`Slot ${j + 1}: no ${profile.model} preset for “${src.type}”; using “${p.name}” (your temperatures are kept).`);
    return p;
  });

  // ---- 1) template = target machine + process + filament presets ----
  // a different nozzle size than the designer's: scale the layer height and take
  // line widths and layer heights from the printer's own presets for that nozzle
  const srcNozzle = num(first(S.nozzle_diameter)) || 0.4;
  const dstNozzle = num(first(profile.machineValues.nozzle_diameter)) || 0.4;
  const nozzleChange = Math.abs(srcNozzle - dstNozzle) > 0.001;
  const proc = pickProcess(profile, nozzleChange ? a.layerHeight * (dstNozzle / srcNozzle) : a.layerHeight);
  if (nozzleChange)
    info(`Nozzle changed from ${fmt(srcNozzle)} mm to ${fmt(dstNozzle)} mm: layer height and line widths come from the “${proc.name}” preset; the designer's other settings are kept.`);
  const T: Dict = { ...clone(profile.machineValues), ...clone(proc.values) };
  const filKeys = new Set<string>();
  outPresets.forEach((p) => Object.keys(p.values).forEach((k) => filKeys.add(k)));
  for (const k of filKeys) {
    const fallback = outPresets.find((p) => k in p.values)!.values[k];
    T[k] = outPresets.map((p) => first(k in p.values ? p.values[k] : fallback));
  }
  const R: Dict = clone(T);
  R.from = "project";
  R.name = "project_settings";
  if (S.version) R.version = S.version;
  R.printer_settings_id = profile.machine;
  R.printer_model = profile.printer_model;
  R.printer_variant = profile.printer_variant;
  R.print_settings_id = proc.name;
  R.default_print_profile = profile.defaultProcess || proc.name;
  R.filament_settings_id = outPresets.map((p) => p.name);
  R.filament_ids = outPresets.map((p) => p.id || "");
  R.print_compatible_printers = [profile.machine];
  R.filament_self_index = Array.from({ length: nOut }, (_, i) => String(i + 1));
  R.filament_extruder_variant = Array(nOut).fill("Direct Drive Standard");
  if (profile.extruders > 1 && profile.slots === profile.extruders) {
    R.filament_map = Array.from({ length: nOut }, (_, i) => String(Math.min(i + 1, profile.extruders)));
    R.filament_map_mode = "Manual";
  } else {
    R.filament_map = Array(nOut).fill("1");
    if (profile.extruders > 1) R.filament_map_mode = "Auto For Flush";
  }
  info(`Print preset: “${proc.name}” (closest to the project's ${fmt(a.layerHeight, 3)} mm layers). Machine settings, start/end G-code and limits come from “${profile.machine}”.`);

  // ---- 2) colours & flush ----
  const srcCols = filVector(S.filament_colour || a.filaments.map((f) => f.color), nfil, si, fv);
  R.filament_colour = reps.map((r, j) => normalizeColor(opts.slotColors?.[j + 1] || (r ? srcCols[r - 1] : "#FFFFFF")));
  R.filament_type = outTypes;
  if ("filament_multi_colour" in S || "filament_multi_colour" in R) R.filament_multi_colour = R.filament_colour.slice();
  if ("filament_colour_type" in S) R.filament_colour_type = Array(nOut).fill("1");
  const fm = S.flush_volumes_matrix;
  if (Array.isArray(fm) && fm.length >= nfil * nfil) {
    R.flush_volumes_matrix = [];
    for (let x = 0; x < nOut; x++)
      for (let y = 0; y < nOut; y++) {
        const a1 = reps[x], b1 = reps[y];
        R.flush_volumes_matrix.push(a1 && b1 ? fm[(a1 - 1) * nfil + (b1 - 1)] : x === y ? "0" : "280");
      }
  } else {
    R.flush_volumes_matrix = Array.from({ length: nOut * nOut }, (_, i) => (Math.floor(i / nOut) === i % nOut ? "0" : "280"));
  }
  const fvv = S.flush_volumes_vector;
  R.flush_volumes_vector = Array.from({ length: nOut * 2 }, (_, i) => {
    const r = reps[Math.floor(i / 2)];
    return Array.isArray(fvv) && r && fvv.length >= 2 * nfil ? fvv[2 * (r - 1) + (i % 2)] : "140";
  });
  kept.push("filament_colour");

  // ---- 3) copy the author's settings ----
  const copied = new Set<string>();
  const machDiff = new Set<string>();
  const authorProc = new Set<string>(Array.isArray(S.different_settings_to_system) && S.different_settings_to_system.length ? String(S.different_settings_to_system[0]).split(";").filter(Boolean) : []);
  const slowKeep: Record<string, number> = {};
  for (const k of authorProc) {
    const tk = RENAMES[k] || k;
    if (!tk.endsWith("_speed") || S_NOT_SPEED.has(tk) || !(k in S)) continue;
    const av = num(first(S[k])), tv = num(first(T[tk]));
    if (av !== null && tv !== null && !String(first(S[k])).endsWith("%") && av > 0 && av < tv) slowKeep[tk] = av;
  }
  const isMotion = (tk: string) => S_PRINT.has(tk) && !S_NOT_SPEED.has(tk) && (S_MOTION.has(tk) || MOTION_RE.test(tk));

  const pickPerFilament = (k: string, sv: any, tv: any): any[] => {
    const vec = filVector(sv, nfil, si, fv);
    return reps.map((r, j) => (r ? vec[r - 1] : Array.isArray(tv) ? tv[Math.min(j, tv.length - 1)] : tv));
  };

  for (const [key, sv] of Object.entries(S)) {
    if (S_HANDLED.has(key)) continue;
    const tk = RENAMES[key] || key;
    if (nozzleChange && (/(^|_)line_width$/.test(tk) || /^(layer_height|initial_layer_print_height|initial_layer_line_width)$/.test(tk))) {
      replaced.push(key);
      continue;
    }
    const inT = tk in T;
    const printOpt = S_PRINT.has(tk) || S_EXTRA_PROC.has(tk);
    if (!inT && !printOpt) {
      discarded.push(key);
      continue;
    }
    const motion = isMotion(tk);
    const carryMotion = motion && (opts.keepSpeeds || tk in slowKeep);
    if (
      ((S_DISCARDED.has(key) || S_DISCARDED.has(tk)) && !carryMotion && !S_CARRY.has(tk)) ||
      S_REPLACED.has(key) || S_REPLACED.has(tk) || S_IDS.has(key) || S_IDS.has(tk) ||
      (S_PRINTER.has(tk) && !S_CARRY.has(tk))
    ) {
      (S_REPLACED.has(key) || S_REPLACED.has(tk) ? replaced : discarded).push(key);
      continue;
    }
    if (S_FIL.has(tk) && !S_FIL_KEEP.has(tk) && !BED_RE.test(tk)) {
      replaced.push(key);
      continue;
    }
    if (motion && !carryMotion) {
      discarded.push(key);
      continue;
    }
    const tv = T[tk];
    let val: any;
    if (S_FIL.has(tk) || BED_RE.test(tk)) val = pickPerFilament(tk, sv, tv);
    else if (Array.isArray(tv)) val = Array.isArray(sv) ? sv.slice(0, Math.max(tv.length, 1)) : Array(tv.length).fill(sv);
    else if (inT) val = first(sv);
    else val = sv;
    if (carryMotion && !Array.isArray(val) && num(val) === 0 && /accel|jerk/.test(tk) && num(T[tk])) continue;

    // safety caps
    if (TEMP_KEYS.has(tk) && Array.isArray(val)) {
      val = val.map((x: any, j: number) => {
        const hi = num(first(outPresets[j]?.values.nozzle_temperature_range_high)) || 300;
        const n = num(x);
        if (n !== null && n > hi) {
          warn(`Slot ${j + 1}: ${tk.replace(/_/g, " ")} ${x} °C is above the ${profile.model} preset limit; capped at ${hi} °C.`);
          return String(hi);
        }
        return x;
      });
    }
    if (motion && carryMotion && !Array.isArray(val)) {
      const lim = /accel/.test(tk) ? num(first(profile.machineValues.machine_max_acceleration_extruding)) : /speed/.test(tk) ? num(first(profile.machineValues.machine_max_speed_x)) : null;
      const n = num(val);
      if (lim && n && n > lim && !String(val).endsWith("%")) {
        warn(`${tk}: ${val} exceeds the ${profile.model} machine limit; capped at ${lim}.`);
        val = String(lim);
      }
    }
    if (tk in RANGES) {
      const [lo, hi] = RANGES[tk];
      const sane = (x: any) => {
        const n = num(x);
        if (n === null || ((lo === null || n >= lo) && (hi === null || n <= hi))) return x;
        const nv = FIX_DEFAULT[tk] || (inT ? first(T[tk]) : fmt(Math.min(Math.max(n, lo ?? n), hi ?? n)));
        if (n !== -1) warn(`${tk}: ${x} is outside the slicer's accepted range; set to ${nv}.`);
        return nv;
      };
      val = Array.isArray(val) ? val.map(sane) : sane(val);
    }
    if (tk === "support_style" && val === "tree_organic") val = "default";
    R[tk] = val;
    copied.add(tk);
    kept.push(tk === key ? key : `${key} → ${tk}`);
  }
  if (!nozzleChange) for (const k of ["layer_height", "initial_layer_print_height"]) if (k in R) copied.add(k);
  for (const [k, v] of Object.entries(slowKeep)) speeds.push(`${k}: kept the designer's slower ${fmt(v)} mm/s`);
  if (!opts.keepSpeeds) {
    for (const key of Object.keys(S)) {
      const tk = RENAMES[key] || key;
      if (tk in R && isMotion(tk) && !(tk in slowKeep)) {
        const s0 = String(first(S[key])), r0 = String(first(R[tk]));
        if (s0 !== r0) speeds.push(`${tk}: ${s0} → ${r0}`);
      }
    }
  }

  // FIL_OVERRIDES in the project config are 1-based filament numbers
  for (const k of FIL_OVERRIDES) {
    if (!(k in R)) continue;
    const n = num(first(R[k]));
    if (n && n > 0) R[k] = Array.isArray(R[k]) ? R[k].map((x: any) => String(newIdx(Math.round(num(x) || 0)))) : String(newIdx(Math.round(n)));
  }
  if (nOut === 1 && R.enable_prime_tower !== undefined) {
    R.enable_prime_tower = "0";
    info("Only one filament remains, so the prime tower was switched off.");
  }

  // ---- bed / build plate: every slot needs a temperature for the chosen plate ----
  {
    const srcBed = String(first(S.curr_bed_type ?? "") || "");
    const cands = [srcBed, String(first(profile.machineValues.default_bed_type ?? "") || ""), String(first(T.curr_bed_type ?? "") || ""), ...Object.keys(PLATE_KEYS)].filter((b, i, arr) => b && PLATE_KEYS[b] && arr.indexOf(b) === i);
    const ok = (b: string) => {
      const k = PLATE_KEYS[b];
      const v = R[k];
      if (!Array.isArray(v) || v.length < nOut) return false;
      return v.slice(0, nOut).every((x: any) => (num(x) || 0) > 0);
    };
    const bed = cands.find(ok);
    if (bed) {
      R.curr_bed_type = bed;
      if (srcBed && bed !== srcBed) warn(`Build plate changed from “${srcBed}” to “${bed}”: the ${profile.model} filament presets have no bed temperature for the original plate. Fit that plate before printing, or pick another plate in the slicer.`);
      else if (!srcBed) info(`Build plate set to “${bed}”.`);
    } else {
      warn(`No build plate suits every filament in the ${profile.model} presets. Pick a plate in the slicer and check the bed temperatures.`);
    }
  }

  // painted supports need support generation on
  const hasPaintedSupports = Object.keys(e).some((n) => n.toLowerCase().endsWith(".model") && /paint_supports="[^"]/.test(dec(e[n])));
  if (hasPaintedSupports && ["0", "false"].includes(String(first(R.enable_support ?? "0")))) {
    R.enable_support = "1";
    copied.add("enable_support");
    info("The model has hand-painted supports, so support generation was switched on.");
  }
  // ---- keep only keys the destination slicer understands ----
  const fam = targetFamily(profile);
  const allowed = KEYSET[fam];
  const dropped0: string[] = [];
  for (const k of Object.keys(R)) {
    if (META_KEYS.has(k) || allowed.has(k)) continue;
    delete R[k];
    copied.delete(k);
    dropped0.push(k);
  }
  if (fam === "bambu") {
    // Bambu Studio only accepts line widths in mm; OrcaSlicer allows % of the nozzle diameter
    const nd = num(first(R.nozzle_diameter)) || 0.4;
    for (const k of Object.keys(R)) {
      if (!/(^|_)line_width$/.test(k)) continue;
      const conv = (x: any) => {
        const t = String(x);
        if (!t.endsWith("%")) return x;
        const pct = parseFloat(t);
        return isFinite(pct) ? fmt((pct / 100) * nd, 3) : x;
      };
      R[k] = Array.isArray(R[k]) ? R[k].map(conv) : conv(R[k]);
    }
    for (const [k, [lo, hi]] of Object.entries(BAMBU_RANGES)) {
      if (!(k in R)) continue;
      const fix = (x: any) => {
        const n = num(x);
        if (n === null) return x;
        if (lo !== null && n < lo) return String(lo);
        if (hi !== null && n > hi) return String(hi);
        return x;
      };
      R[k] = Array.isArray(R[k]) ? R[k].map(fix) : fix(R[k]);
    }
  }
  if (fam === "orca") {
    // OrcaSlicer validates this range (10-18 mm) even when cutting is unused; some vendor profiles ship 0 or 30
    if ("retraction_distances_when_cut" in R) {
      const fix = (x: any) => { const n = num(x); return n === null ? x : String(Math.min(18, Math.max(10, n))); };
      machDiff.add("retraction_distances_when_cut");
      R.retraction_distances_when_cut = Array.isArray(R.retraction_distances_when_cut) ? R.retraction_distances_when_cut.map(fix) : fix(R.retraction_distances_when_cut);
    }
    const towerOn = ["1", "true"].includes(String(first(R.enable_prime_tower ?? "0")));
    if (towerOn && nOut > 1 && !["1", "true"].includes(String(first(R.use_relative_e_distances ?? "1")))) {
      R.use_relative_e_distances = "1";
      machDiff.add("use_relative_e_distances");
      info("The prime tower needs relative extrusion, so “Use relative E distances” was switched on (the slicer sends M83 for you).");
    }
    if (["1", "true"].includes(String(first(R.use_relative_e_distances ?? "1")))) {
      const lg = String(first(R.layer_change_gcode ?? "")), bg = String(first(R.before_layer_change_gcode ?? ""));
      if (!/^\s*G92 E0/im.test(lg) && !/^\s*G92 E0/im.test(bg)) {
        const v = lg ? `${lg}\nG92 E0` : "G92 E0";
        R.layer_change_gcode = Array.isArray(R.layer_change_gcode) ? [v] : v;
        machDiff.add("layer_change_gcode");
      }
    }
  }
  // OrcaSlicer refuses single-nozzle mixes where a filament's nozzle temperature sits outside
  // another filament's recommended range (unless the user turns that safety check off).
  if (fam === "orca" && profile.extruders < 2 && nOut > 1) {
    const used = reps.map((r, j) => ({ j, r })).filter((x) => x.r && (a.filaments[x.r - 1]?.used || !a.usedKnown));
    const t = (k: string, j: number) => num(Array.isArray(R[k]) ? R[k][j] : R[k]) || 0;
    const bad: string[] = [];
    for (let x = 0; x < used.length; x++)
      for (let y = x + 1; y < used.length; y++) {
        const i = used[x].j, j = used[y].j;
        const ok = (p: number, q: number) => t("nozzle_temperature", p) >= t("nozzle_temperature_range_low", q) && t("nozzle_temperature", p) <= t("nozzle_temperature_range_high", q);
        if (!(ok(i, j) && ok(j, i))) bad.push(`slot ${i + 1} ${outTypes[i]} ${t("nozzle_temperature", i)} °C vs slot ${j + 1} ${outTypes[j]} ${t("nozzle_temperature", j)} °C`);
      }
    if (bad.length)
      warn(`OrcaSlicer will refuse to slice this as-is: on a single nozzle every filament's temperature must sit inside the others' recommended ranges (${bad.slice(0, 2).join("; ")}). Use materials that print at similar temperatures, or turn on Preferences → Control → Slicing → Remove mixed temperature restriction if you accept the risk.`);
  }
  R.different_settings_to_system = buildDiffLists(copied, nOut, machDiff);

  // ---- 4) plates: re-centre and re-grid ----
  const srcArea = parseArea(S.printable_area);
  const dstArea = parseArea(R.printable_area) || { minx: 0, miny: 0, w: profile.bed[0], h: profile.bed[1] };
  const msKey = findEntry(e, MODEL_SETTINGS);
  const msXml = msKey ? dec(e[msKey]) : "";
  const { plates } = parseModelSettings(msXml);
  const pids = plates.length ? plates.map((p) => p.id) : [1];
  const multi = pids.length > 1;
  const objPlate = new Map<string, number>();
  plates.forEach((p) => p.objectIds.forEach((o) => objPlate.set(o, p.id)));
  const rootKey = findEntry(e, ROOT_MODEL)!;
  let rootText = dec(e[rootKey]);

  const boxes = new Map<number, [number, number, number, number] | null>();
  // individual object footprints, so the prime tower may sit in a gap between objects
  const parts = new Map<number, [number, number, number, number][]>();
  let itemBox: Map<string, [number, number, number, number]> | null = null;
  pids.forEach((pid, i) => {
    let fit: [number, number, number, number] | null = null;
    const pj = findEntry(e, `Metadata/plate_${pid}.json`);
    if (pj) {
      try {
        const j = JSON.parse(dec(e[pj]));
        const bo = (j.bbox_objects || []).map((o: any) => o.bbox).filter(Boolean);
        if (bo.length) parts.set(pid, bo.map((b: number[]) => [b[0], b[1], b[2], b[3]]));
        if (bo.length) fit = [Math.min(...bo.map((b: number[]) => b[0])), Math.min(...bo.map((b: number[]) => b[1])), Math.max(...bo.map((b: number[]) => b[2])), Math.max(...bo.map((b: number[]) => b[3]))];
      } catch { /* ignore */ }
    }
    if (!fit && srcArea) {
      if (!itemBox) itemBox = itemBoxes(e, rootText);
      const ids = multi ? plates.find((p) => p.id === pid)?.objectIds || [] : [...itemBox.keys()];
      const bs = ids.map((id) => itemBox!.get(id)).filter(Boolean) as [number, number, number, number][];
      if (bs.length) {
        const [ox, oy] = plateOrigin(i, pids.length, srcArea.w, srcArea.h);
        parts.set(pid, bs.map((b) => [b[0] - ox, b[1] - oy, b[2] - ox, b[3] - oy]));
        fit = [Math.min(...bs.map((b) => b[0])) - ox, Math.min(...bs.map((b) => b[1])) - oy, Math.max(...bs.map((b) => b[2])) - ox, Math.max(...bs.map((b) => b[3])) - oy];
      }
    }
    boxes.set(pid, fit);
  });
  const towerOn = ["1", "true"].includes(String(first(S.enable_prime_tower ?? "0"))) && reps.filter(Boolean).length > 1;
  const ncx = dstArea.minx + dstArea.w / 2, ncy = dstArea.miny + dstArea.h / 2;
  const shifts = new Map<number, [number, number]>();
  for (const pid of pids) {
    const fit = boxes.get(pid);
    if (!opts.recenter && srcArea) shifts.set(pid, [0, 0]);
    else if (fit) {
      // centre the designer's layout as a whole: objects plus the prime tower they left room for,
      // so the model does not slide into the tower's spot. Fall back to objects only if that won't fit.
      let g = fit;
      const i = pids.indexOf(pid);
      const twx = S.wipe_tower_x, twy = S.wipe_tower_y;
      if (towerOn && twx !== undefined && twy !== undefined) {
        const ax = Array.isArray(twx) ? twx : [twx], ay = Array.isArray(twy) ? twy : [twy];
        const tx = num(ax[Math.min(i, ax.length - 1)]), ty = num(ay[Math.min(i, ay.length - 1)]);
        const stw = num(first(S.prime_tower_width ?? "")) || 35;
        if (tx != null && ty != null) {
          const u: [number, number, number, number] = [Math.min(fit[0], tx), Math.min(fit[1], ty), Math.max(fit[2], tx + stw), Math.max(fit[3], ty + stw)];
          if (u[2] - u[0] <= dstArea.w - 4 && u[3] - u[1] <= dstArea.h - 4) g = u;
        }
      }
      shifts.set(pid, [ncx - (g[0] + g[2]) / 2, ncy - (g[1] + g[3]) / 2]);
    }
    else if (srcArea) shifts.set(pid, [ncx - (srcArea.minx + srcArea.w / 2), ncy - (srcArea.miny + srcArea.h / 2)]);
    else shifts.set(pid, [0, 0]);
  }
  const oldOrg = new Map<number, [number, number]>();
  const newOrg = new Map<number, [number, number]>();
  pids.forEach((pid, i) => {
    if (srcArea) oldOrg.set(pid, plateOrigin(i, pids.length, srcArea.w, srcArea.h));
    newOrg.set(pid, plateOrigin(i, pids.length, dstArea.w, dstArea.h));
  });
  if (multi) info(`${pids.length} plates: each plate was re-centred on the ${profile.model} bed and laid out on its plate grid.`);

  // prime tower: its width is tuned per printer (toolchangers use small towers, single-nozzle
  // MMU printers wide ones), so the destination printer's width is used
  if (T.prime_tower_width !== undefined && S.printer_settings_id !== profile.machine) {
    if (String(first(S.prime_tower_width ?? "")) && String(first(S.prime_tower_width)) !== String(first(T.prime_tower_width)))
      info(`Prime tower width set to the ${profile.model} default (${first(T.prime_tower_width)} mm).`);
    R.prime_tower_width = T.prime_tower_width;
  }
  const tw0 = num(first(R.prime_tower_width)) || 35;
  // purge volume per layer is fixed, so thin layers (small nozzles) make a deeper tower
  const lhOut = num(first(R.layer_height)) || 0.2;
  const tf = Math.min(2.5, Math.max(1, 0.2 / lhOut));
  if (S.wipe_tower_x !== undefined || S.wipe_tower_y !== undefined) {
   // very wide vendor towers (some Creality CFS profiles use 180 mm) may not fit beside the model;
   // then try narrower towers before settling for the least-overlapping spot
   const widths = [tw0, ...[60, 35].filter((w) => w < tw0)];
   for (let wi = 0; wi < widths.length; wi++) {
    const tw = widths[wi];
    const last = wi === widths.length - 1;
    const towerDepth = Math.max(tw, 60) * tf;
    const misses: number[] = [];
    const ax = Array.isArray(S.wipe_tower_x) ? S.wipe_tower_x : [S.wipe_tower_x ?? 15];
    const ay = Array.isArray(S.wipe_tower_y) ? S.wipe_tower_y : [S.wipe_tower_y ?? 15];
    // keep well clear of the edges: slicers grow the tower (brim, skirt, extra wipe depth) beyond
    // its nominal footprint, and multi-nozzle printers can only reach part of the bed with each nozzle
    // try a generous footprint first, then tighter ones so small beds still find a free spot
    const tries: [number, number][] = [[15, towerDepth], [10, Math.max(tw, 45) * tf], [6, tw * tf]];
    let moved = 0;
    const outX: string[] = [], outY: string[] = [];
    pids.forEach((pid, i) => {
      const [dx, dy] = shifts.get(pid)!;
      const sx = num(ax[Math.min(i, ax.length - 1)]) ?? 15, sy = num(ay[Math.min(i, ay.length - 1)]) ?? 15;
      const fit = boxes.get(pid);
      const obj = fit ? [fit[0] + dx - 5, fit[1] + dy - 5, fit[2] + dx + 5, fit[3] + dy + 5] : null;
      let pick: [number, number] | undefined, first0: [number, number] | undefined, fallback: [number, number] | undefined;
      // the designer's spot, moved with the model, when it is on the bed and clear of every object
      const keep: [number, number] = [sx + dx, sy + dy];
      const pb0 = (parts.get(pid) || (obj ? [obj] : [])).map((b) => (b === obj ? b : [b[0] + dx - 5, b[1] + dy - 5, b[2] + dx + 5, b[3] + dy + 5]));
      const onBed = keep[0] >= dstArea.minx + 3 && keep[1] >= dstArea.miny + 3 && keep[0] + tw <= dstArea.minx + dstArea.w - 8 && keep[1] + Math.max(tw, 45) * tf <= dstArea.miny + dstArea.h - 3;
      if (onBed && !pb0.some((o) => keep[0] < o[2] && keep[0] + tw > o[0] && keep[1] < o[3] && keep[1] + tw > o[1])) { pick = keep; first0 = keep; }
      for (const [m, depth] of pick ? [] : tries) {
        const xlo = dstArea.minx + m, xhi = dstArea.minx + dstArea.w - tw - 2 * m;
        const ylo = dstArea.miny + m, yhi = dstArea.miny + dstArea.h - depth - m;
        const clampX = (v: number) => Math.min(Math.max(v, xlo), xhi);
        const clampY = (v: number) => Math.min(Math.max(v, ylo), yhi);
        const pb = (parts.get(pid) || (obj ? [obj] : [])).map((b) => (b === obj ? b : [b[0] + dx - 5, b[1] + dy - 5, b[2] + dx + 5, b[3] + dy + 5]));
        const hits = (x: number, y: number) => pb.some((o) => x < o[2] && x + tw > o[0] && y < o[3] && y + depth > o[1]);
        const cands: [number, number][] = [
          [clampX(sx + dx), clampY(sy + dy)],
          [clampX(sx), clampY(sy)],
          [clampX(sx + dx), clampY(obj ? obj[3] : yhi)], [clampX(sx + dx), clampY(obj ? obj[1] - depth : ylo)],
          [clampX(obj ? obj[2] : xhi), clampY(sy + dy)], [clampX(obj ? obj[0] - tw : xlo), clampY(sy + dy)],
          [xhi, yhi], [xlo, yhi], [xhi, ylo], [xlo, ylo],
        ];
        first0 ??= cands[0];
        const overlap = ([x, y]: [number, number]) =>
          pb.reduce((a, o) => a + Math.max(0, Math.min(x + tw, o[2]) - Math.max(x, o[0])) * Math.max(0, Math.min(y + depth, o[3]) - Math.max(y, o[1])), 0);
        fallback ??= cands.slice().sort((p1, p2) => overlap(p1) - overlap(p2))[0];
        pick = cands.find(([x, y]) => !hits(x, y));
        if (pick) break;
      }
      const [x, y] = pick || fallback!;
      if (pick && (pick[0] !== first0![0] || pick[1] !== first0![1])) moved++;
      if (!pick) misses.push(pid);
      outX.push(fmt(x, 2));
      outY.push(fmt(y, 2));
    });
    if (misses.length && !last) continue;
    R.wipe_tower_x = outX;
    R.wipe_tower_y = outY;
    const towerOn = ["1", "true"].includes(String(first(R.enable_prime_tower ?? "0")));
    if (tw !== tw0 && towerOn) {
      R.prime_tower_width = Array.isArray(R.prime_tower_width) ? R.prime_tower_width.map(() => String(tw)) : String(tw);
      info(`The ${tw0} mm prime tower did not fit beside the model, so it was narrowed to ${tw} mm.`);
    }
    if (towerOn) for (const pid of misses) warn(`${multi ? `Plate ${pid}: the` : "The"} model leaves little free space for the prime tower, so it was placed where it overlaps least. Check the tower in the slicer preview; if it touches the model, move it or scale the model.`);
    if (moved && towerOn) info(`The prime tower was moved to a free corner on ${moved} plate${moved > 1 ? "s" : ""} so it does not overlap the model.`);
    break;
   }
  }

  const guessPlate = (x: number, y: number): number | null => {
    if (!srcArea) return null;
    const cols = Math.max(1, Math.ceil(Math.sqrt(pids.length) - 1e-9));
    const col = Math.max(0, Math.floor(x / (srcArea.w * 1.2)));
    const row = y < 0 ? Math.ceil(-y / (srcArea.h * 1.2)) : 0;
    const idx = row * cols + col;
    return idx >= 0 && idx < pids.length ? pids[idx] : null;
  };

  let unplaced = 0;
  if (srcArea) {
    const b = rootText.indexOf("<build");
    if (b >= 0) {
      const head = rootText.slice(0, b);
      const tail = rootText.slice(b).replace(/<item\b[^>]*>/g, (tag) => {
        const tm = /transform="([^"]+)"/.exec(tag);
        if (!tm) return tag;
        const t = tm[1].trim().split(/\s+/);
        if (t.length !== 12) return tag;
        const oid = /objectid="(\d+)"/.exec(tag)?.[1];
        const x = parseFloat(t[9]), y = parseFloat(t[10]);
        let pid = oid ? objPlate.get(oid) ?? null : null;
        if (pid === null) pid = multi ? guessPlate(x, y) : pids[0];
        if (pid === null) {
          unplaced++;
          return tag;
        }
        const [dx, dy] = shifts.get(pid)!;
        const [ox, oy] = oldOrg.get(pid)!;
        const [nx, ny] = newOrg.get(pid)!;
        t[9] = fmt(x - ox + nx + dx, 5);
        t[10] = fmt(y - oy + ny + dy, 5);
        return tag.replace(tm[0], `transform="${t.join(" ")}"`);
      });
      rootText = head + tail;
    }
  }
  if (unplaced) warn(`${unplaced} object(s) could not be matched to a plate and were not moved. Check their position in the slicer.`);

  // fit checks
  for (const pid of pids) {
    const fit = boxes.get(pid);
    if (!fit) continue;
    const [dx, dy] = shifts.get(pid)!;
    const w = fit[2] - fit[0], h = fit[3] - fit[1];
    const lab = multi ? `Plate ${pid}: ` : "";
    if (w > dstArea.w || h > dstArea.h) {
      const rot = h <= dstArea.w && w <= dstArea.h;
      const pct = Math.floor(Math.min(dstArea.w / w, dstArea.h / h) * 95);
      warn(`${lab ? lab + "the" : "The"} model footprint is ${w.toFixed(0)} × ${h.toFixed(0)} mm, larger than the ${dstArea.w.toFixed(0)} × ${dstArea.h.toFixed(0)} mm bed. ${rot ? "Rotating it 90° in the slicer should make it fit." : `Scale it to about ${pct}% or split it before slicing.`}`);
    } else {
      const x0 = fit[0] + dx, y0 = fit[1] + dy, x1 = fit[2] + dx, y1 = fit[3] + dy;
      if (x0 < dstArea.minx - 0.5 || y0 < dstArea.miny - 0.5 || x1 > dstArea.minx + dstArea.w + 0.5 || y1 > dstArea.miny + dstArea.h + 0.5)
        warn(`${lab}objects extend past the bed edge. Use Arrange in the slicer before slicing.`);
    }
  }
  const height = num(R.printable_height) || profile.height;
  if (height && pids.length) {
    // a rough Z check from item boxes is not available without full transforms; rely on slicer.
  }

  // ---- 5) model_settings.config ----
  let msOut = msXml;
  if (msXml) {
    const keys = ["extruder", ...FIL_OVERRIDES].join("|");
    msOut = msOut.replace(new RegExp(`(<metadata\\s+key="(?:${keys})"\\s+value=")(\\d+)(")`, "g"), (_m, a1, v, c) => a1 + String(newIdx(parseInt(v))) + c);
    msOut = msOut.replace(/(opt_key="(?:extruder|wall_filament|sparse_infill_filament|solid_infill_filament|support_filament|support_interface_filament)"\s*>\s*)(\d+)(\s*<)/g, (_m, a1, v, c) => a1 + String(newIdx(parseInt(v))) + c);
    msOut = msOut.replace(/(<metadata\s+key="filament_maps"\s+value=")[^"]*(")/g, (_m, a1, c) => a1 + R.filament_map.join(" ") + c);
    msOut = msOut.replace(/(<metadata\s+key="filament_volume_maps"\s+value=")[^"]*(")/g, (_m, a1, c) => a1 + Array(nOut).fill("0").join(" ") + c);
  }

  // ---- 6) paint data ----
  let paintRemapped = 0;
  const paintNeedsRemap = a.hasPaint && !a.filaments.every((f) => newIdx(f.index) === f.index);
  const outFiles: Zippable = {};
  const removed: string[] = [];
  for (const [name, data] of Object.entries(e)) {
    if (GCODE_CACHE_RE.test(name) || DROP_FILES.has(name)) {
      removed.push(name);
      continue;
    }
    if (name === findEntry(e, SETTINGS)) continue;
    if (name === msKey) {
      outFiles[name] = strToU8(msOut);
      continue;
    }
    if (name === rootKey) {
      let txt = stampModel(rootText, fam);
      if (paintNeedsRemap && /paint_color=|mmu_segmentation=/.test(txt)) {
        const r = remapPaintText(txt, newIdx);
        txt = r.text;
        paintRemapped += r.changed;
      }
      outFiles[name] = strToU8(txt);
      continue;
    }
    if (paintNeedsRemap && name.toLowerCase().endsWith(".model")) {
      const t = dec(data);
      if (/paint_color=|mmu_segmentation=/.test(t)) {
        const r = remapPaintText(t, newIdx);
        paintRemapped += r.changed;
        outFiles[name] = strToU8(r.text);
        continue;
      }
    }
    if (name === "Metadata/slice_info.config") {
      outFiles[name] = strToU8(stampSliceInfo(dec(data), fam));
      continue;
    }
    if (name === "Metadata/custom_gcode_per_layer.xml") {
      outFiles[name] = strToU8(dec(data).replace(/(<layer\b[^>]*\bextruder=")(\d+)(")/g, (_m, a1, v, c) => a1 + String(newIdx(parseInt(v))) + c));
      continue;
    }
    outFiles[name] = /\.(png|jpe?g)$/i.test(name) ? [data, { level: 0 }] : data;
  }
  if (opts.pauses?.length) {
    const lh = num(first(R.layer_height)) || a.layerHeight || 0.2;
    const flh = num(first(R.initial_layer_print_height)) || lh;
    const topZ = (z: number) => {
      const k = Math.max(1, Math.floor((z + 0.01 - flh + lh / 2) / lh) + 1);
      return Math.round((flh + k * lh) * 1000) / 1000;
    };
    const CG = "Metadata/custom_gcode_per_layer.xml";
    const prev = outFiles[CG] ? dec(outFiles[CG] as Uint8Array) : "";
    const mode = opts.map.filter(Boolean).length && Math.max(...opts.map) > 1 ? "MultiAsSingle" : "SingleExtruder";
    const pauseG = String(first(R.machine_pause_gcode ?? "") || "").trim();
    const byPlate = new Map<number, string[]>();
    for (const c of [...opts.pauses].sort((x, y) => x.plate - y.plate || x.z - y.z)) {
      const l = byPlate.get(c.plate) || [];
      const msg = `Load ${normalizeColor(c.color)} in slot ${c.slot}`;
      l.push(
        pauseG
          ? `    <layer top_z="${topZ(c.z)}" type="1" extruder="${c.slot}" color="${normalizeColor(c.color)}" extra="${msg}" gcode="${pauseG.replace(/"/g, "&quot;").replace(/\n/g, "&#10;")}"/>\n`
          : `    <layer top_z="${topZ(c.z)}" type="4" extruder="${c.slot}" color="${normalizeColor(c.color)}" extra="M600" gcode="M600"/>\n`,
      );
      byPlate.set(c.plate, l);
    }
    let xml = prev || `<?xml version="1.0" encoding="utf-8"?>\n<custom_gcodes_per_layer>\n</custom_gcodes_per_layer>\n`;
    for (const [pl, ls] of byPlate) {
      const re = new RegExp(`(<plate>\\s*<plate_info id="${pl}"\\s*/>[\\s\\S]*?)(\\s*<mode\\b|\\s*</plate>)`);
      if (re.test(xml)) xml = xml.replace(re, (_m, body, tail) => body + "\n" + ls.join("").replace(/\n$/, "") + tail);
      else xml = xml.replace("</custom_gcodes_per_layer>", `  <plate>\n    <plate_info id="${pl}"/>\n${ls.join("")}    <mode value="${mode}"/>\n  </plate>\n</custom_gcodes_per_layer>`);
    }
    outFiles[CG] = strToU8(xml);
    const n = opts.pauses.length;
    info(`Added ${n} filament-change pause${n > 1 ? "s" : ""} so ${a.filaments.filter((f) => f.used).length} colours print with ${profile.slots} slot${profile.slots > 1 ? "s" : ""}: ${opts.pauses
      .slice(0, 6)
      .map((c) => `slot ${c.slot} → ${normalizeColor(c.color)} at ${topZ(c.z)} mm${a.plates.length > 1 ? ` (plate ${c.plate})` : ""}`)
      .join("; ")}${n > 6 ? "; …" : ""}. The printer pauses at each one (${pauseG ? `its pause G-code: ${pauseG.split("\n")[0].slice(0, 30)}` : "M600"}); swap the filament from the printer's screen, then resume.`);
    if (!pauseG) warn("This printer profile has no pause G-code, so the pauses use M600. Check that your firmware supports it (on Klipper it needs an M600 macro).");
  }
  R.version = fam === "bambu" ? STAMP.bambu.client : STAMP.orca.client;
  outFiles[SETTINGS] = strToU8(JSON.stringify(R, null, 4));
  if (removed.some((r) => r.endsWith(".gcode"))) info("Removed the pre-sliced G-code for the original printer. Slice again before printing.");
  if (paintRemapped) info(`Re-mapped painted colours on ${paintRemapped.toLocaleString()} triangles to the new slot numbers.`);
  if (!identity && !paintRemapped && a.hasPaint && paintNeedsRemap) info("Painted areas already used the kept filament numbers.");
  const merged = groups.filter((g) => g.length > 1);
  merged.forEach((g) =>
    info(opts.pauses?.some((c) => g.includes(c.fil)) ? `Filaments ${g.join(", ")} share slot ${map[g[0] - 1]}, with a pause to swap between them.` : `Filaments ${g.join(", ")} now print from one slot (slot ${map[g[0] - 1]}).`),
  );
  merged.forEach((g) => {
    const ts = [...new Set(g.map((i) => a.filaments[i - 1]?.type).filter(Boolean))];
    if (ts.length > 1) warn(`Filaments ${g.join(", ")} are different materials (${ts.join(", ")}) but now share slot ${map[g[0] - 1]}. Check that the slot's material suits every part.`);
  });
  const dropped = a.filaments.filter((f) => !map[f.index - 1]);
  if (dropped.length) info(`Removed ${dropped.length} unused filament(s): ${dropped.map((f) => f.index).join(", ")}.`);
  if (a.colorChangeLayers) info("This project has layer colour changes; they were kept and re-numbered. Check them in the slicer's preview.");
  if (S.printer_settings_id === profile.machine) info("The project was already set up for this printer; settings were refreshed anyway.");
  lines.unshift({ level: "ok", text: `Converted for ${profile.model}. Open it in ${profile.slicer} with File → Open Project (not Import), review, then slice.` });

  const bytes = zipSync(outFiles, { level: 6 });
  const base = a.fileName.replace(/\.3mf$/i, "");
  const tag = profile.model.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const report: ConvertReport = {
    target: profile.model,
    process: proc.name,
    filaments: reps.map((r, j) => ({ slot: j + 1, color: R.filament_colour[j], type: outTypes[j], preset: outPresets[j].name, from: groups[j] })),
    kept, replaced, discarded, speeds, lines,
    removedFiles: removed,
    paintRemapped,
    outputName: `${base}_${tag}.3mf`,
  };
  return { bytes, report };
}
