import type { Analysis } from "./types";

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
