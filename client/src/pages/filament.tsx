import { usePageMeta } from "@/lib/seo";
import { ElegooStoreLink } from "@/components/elegoo-store-link";
import { buyingSlug } from "@/lib/filament-buying-guide";
import { useT } from "@/lib/i18n";
import { atomicReel, limits, reelSpecs, reelStatus, type Feeder } from "@/lib/reel-fit";
import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, ExternalLink, Search, Store, Tag, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { cn } from "@/lib/utils";
import { amazonSearch, CLOSE, colourHex, nearestName, normHex, storeCode, hasAnyAffiliate, loadShopConfig, loadShopData, readQuery, shopUrl, VERY_CLOSE, type ColourHit, type Item, type ShopConfig, type ShopData } from "@/lib/shop";
import { addWatched, clearWatched, isCheaper, loadWatched, lowestPpk, removeWatched, searchItems, searchKey, type Search as WatchSearch, type Watched } from "@/lib/watch";

type Data = ShopData;
type Config = ShopConfig;

const FAMILIES = ["All", "PLA", "PETG", "ABS", "ASA", "TPU", "Nylon", "PC", "Other"];
const PAGE = 40;

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return `${Math.round(h / 24)} days ago`;
}
const usd = (n: number) => `$${n.toFixed(2)}`;
function size(it: Item) {
  if (!Number.isFinite(it.kg) || it.kg <= 0) return "";
  const kg = (x: number) => (x < 1 ? `${Math.round(x * 1000)} g` : `${+x.toFixed(2)} kg`);
  return it.n > 1 ? `${it.n} × ${kg(it.kg / it.n)}` : kg(it.kg);
}

export default function Filament() {
  const T = useT();
  const [data, setData] = useState<Data | null>(null);
  const [cfg, setCfg] = useState<Config>({});
  const [err, setErr] = useState("");
  const q0 = useMemo(() => readQuery(), []);
  const [family, setFamily] = useState(() => (FAMILIES.includes(q0.get("f") || "") ? q0.get("f")! : "All"));
  const [type, setType] = useState(() => q0.get("t")?.slice(0,40) || "all");
  const [brand, setBrand] = useState(() => q0.get("b")?.slice(0,60) || "all");
  const [feeder,setFeeder]=useState<Feeder>(()=>q0.get("feeder")==="ams"?"ams":q0.get("feeder")==="u1"?"u1":"none");
  const [dia, setDia] = useState(() => ["2.85","any"].includes(q0.get("d") || "") ? q0.get("d")! : "1.75");
  const [pack, setPack] = useState(() => ["single","multi"].includes(q0.get("pack") || "") ? q0.get("pack")! : "any");
  const [color,setColorRaw] = useState(() => /^[0-9a-f]{6}$/i.test(q0.get("color") || "") ? normHex(q0.get("color"))! : "");
  const [sort, setSort] = useState(() => {
    const s0 = q0.get("sort") || "";
    return ["ppk","price","deal"].includes(s0) || (s0 === "colour" && color) ? s0 : pack === "single" ? "price" : "ppk";
  });
  const setColor = (c:string) => {setColorRaw(c); if (!c && sort === "colour") setSort(pack === "single" ? "price" : "ppk");};
  const changePack = (p:string) => {setPack(p); if (sort !== "colour") setSort(p === "single" ? "price" : "ppk");};
  const [watched, setWatched] = useState<Watched[]>(() => loadWatched());
  const [inStock, setInStock] = useState(true);
  const [q, setQ] = useState(() => q0.get("q") || "");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadShopData()
      .then(setData)
      .catch(() => setErr("Prices could not be loaded. Please try again in a few minutes."));
    loadShopConfig().then(setCfg);
  }, []);
  usePageMeta("Filament prices per kg — compare brand stores | FilaShift", "Compare PLA, PETG, ABS, TPU and other 3D printer filament prices per kilogram across Bambu Lab, Elegoo, Sunlu, Overture, Polymaker and more, updated four times a day.");

  useEffect(() => setShown(PAGE), [family, type, brand, dia, pack, sort, inStock, q, color]);

  const items = data?.items ?? [];
  const types = useMemo(
    () => Array.from(new Set(items.filter((i) => family === "All" || i.f === family).map((i) => i.m))).sort(),
    [items, family],
  );
  const brands = useMemo(() => Array.from(new Set(items.map((i) => i.b))).sort((a, b) => a.localeCompare(b)), [items]);
  const storeCount = data ? Object.values(data.stores).filter((v) => typeof v === "number" && v > 0).length : 0;

  const search: WatchSearch = useMemo(() => ({ f: family, t: type, b: brand, d: dia, pack, color, q, stock: inStock }), [family, type, brand, dia, pack, color, q, inStock]);
  const { list, hits, withoutColour } = useMemo(() => {
    const { list: out, hits } = searchItems(items, search);
    const off = (i: Item) => (i.was ? 1 - i.p / i.was : 0);
    const de = (i: Item) => Math.round((hits.get(i)?.de ?? 99) * 2) / 2;
    out.sort((a, b) =>
      sort === "price" ? a.p - b.p : sort === "deal" ? off(b) - off(a) || a.ppk - b.ppk
        : sort === "colour" ? de(a) - de(b) || (pack === "single" ? a.p - b.p : a.ppk - b.ppk) : a.ppk - b.ppk,
    );
    // how many offers the colour filter alone hid, for the honest "no close colour" state
    const withoutColour = color && !out.length ? searchItems(items, { ...search, color: "" }).list.length : 0;
    return { list: out, hits, withoutColour };
  }, [items, search, sort, pack, color]);
  const nearest = color && list.length ? Math.min(...list.map((i) => hits.get(i)?.de ?? 99)) : null;
  const noCloseColour = !!data && !!color && (nearest === null ? withoutColour > 0 : nearest > CLOSE);
  const key = searchKey(search);
  const current = watched.find((w) => w.key === key);
  const low = useMemo(() => lowestPpk(items, search), [items, search]);

  const best = list[0];
  const amazonUrl = cfg.amazonTag
    ? amazonSearch(
        `${type !== "all" ? type : family !== "All" ? family : "PLA"} filament ${color ? nearestName(color)+" " : ""}${q && q.length < 30 ? q + " " : ""}${dia === "any" ? "" : dia+"mm"} ${pack==="single" ? "single spool" : pack==="multi" ? "bulk" : ""}`.trim(),
        cfg.amazonTag,
      )
    : "";
  const affiliates = hasAnyAffiliate(cfg);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader note={<span className="mr-2 hidden sm:inline">Prices from brand stores</span>} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <section className="mb-6 max-w-2xl">
          <h1 className="text-xl font-bold tracking-tight">Filament prices by the kilogram</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Compare 3D printing filament across brand stores by price per kg, including bulk packs and sales. Prices are read from each
            store's public listings several times a day.
          </p>
          <Link href={`/guides/${buyingSlug}`} className="mt-3 inline-block text-sm text-primary underline">{T("Which spool should I buy? A guide for five printers")}</Link>
          {data && (
            <p className="mt-2 text-xs text-muted-foreground" data-testid="text-updated">
              {`${data.count.toLocaleString()} offers from ${storeCount} stores · updated ${ago(data.updated)}`}
            </p>
          )}
          <div className="mt-3" translate="no">
            <ElegooStoreLink />
            <p className="mt-1 text-xs text-muted-foreground" data-testid="text-affiliate-disclosure">
              {T("Some links and codes on this page are affiliate links. FilaShift may earn a commission at no extra cost to you; it never changes the price order.")}
            </p>
          </div>
        </section>

        {watched.length > 0 && (
          <WatchedList
            watched={watched}
            items={data ? items : null}
            onOpen={(s) => {
              setFamily(s.f); setType(s.t); setBrand(s.b); setDia(s.d); setPack(s.pack); setColorRaw(s.color); setQ(s.q); setInStock(s.stock);
              setSort(s.pack === "single" ? "price" : "ppk");
            }}
            onRemove={(k) => setWatched(removeWatched(watched, k))}
            onClear={() => setWatched(clearWatched())}
          />
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={pack === "single" ? "default" : "outline"} aria-pressed={pack==="single"} onClick={()=>changePack("single")}>One spool for this print</Button>
          <Button size="sm" variant={pack === "multi" ? "default" : "outline"} aria-pressed={pack==="multi"} onClick={()=>changePack("multi")}>Compare bulk prices</Button>
          {color && <Button size="sm" variant="outline" onClick={()=>setColor("")} data-testid="clear-project-colour"><span style={{background:color}} className="mr-2 h-3 w-3 rounded-full border"/><span>Approximate color:</span>&nbsp;{nearestName(color)} · <span>Clear</span></Button>}
        </div>
        {pack==="single" && <p className="mb-4 text-sm text-muted-foreground">One ready-to-use spool, up to 1.25 kg. Refills, multipacks and unconfirmed packaging are excluded. Prices exclude shipping and tax.</p>}
        <div translate="no" className="mb-4 rounded-lg border px-3 py-2 text-sm">
          <label className="flex flex-wrap items-center gap-2 font-medium">{T("Check reel size")}
            <select className="rounded border bg-background p-2" value={feeder} data-testid="feeder" onChange={e=>setFeeder(e.target.value as Feeder)}>
              <option value="none">{T("Choose a feeder")}</option>
              <option value="ams">{T("Original Bambu Lab AMS")}</option><option value="u1">Snapmaker U1</option>
            </select></label>
          {feeder!=="none"&&<p className="mt-2 text-xs">{feeder==="ams"?(T("Width: 50–68 mm. Outer diameter: 197–202 mm.")):(T("Max width: 70 mm. Center hole: 52–60 mm. Up to 1 kg."))}{" "}<a className="underline" href={limits[feeder]}>{T("Manufacturer’s limits")}</a>. {T("Dimensions only; not a guarantee that the material will feed.")}</p>}
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Material">
          {FAMILIES.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={family === f}
              onClick={() => {setFamily(f);setType("all");}}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                family === f ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary",
              )}
              data-testid={`chip-${f.toLowerCase()}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
          <div className="relative col-span-2 sm:col-span-3 lg:col-span-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Color, brand or product" className="pl-8" data-testid="input-search" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger data-testid="select-type" aria-label="Type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(type !== "all" && !types.includes(type) ? [type,...types] : types).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger data-testid="select-brand" aria-label="Brand"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={pack} onValueChange={changePack}>
            <SelectTrigger data-testid="select-pack" aria-label="Pack size"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any size</SelectItem>
              <SelectItem value="single">Single spool</SelectItem>
              <SelectItem value="multi">Bulk, 2 kg and up</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dia} onValueChange={setDia}>
            <SelectTrigger data-testid="select-diameter" aria-label="Diameter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1.75">1.75 mm</SelectItem>
              <SelectItem value="2.85">2.85 mm</SelectItem>
              <SelectItem value="any">Any diameter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger data-testid="select-sort" aria-label="Sort"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ppk">Lowest price per kg</SelectItem>
              <SelectItem value="price">Lowest total price</SelectItem>
              <SelectItem value="deal">Biggest discount</SelectItem>
              {color && <SelectItem value="colour">Closest color</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Switch id="instock" checked={inStock} onCheckedChange={setInStock} data-testid="switch-instock" />
            <Label htmlFor="instock" className="text-sm">In stock only</Label>
          </div>
          <div className="text-sm text-muted-foreground" data-testid="text-count">
            {data ? `${list.length.toLocaleString()} result${list.length === 1 ? "" : "s"}` : err ? "" : "Loading prices…"}
            {best && (sort === "ppk" || sort === "price") && <> {"· from"} <span className="font-medium text-foreground" translate="no">{sort === "price" ? usd(best.p) : `${usd(best.ppk)}/kg`}</span></>}
          </div>
        </div>

        {data && (
          <div className="mb-4 flex flex-wrap items-center gap-2" data-testid="watch-controls">
            {current ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setWatched(removeWatched(watched, key))} data-testid="unwatch-search"><BellOff className="mr-1.5 h-3.5 w-3.5" /><span>Stop watching</span></Button>
                <WatchStatus w={current} now={low} testId="watch-status-current" />
              </>
            ) : (
              <Button size="sm" variant="outline" disabled={low === null} onClick={() => low !== null && setWatched(addWatched(watched, search, low))} data-testid="watch-search"><Bell className="mr-1.5 h-3.5 w-3.5" /><span>Watch this search</span></Button>
            )}
            <span className="text-xs text-muted-foreground">Saved only in this browser, never sent to FilaShift. No account or email.</span>
            {color && <span className="text-xs text-muted-foreground">With a color, only close matches count.</span>}
          </div>
        )}

        {color && data && (
          <p className="mb-4 text-xs text-muted-foreground" data-testid="text-colour-help">
            Color closeness is ΔE (CIEDE2000) between the project color and the store's swatch, or a color estimated from its name. Under 5 is very close, under 12 is close.
          </p>
        )}
        {noCloseColour && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200" role="status" data-testid="no-close-colour">
            <p className="font-medium">No close color match</p>
            <p className="mt-1">{list.length ? "None of these offers is a close color match. The nearest ones are listed, but they will look noticeably different." : "No offer with these filters is close to this color."}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setColor("")} data-testid="show-all-colours">Show all colors</Button>
          </div>
        )}

        {err && <p className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{err}</p>}

        {!data && !err && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />)}
          </div>
        )}

        {data && list.length === 0 && !noCloseColour && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No offers match these filters. Try another material or turn off "In stock only".
          </p>
        )}

        <ul className="space-y-2" data-testid="list-offers">
          {list.slice(0, shown).map((it, idx) => (
            <Offer key={`${it.u}-${idx}`} it={it} rank={idx + 1} cfg={cfg} feeder={feeder} hit={hits.get(it)} />
          ))}
        </ul>

        {list.length > shown && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => setShown((s) => s + PAGE)} data-testid="button-more">
              {`Show more (${(list.length - shown).toLocaleString()} left)`}
            </Button>
          </div>
        )}

        {amazonUrl && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-card-border bg-card p-4">
            <div className="text-sm">
              <div className="font-medium">Also check Amazon</div>
              <div className="text-xs text-muted-foreground">Amazon prices change often and aren't included in the list above.</div>
            </div>
            <Button asChild variant="outline" className="max-w-full flex-wrap whitespace-normal">
              <a href={amazonUrl} target="_blank" rel="sponsored noopener noreferrer" data-testid="link-amazon">
                Search Amazon <span className="ml-1 text-xs font-normal opacity-75">(affiliate link)</span>
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}
      </main>

      <SiteFooter>
        <p>
          Prices, discounts and stock come from each store's public product listings and can change at any time. Shipping and tax are not
          included. Always confirm the price on the store's page before buying.
          {affiliates && " Some store links are affiliate links: if you buy after clicking one, FilaShift may earn a commission at no extra cost to you."}
          {amazonUrl && " As an Amazon Associate, FilaShift earns from qualifying purchases."}
        </p>
      </SiteFooter>
    </div>
  );
}

const money = (n: number) => `$${n.toFixed(2)}/kg`;
function WatchStatus({ w, now, testId }: { w: Watched; now: number | null; testId: string }) {
  if (now === null) return <span className="text-xs text-muted-foreground" data-testid={testId} data-state="none">No offers match right now</span>;
  const cheaper = isCheaper(w, now);
  return (
    <Badge variant={cheaper ? "default" : "outline"} className={cn("whitespace-normal text-left font-normal", cheaper && "bg-primary/15 text-primary hover:bg-primary/15")} data-testid={testId} data-state={cheaper ? "cheaper" : "same"}>
      {cheaper ? `Cheaper than when you saved it (was ${money(w.ppk)}, now ${money(now)})` : `Not cheaper yet (was ${money(w.ppk)}, now ${money(now)})`}
    </Badge>
  );
}

function WatchedList({ watched, items, onOpen, onRemove, onClear }: { watched: Watched[]; items: Item[] | null; onOpen: (s: WatchSearch) => void; onRemove: (key: string) => void; onClear: () => void }) {
  const chip = "rounded-full border border-border px-2 py-0.5";
  return (
    <section className="mb-5 rounded-xl border border-card-border bg-card p-3 sm:p-4" aria-labelledby="watched-heading" data-testid="watched-list">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="watched-heading" className="text-sm font-semibold">Watched searches</h2>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onClear} data-testid="watched-clear">Clear all</Button>
      </div>
      <ul className="divide-y divide-border">
        {watched.map((w, i) => {
          const s = w.s;
          const now = items ? lowestPpk(items, s) : undefined;
          return (
            <li key={w.key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 text-xs" data-testid={`watched-${i}`}>
              <div className="flex min-w-0 flex-1 basis-56 flex-wrap items-center gap-1">
                {s.t !== "all" || s.f !== "All" ? <span className={cn(chip, "font-medium")} translate="no">{s.t !== "all" ? s.t : s.f}</span> : <span className={cn(chip, "font-medium")}>All materials</span>}
                {s.b !== "all" && <span className={chip} translate="no">{s.b}</span>}
                <span className={chip}>{s.d === "any" ? "Any diameter" : `${s.d} mm`}</span>
                <span className={chip}>{s.pack === "single" ? "Single spool" : s.pack === "multi" ? "Bulk, 2 kg and up" : "Any size"}</span>
                {s.color && <span className={cn(chip, "inline-flex items-center gap-1")}><span className="h-2.5 w-2.5 rounded-full border border-black/15 dark:border-white/20" style={{ background: s.color }} aria-hidden /><span>{`close to ${nearestName(s.color)}`}</span></span>}
                {s.q && <span className={chip} translate="no">{`“${s.q}”`}</span>}
                {!s.stock && <span className={chip}>Including out of stock</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">{`Saved ${w.at.slice(0, 10)}`}</span>
                {now !== undefined && <WatchStatus w={w} now={now} testId={`watched-status-${i}`} />}
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onOpen(s)} data-testid={`watched-open-${i}`}>Show</Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onRemove(w.key)} aria-label="Remove watched search" data-testid={`watched-remove-${i}`}><Trash2 className="mr-1 h-3 w-3" /><span>Remove</span></Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Offer({ it, rank, cfg, feeder, hit }: { it: Item; rank: number; cfg: Config; feeder: Feeder; hit?: ColourHit }) {
  const T = useT();
  const status=feeder==="none"?null:reelStatus(it,feeder), reel=status==="within"||status==="outside"?atomicReel(it):null;
  const labels={within:T("Within size limits"),outside:T("Outside size limits"),unknown:T("Reel dimensions unverified"),refill:T("Refill: check your reusable reel")};
  const link = shopUrl(it.u, cfg, "finder");
  const code = storeCode(it.u, cfg);
  const off = it.was ? Math.round((1 - it.p / it.was) * 100) : 0;
  const colours = it.c.slice(0, 6);
  const knownWeight = Number.isFinite(it.kg) && it.kg > 0;
  const bulk = it.n > 1 || it.kg >= 2;
  const packLabel = knownWeight && bulk && !(it.form === "spool" && it.n === 1)
    ? T(it.n > 1 || it.form === "pack" ? "{kg} kg pack total:" : "Total for {kg} kg:", { kg: it.kg.toLocaleString(T.lang, { maximumFractionDigits: 6 }) })
    : null;
  return (
    <li
      className={cn(
        "grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-xl border border-card-border bg-card p-3 sm:grid-cols-[2.5rem_1fr_auto_auto] sm:p-4",
        !it.ok && "opacity-70",
      )}
      data-testid={`offer-${rank}`}
    >
      <div className="hidden font-mono text-xs text-muted-foreground sm:block">{rank}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="font-medium">{it.m}</Badge>
          {it.form === "refill" && <Badge variant="outline">Refill</Badge>}
          <span className="text-sm font-medium">{it.b}</span>
          {it.d !== 1.75 && <Badge variant="outline">{it.d} mm</Badge>}
          {off >= 5 && (
            <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
              <Tag className="mr-1 h-3 w-3" /> {`${off}% off`}
            </Badge>
          )}
          {!it.ok && <Badge variant="outline">{it.ok === false ? "Out of stock" : "Stock not confirmed"}</Badge>}
        </div>
        <div className="mt-1 truncate text-sm text-foreground/90" title={it.t} translate="no">{it.t}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground" translate="no">
          {size(it)}
          {(it.v || colours.length > 0) && <> · {it.v || colours.join(", ")}</>}
        </div>
        <div className="mt-1 flex gap-1" aria-hidden="true" translate="no">
          {it.c.slice(0, 12).map((c, i) => {
            const h = colourHex(c, it.x?.[i]);
            return h ? <span key={i} title={c} className="h-3 w-3 rounded-full border border-black/15 dark:border-white/20" style={{ background: h }} /> : null;
          })}
        </div>
        {hit && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs" data-testid={`colour-${rank}`} data-de={hit.de.toFixed(2)}>
            <span className="h-3 w-3 rounded-full border border-black/15 dark:border-white/20" style={{ background: hit.hex }} aria-hidden />
            <span className={cn("font-medium", hit.de <= CLOSE ? "text-primary" : "text-amber-700 dark:text-amber-300")}>{hit.de <= VERY_CLOSE ? "Very close" : hit.de <= CLOSE ? "Close match" : "Noticeably different"}</span>
            <span className="font-mono tabular-nums text-muted-foreground" translate="no">{`ΔE ${hit.de.toFixed(1)}`}</span>
            {hit.estimated && <span className="text-muted-foreground">color estimated from its name</span>}
          </div>
        )}
        {status&&<div translate="no" data-testid="reel-fit" data-status={status} className="mt-2 text-xs">
          <span className="font-semibold">{feeder==="ams"?"AMS":"U1"}: {labels[status]}</span>
          {reel&&<div>{T("Width")} {reel.width} mm · Ø {reel.outer} mm · {T("hole")} {reel.bore} mm · <a href={reelSpecs} className="text-primary underline">{T("Atomic reel specs")}</a></div>}
        </div>}
        {code && (
          <div className="mt-1.5 text-xs" data-testid={`code-offer-${rank}`}>
            <span className="text-muted-foreground">Affiliate discount code at checkout:</span>{" "}
            <span className="select-all rounded border border-dashed border-primary/50 bg-primary/5 px-1.5 py-0.5 font-mono font-medium text-primary">{code}</span>
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="font-mono text-sm tabular-nums">{usd(it.ppk)}<span className="text-xs font-normal text-muted-foreground">/kg</span></div>
        {packLabel && <div translate="no" data-testid="bulk-pack-total-label" className="max-w-36 text-xs text-muted-foreground">{packLabel}</div>}
        <div className="font-mono text-base font-semibold tabular-nums">
          {it.was && <span className="mr-1 line-through">{usd(it.was)}</span>}
          {usd(it.p)}
        </div>
      </div>
      <Button asChild size="sm" variant={it.ok ? "default" : "outline"} className="col-span-2 sm:col-span-1">
        <a href={link.href} target="_blank" rel={link.sponsored ? "sponsored noopener noreferrer" : "noopener noreferrer"} data-testid={`link-offer-${rank}`}>
          <Store className="mr-1.5 h-3.5 w-3.5" /> {it.r}
        </a>
      </Button>
    </li>
  );
}
