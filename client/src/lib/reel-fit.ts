import type { Item } from "./shop";

export type Feeder = "none" | "ams" | "u1";
export const reelSpecs = "https://atomicfilament.com/pages/filament-spool-sizes";
export const limits = {
  ams: "https://wiki.bambulab.com/en/knowledge-sharing/notes-AMS",
  u1: "https://us.snapmaker.com/products/snapmaker-u1-3d-printer",
};

// A shop weight alone does not identify a reel. Match the manufacturer's own
// variant and packaging description; fail closed on new formats or bundles.
export function atomicReel(it:Item) {
  if(it.b!=="Atomic Filament" || it.r!=="Atomic Filament" || it.n!==1 ||
    !/^https:\/\/atomicfilament\.com\/products\/[\w-]+\?variant=\d+$/.test(it.u) ||
    it.form==="pack" || it.form==="refill" || /refill|bundle|pack\b|sample|spoolless/i.test(it.t+" "+it.v)) return;
  if(it.kg===1 && /^1\.75mm - 1KG AMS Compatible$/i.test(it.v) && /AMS Compatible/i.test(it.t))
    return {width:67, outer:200, bore:51};
  if(it.kg===3.5 && /^1\.75mm - 3\.5KG$/i.test(it.v) && /^3\.5KG /i.test(it.t))
    return {width:95, outer:305, bore:51};
}

export function reelStatus(it:Item, feeder:Exclude<Feeder,"none">) {
  if(it.form==="refill") return "refill";
  const reel=atomicReel(it);
  if(!reel) return "unknown";
  const {width,outer,bore}=reel;
  const within=feeder==="ams" ? width>=50&&width<=68&&outer>=197&&outer<=202 :
    width<=70&&bore>=52&&bore<=60&&it.kg<=1;
  return within?"within":"outside";
}

/**
 * Feeder whose reel limits the finder can check for a converted project's target printer.
 * Only printers sold with (or for) the original AMS, and the Snapmaker U1's reel holder.
 * Newer AMS 2 Pro / AMS lite / AMS 3 printers have different limits, so they get no label.
 */
export function feederFor(model: string): Feeder {
  if (/^Bambu Lab (X1|X1 Carbon|X1E|P1S|P1P)$/.test(model)) return "ams";
  if (model === "Snapmaker U1") return "u1";
  return "none";
}
