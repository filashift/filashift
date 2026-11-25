// Tiny i18n: English strings are the keys; Spanish, German and French live in es.json / de.json / fr.json.
// Missing keys fall back to English. Strings with numbers or names use the <lang>-patterns.ts files and
// conversion report lines use report-<lang>.ts.
import { useSyncExternalStore } from "react";
import es from "./es.json";
import de from "./de.json";
import fr from "./fr.json";
import { REPORT_ES } from "./report-es";
import { REPORT_DE } from "./report-de";
import { REPORT_FR } from "./report-fr";
import type { Rep, Rules } from "./report-types";

export const LANGS = ["en", "es", "de", "fr"] as const;
export type Lang = (typeof LANGS)[number];
/** Native names for the language selector. */
export const LANG_NAMES: Record<Lang, string> = { en: "English", es: "Español", de: "Deutsch", fr: "Français" };
/** BCP 47 locale for dates and numbers. */
export const LOCALES: Record<Lang, string> = { en: "en-US", es: "es-ES", de: "de-DE", fr: "fr-FR" };
const KEY = "filashift-lang";
const DICTS: Record<Lang, Record<string, string>> = { en: {}, es, de, fr };
const isLang = (x: unknown): x is Lang => (LANGS as readonly unknown[]).includes(x);

/** Language from ?lang=, then the saved choice, then the browser languages (first supported one wins). */
export function detectLang(query: string | null, saved: string | null, navLangs: readonly string[]): Lang {
  if (isLang(query)) return query;
  if (isLang(saved)) return saved;
  for (const n of navLangs) {
    const base = (n || "").toLowerCase().split("-")[0];
    if (isLang(base)) return base;
  }
  return "en";
}

function initial(): Lang {
  try {
    const hashQuery = window.location.hash.split("?")[1] || "";
    const q = new URLSearchParams(hashQuery).get("lang") ?? new URLSearchParams(window.location.search).get("lang");
    if (isLang(q)) {
      try { localStorage.setItem(KEY, q); } catch { /* URL still works without storage */ }
      return q;
    }
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* private mode */ }
    const nav = navigator.languages?.length ? navigator.languages : [navigator.language || ""];
    // only the first preferred language decides, so an English browser with German as a fallback stays English
    return detectLang(null, saved, nav.slice(0, 1));
  } catch {
    return "en";
  }
}

let current: Lang = typeof window === "undefined" ? "en" : initial();
const subs = new Set<() => void>();
const applyDoc = () => {
  if (typeof document !== "undefined") document.documentElement.lang = current;
};
applyDoc();

export function getLang(): Lang {
  return current;
}
export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* private mode */
  }
  applyDoc();
  subs.forEach((f) => f());
  // the DOM translator works on rendered text, so a clean reload is the simplest way to switch
  if (typeof window !== "undefined") {
    const u = new URL(window.location.href);
    u.searchParams.set("lang", l);
    if (u.hash.startsWith("#/") && u.hash.includes("?")) {
      const [path, query] = u.hash.split("?");
      const p = new URLSearchParams(query);
      p.delete("lang");
      u.hash = path + (p.size ? `?${p}` : "");
    }
    window.location.replace(u.toString());
  }
}
function subscribe(f: () => void) {
  subs.add(f);
  return () => subs.delete(f);
}

/** Translate an English UI string; `{name}` placeholders are filled from vars. */
export function tr(lang: Lang, en: string, vars?: Record<string, string | number>): string {
  let s = (lang !== "en" && DICTS[lang]?.[en]) || en;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => "en" as Lang);
}

/** Hook returning t() bound to the current language (re-renders on change). */
export function useT() {
  const lang = useLang();
  const t = (en: string, vars?: Record<string, string | number>) => tr(lang, en, vars);
  t.lang = lang;
  return t;
}

/** plural helper: t(n === 1 ? one : many) */
export const pl = (n: number, one: string, many: string) => (n === 1 ? one : many);

// ---- conversion report lines (generated in English by the engine) ----
// Patterns are tried in order; `$1`… refer to the English capture groups.
export const REPORTS: Record<Exclude<Lang, "en">, Rules> = { es: REPORT_ES, de: REPORT_DE, fr: REPORT_FR };

export function trReport(lang: Lang, text: string): string {
  if (lang === "en") return text;
  for (const [re, out] of REPORTS[lang]) if (re.test(text)) return text.replace(re, out as never);
  return text;
}

/** Pick a value per language (for content that is not a plain string, e.g. lists or JSX). */
export function pick<T>(lang: Lang, v: { en: T } & Partial<Record<Exclude<Lang, "en">, T>>): T {
  return (v as Record<string, T>)[lang] ?? v.en;
}

// ---- DOM translator ----
// Components render English. When another language is selected, a MutationObserver swaps each text node and a few
// attributes for their translation (exact match after whitespace is collapsed), then dynamic patterns.
// Elements marked translate="no" (file names, printer names, the legal pages and guides, which ship their own translations) are skipped.
export const UI_PATTERNS: Record<Exclude<Lang, "en">, Rules> = { es: [], de: [], fr: [] };
export function addPatterns(lang: Exclude<Lang, "en">, p: [RegExp, Rep][]) {
  UI_PATTERNS[lang].push(...p);
}

function lookup(raw: string): string | null {
  const key = raw.replace(/\s+/g, " ").trim();
  if (!key || !/[A-Za-z]/.test(key)) return null;
  if (current === "en") return null;
  const d = DICTS[current][key];
  if (d) return swap(raw, key, d);
  for (const [re, out] of UI_PATTERNS[current]) if (re.test(key)) return swap(raw, key, key.replace(re, out as never));
  for (const [re, out] of REPORTS[current]) if (re.test(key)) return swap(raw, key, key.replace(re, out as never));
  return null;
}
function swap(raw: string, key: string, val: string): string {
  const lead = raw.match(/^\s*/)![0], trail = raw.match(/\s*$/)![0];
  return raw.trim() === key ? lead + val + trail : val;
}
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);
function skipped(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP.has(e.tagName)) return true;
    if (e.getAttribute("translate") === "no") return true;
  }
  return false;
}
const ATTRS = ["placeholder", "aria-label", "title", "alt"];
function doText(n: Text) {
  if (skipped(n.parentElement)) return;
  const v = n.nodeValue || "";
  const t = lookup(v);
  if (t !== null && t !== v) n.nodeValue = t;
}
function doEl(el: Element) {
  // a <textarea>'s own placeholder is UI text even though its value is not
  if (el.getAttribute("translate") === "no" || skipped(el.parentElement)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const t = lookup(v);
    if (t !== null && t !== v) el.setAttribute(a, t);
  }
}
function walk(root: Node) {
  if (root.nodeType === 3) return doText(root as Text);
  if (root.nodeType !== 1) return;
  const el = root as Element;
  doEl(el);
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? doText(n as Text) : doEl(n as Element);
}
let started = false;
export function startDomTranslator() {
  if (started || current === "en" || typeof document === "undefined") return;
  started = true;
  const fixTitle = () => {
    const t = lookup(document.title);
    if (t && t !== document.title) document.title = t;
  };
  walk(document.body);
  fixTitle();
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === "characterData") doText(m.target as Text);
      else if (m.type === "attributes") doEl(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  const te = document.querySelector("title");
  if (te) new MutationObserver(fixTitle).observe(te, { childList: true, characterData: true, subtree: true });
}
