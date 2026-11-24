// Step-by-step guides for the searches people actually make (3MF to STL, MakerWorld to Flashforge, …).
// Each guide leads with numbered steps, then explains what is kept, what is lost and how to fix common problems.

import { FILE_LIMIT } from "./conversion-facts";
import { buyingGuide } from "./filament-buying-guide";

export interface Guide {
  slug: string;
  title: string; // <h1>
  meta: string; // <title>
  desc: string; // meta description
  intro: string;
  steps: string[];
  printer?: string; // preselected in the converter link
  cta?: string;
  shopping?: boolean;
  editorialNote?: string;
  sections: { h: string; p?: string[]; list?: string[]; model?:string; material?:string; source?:string; warning?:{title:string;items:string[]} }[];
  faq: { q: string; a: string }[];
  updated: string;
}

const OPEN = "Open the downloaded file in your slicer with File → Open Project (not Import, which keeps only the shapes), check the preview and slice.";

export const GUIDES: Guide[] = [
  {slug: "filament-buying-guide-five-printers", ...buyingGuide(false)},
  {
    slug: "3mf-to-stl",
    title: "How to convert 3MF to STL or OBJ",
    meta: "Convert 3MF to STL or OBJ free, in your browser | FilaShift",
    desc: "Convert a 3MF file to STL or OBJ in seconds without uploading it. Parts stay in place, units are converted to millimetres, and OBJ keeps part colours. Step-by-step guide with fixes for common problems.",
    intro:
      "STL and OBJ are plain mesh formats that almost every 3D tool can open. FilaShift turns a 3MF into STL or OBJ inside your browser, so the file is never uploaded.",
    steps: [
      "Open the FilaShift converter and drop your .3mf file onto the page (or click to choose it).",
      "Under the file, click Export STL for a shape-only mesh, or Export OBJ to also keep one colour per part.",
      "Save the download. A project with several plates gives one file per plate in a .zip.",
      "Open the STL or OBJ in your slicer or 3D software and check the size and orientation.",
    ],
    cta: "Open the converter",
    sections: [
      {
        h: "What is kept and what is lost",
        list: [
          "Kept: every printable part, positioned exactly as it sits on the plate, in millimetres (3MF files in inches, centimetres or microns are scaled for you).",
          "OBJ only: one material per part, coloured from its filament, in a matching .mtl file.",
          "Lost in both: painted-on colours, filament assignments, plates, supports and every print setting. Neither STL nor OBJ can store them.",
          "Skipped: modifier, negative and support-blocker volumes, which only matter to the slicer.",
        ],
      },
      {
        h: "STL or OBJ: which should I pick?",
        p: [
          "Pick STL when another person or program just needs the shape: it is the most widely supported format. Pick OBJ when you want to see which part is which colour, for example in Blender or a renderer.",
          "If you are moving a print to a different printer, you usually don't want either. Convert the 3MF itself instead: FilaShift keeps the colours, painting, plates and the designer's settings.",
        ],
      },
      {
        h: "Fixing common problems",
        list: [
          "The model is tiny or huge: the program you opened it in assumed inches or metres. FilaShift always writes millimetres; set the import unit to mm.",
          "Holes or missing faces: the original mesh was not watertight. Most slicers repair this on import; Bambu Studio and OrcaSlicer offer Fix model, and PrusaSlicer repairs automatically.",
          "Parts are merged into one: STL has no part list. Use OBJ, which keeps a named object per part, or split the parts in your slicer.",
          "The colours are gone: STL has no colour at all, and OBJ has one colour per part. Painted detail only survives in a 3MF.",
        ],
      },
    ],
    faq: [
      { q: "Is the 3MF uploaded?", a: "No. The export runs in your browser tab. Nothing is sent to FilaShift or anyone else." },
      { q: "Is there a size limit?", a: FILE_LIMIT.en },
      {
        q: "Can I convert STL back to 3MF?",
        a: "Yes. Choose an STL in FilaShift, select your printer, then convert and download a new 3MF. STL stores geometry only; check the scale, material and print settings in the destination slicer.",
      },
    ],
    updated: "2026-11-24",
  },
  {
    slug: "makerworld-to-flashforge",
    title: "Convert MakerWorld and Bambu Studio 3MF files for Flashforge",
    meta: "Print MakerWorld 3MF on Flashforge AD5X, AD5M and Creator 5 | FilaShift",
    desc: "Convert MakerWorld and Bambu Studio 3MF projects for the Flashforge AD5X, Adventurer 5M and Creator 5 without rebuilding colours, plates or settings. Free, private, step by step.",
    intro:
      "MakerWorld projects are saved for Bambu Lab printers. Opening one on a Flashforge usually drops the colours or the settings. FilaShift rewrites the project with Flashforge's own printer and filament profiles and keeps the rest.",
    printer: "flashforge-ad5x",
    steps: [
      "On MakerWorld, open the model, choose the print profile you want and download it as a 3MF (not the STL).",
      "Drop the 3MF into FilaShift and choose your Flashforge printer: AD5X, Adventurer 5M / 5M Pro or Creator 5.",
      "Check the colour list. Each project colour is matched to one of the four IFS slots (AD5X) or toolheads (Creator 5); change any match you like.",
      "Click Convert, download the new 3MF and read the report.",
      OPEN.replace("your slicer", "OrcaSlicer or Orca-Flashforge"),
    ],
    cta: "Convert for the Flashforge AD5X",
    sections: [
      {
        h: "What carries over",
        list: [
          "Every plate, object and painted colour, with the paint re-numbered to your slots.",
          "The designer's layer height, walls, infill, top and bottom layers, supports, brim and seam settings.",
          "Flashforge's machine settings, start and end G-code and filament temperatures replace the Bambu ones, so the printer is driven correctly.",
          "The prime tower is moved to a free spot on the 220 × 220 mm bed when the original spot no longer fits.",
        ],
      },
      {
        h: "Single-extruder Flashforge printers",
        p: [
          "The Adventurer 5M and 5M Pro have one filament path. FilaShift can either merge all colours into one, or, when colours sit at different heights (signs, badges, keychains), add filament-change pauses so the printer stops for you to swap filament.",
        ],
      },
      {
        h: "Common issues",
        list: [
          "Only the shapes appear: the file was imported. Use File → Open Project.",
          "The model is larger than the bed: most Bambu Lab beds are 256 mm, the AD5X bed is 220 mm. The report says when a model doesn't fit and how much to scale it.",
          "OrcaSlicer refuses to slice because of mixed temperatures: the project mixes materials such as PLA and PETG in one nozzle. Use one material type, or turn on Remove mixed temperature restriction in OrcaSlicer's preferences if you know the mix is safe.",
        ],
      },
    ],
    faq: [
      { q: "Does it work the other way, Flashforge to Bambu?", a: "Yes. Drop a Flashforge or Orca-Flashforge project and choose a Bambu Lab printer." },
      { q: "Do I need Orca-Flashforge?", a: "No. The converted file opens in OrcaSlicer and in Orca-Flashforge." },
    ],
    updated: "2026-11-23",
  },
  {
    slug: "makerworld-to-creality",
    title: "Convert MakerWorld and Bambu Studio 3MF files for Creality printers",
    meta: "Print MakerWorld 3MF on Creality K1, K2, Hi and Ender-3 V3 | FilaShift",
    desc: "Convert Bambu Studio and MakerWorld 3MF projects for Creality K1, K2 Plus, Hi with CFS and Ender-3 V3, keeping colours, plates and the designer's settings.",
    intro:
      "Creality printers use OrcaSlicer-family profiles (OrcaSlicer and Creality Print). FilaShift converts Bambu projects to those profiles and lists every change, so you can print MakerWorld models on a K1, K2 or Ender without starting over.",
    printer: "creality-k2-plus",
    steps: [
      "Download the MakerWorld model as a 3MF with the print profile you want.",
      "Drop it into FilaShift and pick your Creality printer, for example K2 Plus (CFS), Hi (CFS), K1C or Ender-3 V3.",
      "Match colours to your CFS slots, or use filament-change pauses on single-extruder models.",
      "Convert, download and read the report.",
      OPEN.replace("your slicer", "OrcaSlicer"),
    ],
    cta: "Convert for the Creality K2 Plus",
    sections: [
      {
        h: "What carries over",
        list: [
          "Plates, objects and painted colours.",
          "Layer height, walls, infill, supports, brim, seam and ironing.",
          "Creality's machine limits, start and end G-code and filament profiles.",
          "Creality CFS profiles use very wide prime towers; when one doesn't fit beside the model, FilaShift narrows it and tells you.",
        ],
      },
      {
        h: "Older printer profiles",
        p: [
          "Some older OrcaSlicer profiles (for example the Anycubic Kobra Max, Flashforge Adventurer 3 and UltiMaker S5) use absolute extrusion or skip the extruder reset that OrcaSlicer requires. FilaShift adds relative extrusion and a G92 E0 reset on each layer when a project needs them, and reports the change.",
        ],
      },
    ],
    faq: [
      { q: "Does it work with Creality Print?", a: "The converted file is an OrcaSlicer project. Creality Print is based on OrcaSlicer and usually opens it; if it doesn't, use OrcaSlicer." },
      { q: "Can I move a Creality project to Bambu?", a: "Yes. Drop the Creality Print or OrcaSlicer project and pick a Bambu Lab printer." },
    ],
    updated: "2026-11-23",
  },
  {
    slug: "bambu-to-snapmaker-u1",
    title: "Convert Bambu Studio and MakerWorld projects for the Snapmaker U1",
    meta: "Print MakerWorld 3MF on the Snapmaker U1 toolchanger | FilaShift",
    desc: "Move Bambu Studio and MakerWorld 3MF projects to the Snapmaker U1 four-toolhead printer with colours mapped to toolheads and the designer's settings kept.",
    intro:
      "The Snapmaker U1 prints up to four colours with four toolheads instead of an AMS. FilaShift maps each project colour to a toolhead and swaps in the U1's own profiles.",
    printer: "snapmaker-u1",
    steps: [
      "Download the project 3MF from MakerWorld or save it from Bambu Studio.",
      "Drop it into FilaShift; the Snapmaker U1 is selected by default.",
      "Check which colour goes to which toolhead.",
      "Convert, download and read the report.",
      OPEN.replace("your slicer", "Snapmaker Orca or OrcaSlicer"),
    ],
    cta: "Convert for the Snapmaker U1",
    sections: [
      {
        h: "Why toolchangers need less purging",
        p: [
          "An AMS printer purges filament on every colour change; a toolchanger parks one toolhead and picks up another. FilaShift uses the U1's own prime tower size, so the tower is much smaller than on a Bambu printer.",
        ],
      },
      {
        h: "More than four colours",
        p: ["When a project has more colours than toolheads, FilaShift shares the closest colours or adds pauses so you can swap filament at the right height."],
      },
    ],
    faq: [{ q: "Can I convert U1 projects for Bambu?", a: "Yes, conversion works in both directions." }],
    updated: "2026-11-23",
  },
  {
    slug: "prusaslicer-to-bambu",
    title: "Open PrusaSlicer and Printables 3MF projects in Bambu Studio or OrcaSlicer",
    meta: "Convert PrusaSlicer / Printables 3MF to Bambu Studio and OrcaSlicer | FilaShift",
    desc: "Convert PrusaSlicer and Printables 3MF projects for Bambu Lab, Flashforge, Creality and other printers, keeping parts, painted colours, colour changes and the main print settings.",
    intro:
      "PrusaSlicer stores its projects differently from Bambu Studio and OrcaSlicer, so opening one in the other usually loses the parts, colours and settings. FilaShift translates the PrusaSlicer project first, then converts it for your printer.",
    printer: "bambu-lab-x1-carbon",
    steps: [
      "Download the 3MF from Printables, or save your project in PrusaSlicer 2.4 or newer.",
      "Drop it into FilaShift and pick the printer you own: Bambu Lab, Flashforge, Creality, Snapmaker or another brand.",
      "Check the colour list: each PrusaSlicer extruder becomes a filament.",
      "Convert and read the report: it lists the settings that were translated and those that weren't.",
      OPEN.replace("your slicer", "Bambu Studio or OrcaSlicer"),
    ],
    cta: "Convert for Bambu Lab",
    sections: [
      {
        h: "What is translated",
        list: [
          "Objects and their parts (PrusaSlicer volumes), with names and extruders.",
          "Painted colours, painted supports and painted seams.",
          "Layer colour changes, which become pauses on the new printer.",
          "Layer height, perimeters, infill, top and bottom layers, supports, brim, seam, ironing, the wipe tower and temperatures.",
        ],
      },
      {
        h: "What isn't",
        list: [
          "Speeds and line widths, because PrusaSlicer stores them differently; the new printer's tuned defaults are used instead.",
          "Variable layer height, which has no direct equivalent; the report tells you when a project used it.",
        ],
      },
    ],
    faq: [{ q: "Can I convert Bambu projects for Prusa printers?", a: "Yes. Pick a Prusa printer such as the MK4S or Core One: the result is an OrcaSlicer project with Prusa's profiles." }],
    updated: "2026-11-23",
  },
  {
    slug: "flashforge-creality-to-bambu",
    title: "Move Flashforge, Creality and Snapmaker projects back to Bambu Lab",
    meta: "Convert Flashforge, Creality or Orca 3MF projects to Bambu Studio | FilaShift",
    desc: "Convert 3MF projects from OrcaSlicer, Orca-Flashforge, Creality Print, ElegooSlicer, Anycubic Slicer Next and Snapmaker Orca for Bambu Studio.",
    intro: "Conversion works both ways. Projects from the OrcaSlicer family can be moved to Bambu Lab printers with Bambu's own profiles and AMS slots.",
    printer: "bambu-lab-p1s",
    steps: [
      "Save the project as a 3MF in OrcaSlicer, Orca-Flashforge, Creality Print, ElegooSlicer, Anycubic Slicer Next or Snapmaker Orca.",
      "Drop it into FilaShift and pick your Bambu Lab printer.",
      "Match each colour to an AMS slot.",
      "Convert, download and read the report.",
      OPEN.replace("your slicer", "Bambu Studio"),
    ],
    cta: "Convert for the Bambu Lab P1S",
    sections: [
      {
        h: "What Bambu Studio needs",
        list: [
          "Line widths in millimetres rather than percentages: FilaShift converts them.",
          "Values within Bambu Studio's allowed ranges: out-of-range values are clamped and listed in the report.",
          "Bambu printer and filament presets by name, so the AMS and build plate are recognised.",
        ],
      },
    ],
    faq: [{ q: "Will Bambu Studio show the project as modified?", a: "Yes, settings that differ from the Bambu presets are shown as changes, which is expected." }],
    updated: "2026-11-24",
  },
  {
    slug: "multicolor-3mf",
    title: "Keep colours, plates and painting when converting multi-colour 3MF files",
    meta: "Convert multi-colour 3MF files without losing colours | FilaShift",
    desc: "How FilaShift keeps painted colours, plates and colour changes when moving multi-colour 3MF projects between printers, including printers with fewer slots.",
    intro:
      "Most conversion problems are colour problems: painted detail disappears, colours land in the wrong slot, or a 4-colour model meets a 1-colour printer. Here is how each case is handled.",
    steps: [
      "Download the project 3MF, not the STL: only the 3MF has the colours.",
      "Drop it into FilaShift and pick your printer.",
      "Review the colour → slot list; similar colours are grouped when you have fewer slots.",
      "If your printer has fewer slots than the project has colours, switch on filament-change pauses when offered.",
      "Convert and " + OPEN.charAt(0).toLowerCase() + OPEN.slice(1),
    ],
    cta: "Open the converter",
    sections: [
      {
        h: "Painted colours",
        p: ["Painted triangles store a filament number. FilaShift rewrites those numbers to your slots, so the painting keeps its colours."],
      },
      {
        h: "Fewer slots than colours",
        list: [
          "Similar colours can share a slot: the report lists which ones.",
          "Colours at different heights can print with pauses: the printer stops, you swap filament, then resume.",
          "When colours are mixed on the same layers, pauses can't help; FilaShift explains why and keeps the closest-colour mapping.",
        ],
      },
      {
        h: "Plates",
        p: ["Every plate is kept and re-centred on your bed. If a plate is bigger than your bed, the report says how much to scale it."],
      },
    ],
    faq: [{ q: "Why do I only see one colour after opening?", a: "The file was imported instead of opened as a project. Use File → Open Project." }],
    updated: "2026-11-23",
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
