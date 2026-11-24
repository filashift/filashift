import { Switch, Route, Router } from "wouter";
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
import Filament from "@/pages/filament";
import { About, Contact, Privacy, Terms } from "@/pages/info";
import Creators from "@/pages/creators";
import { GuidePage, GuidesIndex } from "@/pages/guides";
import { ReportDialog } from "@/components/report-dialog";
import { PATH_ROUTING } from "./routing";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/filament" component={Filament} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/creators" component={Creators} />
      <Route path="/guides" component={GuidesIndex} />
      <Route path="/guides/:slug" component={GuidePage} />
      <Route component={NotFound} />
    </Switch>
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
