"use client";

import { useLocale } from "@/hooks/useLocale";

const AAA_SUBSCRIPTION_URL =
  "https://aaa.cseamadeus.com/index.php?controller=produit&action=detail&type_code=ADH&code=ADH+FOOT&libelle_produit=adhesion-football-jusqu-au-31-07-2022&fromDisplay=liste";

export function HouseRules() {
  const { t } = useLocale();

  return (
    <div className="rounded-xl border border-emerald-200 bg-white/80 backdrop-blur-sm p-5 mb-6 shadow-sm">
      <h2 className="text-lg font-bold text-emerald-800 mb-3">
        {t("houseRulesTitle")}
      </h2>
      <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700">
        <li>{t("houseRule1")}</li>
        <li>{t("houseRule2")}</li>
        <li>{t("houseRule3")}</li>
        <li>
          <a
            href={AAA_SUBSCRIPTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 underline hover:text-emerald-900 font-medium"
          >
            {t("houseRule4")}
          </a>
        </li>
        <li>{t("houseRule5")}</li>
      </ol>
    </div>
  );
}
