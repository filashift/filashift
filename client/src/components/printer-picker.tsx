import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { PrinterIndexEntry } from "@/engine/types";
import { cn } from "@/lib/utils";

/** Shown first, in this order, under "Popular". */
const FEATURED = ["snapmaker-u1", "flashforge-ad5x", "flashforge-adventurer-5m", "flashforge-creator-5"];

export function slotLabel(p: Pick<PrinterIndexEntry, "slots" | "slotUnit">) {
  if (p.slots <= 1) return "1 filament";
  const u = p.slotUnit || "";
  if (/\d/.test(u)) return u;
  if (/extruder|toolchanger|IDEX|multi-color/i.test(u)) return `${p.slots} slots · ${u}`;
  return `${p.slots} slots · ${u || "multi-material"}`;
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
              <span className="truncate font-medium">{current.model}</span>
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
