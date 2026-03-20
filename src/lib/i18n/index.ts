import fr, { type TranslationKeys } from "./fr";
import en from "./en";
import es from "./es";
import hi from "./hi";
import pt from "./pt";
import it from "./it";

export type Locale = "fr" | "en" | "es" | "hi" | "pt" | "it";
export type Translations = Record<TranslationKeys, string>;

export const translations: Record<Locale, Translations> = { fr, en, es, hi, pt, it };

export const localeLabels: Record<Locale, string> = {
  fr: "🇫🇷 Français",
  en: "🇬🇧 English",
  es: "🇪🇸 Español",
  hi: "🇮🇳 हिन्दी",
  pt: "🇵🇹 Português",
  it: "🇮🇹 Italiano",
};

export const localeList: Locale[] = ["en", "es", "fr", "hi", "it", "pt"];

export { type TranslationKeys };
