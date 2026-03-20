import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type SupportedLocale = "fr" | "en" | "es" | "hi" | "pt" | "it";

const VALID_LOCALES: SupportedLocale[] = ["fr", "en", "es", "hi", "pt", "it"];

function isValidLocale(v: unknown): v is SupportedLocale {
  return typeof v === "string" && VALID_LOCALES.includes(v as SupportedLocale);
}

const emailTranslations: Record<SupportedLocale, {
  promotedSubject: string;
  promotedHeading: string;
  promotedBody: string;
  rosterSubject: string;
  rosterHeading: string;
  rosterBody: string;
  playersTitle: string;
  waitingListTitle: string;
  cta: string;
}> = {
  fr: {
    promotedSubject: "🎉 Tu joues ! — {matchDay} {matchDate}",
    promotedHeading: "Tu es maintenant dans la liste des joueurs !",
    promotedBody:
      "Suite à un désistement, tu fais maintenant partie des joueurs pour le match de {matchDay} {matchDate}. Voici la liste mise à jour.",
    rosterSubject: "📋 Liste mise à jour — {matchDay} {matchDate}",
    rosterHeading: "La liste des joueurs a été mise à jour",
    rosterBody:
      "La liste des joueurs pour le match de {matchDay} {matchDate} a changé. Voici la liste mise à jour.",
    playersTitle: "Joueurs",
    waitingListTitle: "File d'attente",
    cta: "Voir le match",
  },
  en: {
    promotedSubject: "🎉 You're playing! — {matchDay} {matchDate}",
    promotedHeading: "You're now on the player list!",
    promotedBody:
      "Due to a cancellation, you are now part of the players for the match on {matchDay} {matchDate}. Here is the updated list.",
    rosterSubject: "📋 Roster updated — {matchDay} {matchDate}",
    rosterHeading: "The player roster has been updated",
    rosterBody:
      "The player list for the match on {matchDay} {matchDate} has changed. Here is the updated list.",
    playersTitle: "Players",
    waitingListTitle: "Waiting list",
    cta: "View match",
  },
  es: {
    promotedSubject: "🎉 ¡Juegas! — {matchDay} {matchDate}",
    promotedHeading: "¡Ahora estás en la lista de jugadores!",
    promotedBody:
      "Debido a una cancelación, ahora formas parte de los jugadores para el partido de {matchDay} {matchDate}. Aquí está la lista actualizada.",
    rosterSubject: "📋 Lista actualizada — {matchDay} {matchDate}",
    rosterHeading: "La lista de jugadores se ha actualizado",
    rosterBody:
      "La lista de jugadores para el partido del {matchDay} {matchDate} ha cambiado. Aquí está la lista actualizada.",
    playersTitle: "Jugadores",
    waitingListTitle: "Lista de espera",
    cta: "Ver partido",
  },
  hi: {
    promotedSubject: "🎉 आप खेल रहे हैं! — {matchDay} {matchDate}",
    promotedHeading: "अब आप खिलाड़ी सूची में हैं!",
    promotedBody:
      "रद्दीकरण के कारण, अब आप {matchDay} {matchDate} के मैच के खिलाड़ियों में शामिल हैं। यहां अपडेटेड सूची है।",
    rosterSubject: "📋 सूची अपडेट — {matchDay} {matchDate}",
    rosterHeading: "खिलाड़ी सूची अपडेट हो गई है",
    rosterBody:
      "{matchDay} {matchDate} के मैच की खिलाड़ी सूची बदल गई है। यहां अपडेटेड सूची है।",
    playersTitle: "खिलाड़ी",
    waitingListTitle: "प्रतीक्षा सूची",
    cta: "मैच देखें",
  },
   pt: {
     promotedSubject: "🎉 Você joga! — {matchDay} {matchDate}",
     promotedHeading: "Agora está na lista de jogadores!",
     promotedBody:
       "Devido a um cancelamento, agora faz parte dos jogadores para o jogo de {matchDay} {matchDate}. Aqui está a lista atualizada.",
     rosterSubject: "📋 Lista atualizada — {matchDay} {matchDate}",
     rosterHeading: "A lista de jogadores foi atualizada",
     rosterBody:
       "A lista de jogadores para o jogo de {matchDay} {matchDate} mudou. Aqui está a lista atualizada.",
     playersTitle: "Jogadores",
     waitingListTitle: "Lista de espera",
     cta: "Ver jogo",
   },
   it: {
    promotedSubject: "🎉 Giochi! — {matchDay} {matchDate}",
    promotedHeading: "Ora sei nella lista dei giocatori!",
    promotedBody:
      "A seguito di un annullamento, ora fai parte dei giocatori per la partita di {matchDay} {matchDate}. Ecco la lista aggiornata.",
    rosterSubject: "📋 Lista aggiornata — {matchDay} {matchDate}",
    rosterHeading: "La lista dei giocatori è stata aggiornata",
    rosterBody:
      "La lista dei giocatori per la partita di {matchDay} {matchDate} è cambiata. Ecco la lista aggiornata.",
    playersTitle: "Giocatori",
    waitingListTitle: "Lista d'attesa",
    cta: "Vedi partita",
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

function buildRosterEmailHtml(
  locale: SupportedLocale,
  matchDay: string,
  matchDate: string,
  appUrl: string,
  players: { displayName: string }[],
  waitingList: { displayName: string }[],
  isPromoted: boolean,
): string {
  const t = emailTranslations[locale];
  const dir = "ltr";
  const lang = locale;

  const headingText = isPromoted ? t.promotedHeading : t.rosterHeading;
  const bodyText = (isPromoted ? t.promotedBody : t.rosterBody)
    .replace("{matchDay}", matchDay)
    .replace("{matchDate}", matchDate);

  const playersList = players
    .map((p, idx) => `<li>${idx + 1}. ${p.displayName}</li>`)
    .join("");
  const waitingListItems = waitingList
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
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#15803d);padding:28px 32px;text-align:center;">
            <span style="font-size:32px;">⚽</span>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">AAA-BelAir</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">${headingText}</h2>
            <p style="margin:0 0 6px;font-size:14px;color:#18181b;font-weight:600;">${matchDay} ${matchDate}</p>
            <p style="margin:0 0 20px;font-size:14px;color:#3f3f46;line-height:1.6;">
              ${bodyText}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="width:50%;vertical-align:top;padding-right:8px;">
                  <h3 style="margin:0 0 8px;font-size:14px;color:#374151;">${t.playersTitle}</h3>
                  <ol style="padding-left:20px;margin:0 0 12px 0;">
                    ${playersList}
                  </ol>
                </td>
                <td style="width:50%;vertical-align:top;padding-left:8px;">
                  <h3 style="margin:0 0 8px;font-size:14px;color:#374151;">${t.waitingListTitle}</h3>
                  <ol style="padding-left:20px;margin:0 0 12px 0;">
                    ${waitingListItems}
                  </ol>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
              <tr>
                <td align="center" style="padding:16px 0 0 0;">
                  <a href="${appUrl}" style="display:inline-block;background-color:#059669;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                    ${t.cta}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e4e4e7;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">AAA-BelAir</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface RosterRequest {
  existingPlayerEmails: { email: string; locale?: string; displayName: string }[];
  promotedPlayer: { email: string; locale?: string; displayName: string } | null;
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
      { status: 500 },
    );
  }

  const { existingPlayerEmails, promotedPlayer, matchDay, matchDate, players, waitingList } =
    (await req.json()) as RosterRequest;

  const hasExisting = existingPlayerEmails?.length > 0;
  const hasPromoted = promotedPlayer != null;
  if (!hasPromoted && !hasExisting) {
    return NextResponse.json({ success: false, error: "no-recipients" }, { status: 400 });
  }

  const appUrl = getAppUrl();
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS || "AAA-BelAir <onboarding@resend.dev>";

  const htmlCache: Record<string, string> = {};
  function getHtml(locale: SupportedLocale, isPromotedEmail: boolean): string {
    const key = `${locale}_${isPromotedEmail ? "p" : "r"}`;
    if (!htmlCache[key]) {
      htmlCache[key] = buildRosterEmailHtml(locale, matchDay, matchDate, appUrl, players, waitingList, isPromotedEmail);
    }
    return htmlCache[key];
  }

  const batch: Array<{ from: string; to: string[]; subject: string; html: string }> = [];

  if (promotedPlayer?.email) {
    const locale = isValidLocale(promotedPlayer.locale) ? promotedPlayer.locale : "fr";
    const t = emailTranslations[locale];
    batch.push({
      from: fromAddress,
      to: [promotedPlayer.email],
      subject: t.promotedSubject.replace("{matchDay}", matchDay).replace("{matchDate}", matchDate),
      html: getHtml(locale, true),
    });
  }

  for (const ep of existingPlayerEmails ?? []) {
    const locale = isValidLocale(ep.locale) ? ep.locale : "fr";
    const t = emailTranslations[locale];
    batch.push({
      from: fromAddress,
      to: [ep.email],
      subject: t.rosterSubject.replace("{matchDay}", matchDay).replace("{matchDate}", matchDate),
      html: getHtml(locale, false),
    });
  }

  const results = [];
  for (let i = 0; i < batch.length; i += 100) {
    const chunk = batch.slice(i, i + 100);
    const { data, error } = await resend.batch.send(chunk);
    if (error) {
      console.error("Resend batch error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }
    results.push(data);
  }

  return NextResponse.json({ success: true, sent: batch.length, results });
}
