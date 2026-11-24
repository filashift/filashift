import { usePageMeta } from "@/lib/seo";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search, Store, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { cn } from "@/lib/utils";
import { amazonSearch, closeColour, colourHex, nearestName, oneSpool, storeCode, hasAnyAffiliate, loadShopConfig, loadShopData, readQuery, shopUrl, type Item, type ShopConfig, type ShopData } from "@/lib/shop";

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
  const kg = (x: number) => (x < 1 ? `${Math.round(x * 1000)} g` : `${+x.toFixed(2)} kg`);
  return it.n > 1 ? `${it.n} × ${kg(it.kg / it.n)}` : kg(it.kg);
}

export default function Filament() {
  const [data, setData] = useState<Data | null>(null);
  const [cfg, setCfg] = useState<Config>({});
  const [err, setErr] = useState("");
  const q0 = useMemo(() => readQuery(), []);
  const [family, setFamily] = useState(() => (FAMILIES.includes(q0.get("f") || "") ? q0.get("f")! : "All"));
  const [type, setType] = useState(() => q0.get("t")?.slice(0,40) || "all");
  const [brand, setBrand] = useState("all");
  const [dia, setDia] = useState(() => ["2.85","any"].includes(q0.get("d") || "") ? q0.get("d")! : "1.75");
  const [pack, setPack] = useState(() => ["single","multi"].includes(q0.get("pack") || "") ? q0.get("pack")! : "any");
  const [sort, setSort] = useState(pack === "single" ? "price" : "ppk");
  const [color,setColor] = useState(() => /^[0-9a-f]{6}$/i.test(q0.get("color") || "") ? "#"+q0.get("color") : "");
  const changePack = (p:string) => {setPack(p); setSort(p === "single" ? "price" : "ppk");};
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

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = items.filter((i) => {
      if (inStock && !i.ok) return false;
      if (family !== "All" && i.f !== family) return false;
      if (type !== "all" && i.m.toLowerCase() !== type.toLowerCase()) return false;
      if (brand !== "all" && i.b !== brand) return false;
      if (dia !== "any" && String(i.d) !== dia) return false;
      if (pack === "single" && !oneSpool(i)) return false;
      if (color && !closeColour(i,color)) return false;
      if (pack === "multi" && i.kg < 2) return false;
      if (words.length) {
        const hay = `${i.b} ${i.t} ${i.v} ${i.m} ${i.c.join(" ")}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const off = (i: Item) => (i.was ? 1 - i.p / i.was : 0);
    out.sort((a, b) =>
      sort === "price" ? a.p - b.p : sort === "deal" ? off(b) - off(a) || a.ppk - b.ppk : a.ppk - b.ppk,
    );
    return out;
  }, [items, family, type, brand, dia, pack, sort, inStock, q, color]);

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
          {data && (
            <p className="mt-2 text-xs text-muted-foreground" data-testid="text-updated">
              {`${data.count.toLocaleString()} offers from ${storeCount} stores · updated ${ago(data.updated)}`}
            </p>
          )}
          {(affiliates || amazonUrl) && (
            <p className="mt-2 text-xs text-muted-foreground" data-testid="text-affiliate-disclosure">
              Some links and codes on this page are affiliate links. FilaShift may earn a commission at no extra cost to you; it never changes the
              price order.
            </p>
          )}
        </section>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={pack === "single" ? "default" : "outline"} aria-pressed={pack==="single"} onClick={()=>changePack("single")}>One spool for this print</Button>
          <Button size="sm" variant={pack === "multi" ? "default" : "outline"} aria-pressed={pack==="multi"} onClick={()=>changePack("multi")}>Compare bulk prices</Button>
          {color && <Button size="sm" variant="outline" onClick={()=>setColor("")} data-testid="clear-project-colour"><span style={{background:color}} className="mr-2 h-3 w-3 rounded-full border"/><span>Approximate colour:</span>&nbsp;{nearestName(color)} · <span>Clear</span></Button>}
        </div>
        {pack==="single" && <p className="mb-4 text-sm text-muted-foreground">One ready-to-use spool, up to 1.25 kg. Refills, multipacks and unconfirmed packaging are excluded. Prices exclude shipping and tax.</p>}
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
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Colour, brand or product" className="pl-8" data-testid="input-search" />
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

        {err && <p className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{err}</p>}

        {!data && !err && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />)}
          </div>
        )}

        {data && list.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No offers match these filters. Try another material or turn off "In stock only".
          </p>
        )}

        <ul className="space-y-2" data-testid="list-offers">
          {list.slice(0, shown).map((it, idx) => (
            <Offer key={`${it.u}-${idx}`} it={it} rank={idx + 1} cfg={cfg} />
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
            <Button asChild variant="outline">
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

function Offer({ it, rank, cfg }: { it: Item; rank: number; cfg: Config }) {
  const link = shopUrl(it.u, cfg, "finder");
  const code = storeCode(it.u, cfg);
  const off = it.was ? Math.round((1 - it.p / it.was) * 100) : 0;
  const colours = it.c.slice(0, 6);
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
        {code && (
          <div className="mt-1.5 text-xs" data-testid={`code-offer-${rank}`}>
            <span className="text-muted-foreground">Affiliate discount code at checkout:</span>{" "}
            <span className="select-all rounded border border-dashed border-primary/50 bg-primary/5 px-1.5 py-0.5 font-mono font-medium text-primary">{code}</span>
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="font-mono text-sm tabular-nums">{usd(it.ppk)}<span className="text-xs font-normal text-muted-foreground">/kg</span></div>
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
