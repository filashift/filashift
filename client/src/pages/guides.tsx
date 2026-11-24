import { Link, useRoute } from "wouter";
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { GUIDES, guideBySlug, type Guide } from "@/lib/guides";
import { GUIDES_ES } from "@/lib/guides-es";
import { useLang } from "@/lib/i18n";

/** The guide in the current language (Spanish text when available, English otherwise). */
function useLocal() {
  const lang = useLang();
  const es = lang === "es";
  const loc = (g: Guide): Guide => (es && GUIDES_ES[g.slug] ? { ...g, ...GUIDES_ES[g.slug] } : g);
  const L = (en: string, sp: string) => (es ? sp : en);
  return { es, loc, L };
}
import { SITE, useJsonLd, usePageMeta } from "@/lib/seo";
import NotFound from "./not-found";

function Shell({ children }: { children: React.ReactNode }) {
  const { es } = useLocal();
  useEffect(() => window.scrollTo(0, 0), []);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6" lang={es ? "es" : "en"} translate="no">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function GuidesIndex() {
  const { loc, L } = useLocal();
  usePageMeta(
    L(
      "3MF conversion guides: STL, OBJ, MakerWorld to Flashforge, Creality, Prusa | FilaShift",
      "Guías de conversión 3MF: STL, OBJ, MakerWorld a Flashforge, Creality, Prusa | FilaShift",
    ),
    L(
      "Step-by-step guides for converting 3MF files: 3MF to STL and OBJ, MakerWorld and Bambu Studio projects to Flashforge, Creality and Snapmaker, PrusaSlicer to Bambu, and keeping multi-colour prints intact.",
      "Guías paso a paso para convertir archivos 3MF: 3MF a STL y OBJ, proyectos de MakerWorld y Bambu Studio a Flashforge, Creality y Snapmaker, PrusaSlicer a Bambu y cómo conservar las impresiones multicolor.",
    ),
  );
  return (
    <Shell>
      <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
        {L("3D printing guides", "Guías de impresión 3D")}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {L(
          "Short, tested workflows for moving 3D printing projects between slicers and printers, and for turning 3MF files into STL or OBJ.",
          "Flujos de trabajo breves y probados para pasar proyectos de impresión 3D entre laminadores e impresoras, y para convertir archivos 3MF a STL u OBJ.",
        )}
      </p>
      <div data-testid="list-guides">
      {["mesh", "project", "shop"].map(group => <section key={group} className="mt-8">
      <h2 className="mb-2 text-xl font-semibold">{group === "shop" ? L("Filament buying guides","Guías de compra de filamento") : group === "mesh"
        ? L("Convert 3MF to STL or OBJ", "Convertir 3MF a STL u OBJ")
        : L("Convert 3MF between slicers and printers", "Convertir 3MF entre laminadores e impresoras")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{group === "shop" ? L("Choose a first spool for your printer and project.","Elige una primera bobina para tu impresora y tu proyecto.") : group === "mesh"
        ? L("Choose this if you need the model’s shape for another program.", "Elige esta opción si necesitas la geometría del modelo para otro programa.")
        : L("Keep a project in 3MF when you need its plates, colors, and print settings on another printer.", "Mantén el proyecto en formato 3MF si necesitas sus placas, colores y ajustes de impresión en otra impresora.")}</p>
      <ul className="space-y-3">
        {GUIDES.filter(g => group === (g.shopping ? "shop" : g.slug === "3mf-to-stl" ? "mesh" : "project")).map(loc).map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="group flex items-start gap-3 rounded-xl border border-card-border bg-card p-4 transition-colors hover:border-primary/50"
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
  const { es, loc, L } = useLocal();
  const g0 = guideBySlug(params?.slug || "");
  const g = g0 && loc(g0);
  usePageMeta(g?.meta || L("Guide not found — FilaShift", "Guía no encontrada — FilaShift"), g?.desc);
  useJsonLd(
    "ld-guide",
    g
      ? {
          "@context": "https://schema.org",
          "@graph": [
            g.shopping ? { "@type":"Article", headline:g.title, description:g.desc, dateModified:g.updated, inLanguage:es?"es":"en" } : {
              "@type": "HowTo",
              name: g.title,
              description: g.desc,
              dateModified: g.updated,
              step: g.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
            },
            {
              "@type": "FAQPage",
              mainEntity: g.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "FilaShift", item: `${SITE}/` },
                { "@type": "ListItem", position: 2, name: L("Guides", "Guías"), item: `${SITE}/guides` },
                { "@type": "ListItem", position: 3, name: g.title, item: `${SITE}/guides/${g.slug}` },
              ],
            },
          ],
        }
      : null,
  );
  if (!g) return <NotFound />;
  const href = g.shopping ? "/filament?pack=single&d=1.75" : g.printer ? `/?printer=${g.printer}` : "/";
  const others = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 4).map(loc);
  return (
    <Shell>
      <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">
          FilaShift
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/guides" className="hover:text-foreground">
          {L("Guides", "Guías")}
        </Link>
      </nav>
      <article>
        <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl" data-testid="text-page-title">
          {g.title}
        </h1>
        <p className="mt-3 text-muted-foreground">{g.intro}</p>
        {g.shopping && <nav aria-label={L("Jump to your printer","Ir a tu impresora")} className="mt-5 flex flex-wrap gap-2">{g.sections.map(s=><button type="button" className="rounded-lg border px-3 py-2 text-sm text-primary hover:underline" onClick={()=>{const target=document.getElementById(s.model!);target?.focus({preventScroll:true});target?.scrollIntoView({block:"start"});}} key={s.model}>{s.h}</button>)}</nav>}

        <section className="mt-6 rounded-xl border border-primary/25 bg-primary/[0.04] p-5" aria-labelledby="steps">
          <h2 id="steps" className="text-base font-semibold">
            {g.shopping ? L("Before you buy","Antes de comprar") : L("Steps", "Pasos")}
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
          <Button asChild className="mt-5 gap-2">
            <Link href={href} data-testid="link-guide-cta">
              {g.cta || L("Open the converter", "Abrir el convertidor")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">{g.shopping ? L("FilaShift may earn a commission from partner store links at no extra cost to you. Prices and stock can change before checkout.","FilaShift puede recibir una comisión de las tiendas asociadas sin coste adicional para ti. El precio y el inventario pueden cambiar antes del pago.") : L("Free · no account · your file never leaves your device", "Gratis · sin cuenta · tu archivo nunca sale de tu dispositivo")}</p>
        </section>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed">
          {g.sections.map((s) => (
            <section key={s.h} id={s.model} tabIndex={s.model ? -1 : undefined} aria-label={s.model ? s.h : undefined} className={s.model ? "scroll-mt-20 border-t border-border pt-5" : undefined}>
              {s.material && <p className="mb-1 text-xs font-semibold text-primary">{L("First spool","Primera bobina")} · {s.material} · 1.75 mm</p>}
              <h2 className="mb-2 text-lg font-semibold">{s.h}</h2>
              {s.p?.map((t, i) => (
                <p key={i} className="mb-3 text-muted-foreground">
                  {t}
                </p>
              ))}
              {s.material && <div className="flex flex-wrap items-center gap-x-5 gap-y-2"><Button asChild variant="outline"><Link href={`/filament?pack=single&d=1.75&f=${s.material}&t=${s.material}`}>{L(`Compare ${s.material} spools`,`Comparar bobinas de ${s.material}`)}</Link></Button><a className="text-sm text-primary underline" href={s.source}>{L("Manufacturer’s guide","Guía del fabricante")}<span className="sr-only">: {s.h}</span></a></div>}
              {s.model === "snapmaker-u1" && <a className="mt-2 inline-block text-sm text-primary underline" href="https://wiki.snapmaker.com/en/FAQ/u1">{L("Snapmaker spool dimensions FAQ","Preguntas frecuentes sobre las dimensiones de bobina")}</a>}
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
            <h2 className="mb-2 text-lg font-semibold">{L("Questions", "Preguntas")}</h2>
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
          {es ? "Actualizado el " : "Updated "}
          <time dateTime={g.updated}>{new Date(g.updated + "T12:00:00Z").toLocaleDateString(es ? "es-ES" : "en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</time>.
        </p>
      </article>

      <aside className="mt-10 border-t border-border pt-6">
        <h2 className="text-sm font-semibold">{L("More guides", "Más guías")}</h2>
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
