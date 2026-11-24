import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ChevronDown, ExternalLink, ShoppingBag, Store } from "lucide-react";
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
  shopUrl,
  type Match,
  type ShopConfig,
  type ShopData,
} from "@/lib/shop";
import { cn } from "@/lib/utils";

type Need = { color: string; type: string; slot?: number };

/** "Filament for this print": cheapest close colour matches for each slot of a converted project */
export function ProjectFilament({ needs, testId }: { needs: Need[]; testId: string }) {
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
    const k = `${familyOf(n.type)}|${n.color.toLowerCase()}`;
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
              · {rows.length} colour{rows.length === 1 ? "" : "s"}
            </span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-primary/15 px-3 pb-3">
        <ul className="divide-y divide-border">
          {rows.map((n, i) => (
            <NeedRow key={i} need={n} data={data} cfg={cfg} testId={`${testId}-row-${i}`} />
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Closest colours from brand store listings, cheapest first. Colours on screen are approximate, so check the store photo.
          {sponsored && " Some links are affiliate links; FilaShift may earn a commission at no extra cost to you."}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NeedRow({ need, data, cfg, testId }: { need: Need; data: ShopData | null; cfg: ShopConfig; testId: string }) {
  const fam = familyOf(need.type);
  const word = nearestName(need.color);
  const matches: Match[] = data ? matchOffers(data.items, need.type, need.color, 2) : [];
  const more = filamentLink({ f: fam === "Other" ? "All" : fam, q: word });
  return (
    <li className="py-2.5" data-testid={testId}>
      <div className="flex items-center gap-2 text-sm">
        <span className="h-4 w-4 shrink-0 rounded-full border border-black/15 dark:border-white/20" style={{ background: need.color }} aria-hidden />
        {need.slot ? <span className="font-mono text-xs text-muted-foreground">{need.slot}</span> : null}
        <span className="font-medium">{need.type}</span>
        <span className="text-muted-foreground">· close to {word}</span>
      </div>
      {!data ? (
        <div className="mt-2 h-8 animate-pulse rounded bg-secondary" />
      ) : matches.length ? (
        <ul className="mt-1.5 space-y-1.5">
          {matches.map((m, j) => {
            const link = shopUrl(m.item.u, cfg);
            return (
              <li key={j} className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 shrink-0 rounded-full border border-black/15 dark:border-white/20" style={{ background: m.hex }} aria-hidden />
                <span className="min-w-0 flex-1 truncate" title={`${m.item.b} ${m.item.t} · ${m.colour}`}>
                  <span className="font-medium">{m.item.b}</span> {m.colour} · <span className="text-muted-foreground">{m.item.m}</span>
                </span>
                <span className="font-mono tabular-nums">${m.item.ppk.toFixed(2)}/kg</span>
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
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <Link href={more} className="text-primary hover:underline" data-testid={`${testId}-more`}>
          Compare all {fam === "Other" ? need.type : fam} in {word}
        </Link>
        {cfg.amazonTag && (
          <a
            href={amazonSearch(`${need.type} filament ${word} 1.75mm`, cfg.amazonTag)}
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
