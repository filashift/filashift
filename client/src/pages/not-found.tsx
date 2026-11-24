import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { usePageMeta } from "@/lib/seo";

export default function NotFound() {
  usePageMeta("Page not found — FilaShift");
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center px-4 py-16 sm:px-6">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight" data-testid="text-page-title">
          This page doesn't exist
        </h1>
        <p className="mt-3 text-muted-foreground">The link may be old or mistyped. The converter and guides are one click away.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/">Open the converter</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/guides">Browse guides</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
