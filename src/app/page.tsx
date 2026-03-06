"use client";

import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { Header } from "@/components/header";
import { HouseRules } from "@/components/house-rules";
import { WeekView } from "@/components/week-view";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=1920&q=80&auto=format')" }}
    >
      <div className="min-h-screen bg-white/50">
        <Header />
        <main className="mx-auto max-w-7xl px-6 py-6">
          <HouseRules />
          <WeekView />
        </main>
      </div>
    </div>
  );
}
