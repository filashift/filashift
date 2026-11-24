import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { Mail, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMPANY, JtsEmblem, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { openReport } from "@/components/report-dialog";

const UPDATED = "November 23, 2026";
const EMAIL = "support@jacksoncgc.com";

function Page({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} — FilaShift`;
    window.scrollTo(0, 0);
    return () => {
      document.title = "FilaShift — 3MF printer converter";
    };
  }, [title]);
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

const Mailto = () => <a href={`mailto:${EMAIL}`}>{EMAIL}</a>;

export function Privacy() {
  return (
    <Page title="Privacy" intro={`How FilaShift handles your files and data. Last updated ${UPDATED}.`}>
      <S h="Your 3MF files stay on your device">
        <p>
          <strong>Conversion happens entirely in your browser.</strong> Your project files are read, converted and saved on your own computer or
          phone. They are never uploaded to FilaShift or anyone else, and we cannot see them.
        </p>
      </S>
      <S h="What the site loads">
        <p>
          Your browser downloads the FilaShift app, printer profiles, fonts and filament price lists from filashift.com only. We don't use analytics,
          advertising trackers, social widgets or cookies, and the site does not contact third-party servers while you use it.
        </p>
        <p>
          The web server does not keep access logs of visitors. Like any website, your internet address is visible to the server while a page is
          being delivered.
        </p>
      </S>
      <S h="Problem reports and email">
        <p>
          If you send a report through "Report a problem", we receive what you type, the optional link and email address, and, only if you leave
          the box ticked, a short summary of the conversion (file name, source and target printer, plate and filament counts, warnings and your
          browser version). Never the file itself. Reports are kept for up to 12 months to fix problems and then deleted. We use your email only to
          reply to you.
        </p>
      </S>
      <S h="Store and affiliate links">
        <p>
          Filament prices come from brand stores' public listings. When you click a store or Amazon link you leave FilaShift, and that site's own
          privacy policy applies. Some links are affiliate links: the store may set a cookie so that FilaShift can earn a small commission if you
          buy, at no extra cost to you. As an Amazon Associate, FilaShift earns from qualifying purchases.
        </p>
      </S>
      <S h="Children">
        <p>FilaShift is a general audience tool and does not knowingly collect personal information from children.</p>
      </S>
      <S h="Contact">
        <p>
          FilaShift is operated by {COMPANY}. Questions about privacy or a request to delete a report: <Mailto />.
        </p>
      </S>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms of use" intro={`Last updated ${UPDATED}.`}>
      <S h="Using FilaShift">
        <p>
          FilaShift is a free tool that converts 3D printing project files between slicers and printers. By using it you agree to these terms. If
          you don't agree, please don't use the site.
        </p>
      </S>
      <S h="Check before you print">
        <p>
          Converted projects are a best effort. Printers, slicer versions and filaments differ, so <strong>always open the converted project in your
          slicer and check the preview, temperatures and speeds before printing.</strong> You are responsible for what you print and for operating
          your printer safely.
        </p>
      </S>
      <S h="Your files and designers' rights">
        <p>
          Only convert files you are allowed to use. Converting a model does not change its licence: follow the designer's terms, including any
          non-commercial or no-remix conditions, and credit the designer when you share it.
        </p>
      </S>
      <S h="Prices and stores">
        <p>
          Filament prices, stock and discounts are collected from store listings several times a day and can be out of date. The store's checkout
          price is the one that counts. FilaShift does not sell anything and is not responsible for purchases you make from stores. Some store
          links earn FilaShift a commission.
        </p>
      </S>
      <S h="No warranty">
        <p>
          FilaShift is provided "as is", without warranties of any kind. To the extent the law allows, {COMPANY} is not liable for failed prints,
          damaged equipment, wasted material or any indirect loss arising from using the site.
        </p>
      </S>
      <S h="Open source">
        <p>
          The FilaShift software is licensed under the GNU AGPL-3.0. Printer and filament presets are derived from OrcaSlicer and Bambu Studio
          (AGPL-3.0), and our use of their names describes compatibility only.
        </p>
      </S>
      <S h="Trademarks">
        <p>
          Bambu Lab, MakerWorld, Snapmaker, Flashforge, Creality, Prusa, Elegoo, Anycubic, Qidi and other product names are trademarks of their
          owners. FilaShift is not affiliated with or endorsed by them. The FilaShift name and the JTS emblem belong to {COMPANY}.
        </p>
      </S>
      <S h="Changes and governing law">
        <p>
          We may update these terms; the date above shows the latest version. These terms are governed by the laws of the State of Wisconsin,
          USA. Questions: <Mailto />.
        </p>
      </S>
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
          <li>Files never leave your device. No upload, no account, no limits.</li>
          <li>Works in both directions across 225 printers from 15 brands.</li>
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
