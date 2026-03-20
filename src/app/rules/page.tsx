"use client";

import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { Header } from "@/components/header";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Users, Clock, AlertTriangle, Swords, Heart, UserPlus, CreditCard, Mail } from "lucide-react";

const AAA_SUBSCRIPTION_URL =
  "https://aaa.cseamadeus.com/index.php?controller=produit&action=detail&type_code=ADH&code=ADH+FOOT&libelle_produit=adhesion-football-jusqu-au-31-07-2022&fromDisplay=liste";

export default function RulesPage() {
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

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522778526097-ce0a22ceb253?w=1920&q=80&auto=format')" }}
    >
      <div className="min-h-screen bg-gradient-to-b from-slate-900/70 via-slate-800/50 to-emerald-950/40 backdrop-blur-[2px]">
        <Header />
        <main className="mx-auto max-w-3xl px-6 py-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg mb-3">
              {t("rulesPageTitle")}
            </h1>
            <p className="text-sm text-white/60 max-w-xl mx-auto">
              {t("rulesIntro")}
            </p>
          </div>

          <div className="space-y-4">
            <RuleSection icon={<Users className="h-5 w-5" />} title={t("rulesSec1Title")}>
              <ul className="space-y-2">
                <li>{t("rulesSec1_roster")}</li>
                <li>{t("rulesSec1_slots")}</li>
                <li>{t("rulesSec1_priority")}</li>
                <li>{t("rulesSec1_full")}</li>
              </ul>
            </RuleSection>

            <RuleSection icon={<Clock className="h-5 w-5" />} title={t("rulesSec2Title")}>
              <ul className="space-y-2">
                <li>{t("rulesSec2_arrive")}</li>
                <li>{t("rulesSec2_early")}</li>
              </ul>
            </RuleSection>

            <RuleSection icon={<AlertTriangle className="h-5 w-5" />} title={t("rulesSec3Title")} highlight>
              <p className="text-amber-400 font-medium mb-2">{t("rulesSec3_intro")}</p>
              <ul className="space-y-2">
                <li className="font-medium text-red-400">🚫 {t("rulesSec3_noshow")}</li>
                <li className="font-medium text-red-400">🚫 {t("rulesSec3_lateCancel")}</li>
              </ul>
            </RuleSection>

            <RuleSection icon={<Swords className="h-5 w-5" />} title={t("rulesSec4Title")}>
              <ul className="space-y-2">
                <li>{t("rulesSec4_throwins")}</li>
                <li>{t("rulesSec4_goalkeeper")}</li>
                <li>{t("rulesSec4_goals")}</li>
                <li>{t("rulesSec4_balance")}</li>
              </ul>
            </RuleSection>

            <RuleSection icon={<Heart className="h-5 w-5" />} title={t("rulesSec5Title")}>
              <ul className="space-y-2">
                <li>{t("rulesSec5_spirit")}</li>
                <li>⚠️ {t("rulesSec5_fouls")}</li>
                <li>{t("rulesSec5_foulTypes")}</li>
              </ul>
            </RuleSection>

            <RuleSection icon={<UserPlus className="h-5 w-5" />} title={t("rulesSec6Title")}>
              <p>{t("rulesSec6_process")}</p>
            </RuleSection>

            <RuleSection icon={<CreditCard className="h-5 w-5" />} title={t("rulesSec7Title")}>
              <p>
                {t("rulesSec7_pay")}{" "}
                <a
                  href={AAA_SUBSCRIPTION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-400/30 hover:decoration-emerald-400 font-medium transition-colors"
                >
                  →
                </a>
              </p>
            </RuleSection>

            <RuleSection icon={<Mail className="h-5 w-5" />} title={t("rulesSec8Title")}>
              <p>{t("rulesSec8_contact")}</p>
            </RuleSection>
          </div>
        </main>
      </div>
    </div>
  );
}

function RuleSection({ icon, title, children, highlight }: { icon: React.ReactNode; title: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`backdrop-blur-xl border shadow-2xl p-6 rounded-[2rem] ${highlight ? "bg-amber-500/10 border-amber-500/20" : "bg-black/40 border-white/10"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={highlight ? "text-amber-400" : "text-emerald-400"}>{icon}</span>
        <h2 className={`text-base font-bold ${highlight ? "text-amber-400" : "text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70"}`}>
          {title}
        </h2>
      </div>
      <div className="text-sm text-white/70 leading-relaxed">
        {children}
      </div>
    </div>
  );
}
