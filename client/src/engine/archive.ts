import { Unzip, UnzipInflate, unzipSync, strFromU8 } from "fflate";

export const MAX_EXPANDED = 2_000_000_000;
const limitError = () => new Error("This file expands to more than 2 GB, which exceeds the safety limit.");

/** Where an entry's compressed bytes sit in the source archive, so an unchanged entry can be copied as-is. */
export interface RawEntry { src: Uint8Array; start: number; csize: number; method: number; crc: number }
const RAW = new WeakMap<Uint8Array, RawEntry>();
/** Source location of an entry returned by readArchive (undefined for anything else, e.g. edited data). */
export const rawEntry = (data: Uint8Array) => RAW.get(data);

const u16 = (d: Uint8Array, b: number) => d[b] | (d[b + 1] << 8);
const u32 = (d: Uint8Array, b: number) => (d[b] | (d[b + 1] << 8) | (d[b + 2] << 16) | (d[b + 3] << 24)) >>> 0;
// Central directory -> compressed data location per entry name. Best effort: anything unusual
// (ZIP64, encryption, odd methods, inconsistent headers) just means "recompress this entry".
function rawLocations(d: Uint8Array): Map<string, RawEntry & { usize: number }> {
  const out = new Map<string, RawEntry & { usize: number }>();
  let e = d.length - 22;
  const stop = Math.max(0, d.length - 22 - 65535);
  while (e >= stop && u32(d, e) !== 0x6054b50) e--;
  if (e < stop) return out;
  const n = u16(d, e + 10);
  let b = u32(d, e + 16);
  for (let i = 0; i < n && b + 46 <= d.length && u32(d, b) === 0x2014b50; i++) {
    const flag = u16(d, b + 8), method = u16(d, b + 10), crc = u32(d, b + 16), csize = u32(d, b + 20), usize = u32(d, b + 24);
    const fnl = u16(d, b + 28), exl = u16(d, b + 30), cml = u16(d, b + 32), lo = u32(d, b + 42);
    const name = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(flag & 2048));
    b += 46 + fnl + exl + cml;
    if (flag & 1 || (method !== 0 && method !== 8) || csize === 0xffffffff || usize === 0xffffffff || lo === 0xffffffff) continue;
    if (lo + 30 > d.length || u32(d, lo) !== 0x4034b50 || u16(d, lo + 8) !== method) continue;
    const start = lo + 30 + u16(d, lo + 26) + u16(d, lo + 28);
    if (start + csize > d.length) continue;
    out.set(name, { src: d, start, csize, method, crc, usize });
  }
  return out;
}

// Inspect the central directory without inflating any entries. Then enforce the same
// budget on actual streamed output; do not trust ZIP size declarations alone.
export function readArchive(bytes: Uint8Array, budget = MAX_EXPANDED): Record<string, Uint8Array> {
  const sizes = new Map<string, number>();
  let declared = 0, actual = 0;
  unzipSync(bytes, { filter(f) {
    declared += f.originalSize;
    if (declared > budget) throw limitError();
    if (sizes.has(f.name) || sizes.size >= 65535) throw Error("Invalid or unsupported archive directory.");
    sizes.set(f.name, f.originalSize);
    return false;
  }});
  const out: Record<string, Uint8Array> = Object.create(null);
  const raw = rawLocations(bytes);
  const stream = new Unzip(f => {
    const expected = sizes.get(f.name);
    if (expected === undefined) throw Error("Archive entry does not match its directory.");
    const path = f.name.replace(/\\/g, "/");
    const keep = !path.endsWith("/") && !path.startsWith("/") && !path.includes("..");
    let dest: Uint8Array | undefined, offset = 0;
    f.ondata = (err, chunk, final) => {
      if (err) throw err;
      actual += chunk.length;
      if (actual > budget) throw limitError();
      if (offset + chunk.length > expected) throw Error("Archive entry exceeds its declared size.");
      if (keep) {
        dest ??= new Uint8Array(expected);
        dest.set(chunk, offset);
      }
      offset += chunk.length;
      if (final) {
        if (offset !== expected) throw Error("Incomplete archive entry.");
        if (keep && dest) {
          out[path] = dest;
          const r = raw.get(f.name);
          if (r && r.usize === expected) RAW.set(dest, { src: r.src, start: r.start, csize: r.csize, method: r.method, crc: r.crc });
        }
        sizes.delete(f.name);
      }
    };
    f.start();
  });
  stream.register(UnzipInflate);
  for (let i=0; i<bytes.length; i+=8192) stream.push(bytes.subarray(i,i+8192), i+8192>=bytes.length);
  if (sizes.size) throw Error("Incomplete archive.");
  return out;
}
