/*
 * Tool-changer support (Bambu Lab H3C / P3C PrintTools, H2C Vortek hotend rack; per-tool nozzle sizes).
 *
 * Bambu Studio 2.9 describes the nozzles a project expects with per-slot keys:
 *   extruder_nozzle_count        installed nozzles per extruder
 *   extruder_nozzle_slot         their physical slot ids (counted across extruders, each extruder
 *                                owning extruder_max_nozzle_count ids)
 *   extruder_nozzle_volume_type  Standard / High Flow / TPU285 ... per installed nozzle
 *   extruder_nozzle_diameter     per installed nozzle
 *   extruder_nozzle_stats(_new)  the same as "Standard#8|TPU285#1" per extruder
 * and the filament -> nozzle assignment with filament_map (1-based extruder), filament_nozzle_map
 * (physical slot id), filament_volume_map (volume-type enum) under filament_map_mode "Nozzle Manual".
 * The slicer re-resolves any assignment that points at a missing or incompatible nozzle, so a
 * bad map degrades to the slicer's own choice instead of failing.
 */
import type { Dict, PrinterProfile } from "./types";

const first = (v: any) => (Array.isArray(v) ? v[0] : v);
const num = (v: any): number | null => {
  const n = parseFloat(String(v));
  return isFinite(n) ? n : null;
};
const fmt = (n: number) => String(Math.round(n * 100) / 100);

// NozzleVolumeType enum of Bambu Studio 2.9 (PrintConfig.cpp)
const VOL: Record<string, number> = { Standard: 0, "High Flow": 1, Hybrid: 2, "TPU High Flow": 3, TPU285: 4, "E3D High Flow": 5 };
const volName = (t: string) => (t === "HighFlow" ? "High Flow" : t);

// how many tools a stock machine has fitted (the profiles only say how many it can hold)
const INSTALLED: Record<string, number[]> = {
  "Bambu Lab H3C": [9], // 8 PrintTools for 1.75 mm + 1 for 2.85 mm TPU
  "Bambu Lab P3C": [5], // 5 PrintTools in 7 docks
  "Bambu Lab H2C": [1, 4], // fixed left hotend + 4 x 0.4 mm induction hotends in the rack
};

export const isFlexible = (type: string) => /TPU|TPE|FLEX/i.test(type || "");

/** per-source-filament nozzle diameter and tool (0-based physical slot / extruder) */
export interface SourceTools {
  /** nozzle diameter each source filament printed with (null = unknown) */
  dia: (number | null)[];
  /** physical tool id each filament used on the source machine, if it was a multi-tool printer */
  tool: (number | null)[];
  /** filament diameter (1.75 / 2.85) */
  filDia: number[];
  /** the source printer had several tools / nozzles */
  multiTool: boolean;
  model: string;
}

export function readSourceTools(S: Dict, nfil: number, filVec: (v: any) => any[]): SourceTools {
  const arr = (v: any): string[] => (Array.isArray(v) ? v.map(String) : v === undefined || v === null || v === "" ? [] : [String(v)]);
  const nd = arr(S.nozzle_diameter).map(num);
  const slotDia = arr(S.extruder_nozzle_diameter).map(num);
  const slotIds = arr(S.extruder_nozzle_slot).map((x) => parseInt(x));
  const counts = arr(S.extruder_nozzle_count).map((x) => parseInt(x) || 0);
  const nozMap = arr(S.filament_nozzle_map).map((x) => parseInt(x));
  const filMap = arr(S.filament_map).map((x) => parseInt(x));
  const diaMap = arr(S.filament_diameter_map);
  const multiDia = ["1", "true"].includes(String(first(S.multi_nozzle_diameter_mode ?? "0")));
  const fd = S.filament_diameter !== undefined ? filVec(S.filament_diameter) : [];
  const totalSlots = counts.reduce((a, b) => a + b, 0);
  const perSlot = totalSlots > 1 && slotDia.length === totalSlots;
  const out: SourceTools = { dia: [], tool: [], filDia: [], multiTool: perSlot || nd.length > 1, model: String(S.printer_model || "") };
  for (let i = 0; i < nfil; i++) {
    out.filDia.push(num(fd[i]) || 1.75);
    let d: number | null = null, t: number | null = null;
    if (perSlot && i < nozMap.length && nozMap[i] >= 0) {
      const k = slotIds.length === totalSlots ? slotIds.indexOf(nozMap[i]) : nozMap[i];
      if (k >= 0 && k < slotDia.length) {
        d = slotDia[k];
        t = nozMap[i];
      }
    }
    if (multiDia && diaMap[i] && !diaMap[i].includes(";") && num(diaMap[i])) d = num(diaMap[i]);
    if (t === null && nd.length > 1 && filMap[i] >= 1 && filMap[i] <= nd.length) {
      t = filMap[i] - 1;
      d = nd[filMap[i] - 1];
    }
    if (d === null) d = nd[0] ?? null;
    out.dia.push(d);
    out.tool.push(t);
  }
  return out;
}

interface Slot {
  ext: number; // 0-based extruder
  id: number; // physical slot id
  vol: string; // volume type name
  installed: boolean;
}

export interface ToolTarget {
  kind: "rack";
  slots: Slot[];
  maxCounts: number[];
  amsSlot: number; // the slot that takes extra filaments through the AMS
}

/** a Bambu printer whose project carries per-nozzle keys (H3C, P3C, H2C) */
export function toolTarget(profile: PrinterProfile): ToolTarget | null {
  const mv = profile.machineValues || {};
  if (profile.slicer !== "Bambu Studio") return null;
  const maxCounts = (Array.isArray(mv.extruder_max_nozzle_count) ? mv.extruder_max_nozzle_count : []).map((x: any) => parseInt(x) || 1);
  if (!maxCounts.some((c: number) => c > 1)) return null;
  const inst = INSTALLED[profile.model] || maxCounts;
  const dvt: string[] = Array.isArray(mv.default_nozzle_volume_type) ? mv.default_nozzle_volume_type.map(String) : [];
  const total = maxCounts.reduce((a: number, b: number) => a + b, 0);
  const slots: Slot[] = [];
  let base = 0;
  maxCounts.forEach((m: number, e: number) => {
    for (let k = 0; k < m; k++) {
      const id = base + k;
      const vol = dvt.length === total ? dvt[id] : dvt.length === maxCounts.length ? dvt[e] : "Standard";
      slots.push({ ext: e, id, vol: volName(vol || "Standard"), installed: k < (inst[e] ?? m) });
    }
    base += m;
  });
  const ams = parseInt(first(mv.ams_nozzle_idx ?? "")); // H3C/P3C: tool 1 takes the AMS
  const amsSlot = Number.isFinite(ams) && slots[ams] ? ams : slots.find((s) => s.ext === maxCounts.findIndex((m: number) => m > 1))!.id;
  return { kind: "rack", slots, maxCounts, amsSlot };
}

export function toolLabel(profile: PrinterProfile, tt: ToolTarget, id: number): string {
  const s = tt.slots[id];
  if (tt.maxCounts.length > 1) {
    const local = tt.slots.filter((x) => x.ext === s.ext).indexOf(s);
    return tt.maxCounts[s.ext] > 1 ? `rack hotend ${local + 1}` : "left hotend";
  }
  return `PrintTool ${id + 1}`;
}

export interface ToolPlanInput {
  types: string[]; // per output slot
  filDia: number[]; // per output slot, 1.75 / 2.85
  used: boolean[]; // per output slot
  prefer: (number | null)[]; // per output slot: tool used on the source (same printer model only)
  nozzle: number; // target nozzle diameter
}

/**
 * Assign every output filament to a nozzle and write Bambu Studio's per-nozzle keys into R.
 * Returns report lines.
 */
export function applyTools(R: Dict, profile: PrinterProfile, tt: ToolTarget, p: ToolPlanInput): { info: string[]; warn: string[] } {
  const info: string[] = [], warn: string[] = [];
  const mv = profile.machineValues || {};
  const unprint: string[][] = (Array.isArray(mv.unprintable_filament_types) ? mv.unprintable_filament_types : []).map((s: any) =>
    String(s).split(",").map((x) => x.trim().toUpperCase()).filter(Boolean),
  );
  const n = p.types.length;
  const needs285 = (j: number) => p.filDia[j] > 2.5;
  const okFor = (j: number, s: Slot) => {
    if ((unprint[s.ext] || []).includes(String(p.types[j] || "").toUpperCase())) return false;
    // the TPU285 tool only takes 2.85 mm filament, and 2.85 mm filament only fits that tool
    return needs285(j) ? s.vol === "TPU285" : s.vol !== "TPU285";
  };
  const taken = new Set<number>();
  const assign: number[] = Array(n).fill(-1);
  const fitted: number[] = [];
  const shared: number[] = [];
  const order = [...Array(n).keys()].sort((x, y) => Number(p.used[y]) - Number(p.used[x]) || x - y);
  for (const j of order) {
    if (!p.used[j]) continue;
    const pref = p.prefer[j];
    let s: Slot | undefined =
      pref !== null && pref !== undefined && tt.slots[pref]?.installed && !taken.has(pref) && okFor(j, tt.slots[pref]) ? tt.slots[pref] : undefined;
    s ??= tt.slots.find((x) => x.installed && !taken.has(x.id) && okFor(j, x));
    if (!s) {
      // an empty dock: ask for one more tool to be fitted
      const free = tt.slots.find((x) => !x.installed && !taken.has(x.id) && !(unprint[x.ext] || []).includes(String(p.types[j]).toUpperCase()));
      if (free) {
        free.installed = true;
        if (needs285(j)) free.vol = "TPU285";
        else if (free.vol === "TPU285") free.vol = "Standard";
        s = free;
        fitted.push(free.id);
      }
    }
    if (!s) {
      // share a tool through the AMS
      const ams = tt.slots[tt.amsSlot];
      s = !needs285(j) && okFor(j, ams) ? ams : tt.slots.find((x) => x.installed && okFor(j, x));
      if (s) shared.push(j);
    }
    if (!s) {
      warn.push(`Filament ${j + 1} (${p.types[j]}) has no suitable ${tt.maxCounts.length > 1 ? "hotend" : "PrintTool"} on the ${profile.model}; the slicer will choose one.`);
      s = tt.slots[tt.amsSlot];
    }
    assign[j] = s.id;
    taken.add(s.id);
  }
  // unused filaments: park them where they fit without claiming a tool
  for (let j = 0; j < n; j++) {
    if (assign[j] >= 0) continue;
    const ams = tt.slots[tt.amsSlot];
    const s = okFor(j, ams) && ams.installed ? ams : tt.slots.find((x) => x.installed && okFor(j, x)) || ams;
    assign[j] = s.id;
  }

  const inst = tt.slots.filter((s) => s.installed);
  const d = fmt(p.nozzle);
  R.extruder_nozzle_count = tt.maxCounts.map((_, e) => String(inst.filter((s) => s.ext === e).length));
  R.extruder_nozzle_slot = inst.map((s) => String(s.id));
  R.extruder_nozzle_volume_type = inst.map((s) => s.vol);
  R.extruder_nozzle_diameter = inst.map(() => d);
  const stats = tt.maxCounts.map((_, e) => {
    const c = new Map<string, number>();
    inst.filter((s) => s.ext === e).forEach((s) => c.set(s.vol, (c.get(s.vol) || 0) + 1));
    return [...c].map(([k, v]) => `${k}#${v}`).join("|");
  });
  R.extruder_nozzle_stats = stats;
  R.extruder_nozzle_stats_new = stats.slice();
  R.filament_map = assign.map((id) => String(tt.slots[id].ext + 1));
  R.filament_nozzle_map = assign.map(String);
  R.filament_volume_map = assign.map((id) => String(VOL[tt.slots[id].vol] ?? 0));
  R.filament_diameter_map = Array(n).fill(d);
  R.filament_extruder_variant = assign.map((id) => `Direct Drive ${tt.slots[id].vol}`);
  // Bambu Studio 2.9.2 rejects "Nozzle Manual" on two-extruder racks (H2C: "invalid per-filament
  // nozzle map" even for maps it produced itself), so those get the inventory + Auto For Flush.
  const autoMode = tt.maxCounts.length > 1;
  R.filament_map_mode = autoMode ? "Auto For Flush" : "Nozzle Manual";

  const lab = (id: number) => toolLabel(profile, tt, id);
  const used = [...Array(n).keys()].filter((j) => p.used[j]);
  if (used.length && autoMode)
    info.push(`The ${profile.model} project lists the fitted hotends (${tt.slots.filter((x) => x.installed).length}); the slicer assigns each filament to a hotend automatically to minimise purging.`);
  else if (used.length)
    info.push(`${tt.maxCounts.length > 1 ? "Hotend" : "PrintTool"} assignment: ${used.map((j) => `filament ${j + 1} → ${lab(assign[j])}`).join(", ")}.`);
  const tpuTool = tt.slots.find((s) => s.installed && s.vol === "TPU285");
  if (tpuTool) {
    const on = used.filter((j) => assign[j] === tpuTool.id);
    info.push(
      on.length
        ? `${lab(tpuTool.id)} is the 2.85 mm TPU tool; only flexible 2.85 mm filament (${on.map((j) => `filament ${j + 1}`).join(", ")}) was assigned to it.`
        : `${lab(tpuTool.id)} is the 2.85 mm TPU tool, so no rigid filament was assigned to it.`,
    );
  }
  const tpu175 = used.filter((j) => isFlexible(p.types[j]) && !needs285(j));
  if (tpu175.length && tpuTool)
    info.push(`Filament ${tpu175.map((j) => j + 1).join(", ")} is 1.75 mm ${p.types[tpu175[0]]}, which the 2.85 mm TPU tool cannot take; it prints from a standard PrintTool.`);
  if (fitted.length)
    warn.push(`More tools are needed than the stock ${profile.model} has fitted: install ${fitted.map((id) => `${lab(id)}${tt.slots[id].vol === "TPU285" ? " (2.85 mm TPU)" : ""}`).join(", ")} before printing, or merge colors.`);
  if (shared.length)
    info.push(`Filament ${shared.map((j) => j + 1).join(", ")} share${shared.length > 1 ? "" : "s"} ${lab(tt.amsSlot)} through the AMS, because every other tool is in use.`);
  return { info, warn };
}

/** report when per-tool nozzle sizes of the source cannot be kept */
export function nozzleSizesNote(src: SourceTools, usedSrc: number[], target: string, dst: number[], perTool: boolean): string | null {
  const sizes = [...new Set(usedSrc.map((i) => src.dia[i]).filter((x): x is number => x !== null))].sort((a, b) => a - b);
  if (sizes.length < 2) return null;
  const list = usedSrc.filter((i) => src.dia[i] !== null).map((i) => `filament ${i + 1}: ${fmt(src.dia[i]!)} mm`).join(", ");
  if (perTool) return `Per-tool nozzle sizes were kept (${dst.map((d, e) => `toolhead ${e + 1}: ${fmt(d)} mm`).join(", ")}).`;
  const ds = [...new Set(dst.map(fmt))].join("/");
  return `The source printed with different nozzle sizes per tool (${list}). The ${target} project uses ${ds} mm for every filament; fit and select other nozzles in the slicer if you need them.`;
}
