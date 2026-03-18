"use client";

import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { Header } from "@/components/header";
import { WeekView } from "@/components/week-view";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function HomePage() {
  const { profile, loading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/login");
    }
  }, [loading, profile, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white/70">{t("loading")}</div>
      </div>
    );
  }

  if (!profile) return null;

  if (profile.status === "pending") {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=1920&q=80&auto=format')" }}
      >
        <div className="min-h-screen bg-gradient-to-b from-slate-900/70 via-slate-800/50 to-emerald-950/40 backdrop-blur-[2px]">
          <Header />
          <main className="mx-auto max-w-7xl px-6 py-6">
            <Card className="mx-auto max-w-md backdrop-blur-xl bg-black/40 border border-white/10 shadow-2xl rounded-[2rem]">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">{t("pendingApproval")}</h2>
                <p className="text-sm text-white/60">{t("pendingApprovalMessage")}</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=1920&q=80&auto=format')" }}
    >
      <div className="min-h-screen bg-gradient-to-b from-slate-900/70 via-slate-800/50 to-emerald-950/40 backdrop-blur-[2px]">
        <Header />
        <main className="mx-auto max-w-7xl px-6 py-6">
          <WeekView />
        </main>
      </div>
    </div>
  );
}
