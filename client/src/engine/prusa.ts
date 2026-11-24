// PrusaSlicer project -> Orca/Bambu-format project (in memory), so the normal converter can run on it.
// PrusaSlicer writes one mesh per object in 3D/3dmodel.model, splits volumes by triangle ranges in
// Metadata/Slic3r_PE_model.config, and stores the full print/filament/printer config as ini lines in
// Metadata/Slic3r_PE.config. Paint data uses the same TriangleSelector encoding as Bambu/Orca.
import { strFromU8, strToU8 } from "fflate";
import type { Dict } from "./types";

type Entries = Record<string, Uint8Array>;
const dec = (u: Uint8Array) => strFromU8(u);
const enc = (s: string) => strToU8(s);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const find = (e: Entries, re: RegExp) => Object.keys(e).find((k) => re.test(k));

export interface PrusaTranslation {
  entries: Entries;
  settings: Dict;
  version: string;
  translated: string[];
  dropped: string[];
  notes: string[];
}

export function isPrusaProject(e: Entries): boolean {
  return !!find(e, /^Metadata\/Slic3r_PE(_model)?\.config$/i) && !find(e, /^Metadata\/project_settings\.config$/i);
}

export function parsePrusaIni(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^;?\s*([a-z0-9_]+)\s*=\s?(.*)$/i.exec(line);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const vec = (v: string | undefined): string[] => {
  if (v == null || v === "") return [];
  const s = v.replace(/^"|"$/g, "");
  return (s.includes(";") ? s.split(";") : s.split(",")).map((x) => x.replace(/^"|"$/g, "").trim());
};
const pct = (v: string) => (/%$/.test(v) ? v : `${v}%`);
const bool = (v: string) => (v === "1" ? "1" : "0");

const FILL: Record<string, string> = { rectilinear: "zig-zag", alignedrectilinear: "aligned-rectilinear", stars: "tri-hexagon", "3dhoneycomb": "3dhoneycomb", adaptivecubic: "adaptivecubic", supportcubic: "supportcubic", lightning: "lightning", gyroid: "gyroid", grid: "grid", line: "line", triangles: "triangles", cubic: "cubic", honeycomb: "honeycomb", concentric: "concentric", hilbertcurve: "hilbertcurve", archimedeanchords: "archimedeanchords", octagramspiral: "octagramspiral", zigzag: "zig-zag", crosshatch: "crosshatch" };
const SURF: Record<string, string> = { rectilinear: "zig-zag", monotonic: "monotonic", monotoniclines: "monotonicline", alignedrectilinear: "alignedrectilinear", concentric: "concentric", hilbertcurve: "hilbertcurve", archimedeanchords: "archimedeanchords", octagramspiral: "octagramspiral" };
const SEAM: Record<string, string> = { rear: "back", aligned: "aligned", nearest: "nearest", random: "random" };
const IRON: Record<string, string> = { top: "top", topmost: "topmost", solid: "solid" };
const BRIM: Record<string, string> = { outer_only: "outer_only", inner_only: "inner_only", outer_and_inner: "outer_and_inner", no_brim: "no_brim" };

type Rule = [string, string, (v: string, P: Record<string, string>) => string | null];
const same = (v: string) => v;
/** process (print) keys: Prusa key -> Orca key */
const PROCESS: Rule[] = [
  ["layer_height", "layer_height", same],
  ["first_layer_height", "initial_layer_print_height", (v, P) => (/%$/.test(v) ? String((+v.slice(0, -1) / 100) * +P.layer_height) : v)],
  ["perimeters", "wall_loops", same],
  ["top_solid_layers", "top_shell_layers", same],
  ["bottom_solid_layers", "bottom_shell_layers", same],
  ["top_solid_min_thickness", "top_shell_thickness", same],
  ["bottom_solid_min_thickness", "bottom_shell_thickness", same],
  ["fill_density", "sparse_infill_density", pct],
  ["fill_pattern", "sparse_infill_pattern", (v) => FILL[v] ?? null],
  ["top_fill_pattern", "top_surface_pattern", (v) => SURF[v] ?? null],
  ["bottom_fill_pattern", "bottom_surface_pattern", (v) => SURF[v] ?? null],
  ["fill_angle", "infill_direction", same],
  ["infill_overlap", "infill_wall_overlap", (v) => (/%$/.test(v) ? v : null)],
  ["support_material", "enable_support", bool],
  ["support_material_auto", "support_type", (v, P) => (P.support_material_style === "organic" || P.support_material_style === "snug" && false ? (v === "1" ? "tree(auto)" : "tree(manual)") : v === "1" ? "normal(auto)" : "normal(manual)")],
  ["support_material_style", "support_style", (v) => (v === "organic" ? "organic" : v === "snug" ? "snug" : "default")],
  ["support_material_threshold", "support_threshold_angle", (v) => (v === "0" ? "30" : v)],
  ["support_material_contact_distance", "support_top_z_distance", same],
  ["support_material_bottom_contact_distance", "support_bottom_z_distance", (v, P) => (v === "0" ? P.support_material_contact_distance ?? v : v)],
  ["support_material_interface_layers", "support_interface_top_layers", same],
  ["support_material_bottom_interface_layers", "support_interface_bottom_layers", (v, P) => (v === "-1" ? P.support_material_interface_layers ?? "2" : v)],
  ["support_material_buildplate_only", "support_on_build_plate_only", bool],
  ["support_material_spacing", "support_base_pattern_spacing", same],
  ["raft_layers", "raft_layers", same],
  ["brim_width", "brim_width", same],
  ["brim_type", "brim_type", (v, P) => (+P.brim_width > 0 ? BRIM[v] ?? null : "no_brim")],
  ["brim_separation", "brim_object_gap", same],
  ["skirts", "skirt_loops", same],
  ["skirt_distance", "skirt_distance", same],
  ["skirt_height", "skirt_height", same],
  ["seam_position", "seam_position", (v) => SEAM[v] ?? null],
  ["ironing", "ironing_type", (v, P) => (v === "1" ? IRON[P.ironing_type] ?? "top" : "no ironing")],
  ["ironing_flowrate", "ironing_flow", pct],
  ["ironing_spacing", "ironing_spacing", same],
  ["fuzzy_skin", "fuzzy_skin", (v) => (["none", "external", "all"].includes(v) ? v : null)],
  ["fuzzy_skin_thickness", "fuzzy_skin_thickness", same],
  ["fuzzy_skin_point_dist", "fuzzy_skin_point_distance", same],
  ["spiral_vase", "spiral_mode", bool],
  ["thin_walls", "detect_thin_wall", bool],
  ["overhangs", "detect_overhang_wall", bool],
  ["external_perimeters_first", "wall_sequence", (v) => (v === "1" ? "outer wall/inner wall" : "inner wall/outer wall")],
  ["bridge_flow_ratio", "bridge_flow", same],
  ["wipe_tower", "enable_prime_tower", bool],
  ["wipe_tower_x", "wipe_tower_x", same],
  ["wipe_tower_y", "wipe_tower_y", same],
  ["wipe_tower_width", "prime_tower_width", same],
  ["wipe_tower_brim_width", "prime_tower_brim_width", same],
  ["interface_shells", "interface_shells", bool],
  ["infill_every_layers", "infill_combination", (v) => (+v > 1 ? "1" : "0")],
  ["ensure_vertical_shell_thickness", "ensure_vertical_shell_thickness", (v) => (v === "disabled" || v === "0" ? "none" : "ensure_all")],
  ["avoid_crossing_perimeters", "reduce_crossing_wall", bool],
  ["elefant_foot_compensation", "elefant_foot_compensation", same],
  ["xy_size_compensation", "xy_contour_compensation", same],
  ["slice_closing_radius", "slice_closing_radius", same],
];

/** per-object/volume override keys we translate (same map); anything else is reported as dropped */
const PROCESS_BY_KEY = new Map(PROCESS.map((r) => [r[0], r]));

/** Prusa printer_model -> readable name */
export function prusaPrinterName(model: string, settingsId: string): string {
  const m = (model || "").toUpperCase();
  const names: Record<string, string> = { MK4S: "Prusa MK4S", MK4: "Prusa MK4", MK4IS: "Prusa MK4", MK3S: "Prusa MK3S", MK3: "Prusa MK3", MK35: "Prusa MK3.5", MK39: "Prusa MK3.9", MINI: "Prusa MINI", MINIIS: "Prusa MINI", XL: "Prusa XL", COREONE: "Prusa CORE One", COREONEL: "Prusa CORE One L", MK4SMMU3: "Prusa MK4S MMU3", MK4MMU3: "Prusa MK4 MMU3", MK3SMMU3: "Prusa MK3S MMU3", MK3SMMU2S: "Prusa MK3S MMU2S" };
  for (const k of Object.keys(names).sort((a, b) => b.length - a.length)) if (m.startsWith(k)) return names[k];
  return model ? model : settingsId.replace(/\s*\(.*$/, "");
}

interface PVol { first: number; last: number; name: string; type: string; ext: number; meta: Record<string, string> }
interface PObj { id: string; name: string; ext: number; meta: Record<string, string>; vols: PVol[] }

function parseModelConfig(xml: string): PObj[] {
  const out: PObj[] = [];
  const ore = /<object\b([^>]*)>([\s\S]*?)<\/object>/g;
  let m: RegExpExecArray | null;
  while ((m = ore.exec(xml))) {
    const id = /\bid="(\d+)"/.exec(m[1])?.[1];
    if (!id) continue;
    const body = m[2];
    const meta: Record<string, string> = {};
    const objPart = body.replace(/<volume\b[\s\S]*?<\/volume>/g, "");
    for (const mm of objPart.matchAll(/<metadata\s+type="object"\s+key="([^"]+)"\s+value="([^"]*)"/g)) meta[mm[1]] = mm[2];
    const vols: PVol[] = [];
    for (const v of body.matchAll(/<volume\b([^>]*)>([\s\S]*?)<\/volume>/g)) {
      const first = +(/firstid="(\d+)"/.exec(v[1])?.[1] ?? 0);
      const last = +(/lastid="(\d+)"/.exec(v[1])?.[1] ?? -1);
      const vm: Record<string, string> = {};
      for (const mm of v[2].matchAll(/<metadata\s+type="volume"\s+key="([^"]+)"\s+value="([^"]*)"/g)) vm[mm[1]] = mm[2];
      vols.push({ first, last, name: vm.name || "", type: vm.volume_type || (vm.modifier === "1" ? "ParameterModifier" : "ModelPart"), ext: +(vm.extruder || 0), meta: vm });
    }
    out.push({ id, name: meta.name || `Object ${id}`, ext: +(meta.extruder || 0), meta, vols });
  }
  return out;
}

const SUBTYPE: Record<string, string> = { ModelPart: "normal_part", ParameterModifier: "modifier_part", NegativeVolume: "negative_part", SupportBlocker: "support_blocker", SupportEnforcer: "support_enforcer" };
const SKIP_META = new Set(["name", "volume_type", "matrix", "extruder", "modifier", "source_file", "source_object_id", "source_volume_id", "source_offset_x", "source_offset_y", "source_offset_z", "source_in_inches", "source_in_meters", "mirrored", "text_configuration", "shape_configuration"]);

function overrideLines(meta: Record<string, string>, P: Record<string, string>, dropped: Set<string>, pad: string): string {
  let s = "";
  for (const [k, v] of Object.entries(meta)) {
    if (SKIP_META.has(k)) continue;
    const r = PROCESS_BY_KEY.get(k);
    const val = r ? r[2](v, { ...P, ...meta }) : null;
    if (r && val != null) s += `${pad}<metadata key="${r[1]}" value="${esc(val)}"/>\n`;
    else dropped.add(`${k} (per-object)`);
  }
  return s;
}

function uuid(n: number, salt: string) {
  return `${n.toString(16).padStart(8, "0")}-${salt}-4c03-9d28-80fed5dfa1dc`;
}

export function prusaToOrca(e: Entries): PrusaTranslation {
  const rootKey = find(e, /^3D\/3dmodel\.model$/i)!;
  const cfgKey = find(e, /^Metadata\/Slic3r_PE\.config$/i);
  const mcKey = find(e, /^Metadata\/Slic3r_PE_model\.config$/i);
  const P = cfgKey ? parsePrusaIni(dec(e[cfgKey])) : {};
  const root = dec(e[rootKey]);
  const app = /name="Application">([^<]+)</.exec(root)?.[1] || "PrusaSlicer";
  const version = /(\d+\.\d+\.\d+)/.exec(app)?.[1] || "";
  const notes: string[] = [];
  const translated: string[] = [];
  const dropped = new Set<string>();
  if (!cfgKey) notes.push("The PrusaSlicer project has no saved print settings, so only geometry, parts and colours were carried over.");

  // ---- settings ----
  const S: Dict = {};
  for (const [pk, ok, fn] of PROCESS) {
    if (P[pk] == null) continue;
    const v = fn(P[pk], P);
    if (v == null || v === "") { dropped.add(pk); continue; }
    S[ok] = v;
    translated.push(ok);
  }
  if (S.support_type && P.support_material !== "1") delete S.support_type;
  const nExt = Math.max(1, vec(P.nozzle_diameter).length, vec(P.extruder_colour).length, vec(P.filament_colour).length);
  const pad = (a: string[], d: string) => Array.from({ length: nExt }, (_, i) => a[i] ?? a[a.length - 1] ?? d);
  const ec = vec(P.extruder_colour), fc = vec(P.filament_colour);
  S.filament_colour = Array.from({ length: nExt }, (_, i) => (ec[i] && /^#[0-9a-f]{6}/i.test(ec[i]) ? ec[i] : fc[i] || fc[0] || "#FF8000").toUpperCase());
  S.filament_type = pad(vec(P.filament_type), "PLA");
  S.filament_settings_id = pad(vec(P.filament_settings_id), "");
  if (P.temperature) S.nozzle_temperature = pad(vec(P.temperature), "215");
  if (P.first_layer_temperature) S.nozzle_temperature_initial_layer = pad(vec(P.first_layer_temperature), "215");
  if (P.nozzle_diameter) S.nozzle_diameter = vec(P.nozzle_diameter).slice(0, 1);
  if (P.bed_shape) S.printable_area = vec(P.bed_shape.replace(/,/g, ";"));
  if (P.max_print_height) S.printable_height = P.max_print_height;
  S.printer_model = prusaPrinterName(P.printer_model || "", P.printer_settings_id || "");
  S.printer_settings_id = P.printer_settings_id || S.printer_model;
  S.print_settings_id = P.print_settings_id || "";
  S.different_settings_to_system = [translated.join(";")];
  translated.push("filament colours and types", "nozzle temperatures");
  // most-noticed keys we do not move (Prusa speeds/widths are in different units)
  for (const k of ["perimeter_speed", "infill_speed", "external_perimeter_speed", "extrusion_width", "perimeter_extrusion_width", "infill_extrusion_width", "start_gcode", "end_gcode", "first_layer_speed", "travel_speed"]) if (P[k] != null) dropped.add(k);

  // ---- geometry ----
  const objs = mcKey ? parseModelConfig(dec(e[mcKey])) : [];
  const objById = new Map(objs.map((o) => [o.id, o]));
  const out: Entries = {};
  for (const [k, v] of Object.entries(e)) if (!/^3D\/|^Metadata\/Slic3r_PE|^Metadata\/Prusa_Slicer_custom_gcode|^\[Content_Types\]|^_rels\//i.test(k)) out[k] = v;

  const resStart = root.indexOf("<resources");
  let nextId = 1;
  let rootObjs = "";
  let ms = `<?xml version="1.0" encoding="UTF-8"?>\n<config>\n`;
  const rels: string[] = [];
  const idMap = new Map<string, string>();
  const ore = /<object\b([^>]*)>([\s\S]*?)<\/object>/g;
  ore.lastIndex = resStart;
  let m: RegExpExecArray | null;
  let paintRenamed = 0;
  const localBox = new Map<string, number[]>();
  while ((m = ore.exec(root))) {
    const pid = /\bid="(\d+)"/.exec(m[1])?.[1];
    if (!pid) continue;
    const body = m[2];
    const vtxS = body.indexOf("<vertices"), vtxE = body.indexOf("</vertices>");
    const triS = body.indexOf("<triangles"), triE = body.indexOf("</triangles>");
    if (vtxS < 0 || triS < 0) continue;
    const verts = body.slice(body.indexOf(">", vtxS) + 1, vtxE).match(/<vertex\b[^>]*\/>/g) || [];
    const tris = body.slice(body.indexOf(">", triS) + 1, triE).match(/<triangle\b[^>]*\/>/g) || [];
    {
      let b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      for (const vv of verts) {
        const q = /x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/.exec(vv);
        if (!q) continue;
        for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], +q[i + 1]); b[i + 3] = Math.max(b[i + 3], +q[i + 1]); }
      }
      localBox.set(pid, b);
    }
    const po = objById.get(pid) || { id: pid, name: `Object ${pid}`, ext: 0, meta: {}, vols: [] };
    const vols = po.vols.length ? po.vols : [{ first: 0, last: tris.length - 1, name: po.name, type: "ModelPart", ext: 0, meta: {} }];
    const fileId = nextId + vols.length; // root object id; parts take the ids before it
    const path = `3D/Objects/object_${pid}.model`;
    let partXml = "";
    let comps = "";
    let msParts = "";
    vols.forEach((v, vi) => {
      const partId = nextId + vi;
      const remap = new Map<number, number>();
      let vx = "", tx = "";
      for (let t = v.first; t <= Math.min(v.last, tris.length - 1); t++) {
        let tri = tris[t];
        tri = tri.replace(/\bv([123])="(\d+)"/g, (_s, n, idx) => {
          let r = remap.get(+idx);
          if (r == null) { r = remap.size; remap.set(+idx, r); vx += `     ${verts[+idx]}\n`; }
          return `v${n}="${r}"`;
        });
        if (tri.includes("slic3rpe:")) {
          paintRenamed++;
          tri = tri.replace(/slic3rpe:mmu_segmentation=/, "paint_color=").replace(/slic3rpe:custom_supports=/, "paint_supports=").replace(/slic3rpe:custom_seam=/, "paint_seam=").replace(/\s*slic3rpe:[a-z_]+="[^"]*"/g, "");
        }
        tx += `     ${tri}\n`;
      }
      partXml += `  <object id="${partId}" p:UUID="${uuid(partId, "0001")}" type="model">\n   <mesh>\n    <vertices>\n${vx}    </vertices>\n    <triangles>\n${tx}    </triangles>\n   </mesh>\n  </object>\n`;
      comps += `    <component p:path="/${path}" objectid="${partId}" p:UUID="${uuid(partId, "0002")}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>\n`;
      const sub = SUBTYPE[v.type] || "normal_part";
      if (!SUBTYPE[v.type]) notes.push(`Part "${v.name}" has an unknown PrusaSlicer volume type (${v.type}) and was treated as a normal part.`);
      msParts += `    <part id="${partId}" subtype="${sub}">\n      <metadata key="name" value="${esc(v.name || `Part ${vi + 1}`)}"/>\n      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n`;
      if (v.ext > 0) msParts += `      <metadata key="extruder" value="${v.ext}"/>\n`;
      msParts += overrideLines(v.meta, P, dropped, "      ");
      msParts += `    </part>\n`;
    });
    out[path] = enc(`<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">\n <metadata name="BambuStudio:3mfVersion">1</metadata>\n <resources>\n${partXml} </resources>\n <build/>\n</model>\n`);
    rels.push(`/${path}`);
    rootObjs += `  <object id="${fileId}" p:UUID="${uuid(fileId, "0000")}" type="model">\n   <components>\n${comps}   </components>\n  </object>\n`;
    ms += `  <object id="${fileId}">\n    <metadata key="name" value="${esc(po.name)}"/>\n    <metadata key="extruder" value="${po.ext || 1}"/>\n`;
    ms += overrideLines(po.meta, P, dropped, "    ");
    ms += msParts + `  </object>\n`;
    idMap.set(pid, String(fileId));
    nextId = fileId + 1;
  }
  if (/layer_height_profile|layer_config_ranges/.test(mcKey ? dec(e[mcKey]) : "") || find(e, /^Metadata\/Prusa_Slicer_layer(s_adjustment|_config_ranges)/i))
    notes.push("Variable layer height or height-range modifiers from PrusaSlicer were not carried over.");

  // build items + plate
  let build = "";
  let plateInst = "";
  const bm = /<build\b[^>]*>([\s\S]*?)<\/build>/.exec(root);
  let n = 0;
  for (const it of (bm?.[1] || "").matchAll(/<item\b([^>]*)\/?>/g)) {
    const oid = /\bobjectid="(\d+)"/.exec(it[1])?.[1];
    const nid = oid && idMap.get(oid);
    if (!nid) continue;
    const t = /\btransform="([^"]+)"/.exec(it[1])?.[1] || "1 0 0 0 1 0 0 0 1 0 0 0";
    const printable = /\bprintable="0"/.test(it[1]) ? "0" : "1";
    const inst = [...plateInst.matchAll(new RegExp(`value="${nid}"`, "g"))].length;
    build += `  <item objectid="${nid}" p:UUID="${uuid(++n, "0003")}" transform="${t}" printable="${printable}"/>\n`;
    plateInst += `    <model_instance>\n      <metadata key="object_id" value="${nid}"/>\n      <metadata key="instance_id" value="${inst}"/>\n      <metadata key="identify_id" value="${1000 + n}"/>\n    </model_instance>\n`;
  }
  // separate objects that intersect make Orca/Bambu report a G-code conflict
  const world: [string, number[]][] = [];
  for (const it of (bm?.[1] || "").matchAll(/<item\b([^>]*)\/?>/g)) {
    const oid = /\bobjectid="(\d+)"/.exec(it[1])?.[1] || "";
    const b = localBox.get(oid);
    const t = (/\btransform="([^"]+)"/.exec(it[1])?.[1] || "1 0 0 0 1 0 0 0 1 0 0 0").split(/\s+/).map(Number);
    if (!b || t.length < 12) continue;
    const w = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) {
      const p = [x * t[0] + y * t[3] + z * t[6] + t[9], x * t[1] + y * t[4] + z * t[7] + t[10], x * t[2] + y * t[5] + z * t[8] + t[11]];
      for (let i = 0; i < 3; i++) { w[i] = Math.min(w[i], p[i]); w[i + 3] = Math.max(w[i + 3], p[i]); }
    }
    world.push([objById.get(oid)?.name || `Object ${oid}`, w]);
  }
  const clash: string[] = [];
  for (let i = 0; i < world.length && clash.length < 3; i++)
    for (let j = i + 1; j < world.length && clash.length < 3; j++) {
      const a = world[i][1], b = world[j][1];
      if (a[0] < b[3] - 0.05 && b[0] < a[3] - 0.05 && a[1] < b[4] - 0.05 && b[1] < a[4] - 0.05 && a[2] < b[5] - 0.05 && b[2] < a[5] - 0.05) clash.push(`“${world[i][0]}” and “${world[j][0]}”`);
    }
  if (clash.length)
    notes.push(`Some separate objects overlap (${clash.join(", ")}). Orca/Bambu will report a G-code conflict when slicing. In the destination slicer, select the overlapping objects and use Assemble (or re-save them in PrusaSlicer as parts of one object).`);
  ms += `  <plate>\n    <metadata key="plater_id" value="1"/>\n    <metadata key="plater_name" value=""/>\n    <metadata key="locked" value="false"/>\n${plateInst}  </plate>\n</config>\n`;
  const head = root.slice(0, resStart).replace(/<model\b[^>]*>/, `<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">`).replace(/\s*<metadata name="slic3rpe:[^"]*">[^<]*<\/metadata>/g, "");
  out["3D/3dmodel.model"] = enc(`${head}<resources>\n${rootObjs} </resources>\n <build p:UUID="${uuid(0, "0004")}">\n${build} </build>\n</model>\n`);
  out["3D/_rels/3dmodel.model.rels"] = enc(`<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n${rels.map((r, i) => ` <Relationship Target="${r}" Id="rel-${i + 1}" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>`).join("\n")}\n</Relationships>`);
  out["_rels/.rels"] = enc(`<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>`);
  out["[Content_Types].xml"] = enc(`<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n <Default Extension="png" ContentType="image/png"/>\n <Default Extension="gcode" ContentType="text/x.gcode"/>\n</Types>`);
  out["Metadata/model_settings.config"] = enc(ms);
  out["Metadata/project_settings.config"] = enc(JSON.stringify(S, null, 4));

  // per-layer colour changes / pauses
  const cgKey = find(e, /^Metadata\/Prusa_Slicer_custom_gcode_per_print_z\.xml$/i);
  if (cgKey) {
    const x = dec(e[cgKey]);
    const codes = [...x.matchAll(/<code\b([^>]*)\/>/g)].map((c) => {
      const g = (k: string) => new RegExp(`\\b${k}="([^"]*)"`).exec(c[1])?.[1] ?? "";
      // Orca/Bambu do not emit PrusaSlicer-style colour changes (type 0) into G-code; use a pause instead
      const ty = g("type") || "0";
      if (ty === "0") return `    <layer top_z="${g("print_z")}" type="1" extruder="${g("extruder") || "1"}" color="${g("color")}" extra="Load ${g("color")}" gcode="M600"/>\n`;
      return `    <layer top_z="${g("print_z")}" type="${ty}" extruder="${g("extruder") || "1"}" color="${g("color")}" extra="${g("extra")}" gcode="${g("gcode")}"/>\n`;
    });
    const mode = /<mode\s+value="([^"]+)"/.exec(x)?.[1] || "SingleExtruder";
    if (codes.length) {
      out["Metadata/custom_gcode_per_layer.xml"] = enc(`<?xml version="1.0" encoding="utf-8"?>\n<custom_gcodes_per_layer>\n  <plate>\n    <plate_info id="1"/>\n${codes.join("")}    <mode value="${mode}"/>\n  </plate>\n</custom_gcodes_per_layer>\n`);
      translated.push(`${codes.length} layer colour change${codes.length > 1 ? "s" : ""}/pause${codes.length > 1 ? "s" : ""}`);
    }
  }
  if (paintRenamed) translated.push("painted colours, supports and seams");
  return { entries: out, settings: S, version, translated, dropped: [...dropped], notes };
}
