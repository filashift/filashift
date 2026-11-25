import { useEffect, useState } from "react";
import { ExternalLink, Mail, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { dataUrl, usePageMeta } from "@/lib/seo";

// Opt-in list of designers. Edited on the server (/var/www/filashift-data/creators.json) without a redeploy:
// [{ "name": "…", "url": "https://makerworld.com/@…", "platform": "MakerWorld", "note": "multi-colour signs" }]
type Creator = { name: string; url: string; platform?: string; note?: string };
const EMAIL = "support@jacksoncgc.com";

export default function Creators() {
  usePageMeta("Creators — FilaShift", "Designers who make multi-color 3MF projects that convert well between Bambu Lab, Flashforge, Creality, Prusa and other printers.");
  const [list, setList] = useState<Creator[] | null>(null);
  useEffect(() => {
    fetch(dataUrl("creators.json"), { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : []))
      .then((j) => setList(Array.isArray(j) ? j.filter((c) => c && c.name && /^https:\/\//.test(c.url)) : []))
      .catch(() => setList([]));
  }, []);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Creators
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Designers whose multi-color projects convert cleanly between printers. Every creator here asked to be listed. We show only the name and
          profile link they gave us.
        </p>

        {list === null ? (
          <div className="mt-8 h-24 animate-pulse rounded-xl bg-muted" />
        ) : list.length ? (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2" data-testid="list-creators">
            {list.map((c) => (
              <li key={c.url} className="flex items-start gap-3 rounded-xl border border-card-border bg-card p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary" translate="no">
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <a href={c.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium hover:underline" translate="no">
                    {c.name}
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                  {c.platform && (
                    <div className="text-xs text-muted-foreground" translate="no">
                      {c.platform}
                    </div>
                  )}
                  {c.note && <p className="mt-1 text-sm text-muted-foreground">{c.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center" data-testid="text-creators-empty">
            <Palette className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-medium">The first creators are being added.</p>
            <p className="mt-1 text-sm text-muted-foreground">Design multi-color models? You could be one of them.</p>
          </div>
        )}

        <section className="mt-10 rounded-xl border border-card-border bg-card p-6">
          <h2 className="font-semibold">Get listed</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            If you publish 3MF projects on MakerWorld, Printables or elsewhere and want people on other printers to find you, email us your display
            name and profile link. Listing is free, we never rank creators by downloads or earnings, and we remove you whenever you ask.
          </p>
          <Button asChild className="mt-4 gap-2">
            <a href={`mailto:${EMAIL}?subject=FilaShift%20creators%20page`} data-testid="link-creators-email">
              <Mail className="h-4 w-4" />
              Ask to be listed
            </a>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
