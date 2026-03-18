"use client";

import { useLocale } from "@/hooks/useLocale";

const AAA_SUBSCRIPTION_URL =
  "https://aaa.cseamadeus.com/index.php?controller=produit&action=detail&type_code=ADH&code=ADH+FOOT&libelle_produit=adhesion-football-jusqu-au-31-07-2022&fromDisplay=liste";

export function HouseRules() {
  const { t } = useLocale();

  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/70 border border-white/30 p-6 mb-6 shadow-lg">
      <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-3">
        {t("houseRulesTitle")}
      </h2>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
        <li>{t("houseRule1")}</li>
        <li>{t("houseRule2")}</li>
        <li>{t("houseRule3")}</li>
        <li>
          <a
            href={AAA_SUBSCRIPTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 underline decoration-emerald-300 hover:text-emerald-700 hover:decoration-emerald-500 font-medium transition-colors"
          >
            {t("houseRule4")}
          </a>
        </li>
        <li>{t("houseRule5")}</li>
      </ol>
    </div>
  );
}
