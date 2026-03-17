"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { LocaleProvider } from "@/hooks/useLocale";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { ReactNode } from "react";

const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

function RecaptchaWrapper({ children }: { children: ReactNode }) {
  if (!recaptchaSiteKey) {
    return <>{children}</>;
  }
  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
      {children}
    </GoogleReCaptchaProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <RecaptchaWrapper>
      <LocaleProvider>
        <AuthProvider>{children}</AuthProvider>
      </LocaleProvider>
    </RecaptchaWrapper>
  );
}
