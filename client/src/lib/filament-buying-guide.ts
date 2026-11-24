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
      en:{title:"Original AMS compatibility warning",items:["Check the reel before buying PETG: the original AMS takes spools 50–68 mm wide. The finder filters filament, not reel dimensions. Bambu recommends avoiding cardboard spools because they can slip.","Keep soft TPU and damp PVA out of the AMS: both can jam. For printer-compatible soft TPU, use the X1 Carbon’s external spool holder instead."]},
      es:{title:"Advertencia de compatibilidad del AMS original",items:["Antes de comprar PETG, comprueba el carrete: el AMS original admite bobinas de 50 a 68 mm de ancho. El buscador filtra por filamento, no por dimensiones del carrete. Bambu recomienda evitar las bobinas de cartón porque pueden resbalar.","No cargues TPU blando ni PVA húmedo en el AMS: ambos pueden atascarse. Para imprimir con un TPU blando compatible con la X1 Carbon, usa el soporte externo de bobina."]}
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
export function buyingGuide(es:boolean): Omit<Guide,"slug"> {
  return {
    title:es?"Qué filamento comprar para cinco impresoras 3D":"Filament buying guide: what to buy for five 3D printers",
    meta:es?"Qué filamento comprar: Creator 5 Pro y cuatro impresoras más | FilaShift":"Filament buying guide: Creator 5 Pro and four more printers | FilaShift",
    desc:es?"Elige una primera bobina para Creator 5 Pro, A1, X1 Carbon, MK4S o U1. Compara material, formato, alimentador y precios actuales.":"Pick a first spool for the Creator 5 Pro, A1, X1 Carbon, MK4S, or U1. Check the material, reel fit, and feeder before comparing live prices.",
    intro:es?"Estas son cinco selecciones editoriales de FilaShift para distintos sistemas de alimentación, no un ranking de ventas. Empezamos por la Creator 5 Pro, la impresora predeterminada del convertidor. Las comisiones no determinan las selecciones.":"These are five FilaShift editorial picks spanning different ways of feeding filament, not a best-seller ranking. The Creator 5 Pro leads because it is our converter’s default printer. Affiliate commissions do not determine the picks.",
    steps:es?["Elige según la pieza: PLA estándar para una primera figura o un letrero; considera PETG para una pinza o un soporte funcional.","Compara bobinas completas de 1,75 mm. Una recarga necesita un carrete reutilizable compatible. El diámetro del filamento no es el de la boquilla.","Empieza por el precio total de una bobina. Por ejemplo, 500 g por 12 $ cuestan 24 $/kg; una bobina de 1 kg por 20 $ cuesta menos por kilo, pero gastas 8 $ más hoy. Comprueba envío e impuestos antes de pagar."]:["Choose for the part: plain PLA for a first display model or sign; consider PETG for a functional clip or bracket.","Look for 1.75 mm filament on a ready-to-use spool. A refill needs a compatible reusable reel. Filament diameter is not nozzle diameter.","Compare the total for one spool first. For example, 500 g at $12 is $24/kg; 1 kg at $20 costs less per kilogram but $8 more today. Check shipping and tax at checkout."],
    cta:es?"Comparar bobinas disponibles":"Compare in-stock single spools", shopping:true,
    sections:models.map(m=>({h:m.name,p:es?m.es:m.en,model:m.id,material:m.buy,source:m.url,warning:m.warning?.[es?"es":"en"]})),
    faq:es?[{q:"¿La lista garantiza que una bobina sirve para mi alimentador?",a:"No. Los enlaces filtran por material, diámetro y formato, no por dimensiones del carrete. Confirma el ancho, el orificio y el recorrido de alimentación antes de comprar."},{q:"¿Y si ya tengo un proyecto multicolor?",a:"Convierte el archivo y elige «Una bobina para esta impresión» bajo cada color. El comparador usa el material, el diámetro y un color aproximado; comprueba la foto y la variante en la tienda."}]:[{q:"Does a finder result guarantee that the reel fits my feeder?",a:"No. The links filter by material, filament diameter, and packaging, not reel dimensions. Confirm the reel width, hub opening, and feed path before ordering."},{q:"What if I already have a multicolor project?",a:"Convert it first, then choose “One spool for this print” under each color. The finder carries over the material, diameter, and approximate color; confirm the swatch and variant at the store."}],
    updated:"2026-11-24",
    editorialNote:es
      ? "Ahora puedes importar proyectos 3MF guardados en ElegooSlicer y Anycubic Slicer Next. Las recomendaciones de filamento para las cinco impresoras no han cambiado."
      : "You can now import 3MF projects saved in ElegooSlicer and Anycubic Slicer Next. The filament recommendations for the five printers are unchanged."
  };
}
