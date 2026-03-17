"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { LocaleProvider } from "@/hooks/useLocale";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { ReactNode } from "react";

const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
      <LocaleProvider>
        <AuthProvider>{children}</AuthProvider>
      </LocaleProvider>
    </GoogleReCaptchaProvider>
  );
}
