// Spanish versions of the guides in guides.ts, keyed by slug. Keep them in step with the English text
// (same steps, sections and FAQ) and update `updated` in guides.ts when either changes.
import type { Guide } from "./guides";

export type GuideText = Pick<Guide, "title" | "meta" | "desc" | "intro" | "steps" | "cta" | "sections" | "faq">;

const OPEN =
  "Abre el archivo descargado en tu laminador con Archivo → Abrir proyecto (no Importar, que solo conserva las formas), revisa la vista previa y lamina.";
const open = (slicer: string) => OPEN.replace("tu laminador", slicer);

export const GUIDES_ES: Record<string, GuideText> = {
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
      { q: "¿Hay un límite de tamaño?", a: "Como no hay subida, no hay límite de subida. Los proyectos muy grandes solo están limitados por la memoria de tu dispositivo." },
      {
        q: "¿Puedo convertir un STL de vuelta a 3MF?",
        a: "Importa el STL en Bambu Studio, OrcaSlicer o PrusaSlicer y guarda el proyecto: el resultado es un 3MF. Los colores y ajustes hay que configurarlos de nuevo porque el STL nunca los tuvo.",
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
          "OrcaSlicer no quiere laminar por mezcla de temperaturas: el proyecto mezcla materiales como PLA y PETG en una misma boquilla. Usa un solo tipo de material o, si sabes que la mezcla es segura, activa la opción para quitar la restricción de temperaturas mezcladas en las preferencias de OrcaSlicer.",
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
    desc: "Convierte proyectos de OrcaSlicer, Orca-Flashforge, Creality Print y Snapmaker Orca a Bambu Studio para la X1, P1S, A1, H2D y otras impresoras Bambu Lab.",
    intro:
      "La conversión funciona en los dos sentidos. Los proyectos de la familia OrcaSlicer se pueden pasar a impresoras Bambu Lab con los perfiles y las ranuras AMS propios de Bambu.",
    steps: [
      "Guarda el proyecto como 3MF en OrcaSlicer, Orca-Flashforge, Creality Print o Snapmaker Orca.",
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
        a: "El archivo se importó en lugar de abrirse como proyecto. Usa Archivo → Abrir proyecto.",
      },
    ],
  },
};
