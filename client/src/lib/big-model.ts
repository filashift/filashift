// Pre-check for projects that may be too heavy for the device. Conversion runs fully in the browser, so
// a phone with little memory can stall or crash the tab on very large meshes. Thresholds come from
// scripts/bench-browser.mjs runs (OPERATIONS.md): a 1M-triangle painted project peaks around 0.5-1.2 GB.
export const SMALL_DEVICE_TRIANGLES = 600_000;
export const SMALL_DEVICE_BYTES = 50 * 1048576;
export const ANY_DEVICE_TRIANGLES = 3_000_000;
export const ANY_DEVICE_BYTES = 200 * 1048576;

/** Phones, tablets and low-memory machines (navigator.deviceMemory is Chromium-only). */
export function isSmallDevice(): boolean {
  if (typeof window === "undefined") return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return (mem !== undefined && mem <= 4) || window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 768;
}

/** "1.2 million" / "640 thousand": rounded so the warning stays short and easy to translate. */
export function fmtCount(n: number): string {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)} million` : `${Math.max(1, Math.round(n / 1000))} thousand`;
}

/** English warning text, or null when the project is comfortable for this device. */
export function bigModelWarning(triangles: number | undefined, bytes: number, small = isSmallDevice()): string | null {
  const t = triangles || 0;
  const what = t ? `about ${fmtCount(t)} triangles` : `a ${(bytes / 1048576).toFixed(0)} MB file`;
  if (t >= ANY_DEVICE_TRIANGLES || bytes >= ANY_DEVICE_BYTES)
    return `Very large project (${what}). Converting it can take several minutes and needs a lot of memory. Close other tabs first; if the page stops responding, simplify the model in your slicer.`;
  if (small && (t >= SMALL_DEVICE_TRIANGLES || bytes >= SMALL_DEVICE_BYTES))
    return `Large project for this device (${what}). Converting may be slow and could run out of memory on a phone or tablet. If it fails, convert it on a computer.`;
  return null;
}
