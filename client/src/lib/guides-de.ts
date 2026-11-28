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
          "Lehnt OrcaSlicer eine Mischung wie PLA und PETG an einer Düse ab, prüfen Sie, ob die Profile zu den Spulen passen. Sind beide Materialien erforderlich, lassen Sie die Temperaturprüfung aktiv und verwenden Sie eine kompatible Konfiguration.",
          "Beispiel: Ist Filament 3 als PETG eingestellt, obwohl Entwurf und Spule PLA vorsehen, öffnen Sie eine Projektkopie. Wählen Sie in OrcaSlicer unter Vorbereiten → Filament das passende PLA-Profil im Menü der dritten Zeile, nicht im Farbfeld. Slicen Sie die Platte und prüfen Sie die Zuordnung in der Vorschau.",
          "Ist PETG beabsichtigt, prüfen Sie die Hinweise des Designers und das Material der Kontaktschicht unter Prozess → Stützmaterial. Deklarieren Sie PETG nicht als PLA. Slicen Sie unabhängige Teile auf getrennten Platten. Benötigt ein Teil beide Materialien, verwenden Sie eine dafür geprüfte Konfiguration.",
        ],
      },
    ],
    faq: [
      { q: "Funktioniert es auch umgekehrt, von Flashforge zu Bambu?", a: "Ja. Ziehen Sie ein Flashforge- oder Orca-Flashforge-Projekt hinein und wählen Sie einen Bambu-Lab-Drucker." },
      { q: "Brauche ich Orca-Flashforge?", a: "Nein. Die konvertierte Datei lässt sich in OrcaSlicer und in Orca-Flashforge öffnen." },
      { q: "Kann ich die konvertierte Datei in FlashPrint öffnen?", a: "Verwenden Sie stattdessen Flash Studio (Orca-Flashforge) oder OrcaSlicer. In unserem virtuellen Test hat FlashPrint 5.8.7 FilaShift-3MF-Projekte nicht geöffnet, und es enthält keine Profile für AD5X oder Creator 5 Pro." },
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
        a: "Prüfen Sie zuerst, wie Sie die ursprüngliche 3MF geöffnet haben. Nutzen Sie Datei → Projekt öffnen, statt nur die Geometrie zu importieren. Sehen Sie weiterhin nur eine Farbe, prüfen Sie, ob das ursprüngliche Projekt mehrere Farben enthält und ob diese demselben Filamentplatz zugeordnet wurden.",
      },
    ],
  },
  "creality-print-to-bambu": {
    title: "Ein Creality-Print-Projekt für Bambu Lab konvertieren",
    meta: "3MF aus Creality Print, ElegooSlicer und Anycubic Slicer Next für Bambu Studio konvertieren | FilaShift",
    desc: "Übertragen Sie ein 3MF-Projekt aus Creality Print (und Projekte aus ElegooSlicer oder Anycubic Slicer Next) auf einen Bambu-Lab-Drucker: Farben den AMS-Slots zugeordnet, Bambu-Profile eingesetzt und Einstellungen, die nur der Quell-Slicer kennt, entfernt. Mit den Grenzen bei gemischten Filamenten und speziellen Druckplatten aus Creality Print.",
    intro:
      "Creality Print, ElegooSlicer und Anycubic Slicer Next basieren alle auf demselben Code wie OrcaSlicer und Bambu Studio, daher lassen sich ihre 3MF-Projekte auf einen Bambu-Lab-Drucker übertragen. FilaShift erkennt, welcher dieser Slicer die Datei gespeichert hat, behält Modell, Bemalung und die Einstellungen des Designers bei und setzt die eigenen Drucker-, Prozess- und Filamentprofile von Bambu Lab ein.",
    steps: [
      "Speichern Sie das Projekt in Creality Print, ElegooSlicer oder Anycubic Slicer Next mit Datei → Projekt speichern unter (ein .3mf-Projekt, keine exportierte STL und kein G-Code).",
      "Ziehen Sie die 3MF in FilaShift und wählen Sie Ihren Bambu-Lab-Drucker. Die Dateikarte zeigt, welcher Slicer das Projekt gespeichert hat.",
      "Ordnen Sie jede Farbe einem AMS-Slot zu. Haben Sie weniger Slots als das Projekt Farben, teilen sich ähnliche Farben einen Slot.",
      "Konvertieren, herunterladen und den Bericht lesen, vor allem die Zeilen zu Druckplatten und gemischten Filamenten.",
      open("Bambu Studio"),
    ],
    cta: "Für den Bambu Lab X1 Carbon konvertieren",
    sections: [
      {
        h: "Was erhalten bleibt",
        list: [
          "Alle Druckplatten, Objekte und Teile, mit bemalten Farben, gemalten Stützstrukturen und Nähten.",
          "Schichthöhe, Wände, Füllung, Stützstrukturen, Rand (Brim), Naht und Glätten des Designers, übertragen auf die Namen und Einheiten von Bambu Studio (Linienbreiten in Prozent werden zum Beispiel zu Millimetern).",
          "Filamenttypen und -farben, den eigenen Filamentprofilen von Bambu Lab zugeordnet, damit das AMS sie erkennt.",
        ],
      },
      {
        h: "Was entfernt oder geändert wird",
        list: [
          "Einstellungen, die nur der Quell-Slicer versteht, werden nicht übernommen: die CFS-Spül- und Mehrfarbmethoden-Schlüssel von Creality, support_mms von Elegoo sowie die ACE-Slot-Einstellungen und Varianten mit gehärtetem Stahl von Anycubic. Die normalen Einstellungen enthalten bereits die von Ihnen gewählten Werte.",
          "Die Datei gibt sich nicht mehr als Datei aus Creality Print, ElegooSlicer oder Anycubic Slicer Next aus: Sie erhält einen sauberen Bambu-Studio-Header, und die creality.config von Creality wird entfernt.",
          "Der Reinigungsturm nutzt die Standardbreite des Bambu-Druckers (einige CFS-Profile verwenden viel breitere Türme), und Werte außerhalb der von Bambu Studio erlaubten Bereiche werden auf den Grenzwert gesetzt und im Bericht aufgeführt.",
          "Konvertierte Dateien öffnen sich in Bambu Studio 2.9.1 oder neuer.",
        ],
      },
      {
        h: "Grenzen, die Sie prüfen sollten",
        list: [
          "Gemischte Filamente (Farbmischungen) aus Creality Print 7 gibt es nur in Creality Print. Kein anderer Slicer kann sie drucken, daher werden Teile oder Bemalungen mit einer Mischung mit Slot 1 gedruckt. Der Bericht weist Sie darauf hin; weisen Sie diese Teile in Bambu Studio neu zu.",
          "Druckplatten, die es nur bei Creality gibt, etwa Epoxy Resin oder Customized, haben keine Entsprechung bei Bambu. Es wird die Druckplatte des Bambu-Druckers verwendet, und der Bericht vermerkt das; prüfen Sie vor dem Druck die Druckbetttemperatur.",
        ],
      },
    ],
    faq: [
      {
        q: "Funktioniert das auch für ElegooSlicer und Anycubic Slicer Next?",
        a: "Ja. FilaShift erkennt Projekte aus ElegooSlicer und Anycubic Slicer Next, auch wenn Anycubic Slicer Next die Datei als Bambu-Studio-Datei kennzeichnet, und konvertiert sie auf dieselbe Weise.",
      },
      {
        q: "Wie wurde das getestet?",
        a: "Testprojekte aus ElegooSlicer und Anycubic Slicer Next wurden mit deren eigenen Kommandozeilenwerkzeugen exportiert. Die Creality-Print-Testprojekte werden aus den eigenen Profilen und dem Dateiaufbau von Creality Print erzeugt, weil dessen Kommandozeilenwerkzeug keine Projekte speichern kann. Die konvertierten Dateien wurden in den Kommandozeilenwerkzeugen der Ziel-Slicer fehlerfrei gesliced.",
      },
      {
        q: "Kann ich von Bambu Lab zurück zu einem Creality-Drucker wechseln?",
        a: "Ja. Die Konvertierung funktioniert in beide Richtungen: Ziehen Sie ein Bambu-Studio-Projekt hinein und wählen Sie Ihren Creality-Drucker.",
      },
    ],
  },
  "bambu-to-prusaslicer-mmu3-xl": {
    title: "Von Bambu Studio zu PrusaSlicer für MMU3 und XL (native PrusaSlicer-Projekte)",
    meta: "3MF aus Bambu Studio und MakerWorld für PrusaSlicer mit MMU3 und Prusa XL konvertieren | FilaShift",
    desc: "Machen Sie aus einer 3MF aus Bambu Studio oder MakerWorld ein natives PrusaSlicer-2.9-Projekt für den Prusa MK4S MMU3, CORE One MMU3 oder XL: PrusaSlicer-Systemprofile, bemalte Farben, Farbwechsel und Druckplatten als PrusaSlicer-Druckbetten. Mit einer Erklärung, was die PrusaSlicer-Profile ändern.",
    intro:
      "Für Prusa-Drucker kann FilaShift ein echtes PrusaSlicer-Projekt statt einer OrcaSlicer-Datei schreiben. Es nutzt die eigenen Systemprofile von PrusaSlicer für Ihren Drucker, sodass PrusaSlicer sie als Systemprofile anzeigt, und überträgt Teile, Bemalung und Farbwechsel im eigenen Format von PrusaSlicer.",
    steps: [
      "Laden Sie die 3MF von MakerWorld herunter oder speichern Sie Ihr Projekt in Bambu Studio.",
      "Ziehen Sie sie in FilaShift und wählen Sie Ihren Prusa-Drucker, zum Beispiel MK4S MMU3, CORE One MMU3, XL 2T oder XL 5T.",
      "Lassen Sie in den Einstellungen Ausgabe für: PrusaSlicer stehen (die Voreinstellung für Prusa-Drucker). Drucker, die es nur in PrusaSlicer gibt, etwa der MK4S MMU3 und der XL 2T, erhalten immer ein PrusaSlicer-Projekt.",
      "Ordnen Sie jede Farbe einem MMU3-Slot oder einem XL-Werkzeug zu, konvertieren Sie dann und lesen Sie den Bericht.",
      open("PrusaSlicer 2.9 oder neuer"),
    ],
    cta: "Für den Prusa MK4S MMU3 konvertieren",
    sections: [
      {
        h: "Was das PrusaSlicer-Projekt enthält",
        list: [
          "Die System-Drucker-, Druck- und Filamentprofile von PrusaSlicer für Ihren Drucker; als Druckprofil wird das gewählt, das der Schichthöhe des Projekts am nächsten kommt.",
          "Objekte mit ihren Teilen, Namen, Extrudern, Modifikatoren und objektbezogenen Einstellungen.",
          "Bemalte Farben, gemalte Stützstrukturen und gemalte Nähte im eigenen Format von PrusaSlicer.",
          "Farbwechsel und Pausen als PrusaSlicer-Schichtwechsel (M600) und jede Druckplatte als eigenes PrusaSlicer-Druckbett.",
        ],
      },
      {
        h: "PrusaSlicer-Profile bestimmen Temperaturen und Geschwindigkeiten",
        p: [
          "PrusaSlicer speichert seine Einstellungen anders als Bambu Studio, daher stammen Temperaturen und Geschwindigkeiten aus den PrusaSlicer-Profilen für Ihren Drucker und Ihr Filament, nicht aus dem ursprünglichen Projekt. Die Entscheidungen des Designers, die sich übertragen lassen, etwa Wände, Füllung und Stützstrukturen, werden auf die Profile angewendet und im Bericht aufgeführt.",
          "Objektbezogene Einstellungen ohne Entsprechung in PrusaSlicer bleiben bei den Profilwerten (der Bericht listet sie auf). Variable Schichthöhe und Modifikatoren für Höhenbereiche werden nicht übertragen.",
        ],
      },
      {
        h: "Unterschiede zwischen MMU3 und XL",
        list: [
          "Drucker mit MMU3 haben eine Düse und brauchen einen Reinigungsturm. FilaShift prüft den Platz für den breiteren Turm von PrusaSlicer und verschiebt ihn an eine freie Stelle; gibt es keine, fordert der Bericht Sie auf, das Modell zu skalieren oder neu anzuordnen.",
          "Beim MMU3 wird ein Farbwechsel für ein Filament, das auf dieser Höhe nicht druckt, zu einer Pause (M601). So handhabt PrusaSlicer das.",
          "Der XL wechselt den Werkzeugkopf, statt Filament zu laden, daher geht jede Farbe auf ein Werkzeug. Gibt es mehr Farben als Werkzeuge, teilen sich die ähnlichsten Farben ein Werkzeug.",
          "Ist ein Modell größer als das Druckbett, warnt der Konverter und schlägt eine Skalierung vor. Skalieren oder teilen Sie es vor dem Slicen in PrusaSlicer.",
        ],
      },
    ],
    faq: [
      {
        q: "Kann ich für meinen Prusa trotzdem eine OrcaSlicer-Datei bekommen?",
        a: "Ja, für Prusa-Drucker, die OrcaSlicer unterstützt: Wählen Sie in den Einstellungen Ausgabe für: OrcaSlicer. Drucker, die es nur in PrusaSlicer gibt, etwa der MK4S MMU3, der MK3S MMU3 und der XL 2T, erhalten immer ein PrusaSlicer-Projekt.",
      },
      {
        q: "Warum weichen die Temperaturen vom Bambu-Projekt ab?",
        a: "Die Ausgabe für PrusaSlicer nutzt die eigenen Filamentprofile von PrusaSlicer, die die Temperaturen für Ihren Drucker und Ihr Material festlegen. Prüfen Sie sie in PrusaSlicer, wenn Sie die Werte des Designers brauchen.",
      },
      {
        q: "Wie wurde das getestet?",
        a: "Auf dem CORE One MMU3 ragte eine MakerWorld-Anordnung mit acht Objekten über das Druckbett hinaus. PrusaSlicer meldete einen Konflikt mit dem Reinigungsturm und brach ab. Mit vier Objekten pro Platte in Originalgröße erzeugte PrusaSlicer für beide Platten G-Code, sowohl mit der 0,4-mm- als auch mit der 0,6-mm-Düse. Die ursprüngliche Anordnung gilt nicht als bestanden.",
      },
    ],
  },
  "bambu-h3c-p3c-multicolour": {
    title: "Mehrfarbdruck auf den Werkzeugwechslern Bambu Lab H3C und P3C (PrintTools, TPU-Werkzeug)",
    meta: "Mehrfarbige 3MF für die PrintTools des Bambu Lab H3C und P3C konvertieren | FilaShift",
    desc: "Wie FilaShift jede Farbe eines 3MF-Projekts einem PrintTool der Werkzeugwechsler Bambu Lab H3C und P3C zuordnet, starres Filament vom 2,85-mm-TPU-Werkzeug des H3C fernhält und das AMS gemeinsam nutzt, wenn Sie mehr Farben als Werkzeuge haben.",
    intro:
      "Der Bambu Lab H3C und der P3C wechseln ganze PrintTools, statt jede Farbe durch eine einzige Düse zu führen. Wenn Sie ein Projekt für sie konvertieren, schreibt FilaShift für jedes Filament ein Werkzeug in die Datei, sodass Bambu Studio diese Zuordnung beibehält, statt zu raten.",
    steps: [
      "Laden Sie die Projekt-3MF von MakerWorld herunter oder speichern Sie sie in Bambu Studio, OrcaSlicer oder einem anderen unterstützten Slicer.",
      "Ziehen Sie sie in FilaShift und wählen Sie den Bambu Lab H3C oder P3C.",
      "Ordnen Sie jede Farbe einem Slot zu und konvertieren Sie.",
      "Lesen Sie den Bericht: Er zeigt, welches Filament auf welches PrintTool geht und welches Werkzeug Sie gegebenenfalls einsetzen müssen.",
      open("Bambu Studio 2.9.1 oder neuer"),
    ],
    cta: "Für den Bambu Lab H3C konvertieren",
    sections: [
      {
        h: "Wie Filamente den PrintTools zugeordnet werden",
        list: [
          "Jede Farbe, die das Modell nutzt, erhält ein eigenes PrintTool, und die Datei wird auf Nozzle Manual gesetzt, damit Bambu Studio die Zuordnung beibehält. Der Bericht listet sie auf, zum Beispiel Filament 1 → PrintTool 1.",
          "Der H3C hat ab Werk 9 PrintTools: acht für 1,75-mm-Filament und eines, PrintTool 8, für 2,85-mm-TPU. Der P3C hat ab Werk 5 PrintTools in 7 Docks.",
          "Stammt ein Projekt vom selben Druckermodell, behält jedes Filament nach Möglichkeit das Werkzeug, das es dort genutzt hat.",
          "Sind alle eingesetzten Werkzeuge belegt, fordert FilaShift Sie mit einer Warnung auf, ein weiteres Werkzeug in ein freies Dock einzusetzen (P3C); danach teilen sich weitere Farben PrintTool 1 über das AMS. Der Bericht nennt die betroffenen Farben.",
        ],
      },
      {
        h: "Das 2,85-mm-TPU-Werkzeug des H3C",
        list: [
          "Nur flexibles 2,85-mm-Filament geht auf das TPU-Werkzeug, mit dem 2,85-mm-TPU-Filamentprofil des Druckers. Starres Filament wird ihm nie zugeordnet.",
          "Flexibles 1,75-mm-Filament (zum Beispiel TPU aus einem AMS-Projekt) kann das 2,85-mm-Werkzeug nicht nutzen und druckt daher mit einem Standard-PrintTool. Der Bericht vermerkt das.",
          "Beim P3C braucht ein 2,85-mm-TPU-Filament ein zusätzliches TPU-Werkzeug in einem freien Dock. FilaShift fordert es mit einer Warnung an: Setzen Sie dieses Werkzeug vor dem Druck ein oder ändern Sie das Filament.",
        ],
      },
      {
        h: "Grenzen, die Sie prüfen sollten",
        list: [
          "Projekte mit unterschiedlichen Düsengrößen pro Werkzeug erhalten auf dem H3C und P3C eine einheitliche Düsengröße, mit einer Warnung, weil sich konvertierte Dateien mit gemischten Größen in Tests nicht zuverlässig slicen ließen. Stellen Sie die Düse jedes Werkzeugs in Bambu Studio ein, wenn Sie unterschiedliche Größen brauchen.",
          "Werden mehr Werkzeuge benötigt, als der Drucker ab Werk hat, nennt der Bericht die einzusetzenden Werkzeuge. Sie können Farben auch vor dem Konvertieren zusammenlegen.",
          "Der H2C funktioniert anders: Sein Hotend-Rack wird von Bambu Studio automatisch zugewiesen, um die Spülmenge zu verringern.",
          "Bei der Konvertierung vom H3C oder P3C auf einen Drucker mit einer Düse bleiben die Farben als AMS-Slots erhalten.",
        ],
      },
    ],
    faq: [
      {
        q: "Ändert Bambu Studio meine Werkzeugzuordnung?",
        a: "Nicht beim H3C und P3C: Die Datei nutzt den Modus Nozzle Manual, daher behält Bambu Studio das PrintTool jedes Filaments bei. Fehlt ein Werkzeug aus der Datei oder passt es nicht zum Filament, wählt Bambu Studio stattdessen ein anderes.",
      },
      {
        q: "Wurde das getestet?",
        a: "Ja, in Software. Die Standard-Beispielprojekte, konvertiert für den H3C und P3C, werden im Kommandozeilenwerkzeug von Bambu Studio fehlerfrei gesliced (siehe die Seite mit den Testergebnissen). Auch Testprojekte mit einem 2,85-mm-TPU-Filament, 10 Farben und gemischten Düsengrößen werden konvertiert und gesliced, und die Werkzeugzuordnung wird aus dem G-Code zurückgelesen.",
      },
    ],
  },
};
