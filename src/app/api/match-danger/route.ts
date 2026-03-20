import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type SupportedLocale = "fr" | "en" | "es" | "hi" | "pt" | "it";

const VALID_LOCALES: SupportedLocale[] = ["fr", "en", "es", "hi", "pt", "it"];

function isValidLocale(v: unknown): v is SupportedLocale {
  return typeof v === "string" && VALID_LOCALES.includes(v as SupportedLocale);
}

type DangerEvent = "match-in-danger" | "match-rescued";

const emailTranslations: Record<SupportedLocale, {
  // Match in danger (10 → 9)
  dangerSubject: string;
  dangerHeading: string;
  dangerBody: string;
  // Match rescued (9 → 10)
  rescuedSubject: string;
  rescuedHeading: string;
  rescuedBody: string;
  // Common
  playersTitle: string;
  cta: string;
}> = {
  fr: {
    dangerSubject: "🚨 Match en danger — {matchDay} {matchDate}",
    dangerHeading: "Le match est en danger !",
    dangerBody:
      "{playerName} vient de se désinscrire du match de {matchDay} {matchDate}. Il ne reste que <strong>9 joueurs</strong> — il nous en faut 10 minimum pour jouer ! Invite tes collègues, partage le lien, on compte sur toi !",
    rescuedSubject: "🎉 Le match est sauvé ! — {matchDay} {matchDate}",
    rescuedHeading: "Le match est de retour !",
    rescuedBody:
      "{playerName} vient de s'inscrire pour le match de {matchDay} {matchDate}. On est de nouveau <strong>10 joueurs</strong> — le match est sauvé ! Voici la liste mise à jour.",
    playersTitle: "Joueurs",
    cta: "Voir le match",
  },
  en: {
    dangerSubject: "🚨 Match in danger — {matchDay} {matchDate}",
    dangerHeading: "The match is in danger!",
    dangerBody:
      "{playerName} just unsubscribed from the match on {matchDay} {matchDate}. Only <strong>9 players</strong> remain — we need at least 10 to play! Invite your colleagues, share the link, we're counting on you!",
    rescuedSubject: "🎉 The match is saved! — {matchDay} {matchDate}",
    rescuedHeading: "The match is back on!",
    rescuedBody:
      "{playerName} just signed up for the match on {matchDay} {matchDate}. We're back to <strong>10 players</strong> — the match is saved! Here is the updated list.",
    playersTitle: "Players",
    cta: "View match",
  },
  es: {
    dangerSubject: "🚨 Partido en peligro — {matchDay} {matchDate}",
    dangerHeading: "¡El partido está en peligro!",
    dangerBody:
      "{playerName} se ha dado de baja del partido de {matchDay} {matchDate}. Solo quedan <strong>9 jugadores</strong> — ¡necesitamos al menos 10 para jugar! Invita a tus compañeros, comparte el enlace, ¡contamos contigo!",
    rescuedSubject: "🎉 ¡El partido se salva! — {matchDay} {matchDate}",
    rescuedHeading: "¡El partido vuelve!",
    rescuedBody:
      "{playerName} se acaba de inscribir para el partido de {matchDay} {matchDate}. Volvemos a ser <strong>10 jugadores</strong> — ¡el partido se salva! Aquí está la lista actualizada.",
    playersTitle: "Jugadores",
    cta: "Ver partido",
  },
  hi: {
    dangerSubject: "🚨 मैच खतरे में — {matchDay} {matchDate}",
    dangerHeading: "मैच खतरे में है!",
    dangerBody:
      "{playerName} ने {matchDay} {matchDate} के मैच से अपना नाम हटा लिया है। केवल <strong>9 खिलाड़ी</strong> बचे हैं — खेलने के लिए कम से कम 10 चाहिए! अपने साथियों को बुलाओ, लिंक शेयर करो, हम तुम पर भरोसा करते हैं!",
    rescuedSubject: "🎉 मैच बच गया! — {matchDay} {matchDate}",
    rescuedHeading: "मैच वापस आ गया!",
    rescuedBody:
      "{playerName} ने {matchDay} {matchDate} के मैच के लिए साइन अप किया है। हम फिर से <strong>10 खिलाड़ी</strong> हैं — मैच बच गया! यहां अपडेटेड सूची है।",
    playersTitle: "खिलाड़ी",
    cta: "मैच देखें",
  },
  pt: {
    dangerSubject: "🚨 Jogo em perigo — {matchDay} {matchDate}",
    dangerHeading: "O jogo está em perigo!",
    dangerBody:
      "{playerName} cancelou a inscrição do jogo de {matchDay} {matchDate}. Restam apenas <strong>9 jogadores</strong> — precisamos de pelo menos 10 para jogar! Convida os teus colegas, partilha o link, contamos contigo!",
    rescuedSubject: "🎉 O jogo está salvo! — {matchDay} {matchDate}",
    rescuedHeading: "O jogo está de volta!",
    rescuedBody:
      "{playerName} acabou de se inscrever para o jogo de {matchDay} {matchDate}. Estamos de novo com <strong>10 jogadores</strong> — o jogo está salvo! Aqui está a lista atualizada.",
    playersTitle: "Jogadores",
    cta: "Ver jogo",
  },
  it: {
    dangerSubject: "🚨 Partita in pericolo — {matchDay} {matchDate}",
    dangerHeading: "La partita è in pericolo!",
    dangerBody:
      "{playerName} si è cancellato dalla partita di {matchDay} {matchDate}. Rimangono solo <strong>9 giocatori</strong> — ne servono almeno 10 per giocare! Invita i tuoi colleghi, condividi il link, contiamo su di te!",
    rescuedSubject: "🎉 La partita è salva! — {matchDay} {matchDate}",
    rescuedHeading: "La partita è di nuovo in piedi!",
    rescuedBody:
      "{playerName} si è appena iscritto per la partita di {matchDay} {matchDate}. Siamo di nuovo <strong>10 giocatori</strong> — la partita è salva! Ecco la lista aggiornata.",
    playersTitle: "Giocatori",
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

function replacePlaceholders(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function buildDangerEmailHtml(opts: {
  locale: SupportedLocale;
  heading: string;
  body: string;
  matchDay: string;
  matchDate: string;
  appUrl: string;
  players: { displayName: string }[] | null;
  headerColor: string;
}): string {
  const t = emailTranslations[opts.locale];

  const playersList = opts.players
    ? opts.players.map((p, idx) => `<li>${idx + 1}. ${p.displayName}</li>`).join("")
    : "";

  const playersSection = opts.players && opts.players.length > 0
    ? `<hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
       <h3 style="margin:0 0 8px;font-size:14px;color:#374151;">${t.playersTitle}</h3>
       <ol style="padding-left:20px;margin:0 0 12px 0;">${playersList}</ol>`
    : "";

  return `
<!DOCTYPE html>
<html lang="${opts.locale}" dir="ltr">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:${opts.headerColor};padding:28px 32px;text-align:center;">
            <span style="font-size:32px;">⚽</span>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">AAA-BelAir</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">${opts.heading}</h2>
            <p style="margin:0 0 6px;font-size:14px;color:#18181b;font-weight:600;">${opts.matchDay} ${opts.matchDate}</p>
            <p style="margin:0 0 20px;font-size:14px;color:#3f3f46;line-height:1.6;">
              ${opts.body}
            </p>
            ${playersSection}
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
              <tr>
                <td align="center" style="padding:16px 0 0 0;">
                  <a href="${opts.appUrl}" style="display:inline-block;background-color:#059669;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
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

interface Recipient { email: string; locale?: string; displayName: string }

interface DangerRequest {
  event: DangerEvent;
  playerName: string;
  allPlayerEmails: Recipient[];
  matchDay: string;
  matchDate: string;
  players: { displayName: string }[];
}

export async function POST(req: NextRequest) {
  const resend = getResend();
  if (!resend) {
    return NextResponse.json(
      { success: false, error: "server-misconfigured" },
      { status: 500 },
    );
  }

  const body = (await req.json()) as DangerRequest;
  const { event, playerName, allPlayerEmails, matchDay, matchDate, players } = body;

  if (!allPlayerEmails || allPlayerEmails.length === 0) {
    return NextResponse.json({ success: false, error: "no-recipients" }, { status: 400 });
  }

  const appUrl = getAppUrl();
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS || "AAA-BelAir <onboarding@resend.dev>";

  const vars = { playerName, matchDay, matchDate };
  const isDanger = event === "match-in-danger";

  const htmlCache: Record<string, string> = {};

  function getCachedHtml(locale: SupportedLocale): string {
    if (!htmlCache[locale]) {
      const t = emailTranslations[locale];
      const heading = isDanger ? t.dangerHeading : t.rescuedHeading;
      const bodyText = replacePlaceholders(
        isDanger ? t.dangerBody : t.rescuedBody,
        vars,
      );
      htmlCache[locale] = buildDangerEmailHtml({
        locale,
        heading,
        body: bodyText,
        matchDay,
        matchDate,
        appUrl,
        // Danger: no player list (only 9 left, urgency focus). Rescued: show the 10 players.
        players: isDanger ? null : players,
        headerColor: isDanger
          ? "linear-gradient(135deg,#dc2626,#991b1b)"
          : "linear-gradient(135deg,#059669,#15803d)",
      });
    }
    return htmlCache[locale];
  }

  const batch: Array<{ from: string; to: string[]; subject: string; html: string }> = [];

  for (const recipient of allPlayerEmails) {
    const locale = isValidLocale(recipient.locale) ? recipient.locale : "fr";
    const t = emailTranslations[locale];
    const subject = replacePlaceholders(
      isDanger ? t.dangerSubject : t.rescuedSubject,
      vars,
    );

    batch.push({
      from: fromAddress,
      to: [recipient.email],
      subject,
      html: getCachedHtml(locale),
    });
  }

  if (batch.length === 0) {
    return NextResponse.json({ success: true, sent: 0 });
  }

  const results = [];
  for (let i = 0; i < batch.length; i += 100) {
    const chunk = batch.slice(i, i + 100);
    const { data, error } = await resend.batch.send(chunk);
    if (error) {
      console.error("Resend match-danger batch error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }
    results.push(data);
  }

  return NextResponse.json({ success: true, sent: batch.length, results });
}
