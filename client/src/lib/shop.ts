import { dataUrl } from "@/lib/seo";
import { atomicReel } from "./reel-fit";
// Shared filament price data, affiliate links and colour matching.
// Data lives at /data on the server (see OPERATIONS.md); nothing here contacts a third party.

export type Item = {
  form?: "spool" | "pack" | "refill" | "unknown";
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
  ok: boolean | null; // exact variant stock; null means the store did not confirm
  u: string; // product URL
};
export type ShopData = { updated: string; stores: Record<string, number | string>; count: number; items: Item[] };

/**
 * config.json:
 * {
 *   "amazonTag": "filashift-20",
 *   "affiliates": {
 *     "us.polymaker.com": { "params": { "ref": "abc" } },               // appended to the product URL
 *     "us.elegoo.com":    { "template": "https://x.sjv.io/c/1/2/3?u={url}" }, // {url} = encoded product URL
 *     "store.sunlu.com":  { "params": { "sca_ref": "1.abc" }, "code": "ABC" }   // code = discount code shown with offers
 *   }
 * }
 */
export type Affiliate = { params?: Record<string, string>; template?: string; code?: string };
export type ShopConfig = { amazonTag?: string; affiliates?: Record<string, Affiliate> };

let dataP: Promise<ShopData> | null = null;
let cfgP: Promise<ShopConfig> | null = null;
export function loadShopData(): Promise<ShopData> {
  if (!dataP) {
    dataP = fetch(dataUrl("filament.json"), { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error("prices unavailable");
      return r.json().then((data) => {
        if (data.schema !== 2) throw new Error("Variant-level prices unavailable");
        return data;
      });
    });
    dataP.catch(() => (dataP = null));
  }
  return dataP;
}
export function loadShopConfig(): Promise<ShopConfig> {
  if (!cfgP) {
    cfgP = fetch(dataUrl("config.json"), { cache: "no-cache" })
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
export function shopUrl(url: string, cfg: ShopConfig, placement?: "finder" | "converter"): { href: string; sponsored: boolean } {
  const a = affiliateFor(url, cfg);
  if (!a) return { href: url, sponsored: false };
  if (a.template) return { href: a.template.replace("{url}", encodeURIComponent(url)), sponsored: true };
  const u = new URL(url);
  for (const [k, v] of Object.entries(a.params || {})) u.searchParams.set(k, v);
  if (placement && u.hostname === "store.sunlu.com" && a.params?.sca_ref)
    u.searchParams.set("sca_source", `filashift-${placement}`);
  return { href: u.toString(), sponsored: true };
}
/** store discount code (affiliate coupon) shown next to that store's offers */
export const storeCode = (url: string, cfg: ShopConfig) => cfg.affiliates?.[hostOf(url)]?.code || "";
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
const COLOUR_WORDS = NAMED.map(([word, value]) => [new RegExp(`\\b${word}\\b`), value] as const);
export function colourHex(name: string, hex?: string): string | null {
  if (hex && /^#[0-9a-f]{6}$/i.test(hex)) return hex.toLowerCase();
  const n = name.toLowerCase();
  if (/transparent|clear|translucent|rainbow|multi|gradient|dual|tri[- ]?colou?r|mix|bundle|pack/.test(n)) return null;
  for (const [word, value] of COLOUR_WORDS) if (word.test(n)) return value;
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
export const oneSpool = (it: Item) => (it.form === "spool" || !!atomicReel(it)) && it.n === 1 && it.kg > 0 && it.kg <= 1.25;
export const closeColour = (it: Item, hex: string) => it.c.some((c,i) => {
  const h = colourHex(c,it.x?.[i]); return h !== null && dist(hex,h) < 120;
});
/**
 * Cheapest in-stock 1.75 mm offers whose colour is close to `hex` in the same material family.
 * Prefers single spools of 0.5–1.25 kg, which suit one project.
 */
export function matchOffers(items: Item[], type: string, colour: string, limit = 3, diameter = 1.75, sub = shopType(type)): Match[] {
  const fam = familyOf(type);
  const hex = normHex(colour);
  const out: Match[] = [];
  if (!hex) return out;
  for (const it of items) {
    if (!it.ok || it.f !== fam || it.d !== diameter || !oneSpool(it)) continue;
    if (sub && it.m.toLowerCase() !== sub.toLowerCase()) continue;
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

// ---------- project hand-off: hex, subtype, CIEDE2000 colour difference ----------
/** "#E63A2E", "e63a2eff" -> "#e63a2e"; null when not a hex colour */
export function normHex(h: string | undefined | null): string | null {
  const m = /^#?([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec((h || "").trim());
  return m ? `#${m[1].toLowerCase()}` : null;
}

// Same labels and order as MATERIALS in scripts/collect_filament.py (first match wins).
const SUBTYPES: [RegExp, string, string][] = [
  [/\bpla[\s-]*\+|\bpla\s*plus|\bpla[\s-]*pro\b|tough\s*pla|\bpla\s*tough\b/, "PLA", "PLA+"],
  [/\bpla\b.*\b(cf|carbon\s*fib)/, "PLA", "PLA-CF"],
  [/\bsilk\b/, "PLA", "PLA Silk"],
  [/\bmatte\b/, "PLA", "PLA Matte"],
  [/\b(hs|hf|high[\s-]*(speed|flow)|hyper|rapid)\b/, "PLA", "PLA High Speed"],
  [/\bpetg\b.*\b(cf|carbon\s*fib)|\bpetg[\s-]*cf\b/, "PETG", "PETG-CF"],
  [/\b(hs|hf|high[\s-]*(speed|flow)|hyper|rapid)\b/, "PETG", "PETG High Speed"],
  [/\bmatte\b/, "PETG", "PETG Matte"],
  [/\bpctg\b/, "PETG", "PCTG"],
  [/\babs\b.*\b(cf|carbon\s*fib)|\babs[\s-]*cf\b/, "ABS", "ABS-CF"],
  [/\basa\b.*\b(cf|carbon\s*fib)|\basa[\s-]*cf\b/, "ASA", "ASA-CF"],
  [/\b(pa|nylon|paht|pa6|pa12|ppa)\b.*\b(cf|gf|carbon|glass)|\b(pa\d*|ppa|paht)[\s-]*(cf|gf)/, "Nylon", "Nylon-CF/GF"],
  [/\bpc[\s/-]*abs\b/, "PC", "PC-ABS"],
  [/\bhips\b/, "Other", "HIPS"],
  [/\bpva\b|\bbvoh\b/, "Other", "PVA / soluble"],
  [/\bpps\b|\bpeek\b|\bpei\b|\bpekk\b/, "Other", "High-temp"],
  [/\bpp\b/, "Other", "PP"],
];
/**
 * Finder "type" label for a project filament, or undefined when only the family is known
 * (plain PLA/PETG, or a speciality the price list does not track, e.g. Galaxy or Wood).
 * `names` are slicer preset names such as "Bambu PLA Silk @BBL X1C".
 */
export function shopType(type: string, names: string[] = []): string | undefined {
  const fam = familyOf(type);
  const text = [type, ...names.map((n) => n.replace(/@.*$/, ""))].join(" ").toLowerCase();
  for (const [re, f, label] of SUBTYPES) if (f === fam && re.test(text)) return label;
  return undefined;
}

function lab(hex: string): [number, number, number] {
  const lin = (c: number) => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const [r, g, b] = rgb(hex).map(lin);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
/** CIEDE2000 colour difference between two #rrggbb colours (0 = identical, about 2 = just noticeable) */
export function deltaE(a: string, b: string): number {
  const [L1, a1, b1] = lab(a), [L2, a2, b2] = lab(b);
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const ap1 = a1 * (1 + G), ap2 = a2 * (1 + G);
  const Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  const hue = (bb: number, aa: number) => (bb === 0 && aa === 0 ? 0 : (Math.atan2(bb, aa) * deg + 360) % 360);
  const hp1 = hue(b1, ap1), hp2 = hue(b2, ap2);
  const dL = L2 - L1, dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2 !== 0) dh = Math.abs(hp2 - hp1) <= 180 ? hp2 - hp1 : hp2 - hp1 > 180 ? hp2 - hp1 - 360 : hp2 - hp1 + 360;
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh / 2) * rad);
  const Lm = (L1 + L2) / 2, Cpm = (Cp1 + Cp2) / 2;
  let hm = hp1 + hp2;
  if (Cp1 * Cp2 !== 0) hm = Math.abs(hp1 - hp2) <= 180 ? (hp1 + hp2) / 2 : hp1 + hp2 < 360 ? (hp1 + hp2 + 360) / 2 : (hp1 + hp2 - 360) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const SL = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2), SC = 1 + 0.045 * Cpm, SH = 1 + 0.015 * Cpm * T;
  const RT = -2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
/** ΔE00 bands used by the finder: up to VERY_CLOSE "very close", up to CLOSE "close", up to MAX_DE shown as "noticeably different" */
export const VERY_CLOSE = 5, CLOSE = 12, MAX_DE = 25;
export type ColourHit = { de: number; colour: string; hex: string; estimated: boolean };
/** closest listed colour of an offer to `hex`; estimated = the store gave no hex, so it was guessed from the colour name */
export function colourHit(it: Item, hex: string): ColourHit | null {
  let best: ColourHit | null = null;
  it.c.forEach((c, i) => {
    const store = normHex(it.x?.[i]);
    const h = store || colourHex(c);
    if (!h) return;
    const de = deltaE(hex, h);
    if (!best || de < best.de) best = { de, colour: c, hex: h, estimated: !store };
  });
  return best;
}
/** subtype shared by every preset merged into one slot; falls back to the slicer type alone when they disagree */
export function slotType(type: string, presets: string[] = []): string | undefined {
  const subs = presets.map((p) => shopType(type, [p]));
  return subs.length && subs.every((s) => s === subs[0]) ? subs[0] : shopType(type);
}
