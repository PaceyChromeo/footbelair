import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type SupportedLocale = "fr" | "en" | "es" | "hi" | "pt" | "it";

const VALID_LOCALES: SupportedLocale[] = ["fr", "en", "es", "hi", "pt", "it"];

function isValidLocale(v: unknown): v is SupportedLocale {
  return typeof v === "string" && VALID_LOCALES.includes(v as SupportedLocale);
}

const emailTranslations: Record<SupportedLocale, Record<string, string>> = {
  fr: {
    subject: "✅ Match confirmé — {matchDay} {matchDate}",
    heading: "Le match est confirmé !",
    playersTitle: "Joueurs",
    waitingListTitle: "File d'attente",
    body: "Le match de {matchDay} {matchDate} est confirmé ! Voici la liste des joueurs.",
    cta: "Voir le match",
    footer: "AAA-BelAir · Match confirmé",
  },
  en: {
    subject: "✅ Match confirmé — {matchDay} {matchDate}".replace("confirmé", "confirmed"),
    heading: "The match is confirmed!",
    playersTitle: "Players",
    waitingListTitle: "Waiting list",
    body: "The match on {matchDay} {matchDate} is confirmed! Here is the player list.",
    cta: "View match",
    footer: "AAA-BelAir · Match confirmed",
  },
  es: {
    subject: "✅ Partido confirmado — {matchDay} {matchDate}",
    heading: "¡El partido está confirmado!",
    playersTitle: "Jugadores",
    waitingListTitle: "Lista de espera",
    body: "El partido del {matchDay} {matchDate} está confirmado! Aquí está la lista de jugadores.",
    cta: "Ver partido",
    footer: "AAA-BelAir · Partido confirmado",
  },
  hi: {
    subject: "✅ मैच की पुष्टि — {matchDay} {matchDate}",
    heading: "मैच की पुष्टि हो गई!",
    playersTitle: "खिलाड़ी",
    waitingListTitle: "प्रतीक्षा सूची",
    body: "{matchDay} {matchDate} का मैच पुष्टि हो गया है! यहां खिलाड़ियों की सूची है।",
    cta: "मैच देखें",
    footer: "AAA-BelAir · मैच पुष्टि",
  },
   pt: {
     subject: "✅ Jogo confirmado — {matchDay} {matchDate}",
     heading: "O jogo está confirmado!",
     playersTitle: "Jogadores",
     waitingListTitle: "Lista de espera",
     body: "O jogo de {matchDay} {matchDate} está confirmado! Aqui está a lista de jogadores.",
     cta: "Ver jogo",
     footer: "AAA-BelAir · Jogo confirmado",
   },
   it: {
    subject: "✅ Partita confermata — {matchDay} {matchDate}",
    heading: "La partita è confermata!",
    playersTitle: "Giocatori",
    waitingListTitle: "Lista d'attesa",
    body: "La partita di {matchDay} {matchDate} è confermata! Ecco la lista dei giocatori.",
    cta: "Vedi partita",
    footer: "AAA-BelAir · Partita confermata",
  },
};

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

function buildEmailHtml(
  matchDay: string,
  matchDate: string,
  locale: SupportedLocale,
  players: { displayName: string }[],
  waitingList: { displayName: string }[]
): string {
  const t = emailTranslations[locale];
  const dir = "ltr";
  const lang = locale;

  
  const playersHtml = players
    .map((p, idx) => `<li>${idx + 1}. ${p.displayName}</li>`)
    .join("");
  const waitingHtml = waitingList
    .map((p, idx) => `<li>${idx + 1}. ${p.displayName}</li>`)
    .join("");

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
            <p style="margin:0 0 4px;font-size:14px;color:#71717a;">${t.body?.replace("{matchDay}", matchDay).replace("{matchDate}", matchDate)}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
            <p style="margin:0 0 8px;font-size:14px;color:#3f3f46;font-weight:600;">${t.playersTitle}</p>
            <ol style="margin:0 0 16px;padding-left:22px;">${playersHtml}</ol>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
            <p style="margin:0 0 8px;font-size:14px;color:#3f3f46;font-weight:600;">${t.waitingListTitle}</p>
            <ol style="margin:0;padding-left:22px;">${waitingHtml}</ol>
            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:12px 0 0;">
                <a href="${getAppUrl()}" style="display:inline-block;background-color:#059669;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
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

interface Recipient {
  email: string;
  locale?: string;
  displayName: string;
}

interface ConfirmedRequest {
  recipients: Recipient[];
  matchDay: string;
  matchDate: string;
  players: { displayName: string }[];
  waitingList: { displayName: string }[];
}

export async function POST(req: NextRequest) {
  const resend = getResend();
  if (!resend) {
    return NextResponse.json(
      { success: false, error: "server-misconfigured" },
      { status: 500 }
    );
  }

  const { recipients, matchDay, matchDate, players, waitingList } = (await req.json()) as ConfirmedRequest;

  if (!recipients || recipients.length === 0) {
    return NextResponse.json(
      { success: false, error: "no-recipients" },
      { status: 400 }
    );
  }
  if (!matchDay || !matchDate) {
    return NextResponse.json(
      { success: false, error: "missing-match-info" },
      { status: 400 }
    );
  }

  const appUrl = getAppUrl();
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS || "AAA-BelAir <onboarding@resend.dev>";

  
  const htmlCache: Partial<Record<SupportedLocale, string>> = {};
  function getHtml(locale: SupportedLocale): string {
    if (!htmlCache[locale]) {
      htmlCache[locale] = buildEmailHtml(matchDay, matchDate, locale, players, waitingList);
    }
    return htmlCache[locale]!;
  }

  const batch = recipients.map((r) => {
    const locale = isValidLocale(r.locale) ? r.locale : "fr";
    const t = emailTranslations[locale];
    return {
      from: fromAddress,
      to: [r.email],
      subject: t.subject
        .replace("{matchDay}", matchDay)
        .replace("{matchDate}", matchDate),
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
