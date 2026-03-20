"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  type Locale,
  type TranslationKeys,
  translations,
} from "@/lib/i18n";
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { fr as dateFnsFr } from "date-fns/locale";
import { es as dateFnsEs } from "date-fns/locale";
import { hi as dateFnsHi } from "date-fns/locale";
import { pt as dateFnsPt } from "date-fns/locale";
import { enUS as dateFnsEn } from "date-fns/locale";
import { it as dateFnsIt } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";

const dateFnsLocales: Record<Locale, DateFnsLocale> = {
  fr: dateFnsFr,
  en: dateFnsEn,
  es: dateFnsEs,
  hi: dateFnsHi,
  pt: dateFnsPt,
  it: dateFnsIt,
};

const STORAGE_KEY = "aaa-belair-locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in translations) return stored as Locale;
  return "fr";
}

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string;
  dateFnsLocale: DateFnsLocale;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "fr",
  setLocale: () => {},
  t: (key: TranslationKeys) => key,
  dateFnsLocale: dateFnsFr,
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialLocale();
    setLocaleState(initial);
    setMounted(true);
    const uid = auth.currentUser?.uid;
    if (uid) {
      setDoc(doc(db, "users", uid), { locale: initial }, { merge: true }).catch(() => {});
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    // Sync locale to Firestore so emails are sent in the user's language
    const uid = auth.currentUser?.uid;
    if (uid) {
      setDoc(doc(db, "users", uid), { locale: newLocale }, { merge: true }).catch(() => {});
    }
  }, []);

  const t = useCallback(
    (key: TranslationKeys, params?: Record<string, string | number>): string => {
      let value = translations[locale][key] || translations.fr[key] || key;
      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          value = value.replace(`{${paramKey}}`, String(paramValue));
        }
      }
      return value;
    },
    [locale]
  );

  if (!mounted) {
    const fallbackT = (key: TranslationKeys, params?: Record<string, string | number>): string => {
      let value = translations.fr[key] || key;
      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          value = value.replace(`{${paramKey}}`, String(paramValue));
        }
      }
      return value;
    };

    return (
      <LocaleContext.Provider
        value={{ locale: "fr", setLocale, t: fallbackT, dateFnsLocale: dateFnsFr }}
      >
        {children}
      </LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, t, dateFnsLocale: dateFnsLocales[locale] }}
    >
      {children}
    </LocaleContext.Provider>
  );
}
