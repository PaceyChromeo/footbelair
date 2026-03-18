"use client";

import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { Header } from "@/components/header";
import { WeekView } from "@/components/week-view";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ScrollText } from "lucide-react";
import Link from "next/link";

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">{t("loading")}</div>
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
            <Card className="mx-auto max-w-md backdrop-blur-xl bg-white/80 border border-white/30 shadow-2xl rounded-2xl">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-500" />
                <h2 className="text-lg font-semibold text-slate-800">{t("pendingApproval")}</h2>
                <p className="text-sm text-slate-500">{t("pendingApprovalMessage")}</p>
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
          <Link
            href="/rules"
            className="mb-4 flex items-center gap-2 rounded-2xl backdrop-blur-xl bg-white/70 border border-white/30 shadow-lg px-4 py-3 transition-all hover:bg-white/80 hover:shadow-xl active:scale-[0.99]"
          >
            <ScrollText className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              {t("navRules")}
            </span>
            <span className="ml-auto text-xs text-slate-400">→</span>
          </Link>
          <WeekView />
        </main>
      </div>
    </div>
  );
}
