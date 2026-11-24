import { openReport } from "@/components/report-dialog";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Download, Lock, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setLang, useLang } from "@/lib/i18n";

// public source repository (AGPL-3.0). VITE_SOURCE_URL overrides it at build time.
export const SOURCE_URL: string = (import.meta as any).env?.VITE_SOURCE_URL || "https://github.com/filashift/filashift";
export const COMPANY = "Jackson Technology Solutions LLC, a subsidiary of Jackson Consolidated Group of Companies LLC";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-label="FilaShift logo">
      <defs>
        <linearGradient id="fs-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f5cff" />
          <stop offset="1" stopColor="#0029a3" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#fs-logo)" />
      <path d="M7 20h11M7 15h14M7 10h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M20 21.5l5-4-5-4" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Jackson Technology Solutions emblem; sits on a light chip in dark mode so the steel letters stay readable
export function JtsEmblem({ className = "h-6" }: { className?: string }) {
  return (
    <span className="inline-flex items-center rounded-md dark:bg-white/95 dark:px-1.5 dark:py-0.5">
      <img
        src="./jts-emblem-48.webp"
        srcSet="./jts-emblem-48.webp 1x, ./jts-emblem-96.webp 2x, ./jts-emblem-192.webp 4x"
        alt="Jackson Technology Solutions"
        className={cn("w-auto", className)}
        width={71}
        height={48}
      />
    </span>
  );
}

// scroll to a section on the converter page, moving there first when needed
export function useGoSection() {
  const [loc, navigate] = useLocation();
  return (id: string) => {
    const go = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (loc === "/") go();
    else {
      navigate("/");
      setTimeout(go, 120);
    }
  };
}

const NAV: { label: string; href?: string; section?: string }[] = [
  { href: "/", label: "Converter" },
  { href: "/filament", label: "Filament prices" },
  { href: "/guides", label: "Guides" },
  { section: "how", label: "How it works" },
  { section: "printers", label: "Printers" },
  { section: "faq", label: "FAQ" },
];

export function SiteHeader({ note }: { note?: ReactNode }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [loc] = useLocation();
  const goSection = useGoSection();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" data-testid="link-home">
          <Logo />
          <span className="text-base font-bold tracking-tight">FilaShift</span>
        </Link>
        <span className="flex items-center gap-2 border-l border-border pl-3" title="By Jackson Technology Solutions LLC">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">by</span>
          <JtsEmblem className="h-6" />
        </span>
        <nav
          className="order-3 -mx-1 flex w-full gap-0.5 overflow-x-auto pb-1 [scrollbar-width:none] md:order-none md:mx-0 md:ml-4 md:w-auto md:pb-0"
          aria-label="Main"
        >
          {NAV.map((n) => {
            const active = n.href ? (n.href === "/" ? loc === "/" : loc.startsWith(n.href)) : false;
            const cls = cn(
              "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors sm:px-3",
              active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            );
            const tid = `nav-${n.href === "/" ? "converter" : (n.href?.slice(1) ?? n.section)}`;
            return n.href ? (
              <Link key={n.label} href={n.href} className={cls} data-testid={tid}>
                {n.label}
              </Link>
            ) : (
              <button key={n.label} type="button" onClick={() => goSection(n.section!)} className={cls} data-testid={tid}>
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          {note ?? (
            <>
              <Lock className="mr-1 hidden h-3.5 w-3.5 lg:block" />
              <span className="mr-2 hidden lg:inline">Files stay on your device</span>
            </>
          )}
          <InstallButton />
          <LangToggle />
          <Button size="icon" variant="ghost" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" data-testid="button-theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="border-t border-border bg-card/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center gap-4">
          <JtsEmblem className="h-9" />
          <div className="text-sm">
            <div className="font-medium">Built by Jackson Technology Solutions LLC</div>
            <div className="text-xs text-muted-foreground">A subsidiary of Jackson Consolidated Group of Companies LLC</div>
          </div>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <nav className="flex flex-wrap gap-x-4 gap-y-1 pb-2 text-sm" aria-label="Site">
            {[
              ["/about", "About"],
              ["/guides", "Guides"],
              ["/creators", "Creators"],
              ["/privacy", "Privacy"],
              ["/terms", "Terms"],
              ["/contact", "Contact"],
            ].map(([h, l]) => (
              <Link key={h} href={h} className="hover:text-foreground" data-testid={`footer-${h.slice(1)}`}>
                {l}
              </Link>
            ))}
            <button type="button" className="hover:text-foreground" onClick={() => openReport()} data-testid="footer-report">
              Report a problem
            </button>
          </nav>
          {children}
          <p>
            Some store links and codes are affiliate links: FilaShift may earn a commission at no extra cost to you. As an Amazon Associate,
            FilaShift earns from qualifying purchases.
          </p>
          <p>
            FilaShift is an independent tool. Bambu Lab, Bambu Studio, MakerWorld, Snapmaker, Flashforge, Creality, Prusa, PrusaSlicer, Printables,
            OrcaSlicer, Elegoo, Anycubic, Qidi and other names are trademarks of their owners and are used only to describe compatibility. FilaShift is
            not affiliated with or endorsed by them.
          </p>
          <p>
            {SOURCE_URL && (
              <>
                FilaShift is free software under the AGPL-3.0.{" "}
                <a className="underline hover:text-foreground" href={SOURCE_URL} target="_blank" rel="noreferrer" data-testid="link-source">
                  Source code on GitHub
                </a>
                .{" "}
              </>
            )}
            © {new Date().getFullYear()} {COMPANY}.
          </p>
        </div>
      </div>
    </footer>
  );
}

function LangToggle() {
  const lang = useLang();
  return (
    <div className="mr-1 flex h-8 items-center rounded-md border border-border p-0.5 text-[11px] font-medium" translate="no" role="group" aria-label="Language / Idioma">
      {(["en", "es"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => l !== lang && setLang(l)}
          aria-pressed={lang === l}
          className={cn("rounded px-1.5 py-1 uppercase", lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          data-testid={`button-lang-${l}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// "Install app" appears only when the browser offers installation (Chrome, Edge, Android)
let deferred: any = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    listeners.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((f) => f());
  });
}
function InstallButton() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    return () => void listeners.delete(f);
  }, []);
  if (!deferred) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      className="mr-1 h-8 gap-1.5 text-xs"
      onClick={async () => {
        const d = deferred;
        deferred = null;
        force((n) => n + 1);
        await d?.prompt?.();
      }}
      data-testid="button-install"
    >
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Install app</span>
    </Button>
  );
}
