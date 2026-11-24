import { useEffect } from "react";
import { Link } from "wouter";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useTested } from "@/components/printer-picker";
import { FILE_LIMIT } from "@/lib/conversion-facts";
import { tr, useLang } from "@/lib/i18n";
import { useJsonLd, usePageMeta } from "@/lib/seo";

const FAQ = [
  {
    q: "Are my files uploaded anywhere?",
    a: "No. FilaShift reads and rewrites the project inside this browser tab. Your 3MF never leaves your device; the only downloads are the page itself and the printer profiles you pick.",
  },
  {
    q: "Which files can I convert?",
    a: "3MF projects saved by Bambu Studio, the OrcaSlicer family (OrcaSlicer, Creality Print, ElegooSlicer, Anycubic Slicer Next, Orca-Flashforge, Snapmaker Orca) and PrusaSlicer 2.4 or newer, including MakerWorld and Printables downloads. PrusaSlicer projects keep their parts, painted colours, colour changes and main print settings; speeds and line widths use the new printer's defaults because PrusaSlicer stores them differently.",
  },
  {
    q: "Can I convert 3MF to STL or OBJ?",
    a: "Yes. Add the 3MF and use Export STL or Export OBJ under the file. Parts stay in their plate positions, in millimetres, with one file per plate. STL keeps only the shape; OBJ also keeps one colour per part. Painted colours, plates and print settings only survive in a 3MF, so convert the 3MF instead when you want to keep them.",
  },
  {
    q: "Can I convert STL back to 3MF?",
    a: "Yes. Choose an STL, select your printer, then convert and download the new 3MF. STL contains geometry only, so check the scale, material and print settings in your slicer.",
  },
  {
    q: "How do I keep slicer settings when switching printers?",
    a: "Download the project 3MF, not the STL: on MakerWorld use the 3MF download of the print profile you want, and on Printables download the 3MF file. Then convert it here. FilaShift keeps the designer's layer height, walls, infill, supports, seam and colours, swaps in your printer's machine and filament profiles, and lists every change in the report.",
  },
  {
    q: "Can I convert back to Bambu?",
    a: "Yes. Conversion works in every direction, for example Bambu to Flashforge, Flashforge to Snapmaker, Creality back to Bambu, or PrusaSlicer to Bambu Studio.",
  },
  {
    q: "What happens to multi-colour prints?",
    a: "Each colour is matched to one of your printer's filament slots. If the project has more colours than you have slots, extra colours share the closest slot, or, when colours sit at different heights, FilaShift can add filament-change pauses so every colour still prints. You can change every mapping before converting.",
  },
  {
    q: "What does Slicer-tested mean?",
    a: "A Slicer-tested badge means sample projects converted for that printer profile sliced without errors in its destination slicer. It is not a physical print test or a guarantee for your file. Check the preview before printing.",
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
  },
];

export default function FaqPage() {
  const lang = useLang(), tested = useTested();
  const es = lang === "es";
  const title = es ? "Preguntas frecuentes" : "Frequently asked questions";
  const intro = es ? "Respuestas sobre archivos, privacidad, colores y perfiles de impresora." : "Answers about project files, privacy, colour mapping and printer profiles.";
  usePageMeta(`${title} | FilaShift`, intro);
  useEffect(() => { window.scrollTo(0,0); }, []);
  const questions = FAQ.map(f => {
    let a = f.a === FILE_LIMIT.en ? FILE_LIMIT[lang] : tr(lang, f.a);
    if (tested && f.q === "What does Slicer-tested mean?") {
      const results = Object.values(tested.printers);
      const passed = results.filter(r => r.ok).length;
      const versions = Object.entries(tested.slicers).map(([name,v]) => `${name} ${v}`).join("; ");
      a += lang === "es"
        ? ` Última prueba registrada (${tested.date}): ${passed} de ${results.length} perfiles pasaron. Laminadores: ${versions}.`
        : ` Last recorded test (${tested.date}): ${passed} of ${results.length} profiles passed. Slicers: ${versions}.`;
    }
    return {q: tr(lang,f.q), a};
  });
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
        <Accordion translate="no" type="single" collapsible className="rounded-xl border border-card-border bg-card px-4 [&_[role=region][data-state=closed]]:hidden">
          {questions.map((f, i) => (
            <AccordionItem key={i} value={`q${i}`} className={i === FAQ.length - 1 ? "border-b-0" : ""}>
              <AccordionTrigger className="text-left text-sm font-medium" data-testid={`faq-${i}`}>
                {f.q}
              </AccordionTrigger>
              <AccordionContent forceMount className="text-sm text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Link href="/" className="mt-6 inline-block text-sm text-primary underline">{es ? "Volver al convertidor" : "Back to the converter"}</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
