/**
 * ZIP writer for converted projects. Same layout as fflate's zipSync (local headers, central directory,
 * no data descriptors), with two additions for big models:
 *  - an entry that is still the exact Uint8Array read from the source archive (see `rawEntry` in
 *    archive.ts) is copied as its original compressed bytes instead of being deflated again, after its
 *    CRC-32 is checked against the source, so the stored content is identical either way;
 *  - an entry may be a `Streamed` value: chunks already deflated by `StreamedEntry` while the text was
 *    being generated, so the full XML never has to exist as one string.
 */
import { Deflate, deflateSync, inflateSync, strToU8, type Zippable } from "fflate";
import { rawEntry } from "./archive";

const T = (() => {
  const t = new Int32Array(256 * 8);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  for (let i = 0; i < 256; i++) for (let s = 1; s < 8; s++) t[s * 256 + i] = (t[(s - 1) * 256 + i] >>> 8) ^ t[t[(s - 1) * 256 + i] & 255];
  return t;
})();

/** Incremental CRC-32 (slice-by-8). Pass the previous value to continue. */
export function crc32(d: Uint8Array, prev = 0): number {
  let c = ~prev, i = 0;
  const n = d.length - 8;
  for (; i <= n; i += 8) {
    const a = (d[i] | (d[i + 1] << 8) | (d[i + 2] << 16) | (d[i + 3] << 24)) ^ c;
    c = T[1792 + (a & 255)] ^ T[1536 + ((a >>> 8) & 255)] ^ T[1280 + ((a >>> 16) & 255)] ^ T[1024 + (a >>> 24)] ^
      T[768 + d[i + 4]] ^ T[512 + d[i + 5]] ^ T[256 + d[i + 6]] ^ T[d[i + 7]];
  }
  for (; i < d.length; i++) c = T[(c ^ d[i]) & 255] ^ (c >>> 8);
  return ~c >>> 0;
}

/** A deflated entry built from text chunks (for generated XML that can be hundreds of MB). */
export class Streamed {
  readonly chunks: Uint8Array[] = [];
  crc = 0;
  size = 0;
  private z: Deflate;
  private pend: string[] = [];
  private pendLen = 0;
  private done = false;
  constructor(level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = 6) {
    this.z = new Deflate({ level }, (c) => { if (c.length) this.chunks.push(c); });
  }
  private flushText(final: boolean) {
    const s = this.pend.join("");
    this.pend = [];
    this.pendLen = 0;
    const u = strToU8(s);
    this.crc = crc32(u, this.crc);
    this.size += u.length;
    this.z.push(u, final);
  }
  /** Append text. Small pieces are batched so encoding and deflate see ~1 MB blocks. */
  push(s: string) {
    if (this.done) throw Error("entry already finished");
    if (!s) return;
    this.pend.push(s);
    this.pendLen += s.length;
    if (this.pendLen >= 1 << 20) this.flushText(false);
  }
  finish(): this {
    if (!this.done) { this.flushText(true); this.done = true; }
    return this;
  }
  get compressedSize() { return this.chunks.reduce((a, c) => a + c.length, 0); }
}

/** Decoded text of a Streamed entry (tests and the PrusaSlicer re-check only; avoid on big models). */
export function streamedBytes(s: Streamed): Uint8Array {
  const all = new Uint8Array(s.compressedSize);
  let o = 0;
  for (const c of s.chunks) { all.set(c, o); o += c.length; }
  return inflateSync(all);
}

/** Entries above this size are deflated with level 4 instead of 6 (see writeZip). */
export const BIG = 1 << 20;

export type OutEntry = Uint8Array | [Uint8Array, { level?: number }] | Streamed;
export type OutFiles = Record<string, OutEntry>;

const w32 = (d: Uint8Array, b: number, v: number) => { d[b] = v; d[b + 1] = v >>> 8; d[b + 2] = v >>> 16; d[b + 3] = v >>> 24; };
const w16 = (d: Uint8Array, b: number, v: number) => { d[b] = v; d[b + 1] = v >>> 8; };

interface Item { name: Uint8Array; utf8: boolean; method: number; crc: number; size: number; data: Uint8Array[]; csize: number; off: number }

/** Write a ZIP. `level` is the deflate level for entries that need compressing (default 6, as before). */
export function writeZip(files: OutFiles | Zippable, level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = 6, mtime = new Date()): Uint8Array {
  const items: Item[] = [];
  let off = 0;
  for (const [fn, v0] of Object.entries(files as OutFiles)) {
    const name = strToU8(fn);
    if (name.length > 65535) throw Error("file name too long");
    const utf8 = name.length !== fn.length;
    let it: Omit<Item, "name" | "utf8" | "off">;
    if (v0 instanceof Streamed) {
      v0.finish();
      it = { method: 8, crc: v0.crc, size: v0.size, data: v0.chunks, csize: v0.compressedSize };
    } else {
      const [data, o] = Array.isArray(v0) ? v0 : [v0, {} as { level?: number }];
      if (!(data instanceof Uint8Array)) throw Error(`unsupported entry ${fn}`);
      // deflate level 4 is about twice as fast as 6 on mesh XML for ~2% more bytes; only matters for big parts
      const lv = (o.level ?? (level > 4 && data.length > BIG ? 4 : level)) as typeof level;
      const raw = rawEntry(data);
      const crc = crc32(data);
      if (raw && raw.crc === crc && (raw.method === 8 || (raw.method === 0 && lv === 0))) {
        it = { method: raw.method, crc, size: data.length, data: [raw.src.subarray(raw.start, raw.start + raw.csize)], csize: raw.csize };
      } else if (lv === 0) {
        it = { method: 0, crc, size: data.length, data: [data], csize: data.length };
      } else {
        const c = deflateSync(data, { level: lv });
        it = { method: 8, crc, size: data.length, data: [c], csize: c.length };
      }
    }
    if (it.size > 0xfffffffe || it.csize > 0xfffffffe) throw Error("This project is too large to package (4 GB ZIP limit).");
    items.push({ ...it, name, utf8, off });
    off += 30 + name.length + it.csize;
  }
  const cdOff = off;
  let cdLen = 0;
  for (const it of items) cdLen += 46 + it.name.length;
  const out = new Uint8Array(off + cdLen + 22);
  const y = mtime.getFullYear() - 1980;
  if (y < 0 || y > 119) throw Error("date out of range");
  const dos = (y << 25) | ((mtime.getMonth() + 1) << 21) | (mtime.getDate() << 16) | (mtime.getHours() << 11) | (mtime.getMinutes() << 5) | (mtime.getSeconds() >> 1);
  const head = (b: number, it: Item, central: boolean) => {
    w32(out, b, central ? 0x2014b50 : 0x4034b50); b += 4;
    if (central) { out[b++] = 20; out[b++] = 0; }
    out[b] = 20; b += 2;
    out[b++] = 0; out[b++] = it.utf8 ? 8 : 0;
    out[b++] = it.method; out[b++] = 0;
    w32(out, b, dos);
    w32(out, b + 4, it.crc);
    w32(out, b + 8, it.csize);
    w32(out, b + 12, it.size);
    w16(out, b + 16, it.name.length);
    w16(out, b + 18, 0);
    b += 20;
    if (central) { w16(out, b, 0); w16(out, b + 2, 0); w16(out, b + 4, 0); w32(out, b + 6, 0); w32(out, b + 10, it.off); b += 14; }
    out.set(it.name, b);
    return b + it.name.length;
  };
  let cd = cdOff;
  for (const it of items) {
    let b = head(it.off, it, false);
    for (const c of it.data) { out.set(c, b); b += c.length; }
    it.data = [];
    cd = head(cd, it, true);
  }
  w32(out, cd, 0x6054b50);
  w16(out, cd + 8, items.length);
  w16(out, cd + 10, items.length);
  w32(out, cd + 12, cdLen);
  w32(out, cd + 16, cdOff);
  return out;
}
