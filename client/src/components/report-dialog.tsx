import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EVT = "filashift:report";

/** Open the report dialog from anywhere. `details` is shown to the visitor and sent only if they leave it ticked. */
export function openReport(details?: string) {
  window.dispatchEvent(new CustomEvent(EVT, { detail: details || "" }));
}

/** Mounted once in App */
export function ReportDialog() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [include, setInclude] = useState(true);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    const on = (e: Event) => {
      setDetails((e as CustomEvent<string>).detail);
      setInclude(true);
      setState("idle");
      setErr("");
      setOpen(true);
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);

  async function send() {
    setErr("");
    if (message.trim().length < 5) return setErr("Please describe what went wrong.");
    setState("sending");
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          link,
          email,
          website: hp,
          page: location.pathname,
          details: include && details ? `${details}\nBrowser: ${navigator.userAgent}` : "",
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || "The report could not be sent.");
      setState("sent");
      setMessage("");
      setLink("");
    } catch (e: any) {
      setState("idle");
      setErr(`${e?.message || "The report could not be sent."} You can also email support@jacksoncgc.com.`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-testid="dialog-report">
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>Tell us what went wrong. Your 3MF file is never sent; it stays on your device.</DialogDescription>
        </DialogHeader>
        {state === "sent" ? (
          <div className="flex gap-3 py-4" data-testid="text-report-sent">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm">Thanks, your report was received. If you left an email address we'll reply there.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rp-msg">What happened?</Label>
              <Textarea
                id="rp-msg"
                rows={4}
                maxLength={4000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="For example: the colours were wrong after opening the file in Flashforge Orca"
                data-testid="input-report-message"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-link">Link to the model (optional)</Label>
              <Input id="rp-link" type="url" maxLength={500} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://makerworld.com/…" data-testid="input-report-link" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-email">Your email (optional, for a reply)</Label>
              <Input id="rp-email" type="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-report-email" />
            </div>
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              name="website"
            />
            {details && (
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={include} onCheckedChange={(v) => setInclude(v === true)} data-testid="check-report-details" />
                  Include conversion details
                </label>
                {include && (
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono text-[11px] leading-relaxed text-muted-foreground" data-testid="text-report-details">
                    {details}
                  </pre>
                )}
              </div>
            )}
            {err && (
              <p className="text-sm text-destructive" data-testid="text-report-error">
                {err}
              </p>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground" data-testid="text-report-privacy">
          Only the text above is sent — never your file. Reports are kept for up to 12 months to fix problems. See the{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
        <DialogFooter>
          {state === "sent" ? (
            <Button onClick={() => setOpen(false)}>Close</Button>
          ) : (
            <Button onClick={send} disabled={state === "sending"} data-testid="button-report-send">
              {state === "sending" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send report
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Text summary of a conversion for the report dialog (no file contents) */
export function conversionDetails(o: {
  file: string;
  source?: string;
  sourcePrinter?: string;
  target?: string;
  plates?: number;
  objects?: number;
  painted?: boolean;
  filaments?: number;
  warnings?: string[];
  error?: string;
}) {
  const l = [
    `File name: ${o.file}`,
    o.source && `Source: ${o.source}${o.sourcePrinter ? ` (${o.sourcePrinter})` : ""}`,
    o.target && `Target: ${o.target}`,
    o.plates != null && `Plates: ${o.plates}, objects: ${o.objects ?? "?"}${o.painted ? ", painted" : ""}`,
    o.filaments != null && `Filaments used: ${o.filaments}`,
    o.error && `Error: ${o.error}`,
    ...(o.warnings || []).map((w) => `Warning: ${w}`),
    `FilaShift build: ${(import.meta as any).env?.VITE_BUILD || "web"}`,
  ];
  return l.filter(Boolean).join("\n");
}
