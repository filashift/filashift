// French patterns for UI strings that contain numbers or names. Same English regexes as es-patterns.ts.
import { addPatterns } from "./i18n";

const COL: Record<string, string> = {
  army: "vert armée", ash: "cendre", beige: "beige", black: "noir", blue: "bleu", bone: "os", brass: "laiton", bronze: "bronze",
  brown: "marron", burgundy: "bordeaux", charcoal: "anthracite", chocolate: "chocolat", cobalt: "cobalt", coffee: "café", copper: "cuivre",
  coral: "corail", cream: "crème", cyan: "cyan", forest: "vert forêt", fuchsia: "fuchsia", gold: "or", graphite: "graphite", gray: "gris",
  grey: "gris", green: "vert", indigo: "indigo", ivory: "ivoire", khaki: "kaki", lavender: "lavande", lilac: "lilas", lime: "vert citron",
  magenta: "magenta", maroon: "bordeaux foncé", matcha: "matcha", mint: "menthe", natural: "naturel", navy: "bleu marine", olive: "olive",
  orange: "orange", peach: "pêche", pink: "rose", purple: "violet", red: "rouge", sage: "vert sauge", salmon: "saumon", silver: "argent",
  tan: "fauve", teal: "bleu canard", turquoise: "turquoise", violet: "violet", white: "blanc", wine: "lie-de-vin", wood: "bois",
  yellow: "jaune",
};
export function colourFr(w: string): string {
  const m = w.match(/^(dark|light) (.+)$/);
  if (m) return `${COL[m[2]] || m[2]} ${m[1] === "dark" ? "foncé" : "clair"}`;
  return COL[w] || w;
}
const s = (n: string, one: string, many: string) => (n === "1" || n === "0" ? one : many);
const MON: Record<string, string> = { Jan: "janv.", Feb: "févr.", Mar: "mars", Apr: "avr.", May: "mai", Jun: "juin", Jul: "juil.", Aug: "août", Sep: "sept.", Oct: "oct.", Nov: "nov.", Dec: "déc." };

/** "about 1.2 million triangles" / "about 640 thousand triangles" / "a 75 MB file" (see lib/big-model.ts) */
function bigWhatFr(w: string): string {
  const m = /^about ([\d.]+) (million|thousand) triangles$/.exec(w);
  if (m && m[2] === "million" && m[1] === "1.0") return "environ un million de triangles";
  if (m) return m[2] === "million" ? `environ ${m[1].replace(".", ",").replace(/,0$/, "")} millions de triangles` : `environ ${m[1]} 000 triangles`;
  const f = /^a (\d+) MB file$/.exec(w);
  return f ? `un fichier de ${f[1]} Mo` : w;
}
addPatterns("fr", [
  [/^Very large project \((.+)\)\. Converting it can take several minutes and needs a lot of memory\. Close other tabs first; if the page stops responding, simplify the model in your slicer\.$/, (_m, w) =>
    `Projet très volumineux (${bigWhatFr(w)}). La conversion peut prendre plusieurs minutes et demande beaucoup de mémoire. Fermez d’abord les autres onglets ; si la page ne répond plus, simplifiez le modèle dans votre slicer.`],
  [/^Large project for this device \((.+)\)\. Converting may be slow and could run out of memory on a phone or tablet\. If it fails, convert it on a computer\.$/, (_m, w) =>
    `Projet volumineux pour cet appareil (${bigWhatFr(w)}). La conversion peut être lente et manquer de mémoire sur un téléphone ou une tablette. En cas d’échec, convertissez-le sur un ordinateur.`],
  [/^(\d[\d,]*) printers$/, "$1 imprimantes"],
  [/^(\d+) brands$/, "$1 marques"],
  [/^(\d[\d,]*) printers from (\d+) brands$/, "$1 imprimantes de $2 marques"],
  [/^Search (\d+) printers…$/, "Rechercher parmi $1 imprimantes…"],
  [/^(\d+) toolheads?$/, (_m, n) => `${n} ${s(n, "tête d'outil", "têtes d'outil")}`],
  [/^(\d+) slots?( · .+)?$/, (_m, n, rest = "") => `${n} ${s(n, "emplacement", "emplacements")}${rest}`],
  [/^Default: (\d+) (toolheads?|slots?)(.*?)\. Change it if you added an AMS, toolhead or multi-material unit\.$/, (_m, n, u, rest) =>
    `Par défaut : ${n} ${u.startsWith("toolhead") ? s(n, "tête d'outil", "têtes d'outil") : s(n, "emplacement", "emplacements")}${rest}. Modifiez-le si vous avez ajouté un AMS, une tête d'outil ou une unité multimatériau.`],
  [/^Slicer-tested: sample projects converted for this printer sliced without errors in (.+) \((\w+) (\d{4})\)\.$/, (_m, sl, mo, y) =>
    `Testé en trancheur : des projets d'exemple convertis pour cette imprimante ont été tranchés sans erreur dans ${sl} (${MON[mo] || mo} ${y}).`],
  [/^Slicer-tested: (.+)$/, "Testé en trancheur : $1"],
  [/^(\d+) files? added$/, (_m, n) => `${n} ${s(n, "fichier ajouté", "fichiers ajoutés")}`],
  [/^(\d+) ready to download$/, (_m, n) => `${n} ${s(n, "prêt à télécharger", "prêts à télécharger")}`],
  [/^(\d+) files · (\d+) converted$/, (_m, a, b) => `${a} fichiers · ${b} ${s(b, "converti", "convertis")}`],
  [/^Convert all \((\d+)\)$/, "Tout convertir ($1)"],
  [/^Convert for (.+)$/, (_m, p) => `Convertir pour ${p === "printer" ? "l'imprimante" : p}`],
  [/^Ready for (.+)$/, "Prêt pour $1"],
  [/^(\d+) plates? · (\d+) objects?$/, (_m, p, o) => `${p} ${s(p, "plateau", "plateaux")} · ${o} ${s(o, "objet", "objets")}`],
  [/^(\d+) of (\d+) used( \(assumed\))?$/, (_m, a, b, x) => `${a} sur ${b} ${s(a, "utilisé", "utilisés")}${x ? " (supposé)" : ""}`],
  [/^This project uses (\d+) colours on (\d+) slots?\. Some colours print on the same layers( or are painted)?, so pauses cannot replace the missing slots; the closest colours share a slot instead\.$/, (_m, c, n, p) =>
    `Ce projet utilise ${c} couleurs sur ${n} ${s(n, "emplacement", "emplacements")}. Certaines couleurs s'impriment sur les mêmes couches${p ? " ou sont peintes" : ""} : des pauses ne peuvent donc pas remplacer les emplacements manquants, et les couleurs les plus proches partagent un emplacement.`],
  [/^Print all (\d+) colours with filament-change pauses$/, "Imprimer les $1 couleurs avec des pauses de changement de filament"],
  [/^The colours never share a layer, so the printer can pause (\d+) times? for you to swap filament instead of merging colours(.*)$/, (_m, n, rest) =>
    `Les couleurs ne partagent jamais une couche : l'imprimante peut donc faire ${n} ${s(n, "pause", "pauses")} pour que vous changiez de filament au lieu de fusionner des couleurs${rest.replace(/slot (\d+) → (.+?) from ([\d.]+) mm/g, "emplacement $1 → $2 à partir de $3 mm")}`],
  [/^· (\d+) kept · (\d+) adapted · (\d+) speed changes$/, "· $1 conservés · $2 adaptés · $3 changements de vitesse"],
  [/^· (\d+) colours?$/, (_m, n) => `· ${n} ${s(n, "couleur", "couleurs")}`],
  [/^· close to (.+)$/, (_m, w) => `· proche de : ${colourFr(w)}`],
  [/^Compare all (.+) in (.+)$/, (_m, t, w) => `Comparer tout le ${t === "Other" ? "filament" : t} ${colourFr(w)}`],
  [/^(\d[\d,]*) offers from (\d+) stores · updated (.+)$/, (_m, a, b, t) => `${a} offres de ${b} boutiques · mis à jour ${agoFr(t)}`],
  [/^(\d[\d,]*) results?$/, (_m, n) => `${n} ${s(n, "résultat", "résultats")}`],
  [/^Show more \((.+) left\)$/, "Afficher plus ($1 restants)"],
  [/^(\d+)% off$/, "$1 % de remise"],
  [/^Last updated (.+)\.$/, "Dernière mise à jour : $1."],
  [/^Could not read this file: (.+)$/, "Impossible de lire ce fichier : $1"],
  [/^Conversion failed: (.+)$/, "Échec de la conversion : $1"],
  [/^(.+) You can also email support@jacksoncgc\.com\.$/, "$1 Vous pouvez aussi écrire à support@jacksoncgc.com."],
  [/^close to (.+)$/, (_m, w) => `proche de : ${colourFr(w)}`],
  [/^Cheaper than when you saved it \(was \$([\d.]+)\/kg, now \$([\d.]+)\/kg\)$/, (_m, a, b) => `Moins cher qu'à l'enregistrement (avant ${a} $/kg, maintenant ${b} $/kg)`],
  [/^Not cheaper yet \(was \$([\d.]+)\/kg, now \$([\d.]+)\/kg\)$/, (_m, a, b) => `Pas encore moins cher (avant ${a} $/kg, maintenant ${b} $/kg)`],
  [/^Saved (\d{4}-\d{2}-\d{2})$/, "Enregistrée le $1"],
  [/^(\d+) of (\d+) printers slicer-tested$/, "$1 imprimantes sur $2 testées en trancheur"],
  [/^Showing (\d+) of (\d+) printers$/, "$1 imprimantes affichées sur $2"],
  [/^(\d+) of (\d+) slice tests passed$/, "$1 tests de tranchage réussis sur $2"],
  [/^Nozzles: (.+) mm$/, "Buses : $1 mm"],
  [/^(\d+) extruders$/, "$1 extrudeurs"],
  [/^(\d+) files? × (\d+) printers = (\d+) conversions$/, (_m, f, p, n) => `${f} ${s(f, "fichier", "fichiers")} × ${p} imprimantes = ${n} conversions`],
  [/^Convert all (\d+)$/, "Convertir les $1"],
  [/^(\d+) of (\d+) done(?: · (\d+) failed)?$/, (_m, a, b, f) => `${a} sur ${b} terminées${f ? ` · ${f} en échec` : ""}`],
  [/^Ready · (.+?)(?: · (\d+) warnings?)?$/, (_m, size, w) => `Prêt · ${size}${w ? ` · ${w} ${s(w, "avertissement", "avertissements")}` : ""}`],
  [/^Add up to (\d+) more printers\. Every file is converted for each one, and you can download them all as one ZIP\.$/, "Ajoutez jusqu'à $1 imprimantes de plus. Chaque fichier est converti pour chacune, et vous pouvez tout télécharger dans un seul ZIP."],
  [/^That is the limit of (\d+) printers per batch\. Remove one to add another\.$/, "C'est la limite de $1 imprimantes par lot. Retirez-en une pour en ajouter une autre."],
  [/^Up to (\d+) files at a time: (\d+) files? (?:were|was) not added\. Remove a file to add another\.$/, (_m, max, n) => `Jusqu'à ${max} fichiers à la fois : ${n} ${s(n, "fichier n'a pas été ajouté", "fichiers n'ont pas été ajoutés")}. Retirez un fichier pour en ajouter un autre.`],
  [/^Converted · (.+)$/, "Converti · $1"],
  [/^Plate (\d+)$/, "Plateau $1"],
  [/^Slot (\d+)$/, "Emplacement $1"],
  [/^Large model: showing ([\d,]+) of its triangles( in a simplified mesh)?( with the finest painted detail merged)?\. The converted file keeps every triangle\.$/, (_m, n, simp, paint) =>
    `Grand modèle : ${n.replace(/,/g, " ")} de ses triangles sont affichés${simp ? " dans un maillage simplifié" : ""}${paint ? ", les plus fins détails peints étant fusionnés" : ""}. Le fichier converti conserve tous les triangles.`],
  [/^The preview could not be prepared: (.+)$/, "L'aperçu n'a pas pu être préparé : $1"],
  [/^The ZIP could not be built: (.+)$/, "Le ZIP n'a pas pu être créé : $1"],
]);

function agoFr(t: string): string {
  let m = t.match(/^(\d+) min ago$/);
  if (m) return `il y a ${m[1]} min`;
  m = t.match(/^(\d+) hours? ago$/);
  if (m) return `il y a ${m[1]} ${m[1] === "1" ? "heure" : "heures"}`;
  m = t.match(/^(\d+) days ago$/);
  if (m) return `il y a ${m[1]} jours`;
  return t;
}
