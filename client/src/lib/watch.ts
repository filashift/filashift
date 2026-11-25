// Finder searches and private "watched search" price notes.
// Watched searches live only in this browser's localStorage (key below); nothing is sent anywhere.
import { CLOSE, MAX_DE, colourHit, oneSpool, type ColourHit, type Item } from "./shop";

export type Search = {
  f: string; // family or "All"
  t: string; // type label or "all"
  b: string; // brand or "all"
  d: string; // "1.75" | "2.85" | "any"
  pack: string; // "any" | "single" | "multi"
  color: string; // "#rrggbb" or ""
  q: string; // free text
  stock: boolean; // in stock only
};
export type Watched = { key: string; s: Search; ppk: number; at: string };

export const WATCH_KEY = "filashift-watched-searches";
const MAX_WATCHED = 20;

export const searchKey = (s: Search) =>
  JSON.stringify([s.f, s.t.toLowerCase(), s.b, s.d, s.pack, s.color.toLowerCase(), s.q.trim().toLowerCase(), s.stock]);

/** offers matching a search, plus the colour match per offer when a colour is set (unsorted) */
export function searchItems(items: Item[], s: Search): { list: Item[]; hits: Map<Item, ColourHit> } {
  const words = s.q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = new Map<Item, ColourHit>();
  const list = items.filter((i) => {
    if (s.stock && !i.ok) return false;
    if (s.f !== "All" && i.f !== s.f) return false;
    if (s.t !== "all" && i.m.toLowerCase() !== s.t.toLowerCase()) return false;
    if (s.b !== "all" && i.b !== s.b) return false;
    if (s.d !== "any" && String(i.d) !== s.d) return false;
    if (s.pack === "single" && !oneSpool(i)) return false;
    if (s.pack === "multi" && i.kg < 2) return false;
    if (words.length) {
      const hay = `${i.b} ${i.t} ${i.v} ${i.m} ${i.c.join(" ")}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    if (s.color) {
      const h = colourHit(i, s.color);
      if (!h || h.de > MAX_DE) return false;
      hits.set(i, h);
    }
    return true;
  });
  return { list, hits };
}

/**
 * Lowest price per kg a watched search tracks. With a colour, only close matches (ΔE ≤ CLOSE) count,
 * so a cheaper but noticeably different colour never reports a price drop.
 */
export function lowestPpk(items: Item[], s: Search): number | null {
  const { list, hits } = searchItems(items, s);
  const ppks = list.filter((i) => !s.color || (hits.get(i)?.de ?? 99) <= CLOSE).map((i) => i.ppk);
  return ppks.length ? Math.min(...ppks) : null;
}
/** true when today's lowest price per kg is at least a cent below the saved one */
export const isCheaper = (w: Watched, now: number | null) => now !== null && now <= w.ppk - 0.005;

const okSearch = (s: unknown): s is Search => {
  const o = s as Record<string, unknown>;
  return !!o && ["f", "t", "b", "d", "pack", "color", "q"].every((k) => typeof o[k] === "string") && typeof o.stock === "boolean";
};
export function loadWatched(): Watched[] {
  try {
    const raw = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((w) => w && okSearch(w.s) && typeof w.ppk === "number" && isFinite(w.ppk) && typeof w.at === "string")
      .map((w) => ({ key: searchKey(w.s), s: w.s, ppk: w.ppk, at: w.at }));
  } catch {
    return [];
  }
}
function store(list: Watched[]) {
  try {
    if (list.length) localStorage.setItem(WATCH_KEY, JSON.stringify(list));
    else localStorage.removeItem(WATCH_KEY);
  } catch {
    /* private mode or storage full: the list still works for this visit */
  }
  return list;
}
export function addWatched(list: Watched[], s: Search, ppk: number, at = new Date().toISOString()): Watched[] {
  const key = searchKey(s);
  return store([{ key, s: { ...s }, ppk: Math.round(ppk * 100) / 100, at }, ...list.filter((w) => w.key !== key)].slice(0, MAX_WATCHED));
}
export const removeWatched = (list: Watched[], key: string) => store(list.filter((w) => w.key !== key));
export const clearWatched = () => store([]);
