import { useEffect } from "react";
import { Link } from "wouter";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useTested } from "@/components/printer-picker";
import { FILE_LIMIT } from "@/lib/conversion-facts";
import { tr, useLang } from "@/lib/i18n";
import { useJsonLd, usePageMeta } from "@/lib/seo";
import { slicerFirst } from "@/lib/slicer-first";

const FAQ = [
  {
    q: "Are my files uploaded anywhere?",
    a: "No. FilaShift reads and rewrites the project inside this browser tab. Your 3MF never leaves your device; the only downloads are the page itself and the printer profiles you pick.",
  },
  {
    q: "Which files can I convert?",
    a: "3MF projects saved by Bambu Studio, the OrcaSlicer family (OrcaSlicer, Creality Print, ElegooSlicer, Anycubic Slicer Next, Orca-Flashforge, Snapmaker Orca) and PrusaSlicer 2.4 or newer, including MakerWorld and Printables downloads. PrusaSlicer projects keep their parts, painted colors, color changes and main print settings; speeds and line widths use the new printer's defaults because PrusaSlicer stores them differently.",
  },
  {
    q: "Can I convert 3MF to STL or OBJ?",
    a: "Yes. Add the 3MF and use Export STL or Export OBJ under the file. Parts stay in their plate positions, in millimeters, with one file per plate. STL keeps only the shape; OBJ also keeps one color per part. Painted colors, plates and print settings only survive in a 3MF, so convert the 3MF instead when you want to keep them.",
  },
  {
    q: "Can I convert STL back to 3MF?",
    a: "Yes. Choose an STL, select your printer, then convert and download the new 3MF. STL contains geometry only, so check the scale, material and print settings in your slicer.",
  },
  {
    q: "How do I keep slicer settings when switching printers?",
    a: slicerFirst.en.settings,
  },
  {
    q: "Can I convert back to Bambu?",
    a: "Yes. Conversion works in every direction, for example Bambu to Flashforge, Flashforge to Snapmaker, Creality back to Bambu, or PrusaSlicer to Bambu Studio.",
  },
  {
    q: "What happens to multi-color prints?",
    a: "Each color is matched to one of your printer's filament slots. If the project has more colors than you have slots, extra colors share the closest slot, or, when colors sit at different heights, FilaShift can add filament-change pauses so every color still prints. You can change every mapping before converting.",
  },
  {
    q: "What does Slicer-tested mean?",
    a: "A Slicer-tested badge means sample projects converted for that printer profile sliced without errors in its destination slicer. Check the preview before printing.",
  },
  {
    q: "Is there a file size limit?",
    a: FILE_LIMIT.en,
  },
  {
    q: "Will it print exactly the same?",
    a: "Not always. Different printers need different speeds, temperatures and limits, so FilaShift adapts them and lists every change in the report. Always open the file in your slicer, check the preview and slice it yourself.",
  },
  {
    q: "Does it cost anything?",
    a: "No. FilaShift is free and does not require an account. Some store links on the filament price page are affiliate links that may earn a commission, which helps keep the converter running.",
  },  {
    q: "QIDI Studio closes when I open a file I converted with FilaShift. What should I do?",
    a: "Reload FilaShift and convert the original file again. Files converted before the November 27, 2026 update can close QIDI Studio when opened. In our virtual test with QIDI Studio 2.07.02.73, newly converted files for the Q2, X-Plus 4 and Q1 Pro opened normally.",
  },
];

export default function FaqPage() {
  const lang = useLang(), tested = useTested(), T = (s: string, v?: Record<string, string | number>) => tr(lang, s, v);
  const title = T("Frequently asked questions");
  const intro = T("Answers about project files, privacy, color mapping and printer profiles.");
  usePageMeta(`${title} | FilaShift`, intro);
  useEffect(() => { window.scrollTo(0,0); }, []);
  const questions = FAQ.map((f, i) => {
    let a = f.a === FILE_LIMIT.en ? FILE_LIMIT[lang] : f.a === slicerFirst.en.settings ? slicerFirst[lang].settings : tr(lang, f.a);
    if (tested && f.q === "What does Slicer-tested mean?") {
      const results = Object.values(tested.printers);
      const passed = results.filter(r => r.ok).length;
      const versions = Object.entries(tested.slicers).map(([name,v]) => `${name} ${v}`).join("; ");
      a += " " + T("Baseline date: {date}. Across the catalog, {passed} of {total} profiles passed all recorded tests. Slicers: {versions}.", { date: tested.date, passed, total: results.length, versions });
    }
    return {q: tr(lang,f.q), a, id: `q${i}`};
  });
  questions.unshift({q: slicerFirst[lang].question, a: slicerFirst[lang].answer, id: "slicer-first"});
  const topic = new URLSearchParams(window.location.hash.startsWith("#/") ? window.location.hash.split("?")[1] : window.location.search).get("topic");
  useJsonLd("ld-faq", {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  });
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6" lang={lang}>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mb-6 mt-2 text-muted-foreground">{intro}</p>
        <Accordion translate="no" type="single" collapsible defaultValue={topic === "slicer-first" ? topic : undefined} className="rounded-xl border border-card-border bg-card px-4 [&_[role=region][data-state=closed]]:hidden">
          {questions.map((f, i) => (
            <AccordionItem key={f.id} value={f.id} className={i === questions.length - 1 ? "border-b-0" : ""}>
              <AccordionTrigger className="text-left text-sm font-medium" data-testid={`faq-${f.id.replace(/^q/, "")}`}>
                {f.q}
              </AccordionTrigger>
              <AccordionContent forceMount className="text-sm text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Link href="/" className="mt-6 inline-block text-sm text-primary underline">{T("Back to the converter")}</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
