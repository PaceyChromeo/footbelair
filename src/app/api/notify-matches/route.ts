import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type SupportedLocale = "fr" | "en" | "es" | "hi" | "pt" | "it";

const VALID_LOCALES: SupportedLocale[] = ["fr", "en", "es", "hi", "pt", "it"];

function isValidLocale(v: unknown): v is SupportedLocale {
  return typeof v === "string" && VALID_LOCALES.includes(v as SupportedLocale);
}

const emailTranslations: Record<SupportedLocale, Record<string, string>> = {
  fr: {
    subject: "⚽ Matchs de la semaine ouverts — {weekLabel}",
    heading: "Les matchs de la semaine sont ouverts !",
    weekOf: "Semaine du",
    body: "Les inscriptions sont ouvertes pour les matchs de cette semaine. Réserve ta place dès maintenant — les places partent vite !",
    cta: "S'inscrire aux matchs",
    weatherLabel: "🌤️ Météo Villeneuve-Loubet",
    weatherDescription: "Consulte la météo de la semaine pour anticiper les conditions de jeu.",
    weatherLink: "Voir les prévisions →",
    footer: "Tous les jours à 12h30 · 12 places par match",
  },
  en: {
    subject: "⚽ Weekly matches are open — {weekLabel}",
    heading: "Weekly matches are now open!",
    weekOf: "Week of",
    body: "Registration is open for this week's matches. Book your spot now — places go fast!",
    cta: "Register for matches",
    weatherLabel: "🌤️ Villeneuve-Loubet Weather",
    weatherDescription: "Check the weekly forecast to anticipate playing conditions.",
    weatherLink: "View forecast →",
    footer: "Every day at 12:30 PM · 12 spots per match",
  },
  es: {
    subject: "⚽ Partidos de la semana abiertos — {weekLabel}",
    heading: "¡Los partidos de la semana están abiertos!",
    weekOf: "Semana del",
    body: "Las inscripciones están abiertas para los partidos de esta semana. Reserva tu plaza ahora — ¡las plazas vuelan!",
    cta: "Inscribirse a los partidos",
    weatherLabel: "🌤️ Clima Villeneuve-Loubet",
    weatherDescription: "Consulta el clima de la semana para anticipar las condiciones de juego.",
    weatherLink: "Ver previsiones →",
    footer: "Todos los días a las 12:30 · 12 plazas por partido",
  },
  hi: {
    subject: "⚽ सप्ताह के मैच खुले हैं — {weekLabel}",
    heading: "सप्ताह के मैच अब खुले हैं!",
    weekOf: "सप्ताह",
    body: "इस सप्ताह के मैचों के लिए पंजीकरण खुला है। अभी अपनी जगह बुक करें — स्थान तेजी से भरते हैं!",
    cta: "मैचों के लिए पंजीकरण करें",
    weatherLabel: "🌤️ विलेन्यूव-लूबे मौसम",
    weatherDescription: "खेल की स्थिति का अनुमान लगाने के लिए सप्ताह का मौसम देखें।",
    weatherLink: "पूर्वानुमान देखें →",
    footer: "हर दिन दोपहर 12:30 बजे · प्रति मैच 12 स्थान",
  },
   pt: {
     subject: "⚽ Jogos da semana abertos — {weekLabel}",
     heading: "Os jogos da semana estão abertos!",
     weekOf: "Semana de",
     body: "As inscrições estão abertas para os jogos desta semana. Reserve seu lugar agora — as vagas acabam rápido!",
     cta: "Inscrever-se nos jogos",
     weatherLabel: "🌤️ Clima Villeneuve-Loubet",
     weatherDescription: "Confira o clima da semana para antecipar as condições de jogo.",
     weatherLink: "Ver previsões →",
     footer: "Todos os dias às 12h30 · 12 vagas por jogo",
   },
   it: {
    subject: "⚽ Partite della settimana aperte — {weekLabel}",
    heading: "Le partite della settimana sono aperte!",
    weekOf: "Settimana del",
    body: "Le iscrizioni sono aperte per le partite di questa settimana. Prenota il tuo posto ora — i posti vanno a ruba!",
    cta: "Iscriviti alle partite",
    weatherLabel: "🌤️ Meteo Villeneuve-Loubet",
    weatherDescription: "Controlla il meteo della settimana per anticipare le condizioni di gioco.",
    weatherLink: "Vedi previsioni →",
    footer: "Ogni giorno alle 12:30 · 12 posti per partita",
  },
};

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const WEATHER_URL =
  "https://meteofrance.com/previsions-meteo-france/villeneuve-loubet/06270";

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function buildEmailHtml(weekLabel: string, appUrl: string, locale: SupportedLocale): string {
  const t = emailTranslations[locale];
  const dir = "ltr";
  const lang = locale;

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
          <td style="background:linear-gradient(135deg,#059669,#15803d);padding:28px 32px;text-align:center;">
            <span style="font-size:32px;">⚽</span>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">AAA-BelAir</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">${t.heading}</h2>
            <p style="margin:0 0 4px;font-size:14px;color:#71717a;">${t.weekOf}</p>
            <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#18181b;">${weekLabel}</p>
            <p style="margin:0 0 24px;font-size:14px;color:#3f3f46;line-height:1.6;">
              ${t.body}
            </p>
            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:16px;">
                <a href="${appUrl}" style="display:inline-block;background-color:#059669;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                  ${t.cta}
                </a>
              </td></tr>
            </table>
            <!-- Weather -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background-color:#f0fdf4;border-radius:8px;">
              <tr><td style="padding:16px;">
                <p style="margin:0 0 8px;font-size:13px;color:#166534;font-weight:600;">${t.weatherLabel}</p>
                <p style="margin:0 0 12px;font-size:13px;color:#3f3f46;line-height:1.5;">
                  ${t.weatherDescription}
                </p>
                <a href="${WEATHER_URL}" style="font-size:13px;color:#059669;font-weight:600;text-decoration:underline;">
                  ${t.weatherLink}
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e4e4e7;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">
              ${t.footer}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface Recipient {
  email: string;
  locale?: string;
}

interface NotifyRequest {
  recipients: Recipient[];
  weekLabel: string;
}

export async function POST(req: NextRequest) {
  const resend = getResend();
  if (!resend) {
    return NextResponse.json(
      { success: false, error: "server-misconfigured" },
      { status: 500 }
    );
  }

  const { recipients, weekLabel } = (await req.json()) as NotifyRequest;

  if (!recipients || recipients.length === 0) {
    return NextResponse.json(
      { success: false, error: "no-recipients" },
      { status: 400 }
    );
  }

  if (!weekLabel) {
    return NextResponse.json(
      { success: false, error: "missing-week-label" },
      { status: 400 }
    );
  }

  const appUrl = getAppUrl();
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS || "AAA-BelAir <onboarding@resend.dev>";

  const htmlCache: Partial<Record<SupportedLocale, string>> = {};

  function getHtml(locale: SupportedLocale): string {
    if (!htmlCache[locale]) {
      htmlCache[locale] = buildEmailHtml(weekLabel, appUrl, locale);
    }
    return htmlCache[locale];
  }

  const batch = recipients.map((r) => {
    const locale = isValidLocale(r.locale) ? r.locale : "fr";
    const t = emailTranslations[locale];
    return {
      from: fromAddress,
      to: [r.email],
      subject: t.subject.replace("{weekLabel}", weekLabel),
      html: getHtml(locale),
    };
  });

  const results = [];
  for (let i = 0; i < batch.length; i += 100) {
    const chunk = batch.slice(i, i + 100);
    const { data, error } = await resend.batch.send(chunk);
    if (error) {
      console.error("Resend batch error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    results.push(data);
  }

  return NextResponse.json({ success: true, sent: recipients.length, results });
}
