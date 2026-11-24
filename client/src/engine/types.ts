import type { PrusaData } from "./prusa-out";
export type Dict = Record<string, any>;

export interface PrinterIndexEntry {
  id: string;
  vendor: string;
  model: string;
  short: string;
  machine: string;
  bed: [number, number];
  height: number;
  extruders: number;
  slots: number;
  slotUnit: string;
  slicer: string;
  popular: boolean;
  processes: number;
  filamentTypes: string[];
  /** nozzle sizes with their own presets; variant profiles are `<id>-n02`, `-n06`, `-n08` */
  nozzles?: string[];
  /** set on profile files: nozzle of this variant and the base printer id */
  nozzle?: string;
  base?: string;
  /** PrusaSlicer system presets exist (profiles/prusa/<id>.json): native PrusaSlicer output is offered */
  prusa?: boolean;
  /** only PrusaSlicer has a profile for this printer (no OrcaSlicer output) */
  prusaOnly?: boolean;
}

export interface ProcessPreset {
  name: string;
  layer_height: number;
  default: boolean;
  values: Dict;
}

export interface FilamentPreset {
  name: string;
  id: string;
  generic?: boolean;
  values: Dict;
}

export interface PrinterProfile extends PrinterIndexEntry {
  printer_model: string;
  printer_variant: string;
  minFilaments: number;
  flavor: string;
  defaultProcess: string;
  machineValues: Dict;
  processes: any;
  filaments: Record<string, FilamentPreset>;
}

export type SourceKind = "bambu" | "orca" | "prusa" | "plain" | "invalid";

export interface SourceFilament {
  index: number; // 1-based
  color: string; // #RRGGBB
  type: string;
  preset: string;
  used: boolean;
  usage: number; // rough weight: parts + painted triangles
}

export interface PlateInfo {
  footprint?: [number, number];
  id: number;
  name: string;
  objectIds: string[];
  thumbnail?: string; // zip path
}

export interface Analysis {
  fileName: string;
  fileSize: number;
  kind: SourceKind;
  app: string;
  /** friendly name of the slicer that saved the file, e.g. "OrcaSlicer 2.5.2" */
  sourceSlicer: string;
  sourcePrinter: string;
  sourcePrinterModel: string;
  sourceBed: [number, number] | null;
  layerHeight: number;
  supports: boolean;
  primeTower: boolean;
  hasPaint: boolean;
  hasSlicedGcode: boolean;
  colorChangeLayers: boolean;
  filaments: SourceFilament[];
  usedKnown: boolean;
  usedWhy?: string;
  plates: PlateInfo[];
  objectCount: number;
  thumbnail?: string; // zip path of the best thumbnail
  notes: string[];
  error?: string;
  /** height bands each filament occupies, per plate (object-relative mm) */
  stacks?: { plate: number; fil: number; z0: number; z1: number }[];
  /** set when the source was a non-Orca project (PrusaSlicer) translated in memory */
  translatedFrom?: { slicer: string; translated: string[]; dropped: string[] };
}

export interface SlotAssignment {
  /** for each source filament (1-based index -> position in array index-1): output slot (1-based) or 0 = drop */
  map: number[];
}

export interface ConvertOptions {
  map: number[];
  keepSpeeds: boolean;
  recenter: boolean;
  slotColors?: Record<number, string>;
  /** filament-change pauses from planPauses(); heights are object-relative */
  pauses?: { plate: number; slot: number; fil: number; z: number; color: string }[];
  /** "prusa": write a native PrusaSlicer project (needs `prusa`); default is the Orca/Bambu project */
  output?: "orca" | "prusa";
  prusa?: PrusaData;
}

export interface ReportLine {
  level: "info" | "warn" | "ok";
  text: string;
}

export interface ConvertReport {
  target: string;
  process: string;
  filaments: { slot: number; color: string; type: string; diameter?: number; preset: string; from: number[] }[];
  kept: string[];
  replaced: string[];
  discarded: string[];
  speeds: string[];
  lines: ReportLine[];
  removedFiles: string[];
  paintRemapped: number;
  outputName: string;
}

export interface ConvertResult {
  bytes: Uint8Array;
  report: ConvertReport;
}
