// Spanish versions of the guides in guides.ts, keyed by slug. Keep them in step with the English text
// (same steps, sections and FAQ) and update `updated` in guides.ts when either changes.
import type { Guide } from "./guides";
import { FILE_LIMIT } from "./conversion-facts";
import { buyingGuide, buyingSlug } from "./filament-buying-guide";

export type GuideText = Pick<Guide, "title" | "meta" | "desc" | "intro" | "steps" | "cta" | "sections" | "faq">;

const OPEN =
  "Abre el archivo descargado en tu laminador con Archivo → Abrir proyecto (no Importar, que solo conserva las formas), revisa la vista previa y lamina.";
const open = (slicer: string) => OPEN.replace("tu laminador", slicer);

export const GUIDES_ES: Record<string, GuideText> = {
  [buyingSlug]: buyingGuide("es"),
  "3mf-to-stl": {
    title: "Cómo convertir 3MF a STL u OBJ",
    meta: "Convierte 3MF a STL u OBJ gratis, en tu navegador | FilaShift",
    desc: "Convierte un archivo 3MF a STL u OBJ en segundos sin subirlo. Las piezas quedan en su sitio, las unidades se pasan a milímetros y el OBJ conserva el color de cada pieza. Guía paso a paso con soluciones a los problemas habituales.",
    intro:
      "STL y OBJ son formatos de malla sencillos que abre casi cualquier programa 3D. FilaShift convierte un 3MF a STL u OBJ dentro de tu navegador, así que el archivo nunca se sube.",
    steps: [
      "Abre el convertidor de FilaShift y suelta tu archivo .3mf en la página (o haz clic para elegirlo).",
      "Debajo del archivo, haz clic en Exportar STL para una malla solo con la forma, o en Exportar OBJ para conservar además un color por pieza.",
      "Guarda la descarga. Un proyecto con varias placas da un archivo por placa dentro de un .zip.",
      "Abre el STL u OBJ en tu laminador o programa 3D y comprueba el tamaño y la orientación.",
    ],
    cta: "Abrir el convertidor",
    sections: [
      {
        h: "Qué se conserva y qué se pierde",
        list: [
          "Se conserva: cada pieza imprimible, colocada exactamente como está en la placa, en milímetros (los 3MF en pulgadas, centímetros o micras se escalan por ti).",
          "Solo en OBJ: un material por pieza, con el color de su filamento, en un archivo .mtl que lo acompaña.",
          "Se pierde en ambos: los colores pintados, la asignación de filamentos, las placas, los soportes y todos los ajustes de impresión. Ni STL ni OBJ pueden guardarlos.",
          "Se omiten: los volúmenes modificadores, negativos y bloqueadores de soporte, que solo le importan al laminador.",
        ],
      },
      {
        h: "¿STL u OBJ: cuál elijo?",
        p: [
          "Elige STL cuando otra persona u otro programa solo necesita la forma: es el formato más compatible. Elige OBJ cuando quieras ver qué pieza es de qué color, por ejemplo en Blender o en un programa de renderizado.",
          "Si vas a pasar una impresión a otra impresora, normalmente no te conviene ninguno de los dos. Convierte el propio 3MF: FilaShift conserva los colores, la pintura, las placas y los ajustes del diseñador.",
        ],
      },
      {
        h: "Cómo resolver problemas habituales",
        list: [
          "El modelo sale diminuto o enorme: el programa en el que lo abriste supuso pulgadas o metros. FilaShift siempre escribe milímetros; elige mm como unidad de importación.",
          "Agujeros o caras que faltan: la malla original no era cerrada. La mayoría de los laminadores la reparan al importar; Bambu Studio y OrcaSlicer tienen Reparar modelo y PrusaSlicer repara automáticamente.",
          "Las piezas se unen en una sola: STL no tiene lista de piezas. Usa OBJ, que guarda un objeto con nombre por pieza, o separa las piezas en tu laminador.",
          "Los colores desaparecen: STL no tiene color y OBJ tiene uno por pieza. El detalle pintado solo se conserva en un 3MF.",
        ],
      },
    ],
    faq: [
      { q: "¿Se sube el 3MF?", a: "No. La exportación se hace en la pestaña de tu navegador. No se envía nada a FilaShift ni a nadie más." },
      { q: "¿Hay un límite de tamaño?", a: FILE_LIMIT.es },
      {
        q: "¿Puedo convertir un STL de vuelta a 3MF?",
        a: "Sí. Elige un STL en FilaShift, selecciona la impresora, convierte el modelo y descarga el nuevo 3MF. El STL solo guarda la geometría; comprueba la escala, el material y los ajustes de impresión en el laminador de destino.",
      },
    ],
  },
  "makerworld-to-flashforge": {
    title: "Convertir archivos 3MF de MakerWorld y Bambu Studio para Flashforge",
    meta: "Imprime 3MF de MakerWorld en Flashforge AD5X, AD5M y Creator 5 | FilaShift",
    desc: "Convierte proyectos 3MF de MakerWorld y Bambu Studio para la Flashforge AD5X, Adventurer 5M y Creator 5 sin rehacer colores, placas ni ajustes. Gratis, privado y paso a paso.",
    intro:
      "Los proyectos de MakerWorld se guardan para impresoras Bambu Lab. Al abrir uno en una Flashforge se suelen perder los colores o los ajustes. FilaShift reescribe el proyecto con los perfiles de impresora y filamento de Flashforge y conserva todo lo demás.",
    steps: [
      "En MakerWorld, abre el modelo, elige el perfil de impresión que quieras y descárgalo como 3MF (no como STL).",
      "Suelta el 3MF en FilaShift y elige tu impresora Flashforge: AD5X, Adventurer 5M / 5M Pro o Creator 5.",
      "Revisa la lista de colores. Cada color del proyecto se asigna a una de las cuatro ranuras del IFS (AD5X) o a un cabezal (Creator 5); cambia la asignación que quieras.",
      "Haz clic en Convertir, descarga el nuevo 3MF y lee el informe.",
      open("OrcaSlicer u Orca-Flashforge"),
    ],
    cta: "Convertir para la Flashforge AD5X",
    sections: [
      {
        h: "Qué se conserva",
        list: [
          "Todas las placas, los objetos y los colores pintados, con la pintura renumerada a tus ranuras.",
          "La altura de capa, paredes, relleno, capas superiores e inferiores, soportes, borde y costura que eligió el diseñador.",
          "Los ajustes de máquina, el G-code de inicio y fin y las temperaturas de filamento de Flashforge sustituyen a los de Bambu, para que la impresora funcione correctamente.",
          "La torre de purga se mueve a un hueco libre de la cama de 220 × 220 mm cuando ya no cabe en su sitio original.",
        ],
      },
      {
        h: "Impresoras Flashforge de un solo extrusor",
        p: [
          "La Adventurer 5M y la 5M Pro tienen un único camino de filamento. FilaShift puede unir todos los colores en uno o, cuando los colores están a alturas distintas (carteles, insignias, llaveros), añadir pausas para cambio de filamento para que la impresora se detenga y puedas cambiarlo.",
        ],
      },
      {
        h: "Problemas habituales",
        list: [
          "Solo aparecen las formas: el archivo se importó. Usa Archivo → Abrir proyecto.",
          "El modelo es más grande que la cama: la mayoría de las camas de Bambu Lab miden 256 mm y la de la AD5X, 220 mm. El informe indica cuándo un modelo no cabe y cuánto hay que escalarlo.",
          "Si OrcaSlicer rechaza una mezcla como PLA y PETG en una sola boquilla, comprueba que los perfiles coincidan con las bobinas reales. Si el proyecto requiere ambos materiales, mantén activa la comprobación de temperatura y usa una configuración compatible.",
          "Por ejemplo, si el filamento 3 indica PETG pero tanto el diseño como la bobina requieren PLA, abre una copia en OrcaSlicer. En Preparar → Filamento, selecciona el perfil PLA adecuado en el menú de la fila 3, no en el cuadro de color. Lamina la placa y comprueba las asignaciones en la vista previa.",
          "Si el PETG es intencional, consulta las notas del diseñador y el material de interfaz en Proceso → Soporte. No etiquetes el PETG como PLA. Lamina las piezas independientes en placas separadas; si una sola pieza necesita ambos materiales, usa una configuración verificada para esa mezcla.",
        ],
      },
    ],
    faq: [
      { q: "¿Funciona al revés, de Flashforge a Bambu?", a: "Sí. Suelta un proyecto de Flashforge u Orca-Flashforge y elige una impresora Bambu Lab." },
      { q: "¿Necesito Orca-Flashforge?", a: "No. El archivo convertido se abre en OrcaSlicer y en Orca-Flashforge." },
    ],
  },
  "makerworld-to-creality": {
    title: "Convertir archivos 3MF de MakerWorld y Bambu Studio para impresoras Creality",
    meta: "Imprime 3MF de MakerWorld en Creality K1, K2, Hi y Ender-3 V3 | FilaShift",
    desc: "Convierte proyectos 3MF de Bambu Studio y MakerWorld para Creality K1, K2 Plus, Hi con CFS y Ender-3 V3, conservando colores, placas y los ajustes del diseñador.",
    intro:
      "Las impresoras Creality usan perfiles de la familia OrcaSlicer (OrcaSlicer y Creality Print). FilaShift convierte los proyectos de Bambu a esos perfiles y enumera cada cambio, para que imprimas modelos de MakerWorld en una K1, K2 o Ender sin empezar de cero.",
    steps: [
      "Descarga el modelo de MakerWorld como 3MF con el perfil de impresión que quieras.",
      "Suéltalo en FilaShift y elige tu impresora Creality, por ejemplo K2 Plus (CFS), Hi (CFS), K1C o Ender-3 V3.",
      "Asigna los colores a las ranuras del CFS o usa pausas para cambio de filamento en los modelos de un solo extrusor.",
      "Convierte, descarga y lee el informe.",
      open("OrcaSlicer"),
    ],
    cta: "Convertir para la Creality K2 Plus",
    sections: [
      {
        h: "Qué se conserva",
        list: [
          "Placas, objetos y colores pintados.",
          "Altura de capa, paredes, relleno, soportes, borde, costura y planchado.",
          "Los límites de máquina, el G-code de inicio y fin y los perfiles de filamento de Creality.",
          "Los perfiles CFS de Creality usan torres de purga muy anchas; cuando una no cabe junto al modelo, FilaShift la estrecha y te lo indica.",
        ],
      },
      {
        h: "Perfiles de impresora antiguos",
        p: [
          "Algunos perfiles antiguos de OrcaSlicer (por ejemplo, Anycubic Kobra Max, Flashforge Adventurer 3 y UltiMaker S5) usan extrusión absoluta u omiten el reinicio del extrusor que OrcaSlicer exige. FilaShift añade extrusión relativa y un reinicio G92 E0 en cada capa cuando el proyecto lo necesita, y lo indica en el informe.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Funciona con Creality Print?",
        a: "El archivo convertido es un proyecto de OrcaSlicer. Creality Print está basado en OrcaSlicer y normalmente lo abre; si no, usa OrcaSlicer.",
      },
      { q: "¿Puedo pasar un proyecto de Creality a Bambu?", a: "Sí. Suelta el proyecto de Creality Print u OrcaSlicer y elige una impresora Bambu Lab." },
    ],
  },
  "bambu-to-snapmaker-u1": {
    title: "Convertir proyectos de Bambu Studio y MakerWorld para la Snapmaker U1",
    meta: "Imprime 3MF de MakerWorld en la Snapmaker U1 con cambio de cabezal | FilaShift",
    desc: "Pasa proyectos 3MF de Bambu Studio y MakerWorld a la Snapmaker U1 de cuatro cabezales, con los colores asignados a cada cabezal y los ajustes del diseñador conservados.",
    intro:
      "La Snapmaker U1 imprime hasta cuatro colores con cuatro cabezales en lugar de un AMS. FilaShift asigna cada color del proyecto a un cabezal y pone los perfiles propios de la U1.",
    steps: [
      "Descarga el 3MF del proyecto desde MakerWorld o guárdalo desde Bambu Studio.",
      "Suéltalo en FilaShift; la Snapmaker U1 viene seleccionada por defecto.",
      "Comprueba qué color va a cada cabezal.",
      "Convierte, descarga y lee el informe.",
      open("Snapmaker Orca u OrcaSlicer"),
    ],
    cta: "Convertir para la Snapmaker U1",
    sections: [
      {
        h: "Por qué el cambio de cabezal necesita menos purga",
        p: [
          "Una impresora con AMS purga filamento en cada cambio de color; una con cambio de cabezal deja un cabezal aparcado y toma otro. FilaShift usa el tamaño de torre de purga propio de la U1, así que la torre es mucho más pequeña que en una impresora Bambu.",
        ],
      },
      {
        h: "Más de cuatro colores",
        p: [
          "Cuando un proyecto tiene más colores que cabezales, FilaShift comparte los colores más parecidos o añade pausas para que cambies el filamento a la altura correcta.",
        ],
      },
    ],
    faq: [{ q: "¿Puedo convertir proyectos de la U1 para Bambu?", a: "Sí, la conversión funciona en los dos sentidos." }],
  },
  "prusaslicer-to-bambu": {
    title: "Abrir proyectos 3MF de PrusaSlicer y Printables en Bambu Studio u OrcaSlicer",
    meta: "Convierte 3MF de PrusaSlicer / Printables a Bambu Studio y OrcaSlicer | FilaShift",
    desc: "Convierte proyectos 3MF de PrusaSlicer y Printables para impresoras Bambu Lab, Flashforge, Creality y otras, conservando piezas, colores pintados, cambios de color y los ajustes de impresión principales.",
    intro:
      "PrusaSlicer guarda sus proyectos de forma distinta a Bambu Studio y OrcaSlicer, así que al abrir uno en el otro se suelen perder las piezas, los colores y los ajustes. FilaShift primero traduce el proyecto de PrusaSlicer y después lo convierte para tu impresora.",
    steps: [
      "Descarga el 3MF desde Printables o guarda tu proyecto en PrusaSlicer 2.4 o posterior.",
      "Suéltalo en FilaShift y elige la impresora que tienes: Bambu Lab, Flashforge, Creality, Snapmaker u otra marca.",
      "Revisa la lista de colores: cada extrusor de PrusaSlicer se convierte en un filamento.",
      "Convierte y lee el informe: enumera los ajustes que se tradujeron y los que no.",
      open("Bambu Studio u OrcaSlicer"),
    ],
    cta: "Convertir para Bambu Lab",
    sections: [
      {
        h: "Qué se traduce",
        list: [
          "Los objetos y sus piezas (volúmenes de PrusaSlicer), con sus nombres y extrusores.",
          "Los colores pintados, los soportes pintados y las costuras pintadas.",
          "Los cambios de color por capa, que pasan a ser pausas en la nueva impresora.",
          "Altura de capa, perímetros, relleno, capas superiores e inferiores, soportes, borde, costura, planchado, la torre de purga y las temperaturas.",
        ],
      },
      {
        h: "Qué no se traduce",
        list: [
          "Las velocidades y anchos de línea, porque PrusaSlicer los guarda de otra manera; se usan los valores ajustados de la nueva impresora.",
          "La altura de capa variable, que no tiene equivalente directo; el informe te avisa cuando un proyecto la usaba.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Puedo convertir proyectos de Bambu para impresoras Prusa?",
        a: "Sí. Elige una impresora Prusa como la MK4S o la Core One: el resultado es un proyecto de OrcaSlicer con los perfiles de Prusa.",
      },
    ],
  },
  "flashforge-creality-to-bambu": {
    title: "Pasar proyectos de Flashforge, Creality y Snapmaker de vuelta a Bambu Lab",
    meta: "Convierte proyectos 3MF de Flashforge, Creality u Orca a Bambu Studio | FilaShift",
    desc: "Convierte proyectos 3MF de OrcaSlicer, Orca-Flashforge, Creality Print, ElegooSlicer, Anycubic Slicer Next y Snapmaker Orca para Bambu Studio.",
    intro:
      "La conversión funciona en los dos sentidos. Los proyectos de la familia OrcaSlicer se pueden pasar a impresoras Bambu Lab con los perfiles y las ranuras AMS propios de Bambu.",
    steps: [
      "Guarda el proyecto como 3MF en OrcaSlicer, Orca-Flashforge, Creality Print, ElegooSlicer, Anycubic Slicer Next o Snapmaker Orca.",
      "Suéltalo en FilaShift y elige tu impresora Bambu Lab.",
      "Asigna cada color a una ranura del AMS.",
      "Convierte, descarga y lee el informe.",
      open("Bambu Studio"),
    ],
    cta: "Convertir para la Bambu Lab P1S",
    sections: [
      {
        h: "Qué necesita Bambu Studio",
        list: [
          "Anchos de línea en milímetros en lugar de porcentajes: FilaShift los convierte.",
          "Valores dentro de los rangos que admite Bambu Studio: los que se salen se ajustan al límite y aparecen en el informe.",
          "Los perfiles de impresora y filamento de Bambu por su nombre, para que se reconozcan el AMS y la placa de impresión.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Bambu Studio mostrará el proyecto como modificado?",
        a: "Sí, los ajustes que difieren de los perfiles de Bambu aparecen como cambios, y es lo esperado.",
      },
    ],
  },
  "multicolor-3mf": {
    title: "Mantener colores, placas y pintura al convertir archivos 3MF multicolor",
    meta: "Convierte archivos 3MF multicolor sin perder colores | FilaShift",
    desc: "Cómo conserva FilaShift los colores pintados, las placas y los cambios de color al pasar proyectos 3MF multicolor entre impresoras, incluso a impresoras con menos ranuras.",
    intro:
      "La mayoría de los problemas de conversión son problemas de color: desaparece el detalle pintado, los colores caen en la ranura equivocada o un modelo de 4 colores llega a una impresora de 1 color. Así se resuelve cada caso.",
    steps: [
      "Descarga el 3MF del proyecto, no el STL: solo el 3MF tiene los colores.",
      "Suéltalo en FilaShift y elige tu impresora.",
      "Revisa la lista color → ranura; si tienes menos ranuras, los colores parecidos se agrupan.",
      "Si tu impresora tiene menos ranuras que colores el proyecto, activa las pausas para cambio de filamento cuando se ofrezcan.",
      "Convierte y " + OPEN.charAt(0).toLowerCase() + OPEN.slice(1),
    ],
    cta: "Abrir el convertidor",
    sections: [
      {
        h: "Colores pintados",
        p: ["Los triángulos pintados guardan un número de filamento. FilaShift reescribe esos números a tus ranuras, así la pintura conserva sus colores."],
      },
      {
        h: "Menos ranuras que colores",
        list: [
          "Los colores parecidos pueden compartir ranura: el informe indica cuáles.",
          "Los colores a distintas alturas se pueden imprimir con pausas: la impresora se detiene, cambias el filamento y continúa.",
          "Cuando los colores se mezclan en las mismas capas, las pausas no sirven; FilaShift explica por qué y mantiene la asignación al color más cercano.",
        ],
      },
      {
        h: "Placas",
        p: ["Se conservan todas las placas y se vuelven a centrar en tu cama. Si una placa es más grande que tu cama, el informe indica cuánto hay que escalarla."],
      },
    ],
    faq: [
      {
        q: "¿Por qué solo veo un color al abrirlo?",
        a: "Primero comprueba cómo abriste el 3MF original. Usa Archivo → Abrir proyecto en vez de importar solo la geometría. Si sigues viendo un solo color, comprueba si el proyecto original tiene varios colores y si se asignaron a la misma ranura de filamento.",
      },
    ],
  },
  "creality-print-to-bambu": {
    title: "Convertir un proyecto de Creality Print para Bambu Lab",
    meta: "Convierte 3MF de Creality Print, ElegooSlicer y Anycubic Slicer Next a Bambu Studio | FilaShift",
    desc: "Pasa un proyecto 3MF de Creality Print (y proyectos de ElegooSlicer o Anycubic Slicer Next) a una impresora Bambu Lab: colores asignados a las ranuras del AMS, perfiles de Bambu y ajustes exclusivos del laminador de origen eliminados. Incluye los límites de los filamentos mezclados de Creality Print y las placas especiales.",
    intro:
      "Creality Print, ElegooSlicer y Anycubic Slicer Next se basan en el mismo código que OrcaSlicer y Bambu Studio, así que sus proyectos 3MF se pueden pasar a una impresora Bambu Lab. FilaShift reconoce qué laminador guardó el archivo, conserva el modelo, la pintura y los ajustes del diseñador, y aplica los perfiles de impresora, proceso y filamento propios de Bambu Lab.",
    steps: [
      "En Creality Print, ElegooSlicer o Anycubic Slicer Next, guarda el proyecto con Archivo → Guardar proyecto como (un proyecto .3mf, no un STL exportado ni G-code).",
      "Suelta el 3MF en FilaShift y elige tu impresora Bambu Lab. La tarjeta del archivo muestra qué laminador guardó el proyecto.",
      "Asigna cada color a una ranura del AMS. Si tienes menos ranuras que colores, los colores parecidos comparten ranura.",
      "Convierte, descarga y lee el informe, sobre todo las líneas sobre placas de impresión y filamentos mezclados.",
      open("Bambu Studio"),
    ],
    cta: "Convertir para la Bambu Lab X1 Carbon",
    sections: [
      {
        h: "Qué se conserva",
        list: [
          "Todas las placas, objetos y piezas, con los colores pintados, los soportes pintados y las costuras.",
          "La altura de capa, perímetros, relleno, soportes, borde, costura y planchado del diseñador, con los nombres y unidades de Bambu Studio (por ejemplo, los anchos de línea en porcentaje pasan a milímetros).",
          "Los tipos y colores de filamento, asociados a los perfiles de filamento de Bambu Lab para que el AMS los reconozca.",
        ],
      },
      {
        h: "Qué se quita o cambia",
        list: [
          "No se copian los ajustes que solo entiende el laminador de origen: las claves de purga del CFS y del método multicolor de Creality, support_mms de Elegoo y los ajustes de ranuras del ACE y las variantes de acero endurecido de Anycubic. Los ajustes normales ya contienen los valores que elegiste.",
          "El archivo deja de presentarse como de Creality Print, ElegooSlicer o Anycubic Slicer Next: recibe una cabecera limpia de Bambu Studio y se elimina el creality.config de Creality.",
          "La torre de purga usa el ancho por defecto de la impresora Bambu (algunos perfiles CFS usan torres mucho más anchas), y los valores fuera de los rangos que admite Bambu Studio se limitan y aparecen en el informe.",
          "Los archivos convertidos se abren en Bambu Studio 2.9.1 o posterior.",
        ],
      },
      {
        h: "Límites que conviene revisar",
        list: [
          "Los filamentos mezclados de Creality Print 7 (mezclas de color) solo existen en Creality Print. Ningún otro laminador puede imprimirlos, así que las piezas o la pintura que usan una mezcla se imprimen con la ranura 1. El informe te avisa; reasigna esas piezas en Bambu Studio.",
          "Las placas exclusivas de Creality, como Epoxy Resin o Customized, no tienen equivalente en Bambu. Se usa la placa de la impresora Bambu y el informe lo indica; revisa la temperatura de la cama antes de imprimir.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Sirve también para ElegooSlicer y Anycubic Slicer Next?",
        a: "Sí. FilaShift reconoce los proyectos de ElegooSlicer y Anycubic Slicer Next, incluso cuando Anycubic Slicer Next marca el archivo como de Bambu Studio, y los convierte de la misma manera.",
      },
      {
        q: "¿Cómo se probó?",
        a: "Los proyectos de prueba de ElegooSlicer y Anycubic Slicer Next se exportaron con sus propias herramientas de línea de comandos. Los de Creality Print se generan a partir de los perfiles y la estructura de archivo del propio Creality Print, porque su herramienta de línea de comandos no puede guardar proyectos. Los archivos convertidos se laminaron sin errores en las herramientas de línea de comandos de los laminadores de destino.",
      },
      {
        q: "¿Puedo volver de Bambu Lab a una impresora Creality?",
        a: "Sí. La conversión funciona en los dos sentidos: suelta un proyecto de Bambu Studio y elige tu impresora Creality.",
      },
    ],
  },
  "bambu-to-prusaslicer-mmu3-xl": {
    title: "De Bambu Studio a PrusaSlicer para MMU3 y XL (proyectos nativos de PrusaSlicer)",
    meta: "Convierte 3MF de Bambu Studio y MakerWorld a PrusaSlicer para MMU3 y Prusa XL | FilaShift",
    desc: "Convierte un 3MF de Bambu Studio o MakerWorld en un proyecto nativo de PrusaSlicer 2.9 para la Prusa MK4S MMU3, CORE One MMU3 o XL: perfiles de sistema de PrusaSlicer, colores pintados, cambios de color y placas como camas de PrusaSlicer. Explica qué cambian los perfiles de PrusaSlicer.",
    intro:
      "Para impresoras Prusa, FilaShift puede escribir un proyecto real de PrusaSlicer en lugar de un archivo de OrcaSlicer. Usa los perfiles de sistema de PrusaSlicer para tu impresora, así que PrusaSlicer los muestra como perfiles de sistema, y traslada las piezas, la pintura y los cambios de color en el formato propio de PrusaSlicer.",
    steps: [
      "Descarga el 3MF de MakerWorld o guarda tu proyecto en Bambu Studio.",
      "Suéltalo en FilaShift y elige tu impresora Prusa, por ejemplo la MK4S MMU3, CORE One MMU3, XL 2T o XL 5T.",
      "En el panel de ajustes, deja Salida para: PrusaSlicer (la opción por defecto en impresoras Prusa). Las impresoras que solo existen en PrusaSlicer, como la MK4S MMU3 y la XL 2T, siempre reciben un proyecto de PrusaSlicer.",
      "Asigna cada color a una ranura del MMU3 o a un cabezal de la XL, convierte y lee el informe.",
      open("PrusaSlicer 2.9 o posterior"),
    ],
    cta: "Convertir para la Prusa MK4S MMU3",
    sections: [
      {
        h: "Qué contiene el proyecto de PrusaSlicer",
        list: [
          "Los perfiles de sistema de impresora, impresión y filamento de PrusaSlicer para tu impresora; el perfil de impresión es el más cercano a la altura de capa del proyecto.",
          "Los objetos con sus piezas, nombres, extrusores, modificadores y ajustes por objeto.",
          "Los colores pintados, los soportes pintados y las costuras pintadas en el formato propio de PrusaSlicer.",
          "Los cambios de color y las pausas como cambios por capa de PrusaSlicer (M600), y cada placa como una cama de PrusaSlicer.",
        ],
      },
      {
        h: "Los perfiles de PrusaSlicer fijan temperaturas y velocidades",
        p: [
          "PrusaSlicer guarda sus ajustes de otra manera que Bambu Studio, así que las temperaturas y velocidades vienen de los perfiles de PrusaSlicer para tu impresora y filamento, no del proyecto original. Las decisiones del diseñador que se pueden trasladar, como perímetros, relleno y soportes, se aplican sobre los perfiles y aparecen en el informe.",
          "Los ajustes por objeto sin equivalente en PrusaSlicer se quedan con los valores del perfil (el informe los enumera). No se trasladan la altura de capa variable ni los modificadores por rango de altura.",
        ],
      },
      {
        h: "Diferencias entre MMU3 y XL",
        list: [
          "Las impresoras con MMU3 tienen una sola boquilla y necesitan torre de purga. FilaShift comprueba el espacio para la torre de PrusaSlicer, que es más ancha, y la mueve a un sitio libre; si no lo hay, el informe te pide escalar o recolocar el modelo.",
          "En el MMU3, un cambio de color para un filamento que no se imprime a esa altura se convierte en una pausa (M601). Así lo gestiona PrusaSlicer.",
          "La XL cambia de cabezal en lugar de cargar filamento, así que cada color va a un cabezal. Si hay más colores que cabezales, los colores más parecidos comparten cabezal.",
          "Si un modelo es más grande que la cama, el convertidor avisa y sugiere una escala. Escálalo o divídelo en PrusaSlicer antes de laminar.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Puedo seguir obteniendo un archivo de OrcaSlicer para mi Prusa?",
        a: "Sí, en las impresoras Prusa que admite OrcaSlicer: elige Salida para: OrcaSlicer en el panel de ajustes. Las impresoras que solo existen en PrusaSlicer, como la MK4S MMU3, la MK3S MMU3 y la XL 2T, siempre reciben un proyecto de PrusaSlicer.",
      },
      {
        q: "¿Por qué las temperaturas son distintas de las del proyecto de Bambu?",
        a: "La salida para PrusaSlicer usa los perfiles de filamento de PrusaSlicer, que fijan las temperaturas para tu impresora y material. Revísalas en PrusaSlicer si necesitas los valores del diseñador.",
      },
      {
        q: "¿Cómo se probó?",
        a: "En la CORE One MMU3, una distribución de MakerWorld con ocho objetos excedía la cama. PrusaSlicer detectó un conflicto con la torre de purga antes de cerrarse de forma inesperada. Al colocar cuatro objetos por placa sin cambiar sus dimensiones, ambas placas generaron G-code con las boquillas de 0,4 y 0,6 mm. La distribución original no pasó la prueba.",
      },
    ],
  },
  "bambu-h3c-p3c-multicolour": {
    title: "Multicolor en los cambiadores de herramienta Bambu Lab H3C y P3C (PrintTools, herramienta TPU)",
    meta: "Convierte 3MF multicolor para las PrintTools de la Bambu Lab H3C y P3C | FilaShift",
    desc: "Cómo asigna FilaShift cada color de un proyecto 3MF a una PrintTool en los cambiadores de herramienta Bambu Lab H3C y P3C, mantiene el filamento rígido fuera de la herramienta TPU de 2,85 mm de la H3C y comparte el AMS cuando tienes más colores que herramientas.",
    intro:
      "Las Bambu Lab H3C y P3C cambian PrintTools completas en lugar de pasar todos los colores por una sola boquilla. Al convertir un proyecto para ellas, FilaShift escribe en el archivo una herramienta para cada filamento, así Bambu Studio conserva esa asignación en lugar de adivinarla.",
    steps: [
      "Descarga el 3MF del proyecto de MakerWorld o guárdalo en Bambu Studio, OrcaSlicer u otro laminador compatible.",
      "Suéltalo en FilaShift y elige la Bambu Lab H3C o P3C.",
      "Asigna cada color a una ranura y convierte.",
      "Lee el informe: indica qué filamento va a cada PrintTool y si necesitas instalar alguna herramienta.",
      open("Bambu Studio 2.9.1 o posterior"),
    ],
    cta: "Convertir para la Bambu Lab H3C",
    sections: [
      {
        h: "Cómo se asignan los filamentos a las PrintTools",
        list: [
          "Cada color que usa el modelo recibe su propia PrintTool, y el archivo se configura en modo Nozzle Manual, así Bambu Studio conserva la asignación. El informe la indica, por ejemplo filamento 1 → PrintTool 1.",
          "La H3C de serie tiene 9 PrintTools: ocho para filamento de 1,75 mm y una, la PrintTool 8, para TPU de 2,85 mm. La P3C de serie tiene 5 PrintTools en 7 bases.",
          "Si el proyecto viene del mismo modelo de impresora, cada filamento conserva, cuando es posible, la herramienta que usaba allí.",
          "Cuando todas las herramientas instaladas están en uso, FilaShift te pide con un aviso instalar otra herramienta en una base libre (P3C); después, los colores extra comparten la PrintTool 1 a través del AMS. El informe indica cuáles.",
        ],
      },
      {
        h: "La herramienta TPU de 2,85 mm de la H3C",
        list: [
          "Solo el filamento flexible de 2,85 mm va a la herramienta TPU, con el perfil de filamento TPU de 2,85 mm de la impresora. El filamento rígido nunca se le asigna.",
          "El filamento flexible de 1,75 mm (por ejemplo, TPU de un proyecto con AMS) no puede usar la herramienta de 2,85 mm, así que se imprime con una PrintTool estándar. El informe lo indica.",
          "En la P3C, un filamento TPU de 2,85 mm necesita una herramienta TPU adicional en una base libre. FilaShift lo pide con un aviso: instala esa herramienta antes de imprimir o cambia el filamento.",
        ],
      },
      {
        h: "Límites que conviene revisar",
        list: [
          "Los proyectos que usaban boquillas de distinto tamaño por herramienta reciben un solo tamaño de boquilla en la H3C y la P3C, con un aviso, porque en las pruebas los archivos convertidos con tamaños mezclados no se laminaban de forma fiable. Ajusta la boquilla de cada herramienta en Bambu Studio si necesitas tamaños distintos.",
          "Si hacen falta más herramientas de las que tiene la impresora de serie, el informe indica cuáles instalar. También puedes unir colores antes de convertir.",
          "La H2C funciona de otra manera: Bambu Studio asigna automáticamente su soporte de hotends para reducir la purga.",
          "Al convertir de la H3C o la P3C a una impresora de una sola boquilla, los colores se mantienen como ranuras del AMS.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Cambiará Bambu Studio mi asignación de herramientas?",
        a: "No en la H3C ni en la P3C: el archivo usa el modo Nozzle Manual, así que Bambu Studio conserva la PrintTool de cada filamento. Si una herramienta del archivo falta o no sirve para el filamento, Bambu Studio elige otra.",
      },
      {
        q: "¿Se ha probado?",
        a: "Sí, en software. Los proyectos de prueba estándar convertidos para la H3C y la P3C se laminan sin errores en la herramienta de línea de comandos de Bambu Studio (consulta la página de resultados de las pruebas). También se convierten y laminan proyectos de prueba con un filamento TPU de 2,85 mm, 10 colores y boquillas de distintos tamaños, y la asignación de herramientas se comprueba en el G-code.",
      },
    ],
  },
};
