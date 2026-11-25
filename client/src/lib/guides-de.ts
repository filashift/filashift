// German versions of the guides in guides.ts, keyed by slug. Keep them in step with the English text
// (same steps, sections and FAQ) and update `updated` in guides.ts when any language changes substantively.
import type { GuideText } from "./guides-es";
import { FILE_LIMIT } from "./conversion-facts";
import { buyingGuide, buyingSlug } from "./filament-buying-guide";

const OPEN =
  "Öffnen Sie die heruntergeladene Datei in Ihrem Slicer mit Datei → Projekt öffnen (nicht Importieren, das nur die Formen übernimmt), prüfen Sie die Vorschau und slicen Sie.";
const open = (slicer: string) => OPEN.replace("Ihrem Slicer", slicer);

export const GUIDES_DE: Record<string, GuideText> = {
  [buyingSlug]: buyingGuide("de"),
  "3mf-to-stl": {
    title: "3MF in STL oder OBJ umwandeln",
    meta: "3MF kostenlos in STL oder OBJ umwandeln, direkt im Browser | FilaShift",
    desc: "Wandeln Sie eine 3MF-Datei in Sekunden in STL oder OBJ um, ohne sie hochzuladen. Die Teile bleiben an ihrem Platz, die Einheiten werden in Millimeter umgerechnet und OBJ behält die Farbe jedes Teils. Schritt-für-Schritt-Anleitung mit Lösungen für häufige Probleme.",
    intro:
      "STL und OBJ sind einfache Netzformate, die fast jedes 3D-Programm öffnen kann. FilaShift wandelt eine 3MF direkt in Ihrem Browser in STL oder OBJ um, die Datei wird also nie hochgeladen.",
    steps: [
      "Öffnen Sie den FilaShift-Konverter und ziehen Sie Ihre .3mf-Datei auf die Seite (oder klicken Sie, um sie auszuwählen).",
      "Klicken Sie unter der Datei auf STL exportieren für ein reines Formnetz oder auf OBJ exportieren, um zusätzlich eine Farbe pro Teil zu behalten.",
      "Speichern Sie den Download. Ein Projekt mit mehreren Druckplatten ergibt eine Datei pro Druckplatte in einem .zip.",
      "Öffnen Sie die STL oder OBJ in Ihrem Slicer oder 3D-Programm und prüfen Sie Größe und Ausrichtung.",
    ],
    cta: "Konverter öffnen",
    sections: [
      {
        h: "Was erhalten bleibt und was verloren geht",
        list: [
          "Erhalten: jedes druckbare Teil, genau so positioniert wie auf der Druckplatte, in Millimetern (3MF-Dateien in Zoll, Zentimetern oder Mikrometern werden für Sie skaliert).",
          "Nur OBJ: ein Material pro Teil, eingefärbt nach seinem Filament, in einer passenden .mtl-Datei.",
          "Bei beiden verloren: aufgemalte Farben, Filamentzuordnungen, Druckplatten, Stützstrukturen und alle Druckeinstellungen. Weder STL noch OBJ kann sie speichern.",
          "Übersprungen: Modifikator-, Negativ- und Stützblocker-Volumen, die nur für den Slicer wichtig sind.",
        ],
      },
      {
        h: "STL oder OBJ: Was soll ich wählen?",
        p: [
          "Wählen Sie STL, wenn eine andere Person oder ein anderes Programm nur die Form braucht: Es ist das am breitesten unterstützte Format. Wählen Sie OBJ, wenn Sie sehen möchten, welches Teil welche Farbe hat, zum Beispiel in Blender oder einem Renderer.",
          "Wenn Sie einen Druck auf einen anderen Drucker übertragen, ist meist keines von beiden sinnvoll. Konvertieren Sie stattdessen die 3MF selbst: FilaShift behält Farben, Bemalung, Druckplatten und die Einstellungen des Designers.",
        ],
      },
      {
        h: "Häufige Probleme lösen",
        list: [
          "Das Modell ist winzig oder riesig: Das Programm, in dem Sie es geöffnet haben, hat Zoll oder Meter angenommen. FilaShift schreibt immer Millimeter; wählen Sie mm als Importeinheit.",
          "Löcher oder fehlende Flächen: Das ursprüngliche Netz war nicht geschlossen. Die meisten Slicer reparieren es beim Import; Bambu Studio und OrcaSlicer haben „Modell reparieren“, PrusaSlicer repariert automatisch.",
          "Teile verschmelzen zu einem: STL hat keine Teileliste. Nutzen Sie OBJ, das ein benanntes Objekt pro Teil speichert, oder trennen Sie die Teile in Ihrem Slicer.",
          "Farben verschwinden: STL hat keine Farbe, OBJ eine pro Teil. Bemalte Details bleiben nur in einer 3MF erhalten.",
        ],
      },
    ],
    faq: [
      { q: "Wird die 3MF hochgeladen?", a: "Nein. Der Export läuft in Ihrem Browser-Tab. Es wird nichts an FilaShift oder an andere gesendet." },
      { q: "Gibt es eine Größenbegrenzung?", a: FILE_LIMIT.de },
      {
        q: "Kann ich eine STL wieder in 3MF umwandeln?",
        a: "Ja. Wählen Sie in FilaShift eine STL, wählen Sie den Drucker, konvertieren Sie das Modell und laden Sie die neue 3MF herunter. STL speichert nur die Geometrie; prüfen Sie Skalierung, Material und Druckeinstellungen im Ziel-Slicer.",
      },
    ],
  },
  "makerworld-to-flashforge": {
    title: "MakerWorld- und Bambu-Studio-3MF-Dateien für Flashforge konvertieren",
    meta: "MakerWorld-3MF auf Flashforge AD5X, AD5M und Creator 5 drucken | FilaShift",
    desc: "Konvertieren Sie 3MF-Projekte aus MakerWorld und Bambu Studio für Flashforge AD5X, Adventurer 5M und Creator 5, ohne Farben, Druckplatten oder Einstellungen neu anzulegen. Kostenlos, privat und Schritt für Schritt.",
    intro:
      "MakerWorld-Projekte werden für Bambu-Lab-Drucker gespeichert. Öffnet man sie auf einem Flashforge, gehen oft Farben oder Einstellungen verloren. FilaShift schreibt das Projekt mit den Drucker- und Filamentprofilen von Flashforge um und behält alles andere bei.",
    steps: [
      "Öffnen Sie das Modell auf MakerWorld, wählen Sie das gewünschte Druckprofil und laden Sie es als 3MF herunter (nicht als STL).",
      "Ziehen Sie die 3MF in FilaShift und wählen Sie Ihren Flashforge-Drucker: AD5X, Adventurer 5M / 5M Pro oder Creator 5.",
      "Prüfen Sie die Farbliste. Jede Projektfarbe wird einem der vier IFS-Slots (AD5X) oder einem Werkzeugkopf (Creator 5) zugeordnet; ändern Sie jede Zuordnung nach Wunsch.",
      "Klicken Sie auf Konvertieren, laden Sie die neue 3MF herunter und lesen Sie den Bericht.",
      open("OrcaSlicer oder Orca-Flashforge"),
    ],
    cta: "Für die Flashforge AD5X konvertieren",
    sections: [
      {
        h: "Was erhalten bleibt",
        list: [
          "Alle Druckplatten, Objekte und bemalten Farben, wobei die Bemalung auf Ihre Slots umnummeriert wird.",
          "Schichthöhe, Wände, Füllung, obere und untere Schichten, Stützstrukturen, Rand (Brim) und Naht, wie vom Designer gewählt.",
          "Die Maschineneinstellungen, der Start- und End-G-Code und die Filamenttemperaturen von Flashforge ersetzen die von Bambu, damit der Drucker richtig arbeitet.",
          "Der Reinigungsturm wird an eine freie Stelle des 220 × 220 mm großen Druckbetts verschoben, wenn er nicht mehr an seinen alten Platz passt.",
        ],
      },
      {
        h: "Flashforge-Drucker mit einem Extruder",
        p: [
          "Adventurer 5M und 5M Pro haben nur einen Filamentweg. FilaShift kann alle Farben zu einer zusammenlegen oder, wenn die Farben auf unterschiedlichen Höhen liegen (Schilder, Abzeichen, Schlüsselanhänger), Filamentwechsel-Pausen einfügen, damit der Drucker anhält und Sie wechseln können.",
        ],
      },
      {
        h: "Häufige Probleme",
        list: [
          "Es erscheinen nur die Formen: Die Datei wurde importiert. Nutzen Sie Datei → Projekt öffnen.",
          "Das Modell ist größer als das Druckbett: Die meisten Bambu-Lab-Betten messen 256 mm, das der AD5X 220 mm. Der Bericht sagt, wann ein Modell nicht passt und wie stark es skaliert werden muss.",
          "OrcaSlicer verweigert das Slicen wegen gemischter Temperaturen: Das Projekt mischt Materialien wie PLA und PETG auf einer Düse. Verwenden Sie nur einen Materialtyp oder, wenn Sie wissen, dass die Mischung sicher ist, heben Sie in den OrcaSlicer-Einstellungen die Einschränkung für gemischte Temperaturen auf.",
        ],
      },
    ],
    faq: [
      { q: "Funktioniert es auch umgekehrt, von Flashforge zu Bambu?", a: "Ja. Ziehen Sie ein Flashforge- oder Orca-Flashforge-Projekt hinein und wählen Sie einen Bambu-Lab-Drucker." },
      { q: "Brauche ich Orca-Flashforge?", a: "Nein. Die konvertierte Datei lässt sich in OrcaSlicer und in Orca-Flashforge öffnen." },
    ],
  },
  "makerworld-to-creality": {
    title: "MakerWorld- und Bambu-Studio-3MF-Dateien für Creality-Drucker konvertieren",
    meta: "MakerWorld-3MF auf Creality K1, K2, Hi und Ender-3 V3 drucken | FilaShift",
    desc: "Konvertieren Sie 3MF-Projekte aus Bambu Studio und MakerWorld für Creality K1, K2 Plus, Hi mit CFS und Ender-3 V3 – Farben, Druckplatten und Designer-Einstellungen bleiben erhalten.",
    intro:
      "Creality-Drucker nutzen Profile der OrcaSlicer-Familie (OrcaSlicer und Creality Print). FilaShift konvertiert Bambu-Projekte auf diese Profile und listet jede Änderung auf, damit Sie MakerWorld-Modelle auf einem K1, K2 oder Ender drucken können, ohne von vorn zu beginnen.",
    steps: [
      "Laden Sie das MakerWorld-Modell als 3MF mit dem gewünschten Druckprofil herunter.",
      "Ziehen Sie es in FilaShift und wählen Sie Ihren Creality-Drucker, zum Beispiel K2 Plus (CFS), Hi (CFS), K1C oder Ender-3 V3.",
      "Ordnen Sie die Farben den CFS-Slots zu oder nutzen Sie bei Modellen mit einem Extruder Filamentwechsel-Pausen.",
      "Konvertieren, herunterladen und den Bericht lesen.",
      open("OrcaSlicer"),
    ],
    cta: "Für den Creality K2 Plus konvertieren",
    sections: [
      {
        h: "Was erhalten bleibt",
        list: [
          "Druckplatten, Objekte und bemalte Farben.",
          "Schichthöhe, Wände, Füllung, Stützstrukturen, Rand (Brim), Naht und Glätten.",
          "Die Maschinengrenzwerte, der Start- und End-G-Code und die Filamentprofile von Creality.",
          "Die CFS-Profile von Creality nutzen sehr breite Reinigungstürme; passt einer nicht neben das Modell, verkleinert FilaShift ihn und weist Sie darauf hin.",
        ],
      },
      {
        h: "Ältere Druckerprofile",
        p: [
          "Einige ältere OrcaSlicer-Profile (zum Beispiel Anycubic Kobra Max, Flashforge Adventurer 3 und UltiMaker S5) nutzen absolute Extrusion oder lassen den Extruder-Reset weg, den OrcaSlicer verlangt. FilaShift ergänzt relative Extrusion und einen G92-E0-Reset pro Schicht, wenn das Projekt es braucht, und vermerkt das im Bericht.",
        ],
      },
    ],
    faq: [
      {
        q: "Funktioniert es mit Creality Print?",
        a: "Die konvertierte Datei ist ein OrcaSlicer-Projekt. Creality Print basiert auf OrcaSlicer und öffnet es normalerweise; falls nicht, nutzen Sie OrcaSlicer.",
      },
      { q: "Kann ich ein Creality-Projekt zu Bambu übertragen?", a: "Ja. Ziehen Sie das Creality-Print- oder OrcaSlicer-Projekt hinein und wählen Sie einen Bambu-Lab-Drucker." },
    ],
  },
  "bambu-to-snapmaker-u1": {
    title: "Bambu-Studio- und MakerWorld-Projekte für den Snapmaker U1 konvertieren",
    meta: "MakerWorld-3MF auf dem Snapmaker U1 mit Werkzeugwechsler drucken | FilaShift",
    desc: "Übertragen Sie 3MF-Projekte aus Bambu Studio und MakerWorld auf den Snapmaker U1 mit vier Werkzeugköpfen – jede Farbe einem Werkzeugkopf zugeordnet, die Einstellungen des Designers erhalten.",
    intro:
      "Der Snapmaker U1 druckt bis zu vier Farben mit vier Werkzeugköpfen statt mit einem AMS. FilaShift ordnet jede Projektfarbe einem Werkzeugkopf zu und setzt die eigenen Profile des U1 ein.",
    steps: [
      "Laden Sie die Projekt-3MF von MakerWorld herunter oder speichern Sie sie aus Bambu Studio.",
      "Ziehen Sie sie in FilaShift; der Snapmaker U1 ist standardmäßig ausgewählt.",
      "Prüfen Sie, welche Farbe auf welchen Werkzeugkopf geht.",
      "Konvertieren, herunterladen und den Bericht lesen.",
      open("Snapmaker Orca oder OrcaSlicer"),
    ],
    cta: "Für den Snapmaker U1 konvertieren",
    sections: [
      {
        h: "Warum ein Werkzeugwechsler weniger Reinigung braucht",
        p: [
          "Ein Drucker mit AMS spült bei jedem Farbwechsel Filament heraus; ein Werkzeugwechsler parkt einen Werkzeugkopf und nimmt einen anderen. FilaShift nutzt die eigene Reinigungsturmgröße des U1, daher ist der Turm viel kleiner als bei einem Bambu-Drucker.",
        ],
      },
      {
        h: "Mehr als vier Farben",
        p: [
          "Hat ein Projekt mehr Farben als Werkzeugköpfe, legt FilaShift die ähnlichsten Farben zusammen oder fügt Pausen ein, damit Sie das Filament auf der richtigen Höhe wechseln.",
        ],
      },
    ],
    faq: [{ q: "Kann ich U1-Projekte für Bambu konvertieren?", a: "Ja, die Konvertierung funktioniert in beide Richtungen." }],
  },
  "prusaslicer-to-bambu": {
    title: "PrusaSlicer- und Printables-3MF-Projekte in Bambu Studio oder OrcaSlicer öffnen",
    meta: "PrusaSlicer-/Printables-3MF für Bambu Studio und OrcaSlicer konvertieren | FilaShift",
    desc: "Konvertieren Sie 3MF-Projekte aus PrusaSlicer und Printables für Drucker von Bambu Lab, Flashforge, Creality und anderen – Teile, bemalte Farben, Farbwechsel und die wichtigsten Druckeinstellungen bleiben erhalten.",
    intro:
      "PrusaSlicer speichert Projekte anders als Bambu Studio und OrcaSlicer, daher gehen beim Öffnen im jeweils anderen Programm oft Teile, Farben und Einstellungen verloren. FilaShift übersetzt zuerst das PrusaSlicer-Projekt und konvertiert es dann für Ihren Drucker.",
    steps: [
      "Laden Sie die 3MF von Printables herunter oder speichern Sie Ihr Projekt in PrusaSlicer 2.4 oder neuer.",
      "Ziehen Sie sie in FilaShift und wählen Sie Ihren Drucker: Bambu Lab, Flashforge, Creality, Snapmaker oder eine andere Marke.",
      "Prüfen Sie die Farbliste: Jeder PrusaSlicer-Extruder wird zu einem Filament.",
      "Konvertieren und den Bericht lesen: Er listet die übersetzten und die nicht übersetzten Einstellungen auf.",
      open("Bambu Studio oder OrcaSlicer"),
    ],
    cta: "Für Bambu Lab konvertieren",
    sections: [
      {
        h: "Was übersetzt wird",
        list: [
          "Objekte und ihre Teile (PrusaSlicer-Volumen), mit Namen und Extrudern.",
          "Bemalte Farben, gemalte Stützstrukturen und gemalte Nähte.",
          "Farbwechsel pro Schicht, die auf dem neuen Drucker zu Pausen werden.",
          "Schichthöhe, Perimeter, Füllung, obere und untere Schichten, Stützstrukturen, Rand (Brim), Naht, Glätten, Reinigungsturm und Temperaturen.",
        ],
      },
      {
        h: "Was nicht übersetzt wird",
        list: [
          "Geschwindigkeiten und Linienbreiten, weil PrusaSlicer sie anders speichert; es gelten die abgestimmten Werte des neuen Druckers.",
          "Variable Schichthöhe, für die es keine direkte Entsprechung gibt; der Bericht warnt, wenn ein Projekt sie verwendet hat.",
        ],
      },
    ],
    faq: [
      {
        q: "Kann ich Bambu-Projekte für Prusa-Drucker konvertieren?",
        a: "Ja. Wählen Sie einen Prusa-Drucker wie den MK4S oder den Core One: Das Ergebnis ist ein OrcaSlicer-Projekt mit den Prusa-Profilen.",
      },
    ],
  },
  "flashforge-creality-to-bambu": {
    title: "Flashforge-, Creality- und Snapmaker-Projekte zurück zu Bambu Lab bringen",
    meta: "3MF-Projekte von Flashforge, Creality oder Orca für Bambu Studio konvertieren | FilaShift",
    desc: "Konvertieren Sie 3MF-Projekte aus OrcaSlicer, Orca-Flashforge, Creality Print, ElegooSlicer, Anycubic Slicer Next und Snapmaker Orca für Bambu Studio.",
    intro:
      "Die Konvertierung funktioniert in beide Richtungen. Projekte der OrcaSlicer-Familie lassen sich mit den eigenen Profilen und AMS-Slots von Bambu auf Bambu-Lab-Drucker übertragen.",
    steps: [
      "Speichern Sie das Projekt als 3MF in OrcaSlicer, Orca-Flashforge, Creality Print, ElegooSlicer, Anycubic Slicer Next oder Snapmaker Orca.",
      "Ziehen Sie es in FilaShift und wählen Sie Ihren Bambu-Lab-Drucker.",
      "Ordnen Sie jede Farbe einem AMS-Slot zu.",
      "Konvertieren, herunterladen und den Bericht lesen.",
      open("Bambu Studio"),
    ],
    cta: "Für den Bambu Lab P1S konvertieren",
    sections: [
      {
        h: "Was Bambu Studio braucht",
        list: [
          "Linienbreiten in Millimetern statt in Prozent: FilaShift rechnet sie um.",
          "Werte innerhalb der von Bambu Studio akzeptierten Bereiche: Werte außerhalb werden auf den Grenzwert gesetzt und im Bericht aufgeführt.",
          "Die Drucker- und Filamentprofile von Bambu mit ihrem Namen, damit AMS und Druckplatte erkannt werden.",
        ],
      },
    ],
    faq: [
      {
        q: "Zeigt Bambu Studio das Projekt als geändert an?",
        a: "Ja, Einstellungen, die von den Bambu-Profilen abweichen, erscheinen als Änderungen – das ist so gewollt.",
      },
    ],
  },
  "multicolor-3mf": {
    title: "Farben, Druckplatten und Bemalung beim Konvertieren mehrfarbiger 3MF-Dateien behalten",
    meta: "Mehrfarbige 3MF-Dateien ohne Farbverlust konvertieren | FilaShift",
    desc: "Wie FilaShift bemalte Farben, Druckplatten und Farbwechsel beim Übertragen mehrfarbiger 3MF-Projekte zwischen Druckern erhält – auch auf Drucker mit weniger Slots.",
    intro:
      "Die meisten Konvertierungsprobleme sind Farbprobleme: Bemalte Details verschwinden, Farben landen im falschen Slot, oder ein vierfarbiges Modell kommt auf einem einfarbigen Drucker an. So wird jeder Fall gelöst.",
    steps: [
      "Laden Sie die Projekt-3MF herunter, nicht die STL: Nur die 3MF enthält die Farben.",
      "Ziehen Sie sie in FilaShift und wählen Sie Ihren Drucker.",
      "Prüfen Sie die Liste Farbe → Slot; haben Sie weniger Slots, werden ähnliche Farben zusammengelegt.",
      "Hat Ihr Drucker weniger Slots als das Projekt Farben, aktivieren Sie die Filamentwechsel-Pausen, wenn sie angeboten werden.",
      "Konvertieren Sie und " + OPEN.charAt(0).toLowerCase() + OPEN.slice(1),
    ],
    cta: "Konverter öffnen",
    sections: [
      {
        h: "Bemalte Farben",
        p: ["Bemalte Dreiecke speichern eine Filamentnummer. FilaShift schreibt diese Nummern auf Ihre Slots um, damit die Bemalung ihre Farben behält."],
      },
      {
        h: "Weniger Slots als Farben",
        list: [
          "Ähnliche Farben können sich einen Slot teilen: Der Bericht sagt, welche.",
          "Farben auf unterschiedlichen Höhen lassen sich mit Pausen drucken: Der Drucker hält an, Sie wechseln das Filament, und er macht weiter.",
          "Wenn sich Farben auf denselben Schichten mischen, helfen Pausen nicht; FilaShift erklärt, warum, und behält die Zuordnung zur ähnlichsten Farbe bei.",
        ],
      },
      {
        h: "Druckplatten",
        p: ["Alle Druckplatten bleiben erhalten und werden auf Ihrem Druckbett neu zentriert. Ist eine Druckplatte größer als Ihr Druckbett, sagt der Bericht, wie stark skaliert werden muss."],
      },
    ],
    faq: [
      {
        q: "Warum sehe ich beim Öffnen nur eine Farbe?",
        a: "Die Datei wurde importiert statt als Projekt geöffnet. Nutzen Sie Datei → Projekt öffnen.",
      },
    ],
  },
};
