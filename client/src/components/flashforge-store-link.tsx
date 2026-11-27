import { ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n";

export function FlashforgeStoreLink() {
  const T = useT();
  return <a href="https://flashforge.sjv.io/aNg6Nq" target="_blank" rel="sponsored noopener noreferrer"
    className="inline-flex items-center gap-1 text-sm text-primary underline" data-testid="link-flashforge-store">
    {T("Shop Flashforge (affiliate link)")} <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
  </a>;
}
