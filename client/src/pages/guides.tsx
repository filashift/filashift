import { Link, useRoute } from "wouter";
import { limits, reelSpecs } from "@/lib/reel-fit";
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { GUIDES, guideBySlug, type Guide } from "@/lib/guides";
import { localGuide } from "@/lib/guides-local";
import { LOCALES, langParam, tr, useLang } from "@/lib/i18n";

/** The guide in the current language (translated text when available, English otherwise). */
function useLocal() {
  const lang = useLang();
  const loc = (g: Guide): Guide => localGuide(lang, g);
  const L = (en: string) => tr(lang, en);
  return { lang, loc, L };
}
import { siteUrl, useJsonLd, usePageMeta } from "@/lib/seo";
import NotFound from "./not-found";

function Shell({ children }: { children: React.ReactNode }) {
  const { lang } = useLocal();
  // Some browsers return a Promise from scrollTo. It is not an effect cleanup.
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6" lang={lang} translate="no">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function GuidesIndex() {
  const { loc, L } = useLocal();
  const topics = [
    { id: "mesh", label: L("Mesh export"), example: "STL / OBJ" },
    { id: "project", label: L("Printer conversion"), example: L("Slicers and colors") },
    { id: "shop", label: L("Filament buying"), example: L("Single spools") },
  ].map(t => ({ ...t, guides: GUIDES.filter(g => t.id === (g.shopping ? "shop" : g.slug === "3mf-to-stl" ? "mesh" : "project")).map(loc) }));
  usePageMeta(
    L("3MF conversion guides: STL, OBJ, MakerWorld to Flashforge, Creality, Prusa | FilaShift"),
    L("Step-by-step guides for converting 3MF files: 3MF to STL and OBJ, MakerWorld and Bambu Studio projects to Flashforge, Creality and Snapmaker, PrusaSlicer to Bambu, and keeping multi-color prints intact."),
  );
  return (
    <Shell>
      <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
        {L("3D printing guides")}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {L("Short, tested workflows for moving 3D printing projects between slicers and printers, and for turning 3MF files into STL or OBJ.")}
      </p>
      <nav aria-label={L("Browse guides by topic")} className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {topics.map(t => <button key={t.id} type="button" data-testid={`topic-${t.id}`} aria-controls={`guides-${t.id}`}
          onClick={() => { const target = document.getElementById(`guides-${t.id}`); target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: "start" }); }}
          className="group rounded-xl border border-card-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.04] focus-visible:ring-2 focus-visible:ring-primary">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">{t.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{t.guides.length}<span className="sr-only"> {L(t.guides.length === 1 ? "guide" : "guides")}</span></span>
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground group-hover:text-primary">{t.example}</span>
        </button>)}
      </nav>
      <div data-testid="list-guides">
      {topics.map(({ id: group, guides }) => <section key={group} id={`guides-${group}`} aria-labelledby={`heading-${group}`} tabIndex={-1} className="mt-8 scroll-mt-32 rounded-lg">
      <h2 id={`heading-${group}`} className="mb-2 text-xl font-semibold">{group === "shop" ? L("Filament buying guides") : group === "mesh"
        ? L("Convert 3MF to STL or OBJ")
        : L("Convert 3MF between slicers and printers")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{group === "shop" ? L("Choose a first spool for your printer and project.") : group === "mesh"
        ? L("Choose this if you need the model’s shape for another program.")
        : L("Keep a project in 3MF when you need its plates, colors, and print settings on another printer.")}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="group flex h-full items-start gap-3 rounded-xl border border-card-border bg-card p-3 transition-colors hover:border-primary/50"
              data-testid={`link-guide-${g.slug}`}
            >
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium group-hover:text-primary">{g.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{g.desc}</span>
              </span>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul></section>)}
      </div>
    </Shell>
  );
}

export function GuidePage() {
  const [, params] = useRoute("/guides/:slug");
  const { lang, loc, L } = useLocal();
  const g0 = guideBySlug(params?.slug || "");
  const g = g0 && loc(g0);
  usePageMeta(g?.meta || L("Guide not found — FilaShift"), g?.desc, { alternates: !!g, noindex: !g });
  useJsonLd(
    "ld-guide",
    g
      ? {
          "@context": "https://schema.org",
          "@graph": [
            g.shopping ? { "@type":"Article", headline:g.title, description:g.desc, dateModified:g.updated, inLanguage:lang } : {
              "@type": "HowTo",
              name: g.title,
              description: g.desc,
              dateModified: g.updated,
              inLanguage: lang,
              step: g.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
            },
            {
              "@type": "FAQPage",
              mainEntity: g.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "FilaShift", item: siteUrl("/", lang) },
                { "@type": "ListItem", position: 2, name: L("Guides"), item: siteUrl("/guides", lang) },
                { "@type": "ListItem", position: 3, name: g.title, item: siteUrl(`/guides/${g.slug}`, lang) },
              ],
            },
          ],
        }
      : null,
  );
  if (!g) return <NotFound />;
  const spoolLink = (material?:string, model?:string) => `/filament?pack=single&d=1.75${material ? `&f=${material}&t=${material}` : ""}${model==="bambu-lab-x1-carbon"?"&feeder=ams":model==="snapmaker-u1"?"&feeder=u1":""}${langParam(lang) ? `&${langParam(lang)}` : ""}`;
  const href = g.shopping ? spoolLink() : g.printer ? `/?printer=${g.printer}` : "/";
  const others = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 4).map(loc);
  return (
    <Shell>
      <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">
          FilaShift
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/guides" className="hover:text-foreground">
          {L("Guides")}
        </Link>
      </nav>
      <article>
        <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl" data-testid="text-page-title">
          {g.title}
        </h1>
        <p className="mt-3 text-muted-foreground">{g.intro}</p>
        {g.shopping && <nav aria-label={L("Jump to your printer")} className="mt-5 flex flex-wrap gap-2">{g.sections.map(s=><button type="button" className="rounded-lg border px-3 py-2 text-sm text-primary hover:underline" onClick={()=>{const target=document.getElementById(s.model!);target?.focus({preventScroll:true});target?.scrollIntoView({block:"start"});}} key={s.model}>{s.h}</button>)}</nav>}

        <section className="mt-6 rounded-xl border border-primary/25 bg-primary/[0.04] p-5" aria-labelledby="steps">
          <h2 id="steps" className="text-base font-semibold">
            {g.shopping ? L("Before you buy") : L("Steps")}
          </h2>
          <ol className="mt-3 space-y-2.5">
            {g.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[15px]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-medium text-primary-foreground">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <Button asChild className="mt-5 h-auto min-h-9 max-w-full gap-2 whitespace-normal py-2 text-left">
            <Link href={href} data-testid="link-guide-cta">
              {g.cta || L("Open the converter")}
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">{g.shopping ? L("FilaShift may earn a commission from partner store links at no extra cost to you. Prices and stock can change before checkout.") : L("Free · no account · your file never leaves your device")}</p>
        </section>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed">
          {g.sections.map((s) => (
            <section key={s.h} id={s.model} tabIndex={s.model ? -1 : undefined} aria-label={s.model ? s.h : undefined} className={s.model ? "scroll-mt-20 border-t border-border pt-5" : undefined}>
              {s.material && <p className="mb-1 text-xs font-semibold text-primary">{L("First spool")} · {s.material} · 1.75 mm</p>}
              <h2 className="mb-2 text-lg font-semibold">{s.h}</h2>
              {s.p?.map((t, i) => (
                <p key={i} className="mb-3 text-muted-foreground">
                  {t}
                </p>
              ))}
              {s.warning && <aside aria-labelledby={`${s.model}-warning`} className="my-4 rounded-md border-l-4 border-amber-600 bg-amber-500/10 p-4">
                <h3 id={`${s.model}-warning`} className="font-semibold">{s.warning.title}</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5">{s.warning.items.map(item=><li key={item}>{item}</li>)}</ul>
              </aside>}
              {(s.model==="bambu-lab-x1-carbon"||s.model==="snapmaker-u1")&&<div translate="no" className="my-4 rounded-lg border p-4 text-sm" data-testid="atomic-reel-guide">
                <h3 className="mb-2 font-semibold">{L("Atomic Filament: check the reel")}</h3>
                <p><strong>{s.model==="snapmaker-u1"?L("1 kg: Outside size limits."):L("1 kg: Within size limits.")}</strong>{" "}
                  {s.model==="snapmaker-u1"?L("Atomic’s AMS-compatible reel is 67 mm wide, but its 51 mm center hole is smaller than the U1 holder’s 52 mm minimum."):L("Atomic’s AMS-compatible reel is 67 mm wide and 200 mm across. Both measurements are within the original AMS limits (50–68 mm wide, 197–202 mm across).")}</p>
                <p className="mt-2"><strong>{L("3.5 kg jumbo: Outside size limits.")}</strong>{" "}{s.model==="snapmaker-u1"?L("At 95 mm wide it exceeds the U1’s 70 mm limit, as well as its 1 kg capacity."):L("At 95 mm wide and 305 mm across, it exceeds both AMS limits.")}</p>
                <p className="mt-2 text-muted-foreground">{L("These labels compare published measurements, not how the material feeds. If the exact reel is unverified, ask the seller before ordering.")}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-primary underline"><a href={reelSpecs}>{L("Atomic reel dimensions")}</a><a href={s.model==="snapmaker-u1"?limits.u1:limits.ams}>{s.model==="snapmaker-u1"?L("Snapmaker U1 limits"):L("Original AMS limits")}</a></div>
              </div>}
              {s.material && <div className="flex flex-wrap items-center gap-x-5 gap-y-2"><Button asChild variant="outline"><Link href={spoolLink(s.material,s.model)}>{tr(lang, "Compare {material} spools", { material: s.material })}</Link></Button><a className="text-sm text-primary underline" href={s.source}>{L("Manufacturer’s guide")}<span className="sr-only">: {s.h}</span></a></div>}
              {s.model === "snapmaker-u1" && <a className="mt-2 inline-block text-sm text-primary underline" href="https://wiki.snapmaker.com/en/FAQ/u1">{L("Snapmaker spool dimensions FAQ")}</a>}
              {s.list && (
                <ul className="space-y-1.5">
                  {s.list.map((t, i) => (
                    <li key={i} className="flex gap-2 text-muted-foreground">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <section>
            <h2 className="mb-2 text-lg font-semibold">{L("Questions")}</h2>
            <dl className="space-y-4">
              {g.faq.map((f) => (
                <div key={f.q}>
                  <dt className="font-medium">{f.q}</dt>
                  <dd className="mt-1 text-muted-foreground">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          {L("Updated ")}
          <time dateTime={g.updated}>{new Date(g.updated + "T12:00:00Z").toLocaleDateString(LOCALES[lang], { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</time>.
          {g.editorialNote && <span className="mt-1 block" data-testid="guide-editorial-note">
            {g.editorialNote}{" "}
            <Link href={`/guides/flashforge-creality-to-bambu${langParam(lang) ? `?${langParam(lang)}` : ""}`} className="text-primary underline">
              {L("How to convert these projects for Bambu Studio")}
            </Link>
          </span>}
        </p>
      </article>

      <aside className="mt-10 border-t border-border pt-6">
        <h2 className="text-sm font-semibold">{L("More guides")}</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/guides/${o.slug}`} className="text-sm text-primary hover:underline">
                {o.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </Shell>
  );
}
