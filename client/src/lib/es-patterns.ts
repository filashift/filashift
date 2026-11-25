// Spanish patterns for UI strings that contain numbers or names. English is matched after whitespace is collapsed.
import { addPatterns } from "./i18n";
import es from "./es.json";

const ES = es as Record<string, string>;

const COL: Record<string, string> = {
  army: "verde militar", ash: "ceniza", beige: "beige", black: "negro", blue: "azul", bone: "hueso", brass: "latón", bronze: "bronce",
  brown: "marrón", burgundy: "burdeos", charcoal: "carbón", chocolate: "chocolate", cobalt: "cobalto", coffee: "café", copper: "cobre",
  coral: "coral", cream: "crema", cyan: "cian", forest: "verde bosque", fuchsia: "fucsia", gold: "dorado", graphite: "grafito", gray: "gris",
  grey: "gris", green: "verde", indigo: "índigo", ivory: "marfil", khaki: "caqui", lavender: "lavanda", lilac: "lila", lime: "lima",
  magenta: "magenta", maroon: "granate", matcha: "matcha", mint: "menta", natural: "natural", navy: "azul marino", olive: "oliva",
  orange: "naranja", peach: "melocotón", pink: "rosa", purple: "morado", red: "rojo", sage: "salvia", salmon: "salmón", silver: "plateado",
  tan: "tostado", teal: "verde azulado", turquoise: "turquesa", violet: "violeta", white: "blanco", wine: "vino", wood: "madera",
  yellow: "amarillo",
};
export function colourEs(w: string): string {
  const m = w.match(/^(dark|light) (.+)$/);
  if (m) return `${COL[m[2]] || m[2]} ${m[1] === "dark" ? "oscuro" : "claro"}`;
  return COL[w] || w;
}
const s = (n: string, one: string, many: string) => (n === "1" ? one : many);

/** "about 1.2 million triangles" / "about 640 thousand triangles" / "a 75 MB file" (see lib/big-model.ts) */
function bigWhatEs(w: string): string {
  const m = /^about ([\d.]+) (million|thousand) triangles$/.exec(w);
  if (m && m[2] === "million" && m[1] === "1.0") return "alrededor de un millón de triángulos";
  if (m) return `unos ${m[1].replace(".", ",").replace(/,0$/, "")} ${m[2] === "million" ? "millones de" : "mil"} triángulos`;
  const f = /^a (\d+) MB file$/.exec(w);
  return f ? `un archivo de ${f[1]} MB` : w;
}
addPatterns("es", [
  [/^Very large project \((.+)\)\. Converting it can take several minutes and needs a lot of memory\. Close other tabs first; if the page stops responding, simplify the model in your slicer\.$/, (_m, w) =>
    `Proyecto muy grande (${bigWhatEs(w)}). La conversión puede tardar varios minutos y necesita mucha memoria. Cierra antes otras pestañas; si la página deja de responder, simplifica el modelo en tu laminador.`],
  [/^Large project for this device \((.+)\)\. Converting may be slow and could run out of memory on a phone or tablet\. If it fails, convert it on a computer\.$/, (_m, w) =>
    `Proyecto grande para este dispositivo (${bigWhatEs(w)}). La conversión puede ser lenta y quedarse sin memoria en un móvil o tableta. Si falla, conviértelo en un ordenador.`],
  [/^(\d[\d,]*) printers$/, "$1 impresoras"],
  [/^(\d+) brands$/, "$1 marcas"],
  [/^(\d[\d,]*) printers from (\d+) brands$/, "$1 impresoras de $2 marcas"],
  [/^Search (\d+) printers…$/, "Buscar entre $1 impresoras…"],
  [/^(\d+) toolheads?$/, (_m, n) => `${n} ${s(n, "cabezal", "cabezales")}`],
  [/^(\d+) slots?( · .+)?$/, (_m, n, rest = "") => `${n} ${s(n, "ranura", "ranuras")}${rest}`],
  [/^Default: (\d+) (toolheads?|slots?)(.*?)\. Change it if you added an AMS, toolhead or multi-material unit\.$/, (_m, n, u, rest) =>
    `Por defecto: ${n} ${u.startsWith("toolhead") ? s(n, "cabezal", "cabezales") : s(n, "ranura", "ranuras")}${rest}. Cámbialo si añadiste un AMS, un cabezal o una unidad multimaterial.`],
  [/^Slicer-tested: sample projects converted for this printer sliced without errors in (.+) \((\w+) (\d{4})\)\.$/, (_m, sl, mo, y) =>
    `Probada en laminador: proyectos de prueba convertidos para esta impresora se laminaron sin errores en ${sl} (${({ Jan: "ene", Feb: "feb", Mar: "mar", Apr: "abr", May: "may", Jun: "jun", Jul: "jul", Aug: "ago", Sep: "sep", Oct: "oct", Nov: "nov", Dec: "dic" } as Record<string, string>)[mo] || mo} ${y}).`],
  [/^Slicer-tested: (.+)$/, "Probada en laminador: $1"],
  [/^(\d+) files? added$/, (_m, n) => `${n} ${s(n, "archivo añadido", "archivos añadidos")}`],
  [/^(\d+) ready to download$/, (_m, n) => `${n} ${s(n, "listo para descargar", "listos para descargar")}`],
  [/^(\d+) files · (\d+) converted$/, "$1 archivos · $2 convertidos"],
  [/^Convert all \((\d+)\)$/, "Convertir todos ($1)"],
  [/^Convert for (.+)$/, (_m, p) => `Convertir para ${p === "printer" ? "la impresora" : p}`],
  [/^Ready for (.+)$/, "Listo para $1"],
  [/^(\d+) plates? · (\d+) objects?$/, (_m, p, o) => `${p} ${s(p, "placa", "placas")} · ${o} ${s(o, "objeto", "objetos")}`],
  [/^(\d+) of (\d+) used( \(assumed\))?$/, (_m, a, b, x) => `${a} de ${b} en uso${x ? " (supuesto)" : ""}`],
  [/^This project uses (\d+) colours on (\d+) slots?\. Some colours print on the same layers( or are painted)?, so pauses cannot replace the missing slots; the closest colours share a slot instead\.$/, (_m, c, n, p) =>
    `Este proyecto usa ${c} colores con ${n} ${s(n, "ranura", "ranuras")}. Algunos colores se imprimen en las mismas capas${p ? " o están pintados" : ""}, así que las pausas no pueden sustituir las ranuras que faltan; los colores más parecidos comparten ranura.`],
  [/^Print all (\d+) colours with filament-change pauses$/, "Imprimir los $1 colores con pausas de cambio de filamento"],
  [/^The colours never share a layer, so the printer can pause (\d+) times? for you to swap filament instead of merging colours(.*)$/, (_m, n, rest) =>
    `Los colores nunca comparten capa, así que la impresora puede pausar ${n} ${s(n, "vez", "veces")} para que cambies el filamento en lugar de unir colores${rest.replace(/slot (\d+) → (.+?) from ([\d.]+) mm/g, "ranura $1 → $2 desde $3 mm")}`],
  [/^· (\d+) kept · (\d+) adapted · (\d+) speed changes$/, "· $1 conservados · $2 adaptados · $3 cambios de velocidad"],
  [/^· (\d+) colours?$/, (_m, n) => `· ${n} ${s(n, "color", "colores")}`],
  [/^· close to (.+)$/, (_m, w) => `· parecido a ${colourEs(w)}`],
  [/^close to (.+)$/, (_m, w) => `parecido a ${colourEs(w)}`],
  [/^Cheaper than when you saved it \(was \$([\d.]+)\/kg, now \$([\d.]+)\/kg\)$/, (_m, a, b) => `Más barato que cuando la guardaste (antes $${a}/kg, ahora $${b}/kg)`],
  [/^Not cheaper yet \(was \$([\d.]+)\/kg, now \$([\d.]+)\/kg\)$/, (_m, a, b) => `Aún no ha bajado (antes $${a}/kg, ahora $${b}/kg)`],
  [/^Saved (\d{4}-\d{2}-\d{2})$/, "Guardada el $1"],
  [/^Compare all (.+) in (.+)$/, (_m, t, w) => `Comparar todo el ${t === "Other" ? "filamento" : t} en ${colourEs(w)}`],
  [/^(\d[\d,]*) offers from (\d+) stores · updated (.+)$/, (_m, a, b, t) => `${a} ofertas de ${b} tiendas · actualizado ${agoEs(t)}`],
  [/^(\d[\d,]*) results?$/, (_m, n) => `${n} ${s(n, "resultado", "resultados")}`],
  [/^Show more \((.+) left\)$/, "Ver más (quedan $1)"],
  [/^(\d+)% off$/, "$1 % de descuento"],
  [/^Last updated (.+)\.$/, "Última actualización: $1."],
  [/^Could not read this file: (.+)$/, "No se pudo leer este archivo: $1"],
  [/^Conversion failed: (.+)$/, "La conversión falló: $1"],
  [/^(.+) You can also email support@jacksoncgc\.com\.$/, (_m, a) => `${ES[a] || a} También puedes escribir a support@jacksoncgc.com.`],
  [/^(\d+) of (\d+) printers slicer-tested$/, "$1 de $2 impresoras probadas en laminador"],
  [/^Showing (\d+) of (\d+) printers$/, "Se muestran $1 de $2 impresoras"],
  [/^(\d+) of (\d+) slice tests passed$/, "$1 de $2 pruebas de laminado superadas"],
  [/^Nozzles: (.+) mm$/, "Boquillas: $1 mm"],
  [/^(\d+) extruders$/, "$1 extrusores"],
  // batch conversion and 3D colour preview
  [/^(\d+) files? × (\d+) printers = (\d+) conversions$/, (_m, f, p, n) => `${f} ${s(f, "archivo", "archivos")} × ${p} impresoras = ${n} conversiones`],
  [/^Convert all (\d+)$/, "Convertir las $1"],
  [/^(\d+) of (\d+) done(?: · (\d+) failed)?$/, (_m, a, b, f) => `${a} de ${b} listas${f ? ` · ${f} con error` : ""}`],
  [/^Ready · (.+?)(?: · (\d+) warnings?)?$/, (_m, size, w) => `Listo · ${size}${w ? ` · ${w} ${s(w, "aviso", "avisos")}` : ""}`],
  [/^Add up to (\d+) more printers\. Every file is converted for each one, and you can download them all as one ZIP\.$/, "Añade hasta $1 impresoras más. Cada archivo se convierte para cada una y puedes descargarlos todos en un solo ZIP."],
  [/^That is the limit of (\d+) printers per batch\. Remove one to add another\.$/, "Ese es el límite de $1 impresoras por lote. Quita una para añadir otra."],
  [/^Up to (\d+) files at a time: (\d+) files? (?:were|was) not added\. Remove a file to add another\.$/, (_m, max, n) => `Hasta ${max} archivos a la vez: ${n} ${s(n, "archivo no se añadió", "archivos no se añadieron")}. Quita un archivo para añadir otro.`],
  [/^Converted · (.+)$/, "Convertido · $1"],
  [/^Plate (\d+)$/, "Placa $1"],
  [/^Slot (\d+)$/, "Ranura $1"],
  [/^Large model: showing ([\d,]+) of its triangles( in a simplified mesh)?( with the finest painted detail merged)?\. The converted file keeps every triangle\.$/, (_m, n, simp, paint) =>
    `Modelo grande: se muestran ${n.replace(/,/g, ".")} de sus triángulos${simp ? " en una malla simplificada" : ""}${paint ? " con el detalle pintado más fino fusionado" : ""}. El archivo convertido conserva todos los triángulos.`],
  [/^The preview could not be prepared: (.+)$/, "No se pudo preparar la vista previa: $1"],
  [/^The ZIP could not be built: (.+)$/, "No se pudo crear el ZIP: $1"],
]);

function agoEs(t: string): string {
  let m = t.match(/^(\d+) min ago$/);
  if (m) return `hace ${m[1]} min`;
  m = t.match(/^(\d+) hours? ago$/);
  if (m) return `hace ${m[1]} ${m[1] === "1" ? "hora" : "horas"}`;
  m = t.match(/^(\d+) days ago$/);
  if (m) return `hace ${m[1]} días`;
  return t;
}
