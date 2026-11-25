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
  {slug: "filament-buying-guide-five-printers", ...buyingGuide("en")},
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
  {
    slug: "creality-print-to-bambu",
    title: "Convert a Creality Print project to Bambu Lab",
    meta: "Convert Creality Print, ElegooSlicer and Anycubic Slicer Next 3MF to Bambu Studio | FilaShift",
    desc: "Move a Creality Print 3MF project (and ElegooSlicer or Anycubic Slicer Next projects) to a Bambu Lab printer: colours mapped to AMS slots, Bambu presets swapped in and fork-only settings removed. Includes the limits of Creality Print mixed filaments and special plates.",
    intro:
      "Creality Print, ElegooSlicer and Anycubic Slicer Next are all based on the same code as OrcaSlicer and Bambu Studio, so their 3MF projects can move to a Bambu Lab printer. FilaShift recognises which of these slicers saved the file, keeps the model, painting and the designer's settings, and swaps in Bambu Lab's own printer, process and filament presets.",
    printer: "bambu-lab-x1-carbon",
    steps: [
      "In Creality Print, ElegooSlicer or Anycubic Slicer Next, save the project with File → Save Project As (a .3mf project, not an exported STL or G-code).",
      "Drop the 3MF into FilaShift and pick your Bambu Lab printer. The file card shows which slicer saved the project.",
      "Match each colour to an AMS slot. Similar colours share a slot if you have fewer slots than the project has colours.",
      "Convert, download and read the report, especially the lines about build plates and mixed filaments.",
      OPEN.replace("your slicer", "Bambu Studio"),
    ],
    cta: "Convert for the Bambu Lab X1 Carbon",
    sections: [
      {
        h: "What is kept",
        list: [
          "Every plate, object and part, with painted colours, painted supports and seams.",
          "The designer's layer height, walls, infill, supports, brim, seam and ironing, translated to Bambu Studio's names and units (for example, percentage line widths become millimetres).",
          "Filament types and colours, matched to Bambu Lab's own filament presets so the AMS recognises them.",
        ],
      },
      {
        h: "What is removed or changed",
        list: [
          "Settings only the source slicer understands are not copied: Creality CFS flush and multicolour-method keys, Elegoo's support_mms and Anycubic ACE slot settings and hardened-steel variants. The normal settings already hold the values you chose.",
          "The file stops claiming to be from Creality Print, ElegooSlicer or Anycubic Slicer Next: it gets a clean Bambu Studio header and Creality's creality.config is dropped.",
          "The prime tower uses the Bambu printer's default width (some CFS profiles use much wider towers), and values outside Bambu Studio's allowed ranges are capped and listed in the report.",
          "Converted files open in Bambu Studio 2.9.1 or newer.",
        ],
      },
      {
        h: "Limits to check",
        list: [
          "Creality Print 7 mixed filaments (colour blends) exist only in Creality Print. No other slicer can print them, so parts or painting that use a blend print with slot 1. The report warns you; reassign those parts in Bambu Studio.",
          "Creality-only build plates such as Epoxy Resin or Customized have no Bambu equivalent. The Bambu printer's plate is used and the report says so; check the bed temperature before printing.",
        ],
      },
    ],
    faq: [
      {
        q: "Does this also work for ElegooSlicer and Anycubic Slicer Next?",
        a: "Yes. FilaShift recognises projects from ElegooSlicer and Anycubic Slicer Next, even when Anycubic Slicer Next labels the file as Bambu Studio, and converts them the same way.",
      },
      {
        q: "How was this tested?",
        a: "Test projects from ElegooSlicer and Anycubic Slicer Next were exported by their own command-line tools. The Creality Print test projects are built from Creality Print's own presets and file layout, because its command-line tool cannot save projects. The converted files were sliced in the destination slicers' command-line tools without errors.",
      },
      {
        q: "Can I go back from Bambu Lab to a Creality printer?",
        a: "Yes. Conversion works in both directions: drop a Bambu Studio project and pick your Creality printer.",
      },
    ],
    updated: "2026-11-25",
  },
  {
    slug: "bambu-to-prusaslicer-mmu3-xl",
    title: "Bambu Studio to PrusaSlicer for MMU3 and XL (native PrusaSlicer projects)",
    meta: "Convert Bambu Studio and MakerWorld 3MF to PrusaSlicer for MMU3 and Prusa XL | FilaShift",
    desc: "Turn a Bambu Studio or MakerWorld 3MF into a native PrusaSlicer 2.9 project for the Prusa MK4S MMU3, CORE One MMU3 or XL: PrusaSlicer system presets, painted colours, colour changes and plates as PrusaSlicer beds. Explains what PrusaSlicer's presets change.",
    intro:
      "For Prusa printers FilaShift can write a real PrusaSlicer project instead of an OrcaSlicer file. It uses PrusaSlicer's own system presets for your printer, so PrusaSlicer shows them as system presets, and it carries over the parts, painting and colour changes in PrusaSlicer's own format.",
    printer: "prusa-mk4s-mmu3",
    steps: [
      "Download the 3MF from MakerWorld or save your project in Bambu Studio.",
      "Drop it into FilaShift and pick your Prusa printer, for example the MK4S MMU3, CORE One MMU3, XL 2T or XL 5T.",
      "In the settings panel, keep Output for: PrusaSlicer (the default for Prusa printers). Printers that exist only in PrusaSlicer, such as the MK4S MMU3 and XL 2T, always get a PrusaSlicer project.",
      "Match each colour to an MMU3 slot or XL tool, then convert and read the report.",
      OPEN.replace("your slicer", "PrusaSlicer 2.9 or newer"),
    ],
    cta: "Convert for the Prusa MK4S MMU3",
    sections: [
      {
        h: "What the PrusaSlicer project contains",
        list: [
          "PrusaSlicer's system printer, print and filament presets for your printer; the print preset is the one closest to the project's layer height.",
          "Objects with their parts, names, extruders, modifiers and per-object settings.",
          "Painted colours, painted supports and painted seams in PrusaSlicer's own format.",
          "Colour changes and pauses as PrusaSlicer layer changes (M600), and each plate as a PrusaSlicer bed.",
        ],
      },
      {
        h: "PrusaSlicer presets set temperatures and speeds",
        p: [
          "PrusaSlicer stores its settings differently from Bambu Studio, so temperatures and speeds come from PrusaSlicer's presets for your printer and filament, not from the original project. The designer's choices that can be carried over, such as walls, infill and supports, are applied on top of the presets and listed in the report.",
          "Per-object settings without a PrusaSlicer equivalent stay at the preset values (the report lists them). Variable layer height and layer-range modifiers are not carried over.",
        ],
      },
      {
        h: "MMU3 and XL differences",
        list: [
          "MMU3 printers have one nozzle and need a wipe tower. FilaShift checks the space for PrusaSlicer's wider tower and moves it to a free spot; if there is none, the report tells you to scale or rearrange the model.",
          "On the MMU3, a colour change for a filament that is not printing at that height becomes a pause (M601). This is how PrusaSlicer handles it.",
          "The XL changes toolheads instead of loading filament, so each colour goes to a tool. When there are more colours than tools, the closest colours share a tool.",
          "If a model is larger than the bed, the converter warns and suggests a scale. Scale or split it in PrusaSlicer before slicing.",
        ],
      },
    ],
    faq: [
      {
        q: "Can I still get an OrcaSlicer file for my Prusa?",
        a: "Yes, for Prusa printers that OrcaSlicer supports: choose Output for: OrcaSlicer in the settings panel. Printers that exist only in PrusaSlicer, such as the MK4S MMU3, MK3S MMU3 and XL 2T, always get a PrusaSlicer project.",
      },
      {
        q: "Why are the temperatures different from the Bambu project?",
        a: "PrusaSlicer output uses PrusaSlicer's own filament presets, which set the temperatures for your printer and material. Check them in PrusaSlicer if you need the designer's values.",
      },
      {
        q: "How was this tested?",
        a: "Sample projects, including two painted MakerWorld projects, were converted for every Prusa printer and nozzle variant and sliced with PrusaSlicer's command-line tool. The only failures were a MakerWorld model larger than the CORE One MMU3 bed, which the converter flags with a scale suggestion.",
      },
    ],
    updated: "2026-11-25",
  },
  {
    slug: "bambu-h3c-p3c-multicolour",
    title: "Multi-colour on Bambu Lab H3C and P3C tool changers (PrintTools, TPU tool)",
    meta: "Convert multi-colour 3MF for Bambu Lab H3C and P3C PrintTools | FilaShift",
    desc: "How FilaShift assigns each colour of a 3MF project to a PrintTool on the Bambu Lab H3C and P3C tool changers, keeps rigid filament off the H3C's 2.85 mm TPU tool, and shares the AMS when you have more colours than tools.",
    intro:
      "The Bambu Lab H3C and P3C swap whole PrintTools instead of pushing every colour through one nozzle. When you convert a project for them, FilaShift writes a tool for each filament into the file, so Bambu Studio keeps that assignment instead of guessing.",
    printer: "bambu-lab-h3c",
    steps: [
      "Download the project 3MF from MakerWorld or save it in Bambu Studio, OrcaSlicer, or another supported slicer.",
      "Drop it into FilaShift and pick the Bambu Lab H3C or P3C.",
      "Match each colour to a slot, then convert.",
      "Read the report: it lists which filament goes to which PrintTool and any tool you need to fit.",
      OPEN.replace("your slicer", "Bambu Studio 2.9.1 or newer"),
    ],
    cta: "Convert for the Bambu Lab H3C",
    sections: [
      {
        h: "How filaments are assigned to PrintTools",
        list: [
          "Each colour that the model uses gets its own PrintTool, and the file is set to Nozzle Manual, so Bambu Studio keeps the assignment. The report lists it, for example filament 1 → PrintTool 1.",
          "The stock H3C has 9 PrintTools: eight for 1.75 mm filament and one, PrintTool 8, for 2.85 mm TPU. The stock P3C has 5 PrintTools in 7 docks.",
          "When a project comes from the same printer model, each filament keeps the tool it used there where possible.",
          "When every fitted tool is in use, FilaShift asks you to fit another tool in a free dock (P3C) with a warning; after that, extra colours share PrintTool 1 through the AMS. The report says which ones.",
        ],
      },
      {
        h: "The H3C's 2.85 mm TPU tool",
        list: [
          "Only flexible 2.85 mm filament goes to the TPU tool, with the printer's 2.85 mm TPU filament preset. Rigid filament is never assigned to it.",
          "Flexible 1.75 mm filament (TPU from an AMS project, for example) cannot use the 2.85 mm tool, so it prints from a standard PrintTool. The report says so.",
          "On the P3C, a 2.85 mm TPU filament needs an extra TPU tool in a free dock. FilaShift asks for it with a warning: fit that tool before printing, or change the filament.",
        ],
      },
      {
        h: "Limits to check",
        list: [
          "Projects that used different nozzle sizes per tool get a single nozzle size on the H3C and P3C, with a warning, because converted files with mixed sizes could not be sliced reliably in testing. Set each tool's nozzle in Bambu Studio if you need different sizes.",
          "If more tools are needed than the stock printer has, the report names the tools to install. You can also merge colours before converting.",
          "The H2C works differently: its hotend rack is assigned automatically by Bambu Studio to reduce purging.",
          "Converting from the H3C or P3C to a single-nozzle printer keeps the colours as AMS slots.",
        ],
      },
    ],
    faq: [
      {
        q: "Will Bambu Studio change my tool assignment?",
        a: "Not on the H3C and P3C: the file uses Nozzle Manual mode, so Bambu Studio keeps the PrintTool for each filament. If a tool in the file is missing or does not suit the filament, Bambu Studio picks one instead.",
      },
      {
        q: "Was this tested?",
        a: "Yes, in software. The standard sample projects converted for the H3C and P3C slice without errors in Bambu Studio's command-line tool (see the test results page). Test projects with a 2.85 mm TPU filament, 10 colours and mixed nozzle sizes are also converted and sliced, and the tool assignment is read back from the G-code.",
      },
    ],
    updated: "2026-11-25",
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
