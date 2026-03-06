import fr, { type TranslationKeys } from "./fr";
import en from "./en";
import es from "./es";
import hi from "./hi";
import pt from "./pt";
import ar from "./ar";
import it from "./it";

export type Locale = "fr" | "en" | "es" | "hi" | "pt" | "ar" | "it";
export type Translations = Record<TranslationKeys, string>;

export const translations: Record<Locale, Translations> = { fr, en, es, hi, pt, ar, it };

export const localeLabels: Record<Locale, string> = {
  fr: "🇫🇷 Français",
  en: "🇬🇧 English",
  es: "🇪🇸 Español",
  hi: "🇮🇳 हिन्दी",
  pt: "🇵🇹 Português",
  ar: "🇸🇦 العربية",
  it: "🇮🇹 Italiano",
};

export const localeList: Locale[] = ["ar", "en", "es", "fr", "hi", "it", "pt"];

export { type TranslationKeys };
