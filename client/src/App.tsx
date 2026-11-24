import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Filament from "@/pages/filament";
import { About, Contact, Privacy, Terms } from "@/pages/info";
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
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
