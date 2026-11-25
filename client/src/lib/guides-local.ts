// Guide text per language. English lives in guides.ts; the other languages override the text fields by slug.
import type { Guide } from "./guides";
import type { Lang } from "./i18n";
import { GUIDES_ES } from "./guides-es";
import { GUIDES_DE } from "./guides-de";
import { GUIDES_FR } from "./guides-fr";

export const GUIDE_TEXT = { es: GUIDES_ES, de: GUIDES_DE, fr: GUIDES_FR };

/** The guide in `lang` (falls back to English for any guide without a translation). */
export function localGuide(lang: Lang, g: Guide): Guide {
  const t = lang === "en" ? undefined : GUIDE_TEXT[lang][g.slug];
  return t ? { ...g, ...t } : g;
}
