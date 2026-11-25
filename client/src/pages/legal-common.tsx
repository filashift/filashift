// Shared pieces of the legal pages (all languages).
import { SOURCE_URL } from "@/components/site-chrome";
import type { ReactNode } from "react";
import type { Lang } from "@/lib/i18n";

export const EMAIL = "support@jacksoncgc.com";
export const ENTITY = "Jackson Technology Solutions LLC";
export const PLACE = "PO Box 46, Waukesha, WI 53187, USA";
export const AFFILIATES = "Amazon Associates, Overture, Sunlu (UpPromote), Flashforge (Impact, when active)";

export const Mailto = () => <a href={`mailto:${EMAIL}`}>{EMAIL}</a>;
const BY_EMAIL: Record<Lang, (m: ReactNode) => ReactNode> = {
  en: (m) => <>by emailing {m} (we will send you a complete copy of the source code)</>,
  es: (m) => <>escribiéndonos a {m} (te enviamos una copia completa del código fuente)</>,
  de: (m) => <>per E-Mail an {m} (wir senden Ihnen eine vollständige Kopie des Quellcodes)</>,
  fr: (m) => <>en nous écrivant à {m} (nous vous enverrons une copie complète du code source)</>,
};
export const Source = ({ lang = "en" }: { lang?: Lang }) =>
  SOURCE_URL ? (
    <a href={SOURCE_URL} target="_blank" rel="noreferrer">
      {SOURCE_URL.replace(/^https?:\/\//, "")}
    </a>
  ) : (
    <>{BY_EMAIL[lang](<Mailto />)}</>
  );
