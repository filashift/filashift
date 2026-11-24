// Shared filament price data, affiliate links and colour matching.
// Data lives at /data on the server (see OPERATIONS.md); nothing here contacts a third party.

export type Item = {
  b: string; // brand
  r: string; // retailer (store)
  t: string; // product title
  v: string; // variant label
  c: string[]; // colour names
  x?: string[]; // colour hex codes from the store, parallel to c ('' when unknown)
  f: string; // material family
  m: string; // material label
  d: number; // diameter
  kg: number; // total kilograms
  n: number; // spools in the pack
  p: number; // price USD
  ppk: number; // price per kg
  was: number | null; // compare-at price
  ok: boolean; // in stock
  u: string; // product URL
};
export type ShopData = { updated: string; stores: Record<string, number | string>; count: number; items: Item[] };

/**
 * config.json:
 * {
 *   "amazonTag": "filashift-20",
 *   "affiliates": {
 *     "us.polymaker.com": { "params": { "ref": "abc" } },               // appended to the product URL
 *     "us.elegoo.com":    { "template": "https://x.sjv.io/c/1/2/3?u={url}" } // {url} = encoded product URL
 *   }
 * }
 */
export type Affiliate = { params?: Record<string, string>; template?: string };
export type ShopConfig = { amazonTag?: string; affiliates?: Record<string, Affiliate> };

let dataP: Promise<ShopData> | null = null;
let cfgP: Promise<ShopConfig> | null = null;
export function loadShopData(): Promise<ShopData> {
  if (!dataP) {
    dataP = fetch("./data/filament.json", { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error("prices unavailable");
      return r.json();
    });
    dataP.catch(() => (dataP = null));
  }
  return dataP;
}
export function loadShopConfig(): Promise<ShopConfig> {
  if (!cfgP) {
    cfgP = fetch("./data/config.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return cfgP;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
export function affiliateFor(url: string, cfg: ShopConfig): Affiliate | null {
  const a = cfg.affiliates?.[hostOf(url)];
  return a && (a.template || (a.params && Object.keys(a.params).length)) ? a : null;
}
/** store link with the affiliate tag applied when one is configured for that store */
export function shopUrl(url: string, cfg: ShopConfig): { href: string; sponsored: boolean } {
  const a = affiliateFor(url, cfg);
  if (!a) return { href: url, sponsored: false };
  if (a.template) return { href: a.template.replace("{url}", encodeURIComponent(url)), sponsored: true };
  const u = new URL(url);
  for (const [k, v] of Object.entries(a.params || {})) u.searchParams.set(k, v);
  return { href: u.toString(), sponsored: true };
}
export const hasAnyAffiliate = (cfg: ShopConfig) => Object.keys(cfg.affiliates || {}).length > 0;

export function amazonSearch(q: string, tag: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(q)}&tag=${encodeURIComponent(tag)}`;
}

// ---------- colour matching ----------
// common colour words; longer phrases are checked first
const NAMED: [string, string][] = [
  ["sky blue", "#5fb4e8"], ["light blue", "#8cc4ec"], ["baby blue", "#9fcbea"], ["navy", "#1f2d5a"], ["dark blue", "#1d3a8a"],
  ["royal blue", "#2346c8"], ["cobalt", "#1f4fb4"], ["teal", "#108080"], ["turquoise", "#30c0c0"], ["cyan", "#00aee0"],
  ["dark green", "#1e5a32"], ["forest", "#2c5a3a"], ["olive", "#6b6b2a"], ["army", "#4b5320"], ["lime", "#8ed13a"], ["mint", "#9fe2bf"],
  ["matcha", "#8a9a5b"], ["sage", "#9caf88"], ["dark grey", "#4a4c50"], ["dark gray", "#4a4c50"], ["light grey", "#c4c6c8"],
  ["light gray", "#c4c6c8"], ["space grey", "#5b5e63"], ["charcoal", "#36383c"], ["graphite", "#45474b"], ["ash", "#9a9ca0"],
  ["hot pink", "#ff4fa0"], ["rose gold", "#d6a090"], ["magenta", "#d1238c"], ["fuchsia", "#d1238c"], ["burgundy", "#7a1f2b"],
  ["wine", "#7a2a3a"], ["maroon", "#6e1e28"], ["coral", "#ff7f60"], ["peach", "#ffb38a"], ["salmon", "#fa8a72"],
  ["chocolate", "#5a3a22"], ["coffee", "#5e4030"], ["tan", "#c9a27a"], ["khaki", "#c3b091"], ["beige", "#e0cfae"],
  ["bone", "#e8dfcc"], ["ivory", "#f2ead6"], ["cream", "#f1e6c8"], ["natural", "#efe8d8"], ["wood", "#a67b50"],
  ["lavender", "#b9a3e0"], ["lilac", "#c8a2c8"], ["violet", "#7f3fbf"], ["purple", "#6f3aa8"], ["indigo", "#3f2f8f"],
  ["silver", "#c0c2c6"], ["gold", "#c9a227"], ["copper", "#b87333"], ["bronze", "#a8783a"], ["brass", "#b5a642"],
  ["black", "#141414"], ["white", "#f4f4f2"], ["grey", "#8a8d91"], ["gray", "#8a8d91"], ["red", "#d42a2a"],
  ["orange", "#f27a1a"], ["yellow", "#f6d21b"], ["green", "#2f9e44"], ["blue", "#1f5bd6"], ["pink", "#f48fb1"],
  ["brown", "#7a4a2a"],
];
export function colourHex(name: string, hex?: string): string | null {
  if (hex && /^#[0-9a-f]{6}$/i.test(hex)) return hex.toLowerCase();
  const n = name.toLowerCase();
  if (/transparent|clear|translucent|rainbow|multi|gradient|dual|tri[- ]?colou?r|mix|bundle|pack/.test(n)) return null;
  for (const [k, v] of NAMED) if (new RegExp(`\\b${k}\\b`).test(n)) return v;
  return null;
}
export function nearestName(hex: string): string {
  let best = "", bd = Infinity;
  for (const [k, v] of NAMED) {
    if (k.includes(" ") && !/^(dark|light) /.test(k)) continue; // keep search words simple
    const d = dist(hex, v);
    if (d < bd) [bd, best] = [d, k];
  }
  return best.replace("gray", "grey");
}
function rgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** perceptual-ish RGB distance (redmean), 0..~765 */
export function dist(a: string, b: string) {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  const rm = (r1 + r2) / 2, dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

/** map a slicer filament type (e.g. "PETG-CF", "PLA Matte", "PA6") to the shop's family */
export function familyOf(type: string): string {
  const t = type.toUpperCase();
  if (/^PLA|PLA/.test(t)) return "PLA";
  if (/PETG|PCTG|PET\b/.test(t)) return "PETG";
  if (/^ABS|EABS/.test(t)) return "ABS";
  if (/^ASA/.test(t)) return "ASA";
  if (/TPU|TPE|FLEX/.test(t)) return "TPU";
  if (/^PA|NYLON|PPA/.test(t)) return "Nylon";
  if (/^PC/.test(t)) return "PC";
  return "Other";
}

export type Match = { item: Item; colour: string; hex: string; d: number };
/**
 * Cheapest in-stock 1.75 mm offers whose colour is close to `hex` in the same material family.
 * Prefers single spools of 0.5–1.25 kg, which suit one project.
 */
export function matchOffers(items: Item[], type: string, hex: string, limit = 3): Match[] {
  const fam = familyOf(type);
  const out: Match[] = [];
  for (const it of items) {
    if (!it.ok || it.f !== fam || it.d !== 1.75 || it.n > 1 || it.kg > 1.25 || it.kg < 0.5) continue;
    let best: { c: string; h: string; d: number } | null = null;
    it.c.forEach((c, i) => {
      const h = colourHex(c, it.x?.[i]);
      if (!h) return;
      const d = dist(hex, h);
      if (!best || d < best.d) best = { c, h, d };
    });
    const b = best as { c: string; h: string; d: number } | null;
    if (b && b.d < 120) out.push({ item: it, colour: b.c, hex: b.h, d: b.d });
  }
  // close colours first in bands, then price
  out.sort((a, b) => Math.round(a.d / 60) - Math.round(b.d / 60) || a.item.ppk - b.item.ppk);
  const seen = new Set<string>();
  return out.filter((m) => !seen.has(m.item.r) && seen.add(m.item.r)).slice(0, limit);
}

/** link to the filament page with filters set; works with both path and hash routing */
export function filamentLink(params: Record<string, string>) {
  const q = new URLSearchParams(params).toString();
  return `/filament${q ? `?${q}` : ""}`;
}
export function readQuery(): URLSearchParams {
  const h = window.location.hash;
  const i = h.indexOf("?");
  if (i >= 0) return new URLSearchParams(h.slice(i + 1));
  return new URLSearchParams(window.location.search);
}
