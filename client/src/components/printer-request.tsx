import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EVT = "filashift:printer-request";

/** Open the "Request a printer" dialog from anywhere; `search` (what the visitor typed) prefills the model. */
export function openPrinterRequest(search?: string) {
  window.dispatchEvent(new CustomEvent(EVT, { detail: search || "" }));
}

/** Button used in the printer picker's empty state and on /tested. */
export function RequestPrinterButton({ search, onBeforeOpen, variant = "outline", className, testId = "button-request-printer" }: {
  search?: string;
  onBeforeOpen?: () => void;
  variant?: "outline" | "default" | "secondary";
  className?: string;
  testId?: string;
}) {
  return (
    <Button type="button" size="sm" variant={variant} className={className} data-testid={testId}
      onClick={() => { onBeforeOpen?.(); setTimeout(() => openPrinterRequest(search), 0); }}>
      Request a printer
    </Button>
  );
}

/** Mounted once in App. Sends brand, model, optional slicer and note to the report inbox (kind "printer-request"). */
export function PrinterRequestDialog() {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [slicer, setSlicer] = useState("");
  const [note, setNote] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    const on = (e: Event) => {
      const q = ((e as CustomEvent<string>).detail || "").trim().slice(0, 120);
      if (q) setModel(q);
      setState("idle");
      setErr("");
      setOpen(true);
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);

  async function send() {
    setErr("");
    if (brand.trim().length < 2 || !model.trim()) return setErr("Please enter the printer brand and model.");
    setState("sending");
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "printer-request", brand, model, slicer, message: note, website: hp, page: location.pathname }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || "The request could not be sent.");
      setState("sent");
      setBrand("");
      setModel("");
      setSlicer("");
      setNote("");
    } catch (e: any) {
      setState("idle");
      setErr(`${e?.message || "The request could not be sent."} You can also email support@jacksoncgc.com.`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-testid="dialog-printer-request">
        <DialogHeader>
          <DialogTitle>Request a printer</DialogTitle>
          <DialogDescription>Can't find your printer? Tell us which one, and we'll look at adding it once its profile can be tested in its slicer.</DialogDescription>
        </DialogHeader>
        {state === "sent" ? (
          <div className="flex gap-3 py-4" data-testid="text-printer-request-sent">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm">Thanks, your request was received. New printers appear in the list and on the test results page once their converted files slice without errors.</p>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pr-brand">Brand</Label>
                <Input id="pr-brand" required maxLength={80} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="For example: Creality" autoComplete="off" data-testid="input-request-brand" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr-model">Model</Label>
                <Input id="pr-model" required maxLength={120} value={model} onChange={(e) => setModel(e.target.value)} placeholder="For example: K2 Plus Combo" autoComplete="off" data-testid="input-request-model" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-slicer">Slicer you use (optional)</Label>
              <Input id="pr-slicer" maxLength={80} value={slicer} onChange={(e) => setSlicer(e.target.value)} placeholder="For example: OrcaSlicer 2.5" autoComplete="off" data-testid="input-request-slicer" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-note">Note (optional)</Label>
              <Textarea id="pr-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nozzle size, multi-colour unit or anything else we should know" data-testid="input-request-note" />
            </div>
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" value={hp} onChange={(e) => setHp(e.target.value)} name="website" />
            {err && <p className="text-sm text-destructive" data-testid="text-printer-request-error">{err}</p>}
            <button type="submit" hidden />
          </form>
        )}
        <p className="text-xs text-muted-foreground" data-testid="text-printer-request-privacy">
          Only these fields and the page you were on are sent. There is no email field, so we can't reply; email support@jacksoncgc.com if you want an answer. Requests are kept for up to 12 months. See the{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
        <DialogFooter>
          {state === "sent" ? (
            <Button onClick={() => setOpen(false)}>Close</Button>
          ) : (
            <Button onClick={() => void send()} disabled={state === "sending"} data-testid="button-request-send">
              {state === "sending" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send request
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
