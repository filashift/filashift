import { useEffect, useState } from "react";
import { PATH_ROUTING } from "@/routing";
import { ChevronDown, ExternalLink, Search, ShoppingBag, Store } from "lucide-react";
import type { Feeder } from "@/lib/reel-fit";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  amazonSearch,
  familyOf,
  filamentLink,
  hasAnyAffiliate,
  loadShopConfig,
  loadShopData,
  matchOffers,
  nearestName,
  normHex,
  slotType,
  shopUrl,
  storeCode,
  type Match,
  type ShopConfig,
  type ShopData,
} from "@/lib/shop";
import { cn } from "@/lib/utils";

/** one converted slot; `presets` = source and target preset names, used to find the subtype (Silk, Matte, PLA+ …) */
type Need = { color: string; type: string; diameter?: number; slot?: number; presets?: string[] };

/** "Filament for this print": cheapest close colour matches for each slot of a converted project */
export function ProjectFilament({ needs, testId, feeder = "none" }: { needs: Need[]; testId: string; feeder?: Feeder }) {
  const [data, setData] = useState<ShopData | null>(null);
  const [cfg, setCfg] = useState<ShopConfig>({});
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    loadShopData().then(setData).catch(() => setFailed(true));
    loadShopConfig().then(setCfg);
  }, []);
  if (failed || !needs.length) return null;

  // one row per material family + colour
  const seen = new Set<string>();
  const rows = needs.filter((n) => {
    const k = `${slotType(n.type, n.presets) || n.type}|${n.diameter}|${normHex(n.color) || n.color.toLowerCase()}`;
    return !seen.has(k) && seen.add(k);
  });
  const sponsored = hasAnyAffiliate(cfg) || !!cfg.amazonTag;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-4 rounded-lg border border-primary/25 bg-primary/[0.03]" data-testid={testId}>
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm" data-testid={`${testId}-toggle`}>
          <span className="flex items-center gap-2 font-medium">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Filament for this print
            <span className="font-normal text-muted-foreground">
              {`· ${rows.length} colour${rows.length === 1 ? "" : "s"}`}
            </span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-primary/15 px-3 pb-3">
        <ul className="divide-y divide-border">
          {rows.map((n, i) => (
            <NeedRow key={i} need={n} data={data} cfg={cfg} feeder={feeder} testId={`${testId}-row-${i}`} />
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Matches use the same material family and an approximate colour. Within each colour-match band, lower prices per kg come first.
          {sponsored && " Some links are affiliate links; FilaShift may earn a commission at no extra cost to you."}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NeedRow({ need, data, cfg, feeder, testId }: { need: Need; data: ShopData | null; cfg: ShopConfig; feeder: Feeder; testId: string }) {
  const fam = familyOf(need.type);
  const sub = slotType(need.type, need.presets);
  const hex = normHex(need.color);
  const word = hex ? nearestName(hex) : "";
  const knownDia = need.diameter === 1.75 || need.diameter === 2.85;
  const matches: Match[] = data && knownDia && hex ? matchOffers(data.items, need.type, hex, 2, need.diameter, sub) : [];
  const codes = [...new Set(matches.map((m) => storeCode(m.item.u, cfg) && `${m.item.r}: ${storeCode(m.item.u, cfg)}`).filter(Boolean))];
  // material family, subtype when known, filament diameter, colour and the target printer's feeder
  const params: Record<string, string> = { f: fam, d: knownDia ? String(need.diameter) : "any",
    ...(hex ? { color: hex.slice(1) } : {}), ...(sub ? { t: sub } : {}), ...(feeder !== "none" ? { feeder } : {}) };
  const href = (extra: Record<string, string>) => (PATH_ROUTING ? "" : "#") + filamentLink({ ...params, ...extra });
  return (
    <li className="py-2.5" data-testid={testId}>
      <div className="flex items-center gap-2 text-sm">
        <span className="h-4 w-4 shrink-0 rounded-full border border-black/15 dark:border-white/20" style={{ background: need.color }} aria-hidden />
        {need.slot ? <span className="font-mono text-xs text-muted-foreground">{need.slot}</span> : null}
        <span className="font-medium" translate="no">{sub || need.type}</span>
        {word && <span className="text-muted-foreground">{`· close to ${word}`}</span>}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button asChild size="sm" className="h-8 px-3 text-xs">
          <a href={href({ pack: "single", ...(hex ? { sort: "colour" } : {}) })} target="_blank" rel="noopener" data-testid={`${testId}-find`}>
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Find matching filament
          </a>
        </Button>
        {feeder !== "none" && <span className="text-xs text-muted-foreground" data-testid={`${testId}-feeder`}>{feeder === "ams" ? "Reel size check: original Bambu Lab AMS" : "Reel size check: Snapmaker U1"}</span>}
      </div>
      {!data ? (
        <div className="mt-2 h-8 animate-pulse rounded bg-secondary" />
      ) : matches.length ? (
        <ul className="mt-1.5 space-y-1.5">
          {matches.map((m, j) => {
            const link = shopUrl(m.item.u, cfg, "converter");
            return (
              <li key={j} className="flex flex-wrap items-center gap-2 rounded border p-2 text-xs" translate="no">
                <span className="h-3 w-3 shrink-0 rounded-full border border-black/15 dark:border-white/20" style={{ background: m.hex }} aria-hidden />
                <span className="min-w-32 flex-1 break-words">
                  <span className="block font-medium">{m.item.t}</span>
                  <span>{m.item.v || m.colour} · {m.item.m} · {m.item.d} mm · {m.item.kg} kg</span>
                </span>
                <span className="text-right font-mono tabular-nums"><strong className="block">${m.item.p.toFixed(2)}</strong>${m.item.ppk.toFixed(2)}/kg</span>
                <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                  <a href={link.href} target="_blank" rel={link.sponsored ? "sponsored noopener noreferrer" : "noopener noreferrer"} data-testid={`${testId}-offer-${j}`}>
                    <Store className="mr-1 h-3 w-3" />
                    {m.item.r}
                  </a>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">No close match in stock right now.</p>
      )}
      {codes.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground" data-testid={`${testId}-code`}>
          Affiliate discount code {codes.map((c, i) => (
            <span key={i} className="mr-1 select-all rounded border border-dashed border-primary/50 px-1 font-mono text-primary">{c}</span>
          ))}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {!knownDia && <span>Confirm filament diameter in the finder.</span>}
        <a href={href({ pack: "single" })} target="_blank" rel="noopener" className="font-semibold text-primary underline" data-testid={`${testId}-single`}>One spool for this print</a>
        <a href={href({ pack: "multi" })} target="_blank" rel="noopener" className="text-primary underline" data-testid={`${testId}-bulk`}>Compare bulk prices</a>
        {cfg.amazonTag && (
          <a
            href={amazonSearch(`${sub || need.type} filament ${word} ${knownDia ? `${need.diameter}mm` : ""}`, cfg.amazonTag)}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            data-testid={`${testId}-amazon`}
          >
            Amazon <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </li>
  );
}
