import { Link, useRoute } from "wouter";
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { SITE, useJsonLd, usePageMeta } from "@/lib/seo";
import NotFound from "./not-found";

function Shell({ children }: { children: React.ReactNode }) {
  useEffect(() => window.scrollTo(0, 0), []);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6" lang="en" translate="no">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function GuidesIndex() {
  usePageMeta(
    "3MF conversion guides: STL, OBJ, MakerWorld to Flashforge, Creality, Prusa | FilaShift",
    "Step-by-step guides for converting 3MF files: 3MF to STL and OBJ, MakerWorld and Bambu Studio projects to Flashforge, Creality and Snapmaker, PrusaSlicer to Bambu, and keeping multi-colour prints intact.",
  );
  return (
    <Shell>
      <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
        3MF conversion guides
      </h1>
      <p className="mt-3 text-muted-foreground">
        Short, tested workflows for moving 3D printing projects between slicers and printers, and for turning 3MF files into STL or OBJ.
      </p>
      <ul className="mt-8 space-y-3" data-testid="list-guides">
        {GUIDES.map((g) => (
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
      </ul>
    </Shell>
  );
}

export function GuidePage() {
  const [, params] = useRoute("/guides/:slug");
  const g = guideBySlug(params?.slug || "");
  usePageMeta(g?.meta || "Guide not found — FilaShift", g?.desc);
  useJsonLd(
    "ld-guide",
    g
      ? {
          "@context": "https://schema.org",
          "@graph": [
            {
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
                { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
                { "@type": "ListItem", position: 3, name: g.title, item: `${SITE}/guides/${g.slug}` },
              ],
            },
          ],
        }
      : null,
  );
  if (!g) return <NotFound />;
  const href = g.printer ? `/?printer=${g.printer}` : "/";
  const others = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 4);
  return (
    <Shell>
      <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">
          FilaShift
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/guides" className="hover:text-foreground">
          Guides
        </Link>
      </nav>
      <article>
        <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl" data-testid="text-page-title">
          {g.title}
        </h1>
        <p className="mt-3 text-muted-foreground">{g.intro}</p>

        <section className="mt-6 rounded-xl border border-primary/25 bg-primary/[0.04] p-5" aria-labelledby="steps">
          <h2 id="steps" className="text-base font-semibold">
            Steps
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
              {g.cta || "Open the converter"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">Free · no account · your file never leaves your device</p>
        </section>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed">
          {g.sections.map((s) => (
            <section key={s.h}>
              <h2 className="mb-2 text-lg font-semibold">{s.h}</h2>
              {s.p?.map((t, i) => (
                <p key={i} className="mb-3 text-muted-foreground">
                  {t}
                </p>
              ))}
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
            <h2 className="mb-2 text-lg font-semibold">Questions</h2>
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
          Updated {new Date(g.updated + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Tested with
          OrcaSlicer 2.5.2, Bambu Studio 2.9 and PrusaSlicer 2.8.
        </p>
      </article>

      <aside className="mt-10 border-t border-border pt-6">
        <h2 className="text-sm font-semibold">More guides</h2>
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
