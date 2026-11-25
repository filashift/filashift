import { useEffect } from "react";
import { PATH_ROUTING } from "@/routing";
import { getLang, isLocalizedRoute, LANGS, localePath, PATH_LANG, stripLocale, translateUi, tr, type Lang } from "@/lib/i18n";

export const SITE = "https://filashift.com";
const DEFAULT_TITLE = "FilaShift — Free 3MF converter for Bambu Lab, Flashforge, Creality, Prusa and more";
const DEFAULT_DESC =
  "Convert 3MF projects between Bambu Studio, OrcaSlicer and PrusaSlicer printers, or export 3MF to STL and OBJ, right in your browser. Colours, plates and settings kept; files never leave your device.";

/** Open Graph locale per language. */
export const OG_LOCALE: Record<Lang, string> = { en: "en_US", es: "es_ES", de: "de_DE", fr: "fr_FR" };
/** Absolute URL of a page in a language: siteUrl("/guides", "de") -> https://filashift.com/de/guides */
export const siteUrl = (path: string, lang: Lang) => SITE + localePath(path === "/" ? "/" : path.replace(/\/$/, ""), lang);
/** hreflang alternates for a localized route: en, es, de, fr and x-default (English). */
export const alternates = (path: string): [string, string][] => [
  ...LANGS.map((l): [string, string] => [l, siteUrl(path, l)]),
  ["x-default", siteUrl(path, "en")],
];

/** Absolute data URL that also works on nested routes such as /guides/3mf-to-stl. */
export const dataUrl = (name: string) => (PATH_ROUTING ? `/data/${name}` : `./data/${name}`);

function meta(sel: string, attr: string, key: string, val: string) {
  let el = document.head.querySelector<HTMLMetaElement>(sel);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", val);
}

/** Per-page <title>, description, canonical, hreflang and Open Graph tags (also captured by the prerender step).
 * Pass { alternates: false } for pages that are not indexed in several languages (404, /source). */
export function usePageMeta(title: string, desc: string = DEFAULT_DESC, opts: { alternates?: boolean } = {}) {
  // titles and descriptions are not visible text, so the DOM translator never sees them; translate them here so
  // the prerendered <title>, description and og: tags are already in the page's language
  const lang = getLang();
  const heading = translateUi(title);
  const description = translateUi(tr(lang, desc));
  const wantAlt = opts.alternates !== false;
  useEffect(() => {
    document.title = heading;
    meta('meta[name="description"]', "name", "description", description);
    meta('meta[property="og:title"]', "property", "og:title", heading);
    meta('meta[property="og:description"]', "property", "og:description", description);
    const raw = PATH_ROUTING ? window.location.pathname : (window.location.hash.replace(/^#/, "").split("?")[0] || "/");
    const path = stripLocale(raw);
    // canonical: this URL's own language (the path prefix; unprefixed URLs are the English pages)
    const url = siteUrl(path, PATH_LANG ?? "en");
    meta('meta[property="og:url"]', "property", "og:url", url);
    meta('meta[property="og:locale"]', "property", "og:locale", OG_LOCALE[PATH_LANG ?? "en"]);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;
    document.head.querySelectorAll('link[rel="alternate"][hreflang], meta[property="og:locale:alternate"]').forEach((e) => e.remove());
    if (wantAlt && isLocalizedRoute(path)) {
      for (const [hl, href] of alternates(path)) {
        const a = document.createElement("link");
        a.rel = "alternate";
        a.hreflang = hl;
        a.href = href;
        document.head.appendChild(a);
      }
      for (const l of LANGS) {
        if (l === (PATH_LANG ?? "en")) continue;
        const m = document.createElement("meta");
        m.setAttribute("property", "og:locale:alternate");
        m.content = OG_LOCALE[l];
        document.head.appendChild(m);
      }
    }
    localizeAppLd();
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [heading, description, wantAlt]);
}

const APP_DESC =
  "Browser-based converter for 3MF 3D printing projects between Bambu Lab, Flashforge, Snapmaker, Creality, Prusa and other printers. Files are processed locally.";
/** The site-wide WebApplication JSON-LD in index.html: description, url and inLanguage in the page language. */
function localizeAppLd() {
  const el = document.getElementById("ld-app");
  if (!el) return;
  try {
    const data = JSON.parse(el.textContent || "{}");
    const lang = getLang();
    data.description = tr(lang, APP_DESC);
    data.operatingSystem = tr(lang, "Any (web browser)");
    data.url = siteUrl("/", PATH_LANG ?? "en");
    data.inLanguage = lang;
    el.textContent = JSON.stringify(data, null, 2);
  } catch {
    /* leave the static copy */
  }
}

/** JSON-LD block for a page (HowTo, FAQPage …). */
export function useJsonLd(id: string, data: object | null) {
  useEffect(() => {
    if (!data) return;
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
    return () => el?.remove();
  }, [id, JSON.stringify(data)]);
}
