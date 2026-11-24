import { Unzip, UnzipInflate, unzipSync } from "fflate";

export const MAX_EXPANDED = 2_000_000_000;
const limitError = () => new Error("This file expands to more than 2 GB, which exceeds the safety limit.");

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
        if (keep && dest) out[path] = dest;
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
