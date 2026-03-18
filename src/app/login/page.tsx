"use client";

import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { localeList, localeLabels, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { FirebaseError } from "firebase/app";

type AuthMode = "login" | "signup" | "reset";

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, profile, loading } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const router = useRouter();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile && !loading) {
      router.push("/");
    }
  }, [profile, loading, router]);

  function getFirebaseErrorMessage(err: FirebaseError): string {
    switch (err.code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return t("authErrorInvalidCredentials");
      case "auth/email-already-in-use":
        return t("authErrorEmailInUse");
      case "auth/weak-password":
        return t("authErrorWeakPassword");
      case "auth/invalid-email":
        return t("authErrorInvalidEmail");
      case "auth/too-many-requests":
        return t("authErrorTooManyRequests");
      default:
        return t("authErrorGeneric");
    }
  }

  const verifyRecaptcha = useCallback(async (): Promise<boolean> => {
    if (!executeRecaptcha) return false;
    try {
      const token = await executeRecaptcha("signup");
      const res = await fetch("/api/recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  }, [executeRecaptcha]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
      } else if (mode === "signup") {
        const captchaOk = await verifyRecaptcha();
        if (!captchaOk) {
          setError(t("authErrorCaptcha"));
          setSubmitting(false);
          return;
        }
        await signUpWithEmail(email, password, displayName);
      } else if (mode === "reset") {
        await resetPassword(email);
        setSuccess(t("resetPasswordSent"));
        setSubmitting(false);
        return;
      }
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === "email-already-exists") {
        setError(t("authErrorEmailInUse"));
      } else if (e.code === "name-already-exists") {
        setError(t("authErrorNameInUse"));
      } else if (typeof e.code === "string" && e.code.startsWith("auth/")) {
        setError(getFirebaseErrorMessage(e as FirebaseError));
      } else {
        setError(t("authErrorGeneric"));
      }
    }

    setSubmitting(false);
  }

  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setError("");
    setSuccess("");
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556056504-5c7696c4c28d?w=1920&q=80&auto=format')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-emerald-950/50" />
      <Card className="relative z-10 w-full max-w-md backdrop-blur-xl bg-white/80 border border-white/30 shadow-2xl rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-6xl animate-bounce">⚽</div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">{t("appName")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={signInWithGoogle} size="lg" variant="outline" className="w-full gap-2 rounded-xl border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all duration-300 h-12 text-base font-medium">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t("loginWithGoogle")}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t("orDivider")}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">{t("displayNameLabel")}</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("displayNamePlaceholder")}
                  className="rounded-xl h-11 border-slate-200 focus:border-emerald-400 transition-colors"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="rounded-xl h-11 border-slate-200 focus:border-emerald-400 transition-colors"
                required
              />
            </div>

            {mode !== "reset" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("passwordLabel")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  className="rounded-xl h-11 border-slate-200 focus:border-emerald-400 transition-colors"
                  required
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50/80 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-red-200/50">{error}</p>
            )}
            {success && (
              <p className="text-sm text-emerald-600 bg-emerald-50/80 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-emerald-200/50">{success}</p>
            )}

            <Button type="submit" size="lg" className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300 active:scale-[0.98]" disabled={submitting}>
              {submitting
                ? t("loading")
                : mode === "login"
                  ? t("loginButton")
                  : mode === "signup"
                    ? t("signupButton")
                    : t("resetPasswordButton")}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-1 text-sm">
            {mode === "login" && (
              <>
                <button type="button" onClick={() => switchMode("signup")} className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  {t("noAccountYet")}
                </button>
                <button type="button" onClick={() => switchMode("reset")} className="text-muted-foreground hover:underline">
                  {t("forgotPassword")}
                </button>
              </>
            )}
            {mode === "signup" && (
              <button type="button" onClick={() => switchMode("login")} className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                {t("alreadyHaveAccount")}
              </button>
            )}
            {mode === "reset" && (
              <button type="button" onClick={() => switchMode("login")} className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                {t("backToLogin")}
              </button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {t("loginFooter")}
          </p>

          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs">{localeLabels[locale]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {localeList.map((loc: Locale) => (
                  <DropdownMenuItem
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={locale === loc ? "bg-muted font-medium" : ""}
                  >
                    {localeLabels[loc]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
