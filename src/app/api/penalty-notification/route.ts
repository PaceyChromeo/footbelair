import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type SupportedLocale = "fr" | "en" | "es" | "hi" | "pt" | "it";

const VALID_LOCALES: SupportedLocale[] = ["fr", "en", "es", "hi", "pt", "it"];

function isValidLocale(v: unknown): v is SupportedLocale {
  return typeof v === "string" && VALID_LOCALES.includes(v as SupportedLocale);
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

type PenaltyReason = "no-show" | "late-cancellation";

interface PenaltyTranslations {
  subject: string;
  heading: string;
  reasonLabel: string;
  reasonNoShow: string;
  reasonLateCancel: string;
  implicationsLabel: string;
  noShowImplications: string;
  lateCancelImplications: string;
  hardBanLabel: string;
  softBanLabel: string;
  complaintLabel: string;
  complaintText: string;
  cta: string;
  footer: string;
}

const emailTranslations: Record<SupportedLocale, PenaltyTranslations> = {
  fr: {
    subject: "⚠️ Pénalité appliquée — AAA-BelAir",
    heading: "Une pénalité a été appliquée à votre compte",
    reasonLabel: "Motif",
    reasonNoShow: "Absence non signalée (no-show)",
    reasonLateCancel: "Désinscription tardive (moins de 4h avant le match)",
    implicationsLabel: "Conséquences",
    noShowImplications: "Interdiction d'inscription pendant 2 semaines (jusqu'au {bannedUntil}), suivie de 2 semaines en bas de liste d'attente (jusqu'au {penaltyUntil}).",
    lateCancelImplications: "Placé en bas de la liste d'attente pendant 2 semaines (jusqu'au {penaltyUntil}).",
    hardBanLabel: "Suspension totale",
    softBanLabel: "Priorité réduite",
    complaintLabel: "Contestation",
    complaintText: "Si vous souhaitez contester cette décision, vous pouvez contacter Ivan TCHOMGUE MIEGUEM ou David RODRIGUEZ ROCHA via Teams.",
    cta: "Voir mon compte",
    footer: "AAA-BelAir · Notification de pénalité",
  },
  en: {
    subject: "⚠️ Penalty applied — AAA-BelAir",
    heading: "A penalty has been applied to your account",
    reasonLabel: "Reason",
    reasonNoShow: "Unannounced absence (no-show)",
    reasonLateCancel: "Late cancellation (less than 4 hours before the match)",
    implicationsLabel: "Implications",
    noShowImplications: "Registration banned for 2 weeks (until {bannedUntil}), followed by 2 weeks at the bottom of the waiting list (until {penaltyUntil}).",
    lateCancelImplications: "Placed at the bottom of the waiting list for 2 weeks (until {penaltyUntil}).",
    hardBanLabel: "Full suspension",
    softBanLabel: "Reduced priority",
    complaintLabel: "Appeal",
    complaintText: "If you wish to appeal this decision, you can contact Ivan TCHOMGUE MIEGUEM or David RODRIGUEZ ROCHA via Teams.",
    cta: "View my account",
    footer: "AAA-BelAir · Penalty notification",
  },
  es: {
    subject: "⚠️ Penalización aplicada — AAA-BelAir",
    heading: "Se ha aplicado una penalización a tu cuenta",
    reasonLabel: "Motivo",
    reasonNoShow: "Ausencia no comunicada (no-show)",
    reasonLateCancel: "Cancelación tardía (menos de 4 horas antes del partido)",
    implicationsLabel: "Consecuencias",
    noShowImplications: "Prohibición de inscripción durante 2 semanas (hasta el {bannedUntil}), seguida de 2 semanas al final de la lista de espera (hasta el {penaltyUntil}).",
    lateCancelImplications: "Colocado al final de la lista de espera durante 2 semanas (hasta el {penaltyUntil}).",
    hardBanLabel: "Suspensión total",
    softBanLabel: "Prioridad reducida",
    complaintLabel: "Reclamación",
    complaintText: "Si deseas impugnar esta decisión, puedes contactar con Ivan TCHOMGUE MIEGUEM o David RODRIGUEZ ROCHA por Teams.",
    cta: "Ver mi cuenta",
    footer: "AAA-BelAir · Notificación de penalización",
  },
  hi: {
    subject: "⚠️ दंड लागू — AAA-BelAir",
    heading: "आपके खाते पर दंड लागू किया गया है",
    reasonLabel: "कारण",
    reasonNoShow: "बिना सूचना अनुपस्थिति (नो-शो)",
    reasonLateCancel: "देर से रद्दीकरण (मैच से 4 घंटे पहले से कम)",
    implicationsLabel: "परिणाम",
    noShowImplications: "2 सप्ताह के लिए पंजीकरण पर प्रतिबंध ({bannedUntil} तक), उसके बाद 2 सप्ताह प्रतीक्षा सूची में अंतिम ({penaltyUntil} तक)।",
    lateCancelImplications: "2 सप्ताह के लिए प्रतीक्षा सूची में अंतिम ({penaltyUntil} तक)।",
    hardBanLabel: "पूर्ण निलंबन",
    softBanLabel: "कम प्राथमिकता",
    complaintLabel: "अपील",
    complaintText: "यदि आप इस निर्णय का विरोध करना चाहते हैं, तो आप Teams पर Ivan TCHOMGUE MIEGUEM या David RODRIGUEZ ROCHA से संपर्क कर सकते हैं।",
    cta: "मेरा खाता देखें",
    footer: "AAA-BelAir · दंड सूचना",
  },
   pt: {
     subject: "⚠️ Penalidade aplicada — AAA-BelAir",
     heading: "Uma penalidade foi aplicada à sua conta",
     reasonLabel: "Motivo",
     reasonNoShow: "Ausência não comunicada (no-show)",
     reasonLateCancel: "Cancelamento tardio (menos de 4 horas antes do jogo)",
     implicationsLabel: "Consequências",
     noShowImplications: "Proibição de inscrição durante 2 semanas (até {bannedUntil}), seguida de 2 semanas no final da lista de espera (até {penaltyUntil}).",
     lateCancelImplications: "Colocado no final da lista de espera durante 2 semanas (até {penaltyUntil}).",
     hardBanLabel: "Suspensão total",
     softBanLabel: "Prioridade reduzida",
     complaintLabel: "Contestação",
     complaintText: "Se deseja contestar esta decisão, pode contactar Ivan TCHOMGUE MIEGUEM ou David RODRIGUEZ ROCHA via Teams.",
     cta: "Ver minha conta",
     footer: "AAA-BelAir · Notificação de penalidade",
   },
   it: {
    subject: "⚠️ Penalità applicata — AAA-BelAir",
    heading: "Una penalità è stata applicata al tuo account",
    reasonLabel: "Motivo",
    reasonNoShow: "Assenza non comunicata (no-show)",
    reasonLateCancel: "Cancellazione tardiva (meno di 4 ore prima della partita)",
    implicationsLabel: "Conseguenze",
    noShowImplications: "Divieto di iscrizione per 2 settimane (fino al {bannedUntil}), seguito da 2 settimane in fondo alla lista d'attesa (fino al {penaltyUntil}).",
    lateCancelImplications: "Posizionato in fondo alla lista d'attesa per 2 settimane (fino al {penaltyUntil}).",
    hardBanLabel: "Sospensione totale",
    softBanLabel: "Priorità ridotta",
    complaintLabel: "Reclamo",
    complaintText: "Se desideri contestare questa decisione, puoi contattare Ivan TCHOMGUE MIEGUEM o David RODRIGUEZ ROCHA via Teams.",
    cta: "Visualizza il mio account",
    footer: "AAA-BelAir · Notifica di penalità",
  },
};

function buildEmailHtml(
  reason: PenaltyReason,
  bannedUntil: string | null,
  penaltyUntil: string,
  locale: SupportedLocale,
  appUrl: string,
  playerName: string
): string {
  const t = emailTranslations[locale];
  const dir = locale === "hi" ? "ltr" : "ltr";
  const lang = locale;

  const isNoShow = reason === "no-show";
  const reasonText = isNoShow ? t.reasonNoShow : t.reasonLateCancel;
  const banTypeLabel = isNoShow ? t.hardBanLabel : t.softBanLabel;
  const banTypeColor = isNoShow ? "#dc2626" : "#d97706";
  const implications = isNoShow
    ? t.noShowImplications
        .replace("{bannedUntil}", bannedUntil || "")
        .replace("{penaltyUntil}", penaltyUntil)
    : t.lateCancelImplications.replace("{penaltyUntil}", penaltyUntil);

  return `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:28px 32px;text-align:center;">
            <span style="font-size:32px;">⚠️</span>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">AAA-BelAir</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 20px;font-size:18px;color:#18181b;">${t.heading}</h2>

            <!-- Reason -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:8px;margin-bottom:16px;">
              <tr><td style="padding:16px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.05em;">${t.reasonLabel}</p>
                <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.5;">${reasonText}</p>
              </td></tr>
            </table>

            <!-- Implications -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border-radius:8px;margin-bottom:16px;">
              <tr><td style="padding:16px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;">${t.implicationsLabel}</p>
                <p style="margin:0 0 10px;font-size:14px;color:#3f3f46;line-height:1.5;">${implications}</p>
                <span style="display:inline-block;background-color:${banTypeColor};color:#ffffff;font-size:12px;font-weight:600;padding:4px 12px;border-radius:12px;">${banTypeLabel}</span>
              </td></tr>
            </table>

            <!-- Complaint -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f9ff;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:16px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.05em;">${t.complaintLabel}</p>
                <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.5;">${t.complaintText}</p>
              </td></tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${appUrl}" style="display:inline-block;background-color:#dc2626;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                  ${t.cta}
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e4e4e7;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">${t.footer}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface PenaltyNotificationRequest {
  playerEmail: string;
  playerName: string;
  playerLocale?: string;
  reason: PenaltyReason;
  bannedUntil?: string; // ISO date string (no-show only)
  penaltyUntil: string; // ISO date string
}

export async function POST(req: NextRequest) {
  const resend = getResend();
  if (!resend) {
    return NextResponse.json(
      { success: false, error: "server-misconfigured" },
      { status: 500 }
    );
  }

  const body = (await req.json()) as PenaltyNotificationRequest;
  const { playerEmail, playerName, playerLocale, reason, bannedUntil, penaltyUntil } = body;

  if (!playerEmail || !reason || !penaltyUntil) {
    return NextResponse.json(
      { success: false, error: "missing-fields" },
      { status: 400 }
    );
  }

  const locale = isValidLocale(playerLocale) ? playerLocale : "fr";
  const appUrl = getAppUrl();
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS || "AAA-BelAir <onboarding@resend.dev>";

  const t = emailTranslations[locale];

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const bannedUntilFormatted = bannedUntil ? formatDate(bannedUntil) : null;
  const penaltyUntilFormatted = formatDate(penaltyUntil);

  const html = buildEmailHtml(
    reason,
    bannedUntilFormatted,
    penaltyUntilFormatted,
    locale,
    appUrl,
    playerName
  );

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [playerEmail],
    subject: t.subject,
    html,
  });

  if (error) {
    console.error("Resend penalty-notification error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}
