import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Lock, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// public source repository (AGPL-3.0). Set VITE_SOURCE_URL at build time; the link is hidden until then.
export const SOURCE_URL: string = (import.meta as any).env?.VITE_SOURCE_URL || "";
export const COMPANY = "Jackson Technology Solutions LLC, a subsidiary of Jackson Consolidated Group of Companies LLC";

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-label="FilaShift logo">
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <path d="M7 20h11M7 15h14M7 10h9" className="stroke-primary-foreground" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M20 21.5l5-4-5-4" fill="none" className="stroke-primary-foreground" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV = [
  { href: "/", label: "Converter" },
  { href: "/filament", label: "Filament prices" },
];

export function SiteHeader({ note }: { note?: ReactNode }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [loc] = useLocation();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3" data-testid="link-home">
          <Logo />
          <span className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight">FilaShift</span>
            <span className="text-xs text-muted-foreground">by JTS</span>
          </span>
        </Link>
        <nav className="order-3 flex w-full gap-1 sm:order-none sm:ml-6 sm:w-auto" aria-label="Main">
          {NAV.map((n) => {
            const active = n.href === "/" ? loc === "/" : loc.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                data-testid={`nav-${n.href === "/" ? "converter" : n.href.slice(1)}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          {note ?? (
            <>
              <Lock className="mr-1 hidden h-3.5 w-3.5 sm:block" />
              <span className="mr-2 hidden sm:inline">Files stay on your device</span>
            </>
          )}
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
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        {children}
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
    </footer>
  );
}
