// German patterns for UI strings that contain numbers or names. Same English regexes as es-patterns.ts.
import { addPatterns } from "./i18n";

const COL: Record<string, string> = {
  army: "armeegrün", ash: "aschgrau", beige: "beige", black: "schwarz", blue: "blau", bone: "knochenweiß", brass: "messing", bronze: "bronze",
  brown: "braun", burgundy: "bordeaux", charcoal: "anthrazit", chocolate: "schokobraun", cobalt: "kobaltblau", coffee: "kaffeebraun", copper: "kupfer",
  coral: "koralle", cream: "creme", cyan: "cyan", forest: "waldgrün", fuchsia: "fuchsia", gold: "gold", graphite: "graphit", gray: "grau",
  grey: "grau", green: "grün", indigo: "indigo", ivory: "elfenbein", khaki: "khaki", lavender: "lavendel", lilac: "flieder", lime: "limette",
  magenta: "magenta", maroon: "kastanienbraun", matcha: "matcha", mint: "mint", natural: "natur", navy: "marineblau", olive: "oliv",
  orange: "orange", peach: "pfirsich", pink: "rosa", purple: "lila", red: "rot", sage: "salbeigrün", salmon: "lachs", silver: "silber",
  tan: "hellbraun", teal: "petrol", turquoise: "türkis", violet: "violett", white: "weiß", wine: "weinrot", wood: "holz",
  yellow: "gelb",
};
export function colourDe(w: string): string {
  const m = w.match(/^(dark|light) (.+)$/);
  if (m) return `${m[1] === "dark" ? "dunkel" : "hell"}${COL[m[2]] || m[2]}`;
  return COL[w] || w;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const s = (n: string, one: string, many: string) => (n === "1" ? one : many);
const MON: Record<string, string> = { Jan: "Jan.", Feb: "Feb.", Mar: "März", Apr: "Apr.", May: "Mai", Jun: "Juni", Jul: "Juli", Aug: "Aug.", Sep: "Sept.", Oct: "Okt.", Nov: "Nov.", Dec: "Dez." };

addPatterns("de", [
  [/^(\d[\d,]*) printers$/, "$1 Drucker"],
  [/^(\d+) brands$/, "$1 Marken"],
  [/^(\d[\d,]*) printers from (\d+) brands$/, "$1 Drucker von $2 Marken"],
  [/^Search (\d+) printers…$/, "$1 Drucker durchsuchen …"],
  [/^(\d+) toolheads?$/, (_m, n) => `${n} ${s(n, "Werkzeugkopf", "Werkzeugköpfe")}`],
  [/^(\d+) slots?( · .+)?$/, (_m, n, rest = "") => `${n} ${s(n, "Slot", "Slots")}${rest}`],
  [/^Default: (\d+) (toolheads?|slots?)(.*?)\. Change it if you added an AMS, toolhead or multi-material unit\.$/, (_m, n, u, rest) =>
    `Standard: ${n} ${u.startsWith("toolhead") ? s(n, "Werkzeugkopf", "Werkzeugköpfe") : s(n, "Slot", "Slots")}${rest}. Ändern Sie das, wenn Sie ein AMS, einen Werkzeugkopf oder eine Mehrmaterialeinheit ergänzt haben.`],
  [/^Slicer-tested: sample projects converted for this printer sliced without errors in (.+) \((\w+) (\d{4})\)\.$/, (_m, sl, mo, y) =>
    `Slicer-getestet: Für diesen Drucker konvertierte Beispielprojekte wurden in ${sl} fehlerfrei gesliced (${MON[mo] || mo} ${y}).`],
  [/^Slicer-tested: (.+)$/, "Slicer-getestet: $1"],
  [/^(\d+) files? added$/, (_m, n) => `${n} ${s(n, "Datei hinzugefügt", "Dateien hinzugefügt")}`],
  [/^(\d+) ready to download$/, (_m, n) => `${n} bereit zum Herunterladen`],
  [/^(\d+) files · (\d+) converted$/, "$1 Dateien · $2 konvertiert"],
  [/^Convert all \((\d+)\)$/, "Alle konvertieren ($1)"],
  [/^Convert for (.+)$/, (_m, p) => `Für ${p === "printer" ? "den Drucker" : p} konvertieren`],
  [/^Ready for (.+)$/, "Bereit für $1"],
  [/^(\d+) plates? · (\d+) objects?$/, (_m, p, o) => `${p} ${s(p, "Druckplatte", "Druckplatten")} · ${o} ${s(o, "Objekt", "Objekte")}`],
  [/^(\d+) of (\d+) used( \(assumed\))?$/, (_m, a, b, x) => `${a} von ${b} verwendet${x ? " (angenommen)" : ""}`],
  [/^This project uses (\d+) colours on (\d+) slots?\. Some colours print on the same layers( or are painted)?, so pauses cannot replace the missing slots; the closest colours share a slot instead\.$/, (_m, c, n, p) =>
    `Dieses Projekt nutzt ${c} Farben auf ${n} ${s(n, "Slot", "Slots")}. Einige Farben werden auf denselben Schichten gedruckt${p ? " oder sind bemalt" : ""}, daher können Pausen die fehlenden Slots nicht ersetzen; stattdessen teilen sich die ähnlichsten Farben einen Slot.`],
  [/^Print all (\d+) colours with filament-change pauses$/, "Alle $1 Farben mit Filamentwechsel-Pausen drucken"],
  [/^The colours never share a layer, so the printer can pause (\d+) times? for you to swap filament instead of merging colours(.*)$/, (_m, n, rest) =>
    `Die Farben teilen sich nie eine Schicht, daher kann der Drucker ${n} ${s(n, "Mal", "Mal")} pausieren, damit Sie das Filament wechseln, statt Farben zusammenzulegen${rest.replace(/slot (\d+) → (.+?) from ([\d.]+) mm/g, "Slot $1 → $2 ab $3 mm")}`],
  [/^· (\d+) kept · (\d+) adapted · (\d+) speed changes$/, "· $1 beibehalten · $2 angepasst · $3 Geschwindigkeitsänderungen"],
  [/^· (\d+) colours?$/, (_m, n) => `· ${n} ${s(n, "Farbe", "Farben")}`],
  [/^· close to (.+)$/, (_m, w) => `· ähnlich wie ${cap(colourDe(w))}`],
  [/^Compare all (.+) in (.+)$/, (_m, t, w) => `Alle ${t === "Other" ? "Filamente" : t} in ${cap(colourDe(w))} vergleichen`],
  [/^(\d[\d,]*) offers from (\d+) stores · updated (.+)$/, (_m, a, b, t) => `${a} Angebote aus ${b} Shops · aktualisiert ${agoDe(t)}`],
  [/^(\d[\d,]*) results?$/, (_m, n) => `${n} ${s(n, "Ergebnis", "Ergebnisse")}`],
  [/^Show more \((.+) left\)$/, "Mehr anzeigen (noch $1)"],
  [/^(\d+)% off$/, "$1 % Rabatt"],
  [/^Last updated (.+)\.$/, "Zuletzt aktualisiert: $1."],
  [/^Could not read this file: (.+)$/, "Diese Datei konnte nicht gelesen werden: $1"],
  [/^Conversion failed: (.+)$/, "Konvertierung fehlgeschlagen: $1"],
  [/^(.+) You can also email support@jacksoncgc\.com\.$/, "$1 Sie können auch an support@jacksoncgc.com schreiben."],
  [/^close to (.+)$/, (_m, w) => `ähnlich wie ${cap(colourDe(w))}`],
  [/^Cheaper than when you saved it \(was \$([\d.]+)\/kg, now \$([\d.]+)\/kg\)$/, (_m, a, b) => `Günstiger als beim Speichern (vorher ${a} $/kg, jetzt ${b} $/kg)`],
  [/^Not cheaper yet \(was \$([\d.]+)\/kg, now \$([\d.]+)\/kg\)$/, (_m, a, b) => `Noch nicht günstiger (vorher ${a} $/kg, jetzt ${b} $/kg)`],
  [/^Saved (\d{4}-\d{2}-\d{2})$/, "Gespeichert am $1"],
  [/^(\d+) of (\d+) printers slicer-tested$/, "$1 von $2 Druckern im Slicer getestet"],
  [/^Showing (\d+) of (\d+) printers$/, "$1 von $2 Druckern angezeigt"],
  [/^(\d+) of (\d+) slice tests passed$/, "$1 von $2 Slice-Tests bestanden"],
  [/^Nozzles: (.+) mm$/, "Düsen: $1 mm"],
  [/^(\d+) extruders$/, "$1 Extruder"],
  [/^(\d+) files? × (\d+) printers = (\d+) conversions$/, (_m, f, p, n) => `${f} ${s(f, "Datei", "Dateien")} × ${p} Drucker = ${n} Konvertierungen`],
  [/^Convert all (\d+)$/, "Alle $1 konvertieren"],
  [/^(\d+) of (\d+) done(?: · (\d+) failed)?$/, (_m, a, b, f) => `${a} von ${b} fertig${f ? ` · ${f} fehlgeschlagen` : ""}`],
  [/^Ready · (.+?)(?: · (\d+) warnings?)?$/, (_m, size, w) => `Fertig · ${size}${w ? ` · ${w} ${s(w, "Warnung", "Warnungen")}` : ""}`],
  [/^Add up to (\d+) more printers\. Every file is converted for each one, and you can download them all as one ZIP\.$/, "Fügen Sie bis zu $1 weitere Drucker hinzu. Jede Datei wird für jeden davon konvertiert, und Sie können alles als eine ZIP-Datei herunterladen."],
  [/^That is the limit of (\d+) printers per batch\. Remove one to add another\.$/, "Das ist die Grenze von $1 Druckern pro Stapel. Entfernen Sie einen, um einen anderen hinzuzufügen."],
  [/^Up to (\d+) files at a time: (\d+) files? (?:were|was) not added\. Remove a file to add another\.$/, (_m, max, n) => `Bis zu ${max} Dateien gleichzeitig: ${n} ${s(n, "Datei wurde", "Dateien wurden")} nicht hinzugefügt. Entfernen Sie eine Datei, um eine andere hinzuzufügen.`],
  [/^Converted · (.+)$/, "Konvertiert · $1"],
  [/^Plate (\d+)$/, "Druckplatte $1"],
  [/^Slot (\d+)$/, "Slot $1"],
  [/^Large model: showing ([\d,]+) of its triangles( in a simplified mesh)?( with the finest painted detail merged)?\. The converted file keeps every triangle\.$/, (_m, n, simp, paint) =>
    `Großes Modell: ${n.replace(/,/g, ".")} seiner Dreiecke werden angezeigt${simp ? " in einem vereinfachten Netz" : ""}${paint ? ", feinste Bemalungsdetails zusammengeführt" : ""}. Die konvertierte Datei behält alle Dreiecke.`],
  [/^The preview could not be prepared: (.+)$/, "Die Vorschau konnte nicht vorbereitet werden: $1"],
  [/^The ZIP could not be built: (.+)$/, "Die ZIP-Datei konnte nicht erstellt werden: $1"],
]);

function agoDe(t: string): string {
  let m = t.match(/^(\d+) min ago$/);
  if (m) return `vor ${m[1]} Min.`;
  m = t.match(/^(\d+) hours? ago$/);
  if (m) return `vor ${m[1]} ${m[1] === "1" ? "Stunde" : "Stunden"}`;
  m = t.match(/^(\d+) days ago$/);
  if (m) return `vor ${m[1]} Tagen`;
  return t;
}
