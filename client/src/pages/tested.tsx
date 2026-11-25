// Public slicer test results: /profiles/tested.json (scripts/tested.py) joined with /profiles/index.json.
// English text is translated by the DOM translator (es.json / es-patterns.ts); printer names, slicer names and
// versions are marked translate="no".
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { BadgeCheck, CircleDashed, FileJson, FlaskConical, Search } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { slotLabel, useTested } from "@/components/printer-picker";
import { RequestPrinterButton } from "@/components/printer-request";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PrinterIndexEntry } from "@/engine/types";
import { SITE, siteUrl, useJsonLd, usePageMeta } from "@/lib/seo";
import { PATH_LANG, tr, useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SLICERS = ["OrcaSlicer", "Bambu Studio", "PrusaSlicer"] as const;
type Out = { slicer: string; ok: boolean; passed: number; tests: number; note?: string };

let indexP: Promise<PrinterIndexEntry[]> | null = null;
function usePrinters() {
  const [list, setList] = useState<PrinterIndexEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    indexP ??= fetch("./profiles/index.json").then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    });
    indexP.then(setList).catch(() => { indexP = null; setFailed(true); });
  }, []);
  return { list, failed };
}

const initialParam = (k: string) => {
  try {
    return new URLSearchParams(window.location.search || window.location.hash.split("?")[1] || "").get(k) || "";
  } catch {
    return "";
  }
};

export default function TestedPage() {
  const lang = useLang(), L = (en: string, v?: Record<string, string | number>) => tr(lang, en, v);
  usePageMeta(
    "Printer test results: every profile sliced in OrcaSlicer, Bambu Studio or PrusaSlicer | FilaShift",
    "See which 3D printer profiles FilaShift has tested: sample 3MF projects converted for each printer and sliced in its destination slicer's command-line tool, with slicer versions, pass counts and notes.",
  );
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const tested = useTested();
  const { list: printers, failed } = usePrinters();
  const [q, setQ] = useState(initialParam("q"));
  const [brand, setBrand] = useState(initialParam("brand") || "all");
  const [slicer, setSlicer] = useState<string>(SLICERS.includes(initialParam("slicer") as any) ? initialParam("slicer") : "all");

  const rows = useMemo(() => {
    if (!printers) return [];
    return printers
      .map((p) => {
        const t = tested?.printers[p.id];
        const outs: Out[] = t?.outputs
          ? SLICERS.filter((s) => t.outputs![s]).map((s) => ({ slicer: s, ...t.outputs![s] }))
          : t ? [{ slicer: t.slicer || p.slicer || "OrcaSlicer", ok: t.ok, passed: t.passed, tests: t.tests, note: t.note }] : [];
        return { p, t, outs };
      })
      .sort((a, b) => a.p.vendor.localeCompare(b.p.vendor) || a.p.model.localeCompare(b.p.model, undefined, { numeric: true }));
  }, [printers, tested]);
  const brands = useMemo(() => [...new Set(rows.map((r) => r.p.vendor))].sort((a, b) => a.localeCompare(b)), [rows]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = rows.filter(({ p, outs }) =>
    (brand === "all" || p.vendor === brand) &&
    (slicer === "all" || outs.some((o) => o.slicer === slicer)) &&
    words.every((w) => `${p.vendor} ${p.model} ${p.short} ${p.id} ${p.slotUnit}`.toLowerCase().includes(w)),
  );
  const passed = rows.filter((r) => r.t?.ok).length;

  useJsonLd(
    "ld-tested",
    tested && printers
      ? {
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: L("FilaShift printer profile slicer test results"),
          description: L("Results of converting sample 3MF projects for {count} 3D printer profiles and slicing each converted file in its destination slicer's command-line tool ({versions}). Software slice tests, not physical prints.", { count: printers.length, versions: Object.entries(tested.slicers).map(([n, v]) => `${n} ${v}`).join(", ") }),
          inLanguage: lang,
          url: siteUrl("/tested", PATH_LANG ?? "en"),
          dateModified: tested.date,
          isAccessibleForFree: true,
          creator: { "@type": "Organization", name: "Jackson Technology Solutions LLC", url: siteUrl("/about", PATH_LANG ?? "en") },
          measurementTechnique: L("Sample projects converted by FilaShift and sliced with the OrcaSlicer, Bambu Studio and PrusaSlicer command-line interfaces"),
          variableMeasured: ["printer profile", "destination slicer", "slicer version", "slice tests passed", "slice tests run", "colour slots"].map((v) => L(v)),
          distribution: [
            { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE}/profiles/tested.json` },
            { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE}/profiles/index.json` },
          ],
        }
      : null,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-page-title">Printer test results</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Every printer FilaShift lists has been checked in software: sample projects were converted for it and the converted files were sliced in the printer's own slicer. Search for your printer to see what was tested.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3" data-testid="tested-summary">
          <div className="rounded-xl border border-card-border bg-card p-4">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Printers</div>
            <div className="mt-1 text-lg font-semibold" data-testid="text-tested-count">{printers && tested ? `${passed} of ${rows.length} printers slicer-tested` : "Loading…"}</div>
          </div>
          <div className="rounded-xl border border-card-border bg-card p-4">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Slicers</div>
            <ul className="mt-1 text-sm" translate="no" data-testid="list-tested-slicers">
              {tested ? Object.entries(tested.slicers).map(([n, v]) => <li key={n}><span className="font-medium">{n}</span> <span className="font-mono text-muted-foreground">{v}</span></li>) : <li>…</li>}
            </ul>
          </div>
          <div className="rounded-xl border border-card-border bg-card p-4">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Last run</div>
            <div className="mt-1 font-mono text-lg font-semibold" translate="no" data-testid="text-tested-date">{tested ? <time dateTime={tested.date}>{tested.date}</time> : "…"}</div>
          </div>
        </div>

        <section className="mt-8 rounded-xl border border-primary/25 bg-primary/[0.04] p-5" aria-labelledby="method">
          <h2 id="method" className="flex items-center gap-2 text-base font-semibold"><FlaskConical className="h-4 w-4 text-primary" />How the tests work</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Sample projects (listed below) are converted for every printer profile by the same code that runs in your browser.</li>
            <li>Each converted file is sliced with the command-line version of its destination slicer: OrcaSlicer, Bambu Studio or PrusaSlicer, at the versions shown above. A test passes when the slicer writes G-code without errors.</li>
            <li>Prusa printers that offer both outputs are tested as PrusaSlicer projects and as OrcaSlicer projects. Pass counts include the tested nozzle variants.</li>
            <li>A note such as “large models must be scaled to fit this bed” means a sample was bigger than the bed. The converter warns and suggests a scale; that test counts as not passed.</li>
            <li>These are software tests, not physical prints. They show that the converted file opens and slices, not how it prints. Always check the preview in your slicer before printing.</li>
          </ul>
          {tested && (
            <>
              <h3 className="mt-4 text-sm font-semibold">Sample projects</h3>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground" data-testid="list-tested-samples">
                {tested.samples.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a className="inline-flex items-center gap-1 text-primary underline" href="./profiles/tested.json" data-testid="link-tested-json"><FileJson className="h-4 w-4" />Test results (JSON)</a>
            <a className="inline-flex items-center gap-1 text-primary underline" href="./profiles/index.json" data-testid="link-index-json"><FileJson className="h-4 w-4" />Printer list (JSON)</a>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="results">
          <h2 id="results" className="text-xl font-semibold">Results by printer</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search printers" aria-label="Search printers" className="pl-8" data-testid="input-tested-search" />
            </div>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger aria-label="Brand" data-testid="select-tested-brand"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                {brands.map((b) => <SelectItem key={b} value={b}><span translate="no">{b}</span></SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={slicer} onValueChange={setSlicer}>
              <SelectTrigger aria-label="Slicer" data-testid="select-tested-slicer"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All slicers</SelectItem>
                {SLICERS.map((s) => <SelectItem key={s} value={s}><span translate="no">{s}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite" data-testid="text-tested-shown">{printers ? `Showing ${shown.length} of ${rows.length} printers` : failed ? "The printer list could not be loaded. Refresh the page to try again." : "Loading…"}</p>

          {printers && shown.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center" data-testid="tested-empty">
              <p className="font-medium">No printer matches.</p>
              <p className="mt-1 text-sm text-muted-foreground">Check the spelling, clear the filters, or ask us to add it.</p>
              <RequestPrinterButton className="mt-3" search={q} testId="button-request-printer-empty" />
            </div>
          )}

          {shown.length > 0 && (
            <table className="mt-4 w-full border-collapse text-sm" data-testid="table-tested">
              <thead className="sr-only md:not-sr-only md:table-header-group">
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">Printer</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Result</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Slicer and version</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Colour slots</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Tested</th>
                  <th scope="col" className="py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ p, t, outs }) => {
                  const notes = [...new Set(outs.map((o) => o.note).filter(Boolean) as string[])];
                  return (
                    <tr key={p.id} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-border py-3 md:table-row md:py-0" data-testid={`row-tested-${p.id}`}>
                      <td className="col-span-2 md:py-2.5 md:pr-3 md:align-top">
                        <Link href={`/?printer=${p.id}`} className="font-medium hover:text-primary hover:underline" translate="no">{p.model}</Link>
                        <div className="text-xs text-muted-foreground" translate="no">{p.vendor}</div>
                      </td>
                      <td className="col-span-2 md:py-2.5 md:pr-3 md:align-top">
                        {t?.ok ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"><BadgeCheck className="h-3.5 w-3.5" />Slicer-tested</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"><CircleDashed className="h-3.5 w-3.5" />{!t?.tests ? "Unverified" : "Not yet passed"}</span>
                        )}
                        {t && <div className="mt-1 text-xs text-muted-foreground">{`${t.passed} of ${t.tests} slice tests passed`}</div>}
                      </td>
                      <td className="col-span-2 md:py-2.5 md:pr-3 md:align-top">
                        <span className="mr-1 text-xs text-muted-foreground md:hidden">Slicer and version:</span>
                        <ul className="inline md:block">
                          {outs.map((o) => (
                            <li key={o.slicer} className={cn("inline md:block", "after:content-[';_'] last:after:content-none md:after:content-none")}>
                              <span translate="no"><span className="font-medium">{o.slicer}</span> <span className="font-mono text-xs">{tested?.slicers[o.slicer] || ""}</span></span>
                              {outs.length > 1 && <span className="text-xs text-muted-foreground"> · <span translate="no">{o.passed}/{o.tests}</span></span>}
                            </li>
                          ))}
                          {!outs.length && <li className="inline text-muted-foreground">No recorded result</li>}
                        </ul>
                      </td>
                      <td className="col-span-2 md:py-2.5 md:pr-3 md:align-top">
                        <span className="mr-1 text-xs text-muted-foreground md:hidden">Colour slots:</span>
                        <span>{slotLabel(p)}</span>
                        {p.nozzles && p.nozzles.length > 1 && <div className="text-xs text-muted-foreground">{`Nozzles: ${p.nozzles.join(", ")} mm`}</div>}
                      </td>
                      <td className="col-span-2 text-xs text-muted-foreground md:py-2.5 md:pr-3 md:align-top">
                        <span className="mr-1 md:hidden">Tested:</span>
                        <span className="font-mono" translate="no">{t?.tests && tested ? t.date || tested.date : "—"}</span>
                      </td>
                      <td className="col-span-2 text-xs text-muted-foreground md:py-2.5 md:align-top">
                        {p.prusaOnly && <div>PrusaSlicer only: always converted to a PrusaSlicer project.</div>}
                        {p.prusa && !p.prusaOnly && <div>PrusaSlicer or OrcaSlicer output.</div>}
                        {notes.map((n) => <div key={n}>{n === "large models must be scaled to fit this bed" ? "Large models must be scaled to fit this bed." : n}</div>)}
                        {p.vendor === "WonderMaker" && <a href="./samples/wondermaker-results.json" className="text-primary underline">WonderMaker test results</a>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-10 rounded-xl border border-card-border bg-card p-6" aria-labelledby="request">
          <h2 id="request" className="font-semibold">Printer not listed?</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Tell us the brand and model. We add printers from the official OrcaSlicer, Bambu Studio and PrusaSlicer profiles, and only list one after its converted files slice without errors in its own slicer.
          </p>
          <RequestPrinterButton variant="default" className="mt-4" search={shown.length === 0 ? q : ""} testId="button-request-printer-tested" />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
