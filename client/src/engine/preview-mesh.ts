/**
 * Geometry for the before/after colour preview. Runs in the converter worker.
 *
 * Every printable part becomes a flat triangle soup (9 floats per triangle, mm, plate coordinates)
 * plus one source filament number per triangle (1-based; 0 = unknown). Painted triangles are split
 * exactly like Bambu Studio / OrcaSlicer's TriangleSelector does (see paint.ts for the encoding), so
 * painted areas show their own colour.
 *
 * Budget: when the painted subdivision would exceed `budget` triangles, deeper paint levels are merged
 * into their parent (area-weighted majority colour). When the base mesh alone exceeds the budget it is
 * simplified by vertex clustering. The caller is told which of the two happened.
 */
import type { Entries } from "./engine";
import { extractMeshes } from "./export";

export interface PreviewPlate {
  id: number;
  name: string;
  /** 9 floats per triangle */
  pos: Float32Array;
  /** source filament per triangle, 1-based, 0 = unknown */
  fil: Uint8Array;
}
export interface PreviewMesh {
  plates: PreviewPlate[];
  /** triangles in the project (before paint subdivision) */
  sourceTriangles: number;
  /** triangles that will be drawn */
  shownTriangles: number;
  painted: boolean;
  /** fine paint detail was merged to stay within the budget */
  paintSimplified: boolean;
  /** the mesh itself was simplified to stay within the budget */
  decimated: boolean;
}

const MAXD = 16;

function nibbles(code: string): Uint8Array | null {
  const out = new Uint8Array(code.length);
  for (let i = code.length - 1, j = 0; i >= 0; i--, j++) {
    const c = code.charCodeAt(i);
    if (c >= 48 && c <= 57) out[j] = c - 48;
    else if (c >= 65 && c <= 70) out[j] = c - 55;
    else if (c >= 97 && c <= 102) out[j] = c - 87;
    else return null;
  }
  return out;
}

/** Triangles emitted for each depth cut-off (index = max depth). null = malformed. */
function leafCounts(nib: Uint8Array): Float64Array | null {
  const out = new Float64Array(MAXD + 1);
  let pos = 0;
  const rec = (depth: number): boolean => {
    if (pos >= nib.length) return false;
    const c = nib[pos++];
    const split = c & 3;
    if (!split) {
      if (((c >> 2) & 3) === 3) {
        if (pos >= nib.length) return false;
        if (nib[pos++] === 15) {
          if (pos >= nib.length) return false;
          pos++;
        }
      }
      for (let d = depth; d <= MAXD; d++) out[d]++;
      return true;
    }
    if (depth <= MAXD) out[depth]++; // emitted as one triangle when cut here
    for (let k = 0; k <= split; k++) if (!rec(depth + 1)) return false;
    return true;
  };
  // out[d] = leaves at depth ≤ d + split nodes at depth d (each drawn as one triangle when cut there)
  if (!rec(0)) return null;
  return out;
}

type V = [number, number, number];
const mid = (a: V, b: V): V => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

/** Children of a split node, in TriangleSelector::perform_split order (vertices rotated to the special side first). */
function children(split: number, special: number, t: [V, V, V]): [V, V, V][] {
  const v0 = t[special % 3], v1 = t[(special + 1) % 3], v2 = t[(special + 2) % 3];
  if (split === 1) {
    const m = mid(v2, v1);
    return [[v0, v1, m], [m, v2, v0]];
  }
  if (split === 2) {
    const m01 = mid(v1, v0), m02 = mid(v0, v2);
    return [[v0, m01, m02], [m01, v1, m02], [v1, v2, m02]];
  }
  const m01 = mid(v1, v0), m12 = mid(v2, v1), m20 = mid(v0, v2);
  return [[v0, m01, m20], [m01, v1, m12], [m12, v2, m20], [m01, m12, m20]];
}

class Out {
  pos: Float32Array;
  fil: Uint8Array;
  n = 0;
  constructor(cap: number) {
    this.pos = new Float32Array(cap * 9);
    this.fil = new Uint8Array(cap);
  }
  push(a: ArrayLike<number>, b: ArrayLike<number>, c: ArrayLike<number>, f: number) {
    if (this.n * 9 + 9 > this.pos.length) {
      const p = new Float32Array(Math.max(this.pos.length * 2, 9 * 1024));
      p.set(this.pos);
      this.pos = p;
      const q = new Uint8Array(p.length / 9);
      q.set(this.fil);
      this.fil = q;
    }
    const o = this.n * 9;
    const P = this.pos;
    P[o] = a[0]; P[o + 1] = a[1]; P[o + 2] = a[2];
    P[o + 3] = b[0]; P[o + 4] = b[1]; P[o + 5] = b[2];
    P[o + 6] = c[0]; P[o + 7] = c[1]; P[o + 8] = c[2];
    this.fil[this.n++] = Math.min(255, f);
  }
  done(): { pos: Float32Array; fil: Uint8Array } {
    return { pos: this.pos.slice(0, this.n * 9), fil: this.fil.slice(0, this.n) };
  }
}

/** Emit one painted triangle into `out`, cutting the tree at `maxDepth`. Returns false when malformed. */
function emitPainted(nib: Uint8Array, tri: [V, V, V], base: number, maxDepth: number, out: Out): boolean {
  let pos = 0;
  const readLeaf = (c: number): number => {
    let st = (c >> 2) & 3;
    if (st === 3) {
      const n = nib[pos++];
      st = n === 15 ? nib[pos++] + 18 : n + 3;
    }
    return st;
  };
  // area-weighted state tally of a whole subtree (used below the cut-off)
  const tally = (w: number, acc: Map<number, number>): boolean => {
    if (pos >= nib.length) return false;
    const c = nib[pos++];
    const split = c & 3;
    if (!split) {
      const st = readLeaf(c);
      acc.set(st, (acc.get(st) || 0) + w);
      return true;
    }
    for (let k = 0; k <= split; k++) if (!tally(w / (split + 1), acc)) return false;
    return true;
  };
  const rec = (t: [V, V, V], depth: number): boolean => {
    if (pos >= nib.length) return false;
    const c = nib[pos];
    const split = c & 3;
    if (!split) {
      pos++;
      const st = readLeaf(c);
      out.push(t[0], t[1], t[2], st || base);
      return true;
    }
    if (depth >= maxDepth) {
      const acc = new Map<number, number>();
      if (!tally(1, acc)) return false;
      let best = 0, bw = -1;
      acc.forEach((w, s) => {
        if (w > bw) { bw = w; best = s; }
      });
      out.push(t[0], t[1], t[2], best || base);
      return true;
    }
    pos++;
    const special = split === 3 ? 0 : (c >> 2) & 3;
    const kids = children(split, special, t);
    // the stream lists the children last-first (TriangleSelector::deserialize)
    for (let k = kids.length - 1; k >= 0; k--) if (!rec(kids[k], depth + 1)) return false;
    return true;
  };
  return rec(tri, 0);
}

/** Vertex-clustering simplification of a triangle soup to roughly `target` triangles. */
function cluster(pos: Float32Array, fil: Uint8Array, target: number): { pos: Float32Array; fil: Uint8Array } {
  const n = fil.length;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  const ext = Math.max(x1 - x0, y1 - y0, z1 - z0, 1e-3);
  // surface triangles scale with 1/cell²: start from the ratio and refine
  let cells = Math.max(8, Math.min(1 << 16, Math.round(Math.sqrt(target) * 2)));
  let best: { pos: Float32Array; fil: Uint8Array } | null = null;
  for (let iter = 0; iter < 6; iter++) {
    const size = ext / cells;
    const K = cells + 2;
    const rep = new Map<number, number>(); // cell -> index into reps
    const reps: number[] = [];
    const vid = (i: number) => {
      const ix = Math.floor((pos[i] - x0) / size), iy = Math.floor((pos[i + 1] - y0) / size), iz = Math.floor((pos[i + 2] - z0) / size);
      const key = (iz * K + iy) * K + ix;
      let r = rep.get(key);
      if (r === undefined) {
        r = reps.length / 3;
        rep.set(key, r);
        reps.push(pos[i], pos[i + 1], pos[i + 2]);
      }
      return r;
    };
    const keep: number[] = [];
    const seen = new Set<string>();
    for (let t = 0; t < n; t++) {
      const a = vid(t * 9), b = vid(t * 9 + 3), c = vid(t * 9 + 6);
      if (a === b || b === c || a === c) continue;
      const k = a < b ? (b < c ? `${a},${b},${c}` : a < c ? `${a},${c},${b}` : `${c},${a},${b}`) : a < c ? `${b},${a},${c}` : b < c ? `${b},${c},${a}` : `${c},${b},${a}`;
      if (seen.has(k)) continue;
      seen.add(k);
      keep.push(a, b, c, t);
    }
    const m = keep.length / 4;
    if (m <= target || iter === 5) {
      const P = new Float32Array(m * 9), F = new Uint8Array(m);
      for (let j = 0; j < m; j++) {
        for (let v = 0; v < 3; v++) {
          const r = keep[j * 4 + v] * 3;
          P[j * 9 + v * 3] = reps[r];
          P[j * 9 + v * 3 + 1] = reps[r + 1];
          P[j * 9 + v * 3 + 2] = reps[r + 2];
        }
        F[j] = fil[keep[j * 4 + 3]];
      }
      best = { pos: P, fil: F };
      if (m <= target) break;
    }
    cells = Math.max(4, Math.floor(cells * Math.sqrt(target / Math.max(m, 1)) * 0.95));
  }
  return best!;
}

export function buildPreview(entries: Entries, budget = 300_000): PreviewMesh {
  const m = extractMeshes(entries, { paint: true });
  budget = Math.max(10_000, Math.min(budget, 2_000_000));
  const cache = new Map<string, { nib: Uint8Array; counts: Float64Array } | null>();
  const info = (code: string) => {
    let r = cache.get(code);
    if (r === undefined) {
      const nib = nibbles(code);
      const counts = nib && leafCounts(nib);
      r = nib && counts ? { nib, counts } : null;
      cache.set(code, r);
    }
    return r;
  };
  // how many triangles each depth cut-off would draw
  const total = new Float64Array(MAXD + 1);
  let sourceTriangles = 0, painted = false;
  for (const p of m.plates)
    for (const part of p.parts) {
      const n = part.tris.length / 9;
      sourceTriangles += n;
      for (let t = 0; t < n; t++) {
        const code = part.paint?.[t];
        const r = code ? info(code) : null;
        if (r) {
          painted = true;
          for (let d = 0; d <= MAXD; d++) total[d] += r.counts[d];
        } else for (let d = 0; d <= MAXD; d++) total[d] += 1;
      }
    }
  let depth = MAXD;
  while (depth > 0 && total[depth] > budget) depth--;
  const paintSimplified = painted && depth < MAXD && total[depth] < total[MAXD];
  const decimated = total[depth] > budget;

  const plates: PreviewPlate[] = [];
  let shown = 0;
  for (const p of m.plates) {
    const plateTris = p.parts.reduce((s, x) => s + x.tris.length / 9, 0);
    const out = new Out(Math.min(plateTris * 2, budget) + 16);
    for (const part of p.parts) {
      const T = part.tris, n = T.length / 9, base = part.filament || 1;
      for (let t = 0; t < n; t++) {
        const o = t * 9;
        const code = part.paint?.[t];
        const r = code ? info(code) : null;
        if (r) {
          const tri: [V, V, V] = [[T[o], T[o + 1], T[o + 2]], [T[o + 3], T[o + 4], T[o + 5]], [T[o + 6], T[o + 7], T[o + 8]]];
          if (emitPainted(r.nib, tri, base, depth, out)) continue;
        }
        out.push(T.subarray(o, o + 3), T.subarray(o + 3, o + 6), T.subarray(o + 6, o + 9), base);
      }
    }
    let g = out.done();
    if (decimated) g = cluster(g.pos, g.fil, Math.max(5_000, Math.floor((budget * plateTris) / Math.max(sourceTriangles, 1))));
    shown += g.fil.length;
    plates.push({ id: p.id, name: p.name, pos: g.pos, fil: g.fil });
  }
  return { plates, sourceTriangles, shownTriangles: shown, painted, paintSimplified, decimated };
}
