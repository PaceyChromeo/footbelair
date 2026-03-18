"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useLocale } from "@/hooks/useLocale";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const oobCode = searchParams.get("oobCode");
    if (!oobCode) {
      setStatus("error");
      return;
    }

    applyActionCode(auth, oobCode)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [searchParams]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556056504-5c7696c4c28d?w=1920&q=80&auto=format')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-emerald-950/50" />
      <Card className="relative z-10 w-full max-w-md backdrop-blur-xl bg-black/40 border border-white/10 shadow-2xl rounded-[2rem]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex flex-col items-center gap-3">
            <img src="/soccer-ball.png" alt="Football" className="h-14 w-14 drop-shadow-lg invert brightness-200" />
            <div className="flex flex-col items-center leading-none">
              <span className="text-4xl font-black tracking-[0.2em] text-white uppercase drop-shadow-sm">FOOT</span>
              <span className="text-xs tracking-[0.5em] text-emerald-300 uppercase">BEL-AIR</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 text-emerald-400 animate-spin" />
              <p className="text-white/70 text-sm">{t("loading")}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-lg font-semibold text-white">{t("emailVerifiedSuccess")}</p>
              <p className="text-sm text-white/60 text-center">{t("emailVerifiedMessage")}</p>
              <Button
                onClick={() => router.push("/login")}
                size="lg"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300 active:scale-[0.98]"
              >
                {t("backToLogin")}
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
              <p className="text-lg font-semibold text-white">{t("emailVerificationFailed")}</p>
              <p className="text-sm text-white/60 text-center">{t("emailVerificationFailedMessage")}</p>
              <Button
                onClick={() => router.push("/login")}
                size="lg"
                className="w-full h-12 rounded-xl bg-white text-black hover:bg-emerald-50 hover:text-emerald-900 font-semibold text-base shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 active:scale-[0.98]"
              >
                {t("backToLogin")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
