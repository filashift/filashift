import { useEffect } from "react";
import { PATH_ROUTING } from "@/routing";
import { getLang, tr } from "@/lib/i18n";

export const SITE = "https://filashift.com";
const DEFAULT_TITLE = "FilaShift — Free 3MF converter for Bambu Lab, Flashforge, Creality, Prusa and more";
const DEFAULT_DESC =
  "Convert 3MF projects between Bambu Studio, OrcaSlicer and PrusaSlicer printers, or export 3MF to STL and OBJ, right in your browser. Colours, plates and settings kept; files never leave your device.";

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

/** Per-page <title>, description, canonical and Open Graph tags (also captured by the prerender step). */
export function usePageMeta(title: string, desc: string = DEFAULT_DESC) {
  // descriptions are not visible text, so the DOM translator never sees them; translate them here
  const description = tr(getLang(), desc);
  useEffect(() => {
    document.title = title;
    meta('meta[name="description"]', "name", "description", description);
    meta('meta[property="og:title"]', "property", "og:title", title);
    meta('meta[property="og:description"]', "property", "og:description", description);
    const path = PATH_ROUTING ? window.location.pathname : (window.location.hash.replace(/^#/, "") || "/");
    const url = SITE + (path === "/" ? "/" : path.replace(/\/$/, ""));
    meta('meta[property="og:url"]', "property", "og:url", url);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description]);
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
