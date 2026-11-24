import { Switch, Route, Router, useLocation } from "wouter";
import { lazy, Suspense, useEffect, useRef } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
// hash routing (preview hosts): ignore "?query" after the hash path so "#/?printer=x" still matches "/"
const useHashPath = (): [string, (to: string, o?: { replace?: boolean }) => void] => {
  const [loc, nav] = useHashLocation();
  return [loc.split("?")[0] || "/", nav];
};
import Home from "@/pages/home";
const Filament=lazy(()=>import("@/pages/filament"));
const Faq=lazy(()=>import("@/pages/faq"));
const About=lazy(()=>import("@/pages/info").then(m=>({default:m.About})));
const Contact=lazy(()=>import("@/pages/info").then(m=>({default:m.Contact})));
const Privacy=lazy(()=>import("@/pages/info").then(m=>({default:m.Privacy})));
const Terms=lazy(()=>import("@/pages/info").then(m=>({default:m.Terms})));
const Creators=lazy(()=>import("@/pages/creators"));
const GuidePage=lazy(()=>import("@/pages/guides").then(m=>({default:m.GuidePage})));
const GuidesIndex=lazy(()=>import("@/pages/guides").then(m=>({default:m.GuidesIndex})));
import { ReportDialog } from "@/components/report-dialog";
import { PATH_ROUTING } from "./routing";

function AppRouter() {
  const [path] = useLocation();
  const lastPath = useRef<string>();
  useEffect(() => {
    if (location.origin !== "https://filashift.com" || navigator.webdriver ||
        navigator.doNotTrack === "1" || (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl) return;
    const key = path.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
    if (lastPath.current === key) return;
    lastPath.current = key;
    void fetch("/api/page-view", {
      method: "POST", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", keepalive: true,
    }).catch(() => {}); // No retries or offline queue; never delay conversion.
  }, [path]);
  return (
    <Suspense fallback={<p role="status" className="p-4">Loading…</p>}><Switch>
      <Route path="/" component={Home} />
      <Route path="/filament" component={Filament} />
      <Route path="/faq" component={Faq} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/creators" component={Creators} />
      <Route path="/guides" component={GuidesIndex} />
      <Route path="/guides/:slug" component={GuidePage} />
      <Route component={NotFound} />
    </Switch></Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ReportDialog />
        {PATH_ROUTING ? (
          <Router>
            <AppRouter />
          </Router>
        ) : (
          <Router hook={useHashPath}>
            <AppRouter />
          </Router>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
