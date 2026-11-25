/**
 * Codec for per-triangle paint data (`paint_color` in Bambu Studio / OrcaSlicer,
 * `slic3rpe:mmu_segmentation` in PrusaSlicer).
 *
 * The string is a hex nibble stream stored back to front. Each tree node is one nibble:
 *   bits 0-1  number of split sides (0 = leaf)
 *   bits 2-3  for a split node: the special side; for a leaf: the state (0-2),
 *             3 = extended state -> following nibble(s) hold state-3 (0xF = +15 and continue)
 * State 0 means "unpainted" (the volume's own filament), state N means filament N.
 */

export type PaintStates = Set<number>;

function toNibbles(code: string): number[] | null {
  const out: number[] = new Array(code.length);
  for (let i = code.length - 1, j = 0; i >= 0; i--, j++) {
    const c = code.charCodeAt(i);
    let v: number;
    if (c >= 48 && c <= 57) v = c - 48;
    else if (c >= 65 && c <= 70) v = c - 55;
    else if (c >= 97 && c <= 102) v = c - 87;
    else return null;
    out[j] = v;
  }
  return out;
}

const HEX = "0123456789ABCDEF";

function fromNibbles(nib: number[]): string {
  let s = "";
  for (let i = nib.length - 1; i >= 0; i--) s += HEX[nib[i]];
  return s;
}

/** Walk the tree. `onLeaf(state)` may return a replacement state. Returns the rewritten nibbles, or null if malformed. */
function walk(code: string, onLeaf: (s: number) => number): number[] | null {
  const nib = toNibbles(code);
  if (!nib) return null;
  const out: number[] = [];
  let pos = 0;
  let pending = 1;
  while (pending > 0) {
    if (pos >= nib.length) return null;
    const c = nib[pos++];
    const split = c & 3;
    if (split) {
      out.push(c);
      pending += split;
      continue;
    }
    pending -= 1;
    let st = (c >> 2) & 3;
    if (st === 3) {
      st = 3;
      for (;;) {
        if (pos >= nib.length) return null;
        const n = nib[pos++];
        st += n;
        if (n !== 15) break;
      }
    }
    const ns = onLeaf(st);
    if (ns < 3) {
      out.push(ns << 2);
    } else {
      out.push(0b1100);
      let r = ns - 3;
      while (r >= 15) {
        out.push(15);
        r -= 15;
      }
      out.push(r);
    }
  }
  // Anything after the tree is kept verbatim (should not happen, but never drop data).
  while (pos < nib.length) out.push(nib[pos++]);
  return out;
}

/** States used by one triangle's paint string. null = malformed. */
export function paintStates(code: string): number[] | null {
  if (!code) return [0];
  const set = new Set<number>();
  const ok = walk(code, (s) => {
    set.add(s);
    return s;
  });
  if (!ok) return null;
  return Array.from(set).sort((a, b) => a - b);
}

/** Rewrite the states of one paint string. Unpainted (0) stays 0. Returns null when malformed. */
export function remapPaint(code: string, map: (s: number) => number): string | null {
  if (!code) return code;
  const nib = walk(code, (s) => (s === 0 ? 0 : map(s)));
  if (!nib) return null;
  return fromNibbles(nib);
}

const PAINT_ATTR_RE = /\b(paint_color|slic3rpe:mmu_segmentation)="([0-9A-Fa-f]*)"/g;

/**
 * Visit every paint attribute of a .model text in order: `on(index, states)` gets the match position and the
 * states used (null = malformed). Decoded trees are cached per call, so repeated strings cost one lookup.
 */
export function eachPaint(text: string, on: (index: number, states: number[] | null) => void): void {
  const cache = new Map<string, number[] | null>();
  const re = new RegExp(PAINT_ATTR_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const code = m[2];
    let st = cache.get(code);
    if (st === undefined) {
      st = paintStates(code);
      cache.set(code, st);
    }
    on(m.index, st);
  }
}

/** Count painted triangles per state for a whole .model text. */
export function scanPaint(text: string): { counts: Map<number, number>; bad: number } {
  const counts = new Map<number, number>();
  let bad = 0;
  eachPaint(text, (_i, st) => {
    if (!st) {
      bad++;
      return;
    }
    for (const s of st) counts.set(s, (counts.get(s) || 0) + 1);
  });
  return { counts, bad };
}

/** Rewrite every paint string in a .model text. */
export function remapPaintText(text: string, map: (s: number) => number): { text: string; changed: number; bad: number } {
  const cache = new Map<string, string | null>();
  let changed = 0;
  let bad = 0;
  PAINT_ATTR_RE.lastIndex = 0;
  const out = text.replace(PAINT_ATTR_RE, (all, attr: string, code: string) => {
    let n = cache.get(code);
    if (n === undefined) {
      n = remapPaint(code, map);
      cache.set(code, n);
    }
    if (n === null) {
      bad++;
      return all;
    }
    if (n !== code) changed++;
    return `${attr}="${n}"`;
  });
  return { text: out, changed, bad };
}
