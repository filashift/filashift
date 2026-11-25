import type { Guide } from "./guides";

export const buyingSlug = "filament-buying-guide-five-printers";
const models = [
  {
    name:"Flashforge Creator 5 Pro", id:"flashforge-creator-5-pro", buy:"PLA",
    en:["For a multicolor sign or figurine, start with one spool of plain PLA in the dominant color. Add only the accent colors the project actually uses; four toolheads do not mean you need four new spools.",
      "Load each toolhead manually and assign its material in Flash Studio. The standard Pro does not include an automatic multi-spool feeder. If you later buy flexible TPU-90A, Flashforge specifies the top external mount."],
    es:["Para un letrero o una figura multicolor, empieza con una bobina de PLA estándar del color predominante. Añade solo los colores de acento que use el proyecto; tener cuatro cabezales no te obliga a comprar cuatro bobinas.",
      "Carga manualmente cada cabezal y asigna su material en Flash Studio. La Pro estándar no incluye un alimentador automático de varias bobinas. Si compras TPU-90A flexible, Flashforge indica que debe usarse el soporte externo superior."],
    url:"https://www.flashforge.com/products/flashforge-creator-5-pro"
  },{
    name:"Bambu Lab A1", id:"bambu-lab-a1", buy:"PLA",
    en:["For a first articulated toy or desk organizer, buy plain PLA rather than PLA-CF or glow filament. You can test the design in one color before buying an AMS lite palette.",
      "The stock 0.4 mm nozzle is stainless steel. Bambu advises a hardened nozzle for abrasive fillers, including carbon fiber and glow particles. Don’t buy ABS or ASA for a large, high-infill part expecting the open A1 to behave like an enclosed printer."],
    es:["Para un juguete articulado o un organizador de escritorio, compra PLA estándar, no PLA-CF ni filamento fosforescente. Prueba el diseño en un color antes de comprar una paleta para AMS lite.",
      "La boquilla de serie de 0,4 mm es de acero inoxidable. Bambu recomienda una boquilla endurecida para cargas abrasivas como la fibra de carbono y las partículas fosforescentes. No compres ABS o ASA para una pieza grande y de relleno alto esperando que la A1 abierta se comporte como una impresora cerrada."],
    url:"https://wiki.bambulab.com/en/a1/manual/faq"
  },{
    name:"Bambu Lab X1 Carbon", id:"bambu-lab-x1-carbon", buy:"PETG",
    en:["For a workshop bracket or clip, start with plain PETG. The word “Carbon” in the printer name is not a reason to pay extra for a fiber-filled spool."],
    es:["Para un soporte o una pinza de taller, empieza con PETG estándar. Que la impresora se llame «Carbon» no es motivo para pagar más por una bobina con fibra."],
    warning:{
      en:{title:"Original AMS compatibility warning",items:["Check the reel before buying PETG: the original AMS takes spools 50–68 mm wide. In the finder, read the size label for the exact offer. Bambu recommends avoiding cardboard spools because they can slip.","Keep soft TPU and damp PVA out of the AMS: both can jam. For printer-compatible soft TPU, use the X1 Carbon’s external spool holder instead."]},
      es:{title:"Advertencia de compatibilidad del AMS original",items:["Antes de comprar PETG, comprueba el carrete: el AMS original admite bobinas de 50 a 68 mm de ancho. En el buscador, consulta la etiqueta de tamaño de la oferta concreta. Bambu recomienda evitar las bobinas de cartón porque pueden resbalar.","No cargues TPU blando ni PVA húmedo en el AMS: ambos pueden atascarse. Para imprimir con un TPU blando compatible con la X1 Carbon, usa el soporte externo de bobina."]}
    },
    url:"https://cdn1.bambulab.com/documentation/Quick%20Start%20Guide%20for%20X1-Carbon%20Combo.pdf"
  },{
    name:"Original Prusa MK4S", id:"prusa-mk4s", buy:"PETG",
    en:["For a replacement knob, jig, or utility hook, try one spool of plain PETG before buying a bulk pack. Prusa lists PETG for the stock MK4S without an enclosure.",
      "The base machine is single-extruder. Buying a five-color pack will not add automatic color changes; that requires the optional MMU3. For ASA or ABS, budget for the enclosure and filtration Prusa specifies, not just the filament."],
    es:["Para un pomo de repuesto, una plantilla o un gancho, prueba una bobina de PETG estándar antes de comprar por volumen. Prusa incluye el PETG entre los materiales de la MK4S de serie sin cerramiento.",
      "La máquina base tiene un solo extrusor. Un paquete de cinco colores no añade cambios automáticos; para eso hace falta la MMU3 opcional. Para ASA o ABS, incluye en el presupuesto el cerramiento y la filtración que indica Prusa, no solo el filamento."],
    url:"https://www.prusa3d.com/en/product/original-prusa-mk4s/"
  },{
    name:"Snapmaker U1", id:"snapmaker-u1", buy:"PLA",
    en:["For a multicolor nameplate, start with plain PLA and check the physical reel before choosing a deal. Snapmaker specifies a 52–60 mm center hole, a maximum width of 70 mm, and spools up to 1 kg for its holder.",
      "A 1 kg listing alone does not prove the reel fits. Ask for its dimensions if they are missing. For a later move to fiber-reinforced filament, Snapmaker lists both the optional Top Cover and hardened steel nozzle, not the base configuration."],
    es:["Para una placa multicolor, empieza con PLA estándar y comprueba el carrete antes de elegir una oferta. Snapmaker especifica un orificio central de 52 a 60 mm, una anchura máxima de 70 mm y bobinas de hasta 1 kg para su soporte.",
      "Que una oferta diga 1 kg no garantiza el ajuste. Si faltan las dimensiones, pídelas. Para pasar a filamentos reforzados con fibra, Snapmaker indica que hacen falta tanto la cubierta superior opcional como la boquilla de acero endurecido."],
    url:"https://us.snapmaker.com/products/snapmaker-u1-3d-printer"
  }
];
type BLang = "en" | "es" | "de" | "fr";

// German and French model paragraphs, keyed by model id (English/Spanish live inline above).
const MODEL_TEXT: Record<"de" | "fr", Record<string, { p: string[]; warning?: { title: string; items: string[] } }>> = {
  de: {
    "flashforge-creator-5-pro": { p: [
      "Für ein mehrfarbiges Schild oder eine Figur beginnen Sie mit einer Spule einfachem PLA in der Hauptfarbe. Kaufen Sie nur die Akzentfarben dazu, die das Projekt wirklich nutzt; vier Werkzeugköpfe bedeuten nicht, dass Sie vier neue Spulen brauchen.",
      "Laden Sie jeden Werkzeugkopf manuell und weisen Sie sein Material in Flash Studio zu. Der Standard-Pro hat keinen automatischen Mehrspulen-Zuführer. Wenn Sie später flexibles TPU-90A kaufen, schreibt Flashforge die obere externe Halterung vor.",
    ] },
    "bambu-lab-a1": { p: [
      "Für ein erstes bewegliches Spielzeug oder einen Schreibtisch-Organizer kaufen Sie einfaches PLA statt PLA-CF oder Leuchtfilament. Sie können das Design in einer Farbe testen, bevor Sie eine Farbpalette für das AMS lite kaufen.",
      "Die serienmäßige 0,4-mm-Düse ist aus Edelstahl. Bambu empfiehlt für abrasive Füllstoffe wie Kohlefaser und Leuchtpartikel eine gehärtete Düse. Kaufen Sie kein ABS oder ASA für ein großes Teil mit hoher Füllung in der Erwartung, dass sich der offene A1 wie ein geschlossener Drucker verhält.",
    ] },
    "bambu-lab-x1-carbon": {
      p: ["Für eine Werkstatthalterung oder einen Clip beginnen Sie mit einfachem PETG. Das Wort „Carbon“ im Druckernamen ist kein Grund, für eine Spule mit Faserfüllung mehr zu bezahlen."],
      warning: { title: "Kompatibilitätshinweis zum originalen AMS", items: [
        "Prüfen Sie vor dem PETG-Kauf die Spule: Das originale AMS nimmt Spulen mit 50–68 mm Breite. Lesen Sie in der Suche die Größenangabe des jeweiligen Angebots. Bambu rät von Pappspulen ab, weil sie durchrutschen können.",
        "Halten Sie weiches TPU und feuchtes PVA vom AMS fern: Beide können sich verklemmen. Für druckertaugliches weiches TPU nutzen Sie stattdessen den externen Spulenhalter des X1 Carbon.",
      ] },
    },
    "prusa-mk4s": { p: [
      "Für einen Ersatzknopf, eine Vorrichtung oder einen Haken probieren Sie eine Spule einfaches PETG, bevor Sie eine Großpackung kaufen. Prusa führt PETG für den serienmäßigen MK4S ohne Einhausung auf.",
      "Die Grundmaschine hat einen Extruder. Ein Fünf-Farben-Paket bringt keine automatischen Farbwechsel; dafür braucht es die optionale MMU3. Für ASA oder ABS planen Sie die von Prusa vorgeschriebene Einhausung und Filterung ein, nicht nur das Filament.",
    ] },
    "snapmaker-u1": { p: [
      "Für ein mehrfarbiges Namensschild beginnen Sie mit einfachem PLA und prüfen die Spule selbst, bevor Sie ein Angebot wählen. Snapmaker gibt für seinen Halter ein Mittelloch von 52–60 mm, eine maximale Breite von 70 mm und Spulen bis 1 kg an.",
      "Eine Angabe von 1 kg allein beweist nicht, dass die Spule passt. Fragen Sie nach den Maßen, wenn sie fehlen. Für einen späteren Umstieg auf faserverstärktes Filament nennt Snapmaker die optionale Top Cover und eine Düse aus gehärtetem Stahl, nicht die Grundausstattung.",
    ] },
  },
  fr: {
    "flashforge-creator-5-pro": { p: [
      "Pour une enseigne ou une figurine multicolore, commencez par une bobine de PLA standard dans la couleur dominante. N'ajoutez que les couleurs d'accent réellement utilisées par le projet ; quatre têtes d'outil ne signifient pas qu'il vous faut quatre nouvelles bobines.",
      "Chargez chaque tête manuellement et attribuez son matériau dans Flash Studio. La Pro standard n'inclut pas de chargeur automatique multibobine. Si vous achetez plus tard du TPU-90A flexible, Flashforge préconise le support externe supérieur.",
    ] },
    "bambu-lab-a1": { p: [
      "Pour un premier jouet articulé ou un organiseur de bureau, achetez du PLA standard plutôt que du PLA-CF ou du filament phosphorescent. Vous pouvez tester le modèle en une couleur avant d'acheter une palette pour l'AMS lite.",
      "La buse de 0,4 mm d'origine est en acier inoxydable. Bambu conseille une buse trempée pour les charges abrasives, dont la fibre de carbone et les particules phosphorescentes. N'achetez pas d'ABS ou d'ASA pour une grande pièce à fort remplissage en espérant que l'A1 ouverte se comporte comme une imprimante fermée.",
    ] },
    "bambu-lab-x1-carbon": {
      p: ["Pour un support ou une pince d'atelier, commencez par du PETG standard. Le mot « Carbon » dans le nom de l'imprimante n'est pas une raison de payer plus cher une bobine chargée en fibres."],
      warning: { title: "Avertissement de compatibilité de l'AMS d'origine", items: [
        "Vérifiez la bobine avant d'acheter du PETG : l'AMS d'origine accepte des bobines de 50 à 68 mm de large. Dans le comparateur, lisez l'étiquette de taille de l'offre concernée. Bambu recommande d'éviter les bobines en carton, qui peuvent glisser.",
        "Ne mettez ni TPU souple ni PVA humide dans l'AMS : les deux peuvent bourrer. Pour un TPU souple compatible avec l'imprimante, utilisez plutôt le porte-bobine externe de la X1 Carbon.",
      ] },
    },
    "prusa-mk4s": { p: [
      "Pour un bouton de rechange, un gabarit ou un crochet, essayez une bobine de PETG standard avant d'acheter en lot. Prusa indique le PETG pour la MK4S d'origine sans caisson.",
      "La machine de base n'a qu'un extrudeur. Un lot de cinq couleurs n'ajoute pas de changements de couleur automatiques ; il faut pour cela le MMU3 en option. Pour l'ASA ou l'ABS, prévoyez le caisson et la filtration préconisés par Prusa, pas seulement le filament.",
    ] },
    "snapmaker-u1": { p: [
      "Pour une plaque nominative multicolore, commencez par du PLA standard et vérifiez la bobine elle-même avant de choisir une offre. Snapmaker indique pour son support un trou central de 52 à 60 mm, une largeur maximale de 70 mm et des bobines jusqu'à 1 kg.",
      "Une annonce de 1 kg ne prouve pas à elle seule que la bobine convient. Demandez ses dimensions si elles manquent. Pour passer plus tard à un filament renforcé de fibres, Snapmaker mentionne le Top Cover en option et une buse en acier trempé, pas la configuration de base.",
    ] },
  },
};

type BText = Pick<Guide, "title" | "meta" | "desc" | "intro" | "steps" | "cta" | "faq" | "editorialNote">;
const TEXT: Record<BLang, BText> = {
  en: {
    title: "Filament buying guide: what to buy for five 3D printers",
    meta: "Filament buying guide: Creator 5 Pro and four more printers | FilaShift",
    desc: "Pick a first spool for the Creator 5 Pro, A1, X1 Carbon, MK4S, or U1. Check the material, reel fit, and feeder before comparing live prices.",
    intro: "These are five FilaShift editorial picks spanning different ways of feeding filament, not a best-seller ranking. The Creator 5 Pro leads because it is our converter’s default printer. Affiliate commissions do not determine the picks.",
    steps: ["Choose for the part: plain PLA for a first display model or sign; consider PETG for a functional clip or bracket.","Look for 1.75 mm filament on a ready-to-use spool. A refill needs a compatible reusable reel. Filament diameter is not nozzle diameter.","Compare the total for one spool first. For example, 500 g at $12 is $24/kg; 1 kg at $20 costs less per kilogram but $8 more today. Check shipping and tax at checkout."],
    cta: "Compare in-stock single spools",
    faq: [{q:"Does a finder result guarantee that the reel fits my feeder?",a:"No. The links filter by material, filament diameter, and packaging, not reel dimensions. Confirm the reel width, hub opening, and feed path before ordering."},{q:"What if I already have a multicolor project?",a:"Convert it first, then choose “One spool for this print” under each color. The finder carries over the material, diameter, and approximate color; confirm the swatch and variant at the store."}],
    editorialNote: "You can now import 3MF projects saved in ElegooSlicer and Anycubic Slicer Next. The filament recommendations for the five printers are unchanged.",
  },
  es: {
    title: "Qué filamento comprar para cinco impresoras 3D",
    meta: "Qué filamento comprar: Creator 5 Pro y cuatro impresoras más | FilaShift",
    desc: "Elige una primera bobina para Creator 5 Pro, A1, X1 Carbon, MK4S o U1. Compara material, formato, alimentador y precios actuales.",
    intro: "Estas son cinco selecciones editoriales de FilaShift para distintos sistemas de alimentación, no un ranking de ventas. Empezamos por la Creator 5 Pro, la impresora predeterminada del convertidor. Las comisiones no determinan las selecciones.",
    steps: ["Elige según la pieza: PLA estándar para una primera figura o un letrero; considera PETG para una pinza o un soporte funcional.","Compara bobinas completas de 1,75 mm. Una recarga necesita un carrete reutilizable compatible. El diámetro del filamento no es el de la boquilla.","Empieza por el precio total de una bobina. Por ejemplo, 500 g por 12 $ cuestan 24 $/kg; una bobina de 1 kg por 20 $ cuesta menos por kilo, pero gastas 8 $ más hoy. Comprueba envío e impuestos antes de pagar."],
    cta: "Comparar bobinas disponibles",
    faq: [{q:"¿La lista garantiza que una bobina sirve para mi alimentador?",a:"No. Los enlaces filtran por material, diámetro y formato, no por dimensiones del carrete. Confirma el ancho, el orificio y el recorrido de alimentación antes de comprar."},{q:"¿Y si ya tengo un proyecto multicolor?",a:"Convierte el archivo y elige «Una bobina para esta impresión» bajo cada color. El comparador usa el material, el diámetro y un color aproximado; comprueba la foto y la variante en la tienda."}],
    editorialNote: "Ahora puedes importar proyectos 3MF guardados en ElegooSlicer y Anycubic Slicer Next. Las recomendaciones de filamento para las cinco impresoras no han cambiado.",
  },
  de: {
    title: "Filament-Kaufberatung: Was Sie für fünf 3D-Drucker kaufen sollten",
    meta: "Filament-Kaufberatung: Creator 5 Pro und vier weitere Drucker | FilaShift",
    desc: "Wählen Sie eine erste Spule für Creator 5 Pro, A1, X1 Carbon, MK4S oder U1. Prüfen Sie Material, Spulenmaß und Zuführung, bevor Sie aktuelle Preise vergleichen.",
    intro: "Dies sind fünf redaktionelle Empfehlungen von FilaShift für unterschiedliche Arten der Filamentzuführung, keine Bestseller-Rangliste. Der Creator 5 Pro steht vorn, weil er der Standarddrucker unseres Konverters ist. Affiliate-Provisionen bestimmen die Auswahl nicht.",
    steps: ["Wählen Sie nach dem Teil: einfaches PLA für ein erstes Deko-Modell oder Schild; für einen funktionalen Clip oder eine Halterung kommt PETG infrage.","Suchen Sie 1,75-mm-Filament auf einer gebrauchsfertigen Spule. Eine Nachfüllpackung braucht eine passende wiederverwendbare Spule. Der Filamentdurchmesser ist nicht der Düsendurchmesser.","Vergleichen Sie zuerst den Gesamtpreis einer Spule. Beispiel: 500 g für 12 $ sind 24 $/kg; 1 kg für 20 $ ist pro Kilogramm günstiger, kostet heute aber 8 $ mehr. Prüfen Sie Versand und Steuern an der Kasse."],
    cta: "Lieferbare Einzelspulen vergleichen",
    faq: [{q:"Garantiert ein Suchergebnis, dass die Spule in meine Zuführung passt?",a:"Nein. Die Links filtern nach Material, Filamentdurchmesser und Verpackung, nicht nach Spulenmaßen. Prüfen Sie Spulenbreite, Nabenöffnung und Zuführweg vor der Bestellung."},{q:"Was, wenn ich schon ein mehrfarbiges Projekt habe?",a:"Konvertieren Sie es zuerst und wählen Sie dann unter jeder Farbe „Eine Spule für diesen Druck“. Die Suche übernimmt Material, Durchmesser und ungefähre Farbe; prüfen Sie Farbmuster und Variante im Shop."}],
    editorialNote: "Sie können jetzt 3MF-Projekte importieren, die in ElegooSlicer und Anycubic Slicer Next gespeichert wurden. Die Filamentempfehlungen für die fünf Drucker sind unverändert.",
  },
  fr: {
    title: "Guide d'achat de filament : quoi acheter pour cinq imprimantes 3D",
    meta: "Guide d'achat de filament : Creator 5 Pro et quatre autres imprimantes | FilaShift",
    desc: "Choisissez une première bobine pour la Creator 5 Pro, l'A1, la X1 Carbon, la MK4S ou la U1. Vérifiez le matériau, le format de bobine et le chargeur avant de comparer les prix actuels.",
    intro: "Voici cinq sélections éditoriales de FilaShift couvrant différentes façons d'alimenter le filament, pas un classement des ventes. La Creator 5 Pro arrive en tête parce que c'est l'imprimante par défaut de notre convertisseur. Les commissions d'affiliation ne déterminent pas les choix.",
    steps: ["Choisissez selon la pièce : du PLA standard pour un premier modèle décoratif ou une enseigne ; envisagez le PETG pour une pince ou un support fonctionnel.","Cherchez du filament de 1,75 mm sur une bobine prête à l'emploi. Une recharge nécessite une bobine réutilisable compatible. Le diamètre du filament n'est pas celui de la buse.","Comparez d'abord le prix total d'une bobine. Par exemple, 500 g à 12 $ font 24 $/kg ; 1 kg à 20 $ revient moins cher au kilo mais coûte 8 $ de plus aujourd'hui. Vérifiez la livraison et les taxes au paiement."],
    cta: "Comparer les bobines en stock",
    faq: [{q:"Un résultat du comparateur garantit-il que la bobine convient à mon chargeur ?",a:"Non. Les liens filtrent par matériau, diamètre de filament et conditionnement, pas par dimensions de bobine. Vérifiez la largeur de la bobine, l'ouverture du moyeu et le trajet du filament avant de commander."},{q:"Et si j'ai déjà un projet multicolore ?",a:"Convertissez-le d'abord, puis choisissez « Une bobine pour cette impression » sous chaque couleur. Le comparateur reprend le matériau, le diamètre et une couleur approximative ; vérifiez l'échantillon et la variante sur la boutique."}],
    editorialNote: "Vous pouvez désormais importer des projets 3MF enregistrés dans ElegooSlicer et Anycubic Slicer Next. Les recommandations de filament pour les cinq imprimantes sont inchangées.",
  },
};

export function buyingGuide(lang: BLang): Omit<Guide,"slug"> {
  const t = TEXT[lang];
  const para = (m: (typeof models)[number]) => (lang === "en" ? m.en : lang === "es" ? m.es : MODEL_TEXT[lang][m.id].p);
  const warn = (m: (typeof models)[number]) =>
    lang === "en" || lang === "es" ? m.warning?.[lang] : MODEL_TEXT[lang][m.id].warning;
  return {
    ...t,
    shopping: true,
    sections: models.map(m=>({h:m.name,p:para(m),model:m.id,material:m.buy,source:m.url,warning:warn(m)})),
    updated:"2026-11-24",
  };
}
