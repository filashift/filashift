import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { PrinterIndexEntry } from "@/engine/types";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import demo from "../../public/samples/test-results.json";
import { RequestPrinterButton } from "@/components/printer-request";

/** Shown first, in this order, under "Popular". */
const FEATURED = ["flashforge-creator-5-pro", "snapmaker-u1", "flashforge-ad5x", "flashforge-adventurer-5m", "flashforge-creator-5"];

export function slotLabel(p: Pick<PrinterIndexEntry, "slots" | "slotUnit">) {
  if (p.slots <= 1) return "1 filament";
  const u = p.slotUnit || "";
  if (/\d/.test(u)) return u;
  if (/extruder|toolchanger|IDEX|multi-color/i.test(u)) return `${p.slots} slots · ${u}`;
  return `${p.slots} slots · ${u || "multi-material"}`;
}

export interface TestedDoc {
  date: string;
  slicers: Record<string, string>;
  samples: string[];
  printers: Record<string, { ok: boolean; passed: number; tests: number; note?: string; slicer?: string; outputs?: Record<string, { ok: boolean; passed: number; tests: number; note?: string }> }>;
}
let testedP: Promise<TestedDoc | null> | null = null;
/** Results of the last full slicer run (scripts/tested.py): converted sample projects sliced in the real destination slicer CLI. */
export function useTested(): TestedDoc | null {
  const [d, setD] = useState<TestedDoc | null>(null);
  useEffect(() => {
    testedP ??= fetch("./profiles/tested.json")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    testedP.then(setD);
  }, []);
  return d;
}
/** `output`: the slicer the converted file is for (Prusa printers can get PrusaSlicer or OrcaSlicer files). */
export function testedLabel(d: TestedDoc | null, p: Pick<PrinterIndexEntry, "id" | "slicer">, output?: string): string | null {
  const t = d?.printers[p.id];
  if (!d || !t?.ok) return null;
  const sl = output || t.slicer || p.slicer || "OrcaSlicer";
  if (t.outputs && !t.outputs[sl]?.ok) return null;
  const v = d.slicers[sl] || "";
  const when = new Date(d.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return `Slicer-tested: sample projects converted for this printer sliced without errors in ${sl} ${v.replace(/^0/, "")} (${when}).`;
}

export function TestedBadge({ id, slicer, className }: { id: string; slicer?: string; className?: string }) {
  const d = useTested();
  const label = testedLabel(d, { id, slicer: slicer as any });
  if (!label) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary", className)} title={label} data-testid={`badge-tested-${id}`}>
      <BadgeCheck className="h-3.5 w-3.5" />
      Slicer-tested
    </span>
  );
}

export function TestedNote({ id, model, slicer, output }: { id: string; model:string; slicer?: string; output?: string }) {
  const d = useTested();
  const es=useLang()==="es", p=d?.printers[id], sl=output||p?.slicer||slicer||"OrcaSlicer";
  const row=p?.outputs?p.outputs[sl]:p && (p.slicer||slicer)===sl?p:undefined;
  const exact=demo.results.find(r=>r.id===id&&r.slicer===sl);
  if(!row || !d) return <p className="mt-2 text-xs text-muted-foreground">{es?"Sin resultado registrado para esta salida.":"No recorded result for this output."}</p>;
  return <details key={id+sl} translate="no" className="mt-2 rounded-lg border p-2 text-xs" data-testid="text-tested-note">
    <summary className="cursor-pointer font-semibold text-primary" data-testid={`badge-tested-${id}`}>
      {row.ok?(es?"Probado en laminador":"Slicer-tested"):(es?"Prueba incompleta":"Test incomplete")} · {es?"Ver resultado":"View result"}
    </summary>
    <div className="mt-2 space-y-1.5">
      <p><b>{model}</b> · {sl} {d.slicers[sl]||""} · {d.date}</p>
      <p>{es?`${row.passed} de ${row.tests} pruebas de laminado correctas para esta salida.`:`${row.passed} of ${row.tests} slice tests passed for this output.`}</p>
      {row.note&&<p>{es&&row.note==="large models must be scaled to fit this bed"?"Los modelos grandes deben reducirse para caber en la cama.":row.note}</p>}
      <p>{es?"Tipos de proyecto del conjunto de pruebas:":"Source projects in the test suite:"}</p>
      <ul className="list-disc pl-4">{d.samples.filter(s=>sl==="PrusaSlicer"||!s.startsWith("PrusaSlicer output only")&&!s.startsWith("PrusaSlicer output also")).map(s=><li key={s}>{es?(s.startsWith("4-colour painted")?"Proyecto Bambu Studio pintado, cuatro colores (X1 Carbon, PLA)":s.startsWith("4-colour Orca")?"Proyecto OrcaSlicer de cuatro colores (Flashforge AD5X, PLA)":s.startsWith("2-object")?"Proyecto PrusaSlicer con dos objetos y cambio de color (MK4S MMU3, PLA)":s.startsWith("PrusaSlicer output also")?"Para salida PrusaSlicer: dos proyectos MakerWorld multicolor (P1S, PLA)":s):s}</li>)}</ul>
      <p>{es?"El total incluye las variantes de boquilla probadas. Son pruebas de software, no una impresión física ni una garantía para tu archivo.":"The total includes tested nozzle variants. These are software results, not a physical print test or a guarantee for your file."}</p>
      <a className="text-primary underline" href="./profiles/tested.json">{es?"Datos de la prueba (JSON)":"Test data (JSON)"}</a>
      {exact&&<p className="border-t pt-2"><b>{es?"Prueba aparte: placa FS de dos colores.":"Separate test: two-color FS nameplate."}</b>{" "}{es?"El proyecto de origen PrusaSlicer se convirtió y produjo G-code con ambos colores en":"The PrusaSlicer source was converted and produced G-code with both colors in"} {exact.slicer} {exact.version} · {demo.date}. <a className="text-primary underline" href="./samples/test-results.json">{es?"Resultado del ejemplo":"Sample result"}</a></p>}
    </div></details>;
}

export function PrinterPicker({
  printers,
  value,
  onChange,
}: {
  printers: PrinterIndexEntry[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const current = printers.find((p) => p.id === value);
  const tested = useTested();

  const groups = useMemo(() => {
    const popular = [
      ...FEATURED.map((id) => printers.find((p) => p.id === id)).filter(Boolean),
      ...printers.filter((p) => p.popular && !FEATURED.includes(p.id)),
    ] as PrinterIndexEntry[];
    const byVendor = new Map<string, PrinterIndexEntry[]>();
    for (const p of printers) {
      if (!byVendor.has(p.vendor)) byVendor.set(p.vendor, []);
      byVendor.get(p.vendor)!.push(p);
    }
    const vendors = Array.from(byVendor.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    vendors.forEach(([, list]) => list.sort((a, b) => a.model.localeCompare(b.model, undefined, { numeric: true })));
    return { popular, vendors };
  }, [printers]);

  const item = (p: PrinterIndexEntry, key: string) => (
    <CommandItem
      key={key}
      value={`${key} ${p.model} ${p.vendor}`}
      onSelect={() => {
        onChange(p.id);
        setOpen(false);
      }}
      data-testid={`option-printer-${p.id}`}
      className="flex items-center gap-2"
    >
      <Check className={cn("h-4 w-4 shrink-0", value === p.id ? "opacity-100" : "opacity-0")} />
      <span className="flex-1 truncate">{p.model}</span>
      {tested?.printers[p.id]?.ok && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Slicer-tested" />}
      <span className="font-mono text-xs text-muted-foreground">
        {p.bed[0]}×{p.bed[1]} · {p.slots}
      </span>
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto w-full justify-between py-2.5 text-left"
          data-testid="button-printer-picker"
        >
          {current ? (
            <span className="flex min-w-0 flex-col">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="whitespace-normal break-words font-medium">{current.model}</span>
              </span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {Math.round(current.bed[0])} × {Math.round(current.bed[1])} × {Math.round(current.height)} mm · {slotLabel(current)}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{printers.length ? "Choose a printer" : "Loading printers…"}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1rem)] p-0" collisionPadding={8} align="start">
        <Command>
          <CommandInput placeholder={`Search ${printers.length} printers…`} value={search} onValueChange={setSearch} data-testid="input-printer-search" />
          <CommandList className="max-h-[360px]">
            <CommandEmpty className="px-3 py-5 text-center text-sm" data-testid="printer-search-empty">
              <p>No printer found.</p>
              <p className="mt-1 text-xs text-muted-foreground">Ask us to add it. We only list printers whose converted files slice in their own slicer.</p>
              <RequestPrinterButton className="mt-3" search={search} onBeforeOpen={() => setOpen(false)} />
            </CommandEmpty>
            <CommandGroup heading="Popular">{groups.popular.map((p) => item(p, `pop-${p.id}`))}</CommandGroup>
            {groups.vendors.map(([vendor, list]) => (
              <CommandGroup key={vendor} heading={vendor}>
                {list.map((p) => item(p, p.id))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
