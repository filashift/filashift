// Tiny i18n: English strings are the keys; Spanish lives in es.json. Missing keys fall back to English.
import { useSyncExternalStore } from "react";
import es from "./es.json";

export type Lang = "en" | "es";
const KEY = "filashift-lang";
const DICTS: Record<Lang, Record<string, string>> = { en: {}, es: es as Record<string, string> };

function initial(): Lang {
  try {
    const hashQuery = window.location.hash.split("?")[1] || "";
    const q = new URLSearchParams(hashQuery).get("lang") ?? new URLSearchParams(window.location.search).get("lang");
    if (q === "es" || q === "en") {
      try { localStorage.setItem(KEY, q); } catch { /* URL still works without storage */ }
      return q;
    }
    const s = localStorage.getItem(KEY);
    if (s === "es" || s === "en") return s;
    return /^es\b/i.test(navigator.language || "") ? "es" : "en";
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
  let s = (lang !== "en" && DICTS[lang][en]) || en;
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
const REPORT_ES: [RegExp, string | ((m: string, ...g: string[]) => string)][] = [
  [/^Converted for (.+)\. Open it in (.+) with File → Open Project \(not Import\), review, then slice\.$/, "Convertido para $1. Ábrelo en $2 con Archivo → Abrir proyecto (no Importar), revísalo y lamina."],
  [/^Print preset: “(.+)” \(closest to the project's ([\d.]+) mm layers\)\. Machine settings, start\/end G-code and limits come from “(.+)”\.$/, "Perfil de impresión: “$1” (el más cercano a las capas de $2 mm del proyecto). Los ajustes de máquina, el G-code de inicio/fin y los límites vienen de “$3”."],
  [/^Build plate set to “(.+)”\.$/, "Placa de impresión: “$1”."],
  [/^Prime tower width set to the (.+) default \((.+)\)\.$/, "Ancho de la torre de purga ajustado al valor por defecto de $1 ($2)."],
  [/^Painted areas already used the kept filament numbers\.$/, "Las zonas pintadas ya usaban los números de filamento conservados."],
  [/^Removed (\d+) unused filament\(s\): (.+)\.$/, "Se quitaron $1 filamento(s) sin usar: $2."],
  [/^This project has layer colour changes; they were kept and re-numbered\. Check them in the slicer's preview\.$/, "Este proyecto tiene cambios de color por capa; se conservaron y se renumeraron. Revísalos en la vista previa del laminador."],
  [/^Only one filament remains, so the prime tower was switched off\.$/, "Solo queda un filamento, así que se desactivó la torre de purga."],
  [/^Filaments (.+) now print from one slot \(slot (\d+)\)\.$/, "Los filamentos $1 ahora se imprimen desde una sola ranura (ranura $2)."],
  [/^Filaments (.+) share slot (\d+), with a pause to swap between them\.$/, "Los filamentos $1 comparten la ranura $2, con una pausa para cambiarlos."],
  [/^Filaments (.+) are different materials \((.+)\) but now share slot (\d+)\. Check that the slot's material suits every part\.$/, "Los filamentos $1 son de materiales distintos ($2) pero ahora comparten la ranura $3. Comprueba que el material de esa ranura sirva para todas las piezas."],
  [/^Re-mapped painted colours on (.+) triangles to the new slot numbers\.$/, "Se reasignaron los colores pintados de $1 triángulos a los nuevos números de ranura."],
  [/^Removed the pre-sliced G-code for the original printer\. Slice again before printing\.$/, "Se eliminó el G-code prelaminado de la impresora original. Vuelve a laminar antes de imprimir."],
  [/^The project was already set up for this printer; settings were refreshed anyway\.$/, "El proyecto ya estaba preparado para esta impresora; aun así se actualizaron los ajustes."],
  [/^Translated from (.+?): (\d+) settings and features mapped to their Orca\/Bambu names .+$/, "Traducido desde $1: $2 ajustes y funciones convertidos a sus nombres de Orca/Bambu (capas, perímetros, relleno, soportes, borde, costura, planchado, torre de purga, colores y temperaturas)."],
  [/^Not carried over from (.+?) \(different units or no equivalent; the destination printer's defaults are used\): (.+)$/, "No se trasladó desde $1 (unidades distintas o sin equivalente; se usan los valores de la impresora de destino): $2"],
  [/^Added (\d+) filament-change pauses? so (\d+) colours print with (\d+) slots?: (.+?)\. The printer pauses at each one \((.+)\); swap the filament from the printer's screen, then resume\.$/, "Se añadieron $1 pausa(s) de cambio de filamento para imprimir $2 colores con $3 ranura(s): $4. La impresora se detiene en cada una ($5); cambia el filamento desde la pantalla de la impresora y reanuda."],
  [/^The prime tower needs relative extrusion, so “Use relative E distances” was switched on \(the slicer sends M83 for you\)\.$/, "La torre de purga necesita extrusión relativa, así que se activó “Usar distancias E relativas” (el laminador envía M83 por ti)."],
  [/^The (\d+) mm prime tower did not fit beside the model, so it was narrowed to (\d+) mm\.$/, "La torre de purga de $1 mm no cabía junto al modelo, así que se estrechó a $2 mm."],
  [/^(?:Plate (\d+): the|The) model leaves little free space for the prime tower, so it was placed where it overlaps least\. Check the tower in the slicer preview; if it touches the model, move it or scale the model\.$/, (_m: string, pl?: string) => `${pl ? `Placa ${pl}: el` : "El"} modelo deja poco espacio libre para la torre de purga, así que se colocó donde menos se solapa. Revisa la torre en la vista previa del laminador; si toca el modelo, muévela o escala el modelo.`],
  [/^The prime tower was moved to a free corner on (\d+) plates? so it does not overlap the model\.$/, "La torre de purga se movió a una esquina libre en $1 placa(s) para que no se solape con el modelo."],
  [/^(\d+) plates: each plate was re-centred on the (.+) bed and laid out on its plate grid\.$/, "$1 placas: cada placa se volvió a centrar en la cama de la $2 y se colocó en su cuadrícula."],
  [/^(\d+) object\(s\) could not be matched to a plate and were not moved\. Check their position in the slicer\.$/, "$1 objeto(s) no se pudieron asignar a una placa y no se movieron. Revisa su posición en el laminador."],
  [/^(?:Plate (\d+): the|The) model footprint is (\d+) × (\d+) mm, larger than the (\d+) × (\d+) mm bed\. Rotating it 90° in the slicer should make it fit\.$/, (_m: string, pl: string, a: string, b: string, c: string, d: string) => `${pl ? `Placa ${pl}: la` : "La"} base del modelo mide ${a} × ${b} mm, más que la cama de ${c} × ${d} mm. Girarlo 90° en el laminador debería hacer que quepa.`],
  [/^(?:Plate (\d+): the|The) model footprint is (\d+) × (\d+) mm, larger than the (\d+) × (\d+) mm bed\. Scale it to about (\d+)% or split it before slicing\.$/, (_m: string, pl: string, a: string, b: string, c: string, d: string, e: string) => `${pl ? `Placa ${pl}: la` : "La"} base del modelo mide ${a} × ${b} mm, más que la cama de ${c} × ${d} mm. Escálalo a un ${e} % aproximadamente o divídelo antes de laminar.`],
  [/^(?:Plate (\d+): )?objects extend past the bed edge\. Use Arrange in the slicer before slicing\.$/, (_m: string, pl?: string) => `${pl ? `Placa ${pl}: hay` : "Hay"} objetos que se salen del borde de la cama. Usa Organizar en el laminador antes de laminar.`],
  [/^The project does not list its filaments; colours were assigned automatically\.$/, "El proyecto no indica sus filamentos; los colores se asignaron automáticamente."],
  [/^This PrusaSlicer project has no readable objects or settings\. .+$/, "Este proyecto de PrusaSlicer no tiene objetos ni ajustes legibles. Vuelve a guardarlo en PrusaSlicer 2.4 o posterior (Archivo → Guardar proyecto) e inténtalo de nuevo."],
  [/^This 3MF contains geometry only, with no slicer settings to carry over\. .+$/, "Este 3MF solo contiene geometría, sin ajustes de laminador que trasladar. Impórtalo directamente en tu laminador y elige allí tu impresora."],
  [/^The file contains pre-sliced G-code for the original printer\. .+$/, "El archivo contiene G-code prelaminado para la impresora original. Se eliminará para que nunca se envíe a la máquina equivocada."],
  [/^The PrusaSlicer project has no saved print settings, so only geometry, parts and colours were carried over\.$/, "El proyecto de PrusaSlicer no tiene ajustes de impresión guardados, así que solo se trasladaron la geometría, las piezas y los colores."],
  [/^Part "(.+)" has an unknown PrusaSlicer volume type \((.+)\) and was treated as a normal part\.$/, "La pieza \"$1\" tiene un tipo de volumen de PrusaSlicer desconocido ($2) y se trató como una pieza normal."],
  [/^Variable layer height or height-range modifiers from PrusaSlicer were not carried over\.$/, "No se trasladaron la altura de capa variable ni los modificadores por rango de altura de PrusaSlicer."],
  [/^Some separate objects overlap \((.+)\)\. Orca\/Bambu will report a G-code conflict when slicing\. .+$/, "Algunos objetos separados se solapan ($1). Orca/Bambu indicará un conflicto de G-code al laminar. En el laminador de destino, selecciona los objetos solapados y usa Ensamblar (o vuelve a guardarlos en PrusaSlicer como piezas de un solo objeto)."],
  [/^Filament (\d+) is used by the model but had no slot; it was assigned to slot 1\.$/, "El modelo usa el filamento $1 pero no tenía ranura; se asignó a la ranura 1."],
  [/^(\d+) filament slots are in use but (.+) is set up for (\d+) \((.+)\)\. Merge colours before slicing, or confirm you have more units connected\.$/, "Se usan $1 ranuras de filamento, pero la $2 está configurada para $3 ($4). Une colores antes de laminar o confirma que tienes más unidades conectadas."],
  [/^Slot (\d+): no (.+) preset for “(.+)”; using “(.+)” \(your temperatures are kept\)\.$/, "Ranura $1: no hay perfil de la $2 para “$3”; se usa “$4” (se mantienen tus temperaturas)."],
  [/^Nozzle changed from ([\d.]+) mm to ([\d.]+) mm: layer height and line widths come from the “(.+)” preset; the designer's other settings are kept\.$/, "Boquilla cambiada de $1 mm a $2 mm: la altura de capa y el ancho de línea vienen del perfil “$3”; se mantienen los demás ajustes del diseñador."],
  [/^Slot (\d+): (.+) (\d+) °C is above the (.+) preset limit; capped at (\d+) °C\.$/, "Ranura $1: $2 de $3 °C supera el límite del perfil de la $4; se limitó a $5 °C."],
  [/^(\w+): (.+) exceeds the (.+) machine limit; capped at (.+)\.$/, "$1: $2 supera el límite de la máquina $3; se limitó a $4."],
  [/^(\w+): (.+) is outside the slicer's accepted range; set to (.+)\.$/, "$1: $2 está fuera del rango que acepta el laminador; se ajustó a $3."],
  [/^Build plate changed from “(.+)” to “(.+)”: the (.+) filament presets have no bed temperature for the original plate\. .+$/, "Placa cambiada de “$1” a “$2”: los perfiles de filamento de la $3 no tienen temperatura de cama para la placa original. Instala esa placa antes de imprimir o elige otra en el laminador."],
  [/^No build plate suits every filament in the (.+) presets\. .+$/, "Ninguna placa sirve para todos los filamentos en los perfiles de la $1. Elige una placa en el laminador y revisa las temperaturas de la cama."],
  [/^The model has hand-painted supports, so support generation was switched on\.$/, "El modelo tiene soportes pintados a mano, así que se activó la generación de soportes."],
  [/^OrcaSlicer will refuse to slice this as-is: on a single nozzle every filament's temperature must sit inside the others' recommended ranges \((.+)\)\. .+$/, (_m: string, x: string) => `OrcaSlicer no laminará esto tal cual: con una sola boquilla, la temperatura de cada filamento debe estar dentro del rango recomendado de los demás (${x.replace(/slot (\d+)/g, "ranura $1")}). Usa materiales que se impriman a temperaturas parecidas, o activa Preferencias → Control → Laminado → Quitar la restricción de temperaturas mezcladas si aceptas el riesgo.`],
  [/^Exported ([\d,]+) triangles from (\d+) parts?( on (\d+) plates \(one file per plate\))? as (STL|OBJ), in millimetres, with the parts in their plate positions\.$/, (_m: string, t: string, n: string, many: string, pl: string, f: string) => `Se exportaron ${t.replace(/,/g, ".")} triángulos de ${n} pieza(s)${many ? ` en ${pl} placas (un archivo por placa)` : ""} como ${f}, en milímetros, con las piezas en su posición en la placa.`],
  [/^STL stores shape only: .+$/, "El STL solo guarda la forma: no incluye colores, asignaciones de filamento, placas ni ajustes de impresión. Usa OBJ para mantener el color de cada pieza, o convierte el 3MF para conservarlo todo."],
  [/^OBJ keeps one colour per part \(from its filament\) in the \.mtl file\. Print settings are not included\.$/, "El OBJ guarda un color por pieza (según su filamento) en el archivo .mtl. No incluye los ajustes de impresión."],
  [/^This project has painted-on colours\. STL and OBJ cannot store painting, .+$/, "Este proyecto tiene colores pintados. STL y OBJ no pueden guardar la pintura, así que las zonas pintadas se exportan con el color base de la pieza. Convierte el 3MF para conservar la pintura."],
  [/^Skipped (\d+) modifier, negative or support-blocker volumes?, which only affect slicing\.$/, "Se omitieron $1 volumen(es) modificador(es), negativo(s) o bloqueador(es) de soporte, que solo afectan al laminado."],
  [/^This file expands to more than 2 GB, which exceeds the safety limit\.$/, "Este archivo ocupa más de 2 GB descomprimido, lo que supera el límite de seguridad."],
  [/^Only Bambu Studio and Orca-family projects can be converted in this release\.$/, "En esta versión solo se pueden convertir proyectos de Bambu Studio y de la familia Orca."],
  [/^The file has no 3D\/3dmodel\.model part, so it is not a 3MF file\.$/, "El archivo no tiene la parte 3D/3dmodel.model, así que no es un archivo 3MF."],
  [/^No printable meshes were found in this file\.$/, "No se encontraron mallas imprimibles en este archivo."],
  [/^This printer profile has no pause G-code, so the pauses use M600\. .+$/, "Este perfil no tiene G-code de pausa, así que las pausas usan M600. Comprueba que tu firmware lo admita (en Klipper necesita una macro M600)."],
];

export function trReport(lang: Lang, text: string): string {
  if (lang === "en") return text;
  for (const [re, out] of REPORT_ES) if (re.test(text)) return text.replace(re, out as never);
  return text;
}

// ---- DOM translator ----
// Components render English. When Spanish is selected, a MutationObserver swaps each text node and a few
// attributes for their Spanish entry (exact match after whitespace is collapsed), then dynamic patterns.
// Elements marked translate="no" (file names, printer names, the legal pages, which ship their own Spanish) are skipped.
type Rep = string | ((m: string, ...g: string[]) => string);
const UI_ES: [RegExp, Rep][] = [];
export function addPatterns(p: [RegExp, Rep][]) {
  UI_ES.push(...p);
}

function lookup(raw: string): string | null {
  const key = raw.replace(/\s+/g, " ").trim();
  if (!key || !/[A-Za-z]/.test(key)) return null;
  const d = DICTS.es[key];
  if (d) return swap(raw, key, d);
  for (const [re, out] of UI_ES) if (re.test(key)) return swap(raw, key, key.replace(re, out as never));
  for (const [re, out] of REPORT_ES) if (re.test(key)) return swap(raw, key, key.replace(re, out as never));
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
  if (skipped(el)) return;
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
