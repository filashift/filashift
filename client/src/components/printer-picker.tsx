import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { PrinterIndexEntry } from "@/engine/types";
import { cn } from "@/lib/utils";

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
  printers: Record<string, { ok: boolean; passed: number; tests: number; note?: string }>;
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
export function testedLabel(d: TestedDoc | null, p: Pick<PrinterIndexEntry, "id" | "slicer">): string | null {
  const t = d?.printers[p.id];
  if (!d || !t?.ok) return null;
  const sl = p.slicer || "OrcaSlicer";
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

export function TestedNote({ id, slicer }: { id: string; slicer?: string }) {
  const d = useTested();
  const label = testedLabel(d, { id, slicer: slicer as any });
  if (!label) return null;
  const note = d!.printers[id].note;
  return (
    <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground" data-testid="text-tested-note">
      <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <span>
        {label}
        {note ? ` Note: ${note}.` : ""}
      </span>
    </p>
  );
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
              <span className="flex items-center gap-2">
                <span className="truncate font-medium">{current.model}</span>
                <TestedBadge id={current.id} slicer={current.slicer} />
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
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${printers.length} printers…`} data-testid="input-printer-search" />
          <CommandList className="max-h-[360px]">
            <CommandEmpty>No printer found.</CommandEmpty>
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
