import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { Mail, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMPANY, JtsEmblem, SiteFooter, SiteHeader, SOURCE_URL } from "@/components/site-chrome";
import { openReport } from "@/components/report-dialog";
import { useLang } from "@/lib/i18n";
import { usePageMeta } from "@/lib/seo";
import { LEGAL_UPDATED, privacySections, termsSections } from "./legal";

const EMAIL = "support@jacksoncgc.com";

function Page({ title, intro, children, desc }: { title: string; intro?: ReactNode; children: ReactNode; desc?: string }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [title]);
  usePageMeta(`${title} — FilaShift`, desc || (typeof intro === "string" ? intro : undefined));
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          {title}
        </h1>
        {intro && <p className="mt-3 text-muted-foreground">{intro}</p>}
        <div className="prose-info mt-8 space-y-8 text-[15px] leading-relaxed">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

function S({ h, children }: { h: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold">{h}</h2>
      <div className="space-y-3 text-muted-foreground [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}


export function Source() {
  const es = useLang() === "es";
  const sha: string = (import.meta as any).env.VITE_RELEASE_SHA || "";
  const pinned = /^[a-f0-9]{40}$/.test(sha);
  return <Page title={es ? "Código fuente" : "Source code"} intro={es
    ? "La conversión se realiza en tu navegador. Tus archivos 3MF y STL no se suben a FilaShift."
    : "Conversion happens in your browser. Your 3MF and STL files are not uploaded to FilaShift."}>
    <div translate="no" className="space-y-8">
      <S h={es ? "Código de esta versión" : "Source for this version"}>
        {pinned && <p><a download href={`/downloads/filashift-${sha}.tar.gz`}>{es ? "Descargar el código fuente (.tar.gz)" : "Download release source (.tar.gz)"}</a><br/>
          <span>{es ? "Versión" : "Revision"}: <code>{sha.slice(0,12)}</code></span></p>}
        <p><a href={pinned ? `${SOURCE_URL}/tree/${sha}` : SOURCE_URL}>{es ? "Ver el código en GitHub" : "Browse the source on GitHub"}</a></p>
      </S>
      <S h={es ? "Licencia y atribuciones" : "License and credits"}>
        <p>{es ? "El software se publica bajo la GNU AGPL, versión 3 o posterior." : "The software is released under the GNU AGPL, version 3 or later."}{" "}
          <a href={`${SOURCE_URL}/blob/${pinned ? sha : "master"}/LICENSE`}>{es ? "Leer la licencia" : "Read the license"}</a>{" · "}
          <a href={`${SOURCE_URL}/blob/${pinned ? sha : "master"}/NOTICE.md`}>{es ? "Avisos de terceros y marcas" : "Third-party and trademark notices"}</a></p>
      </S>
    </div>
  </Page>;
}

export function Privacy() {
  const lang = useLang();
  const es = lang === "es";
  return (
    <Page title={es ? "Privacidad" : "Privacy"} intro={es ? `Cómo trata FilaShift tus archivos y datos. Última actualización: ${LEGAL_UPDATED.es}.` : `How FilaShift handles your files and data. Last updated ${LEGAL_UPDATED.en}.`}>
      <div translate="no" className="contents">
        {privacySections(lang).map((x) => (
          <S key={x.h} h={x.h}>
            {x.body}
          </S>
        ))}
      </div>
    </Page>
  );
}

export function Terms() {
  const lang = useLang();
  const es = lang === "es";
  return (
    <Page title={es ? "Condiciones de uso" : "Terms of use"} intro={es ? `Última actualización: ${LEGAL_UPDATED.es}.` : `Last updated ${LEGAL_UPDATED.en}.`}>
      <div translate="no" className="contents">
        {termsSections(lang).map((x) => (
          <S key={x.h} h={x.h}>
            {x.body}
          </S>
        ))}
      </div>
    </Page>
  );
}

export function About() {
  return (
    <Page title="About FilaShift" intro="A free, private converter that moves 3D printing projects between printers, built in stages and tested in real slicers.">
      <S h="Why we built it">
        <p>
          Great models are often published for one printer. Opening a Bambu Lab project on a Flashforge, Snapmaker or Creality machine (or the other
          way round) usually means losing colours, plates or settings. FilaShift rewrites the project for your printer while keeping the geometry,
          painting, plates and the designer's important settings, and tells you exactly what changed.
        </p>
      </S>
      <S h="What makes it different">
        <ul>
          <li>Files never leave your device. No upload or account is needed.</li>
          <li>Works in both directions across 234 printers from 15 brands.</li>
          <li>A plain conversion report for every file, so nothing changes silently.</li>
          <li>Filament price comparison by the kilogram across brand stores.</li>
        </ul>
      </S>
      <S h="Who we are">
        <div className="flex items-start gap-4">
          <JtsEmblem className="h-12 shrink-0" />
          <p>
            FilaShift is built and operated by <strong>Jackson Technology Solutions LLC</strong>, a subsidiary of{" "}
            <strong>Jackson Consolidated Group of Companies LLC</strong>, based in Waukesha, Wisconsin.
          </p>
        </div>
      </S>
      <S h="Get in touch">
        <p>
          Found a file that doesn't convert well? Use <Link href="/contact">Contact</Link> or the report link on any converted file. Real-world
          examples are how FilaShift gets better.
        </p>
      </S>
    </Page>
  );
}

export function Contact() {
  return (
    <Page title="Contact" intro="Questions, partnership ideas or a file that didn't convert well — we'd like to hear from you.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-card-border bg-card p-5">
          <MessageSquareWarning className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-semibold">Report a problem</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe what went wrong. For conversion issues, use the link under the converted file so the details are filled in for you.
          </p>
          <Button className="mt-4" onClick={() => openReport()} data-testid="button-contact-report">
            Report a problem
          </Button>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-semibold">Email</h2>
          <p className="mt-1 text-sm text-muted-foreground">For everything else, including stores and brands that want to be listed.</p>
          <Button asChild variant="outline" className="mt-4">
            <a href={`mailto:${EMAIL}?subject=FilaShift`} data-testid="link-contact-email">
              {EMAIL}
            </a>
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        FilaShift is operated by {COMPANY}, Waukesha, Wisconsin, USA. Please don't email project files you aren't allowed to share; a link to the
        model page is usually enough.
      </p>
    </Page>
  );
}
