import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type SupportedLocale = "fr" | "en" | "es" | "hi" | "pt" | "it";

const VALID_LOCALES: SupportedLocale[] = ["fr", "en", "es", "hi", "pt", "it"];

function isValidLocale(v: unknown): v is SupportedLocale {
  return typeof v === "string" && VALID_LOCALES.includes(v as SupportedLocale);
}

type RosterEvent = "player-joined" | "player-left";

// formatChange: "5v5-to-6v6" when 11th player joined (was WL) and game goes to 12 players
//               "6v6-to-5v5" when 12th player left and game drops to 10 players
//               null when no format change
type FormatChange = "5v5-to-6v6" | "6v6-to-5v5" | null;

const emailTranslations: Record<SupportedLocale, {
  // Player joined
  joinedSubject: string;
  joinedHeading: string;
  joinedBody: string;
  joinedFormatUpBody: string; // 5v5 → 6v6: WL player (11th) now plays
  // Player left
  leftSubject: string;
  leftHeading: string;
  leftBody: string;
  leftFormatDownBody: string; // 6v6 → 5v5: 11th player now sadly in WL
  // Promoted player (from WL to players after someone left)
  promotedSubject: string;
  promotedHeading: string;
  promotedBody: string;
  // Demoted player (from players to WL after format change down)
  demotedSubject: string;
  demotedHeading: string;
  demotedBody: string;
  // Common
  playersTitle: string;
  waitingListTitle: string;
  cta: string;
}> = {
  fr: {
    joinedSubject: "🆕 Nouveau joueur — {matchDay} {matchDate}",
    joinedHeading: "Un nouveau joueur dans la place !",
    joinedBody:
      "{playerName} vient de s'inscrire pour le match de {matchDay} {matchDate}. Voici la liste mise à jour.",
    joinedFormatUpBody:
      "{playerName} vient de s'inscrire pour le match de {matchDay} {matchDate}. <strong style=\"background-color:#ecfdf5;padding:2px 6px;border-radius:4px;color:#065f46;\">🎉 Bonne nouvelle : {promotedName} quitte la file d'attente et rejoint les joueurs ! Le match passe en 6v6.</strong> Voici la liste mise à jour.",
    leftSubject: "👋 Départ d'un joueur — {matchDay} {matchDate}",
    leftHeading: "Un joueur nous quitte...",
    leftBody:
      "{playerName} s'est désinscrit du match de {matchDay} {matchDate}. {promotedLine}Voici la liste mise à jour.",
    leftFormatDownBody:
      "{playerName} s'est désinscrit du match de {matchDay} {matchDate}. <strong style=\"background-color:#fef2f2;padding:2px 6px;border-radius:4px;color:#991b1b;\">⚠️ Le match repasse en 5v5. {demotedName} se retrouve malheureusement en file d'attente.</strong> Voici la liste mise à jour.",
    promotedSubject: "🎉 Tu joues ! — {matchDay} {matchDate}",
    promotedHeading: "Prépare tes crampons !",
    promotedBody:
      "Suite au départ de {playerName}, tu fais maintenant partie des joueurs pour le match de {matchDay} {matchDate}. Prépare tes affaires !",
    demotedSubject: "😔 Retour en file d'attente — {matchDay} {matchDate}",
    demotedHeading: "Tu es de retour en file d'attente",
    demotedBody:
      "Suite au départ de {playerName}, le match repasse en 5v5 et tu te retrouves malheureusement en file d'attente pour le match de {matchDay} {matchDate}.",
    playersTitle: "Joueurs",
    waitingListTitle: "File d'attente",
    cta: "Voir le match",
  },
  en: {
    joinedSubject: "🆕 New player — {matchDay} {matchDate}",
    joinedHeading: "A new player in town!",
    joinedBody:
      "{playerName} just signed up for the match on {matchDay} {matchDate}. Here is the updated list.",
    joinedFormatUpBody:
      "{playerName} just signed up for the match on {matchDay} {matchDate}. <strong style=\"background-color:#ecfdf5;padding:2px 6px;border-radius:4px;color:#065f46;\">🎉 Great news: {promotedName} moves off the waiting list and joins the players! The game is now 6v6.</strong> Here is the updated list.",
    leftSubject: "👋 Player left — {matchDay} {matchDate}",
    leftHeading: "A player has left...",
    leftBody:
      "{playerName} has unsubscribed from the match on {matchDay} {matchDate}. {promotedLine}Here is the updated list.",
    leftFormatDownBody:
      "{playerName} has unsubscribed from the match on {matchDay} {matchDate}. <strong style=\"background-color:#fef2f2;padding:2px 6px;border-radius:4px;color:#991b1b;\">⚠️ The game is now back to 5v5. {demotedName} is unfortunately moved to the waiting list.</strong> Here is the updated list.",
    promotedSubject: "🎉 You're playing! — {matchDay} {matchDate}",
    promotedHeading: "Get your gear ready!",
    promotedBody:
      "Following {playerName}'s departure, you are now part of the players for the match on {matchDay} {matchDate}. Get your gear ready!",
    demotedSubject: "😔 Back on the waiting list — {matchDay} {matchDate}",
    demotedHeading: "You're back on the waiting list",
    demotedBody:
      "Following {playerName}'s departure, the game is back to 5v5 and you are unfortunately moved to the waiting list for the match on {matchDay} {matchDate}.",
    playersTitle: "Players",
    waitingListTitle: "Waiting list",
    cta: "View match",
  },
  es: {
    joinedSubject: "🆕 Nuevo jugador — {matchDay} {matchDate}",
    joinedHeading: "¡Un nuevo jugador en la cancha!",
    joinedBody:
      "{playerName} se acaba de inscribir para el partido de {matchDay} {matchDate}. Aquí está la lista actualizada.",
    joinedFormatUpBody:
      "{playerName} se acaba de inscribir para el partido de {matchDay} {matchDate}. <strong style=\"background-color:#ecfdf5;padding:2px 6px;border-radius:4px;color:#065f46;\">🎉 ¡Buenas noticias: {promotedName} sale de la lista de espera y se une a los jugadores! El partido pasa a 6v6.</strong> Aquí está la lista actualizada.",
    leftSubject: "👋 Un jugador se fue — {matchDay} {matchDate}",
    leftHeading: "Un jugador nos deja...",
    leftBody:
      "{playerName} se ha dado de baja del partido de {matchDay} {matchDate}. {promotedLine}Aquí está la lista actualizada.",
    leftFormatDownBody:
      "{playerName} se ha dado de baja del partido de {matchDay} {matchDate}. <strong style=\"background-color:#fef2f2;padding:2px 6px;border-radius:4px;color:#991b1b;\">⚠️ El partido vuelve a 5v5. {demotedName} vuelve a la lista de espera lamentablemente.</strong> Aquí está la lista actualizada.",
    promotedSubject: "🎉 ¡Juegas! — {matchDay} {matchDate}",
    promotedHeading: "¡Prepara tus botas!",
    promotedBody:
      "Tras la salida de {playerName}, ahora formas parte de los jugadores para el partido de {matchDay} {matchDate}. ¡Prepárate!",
    demotedSubject: "😔 De vuelta en la lista de espera — {matchDay} {matchDate}",
    demotedHeading: "Estás de vuelta en la lista de espera",
    demotedBody:
      "Tras la salida de {playerName}, el partido vuelve a 5v5 y lamentablemente estás de vuelta en la lista de espera para el partido de {matchDay} {matchDate}.",
    playersTitle: "Jugadores",
    waitingListTitle: "Lista de espera",
    cta: "Ver partido",
  },
  hi: {
    joinedSubject: "🆕 नया खिलाड़ी — {matchDay} {matchDate}",
    joinedHeading: "एक नया खिलाड़ी आया है!",
    joinedBody:
      "{playerName} ने {matchDay} {matchDate} के मैच के लिए साइन अप किया है। यहां अपडेटेड सूची है।",
    joinedFormatUpBody:
      "{playerName} ने {matchDay} {matchDate} के मैच के लिए साइन अप किया है। <strong style=\"background-color:#ecfdf5;padding:2px 6px;border-radius:4px;color:#065f46;\">🎉 अच्छी खबर: {promotedName} प्रतीक्षा सूची से बाहर आकर खिलाड़ियों में शामिल हो गए! खेल अब 6v6 है।</strong> यहां अपडेटेड सूची है।",
    leftSubject: "👋 एक खिलाड़ी चला गया — {matchDay} {matchDate}",
    leftHeading: "एक खिलाड़ी ने छोड़ दिया...",
    leftBody:
      "{playerName} ने {matchDay} {matchDate} के मैच से अपना नाम हटा लिया है। {promotedLine}यहां अपडेटेड सूची है।",
    leftFormatDownBody:
      "{playerName} ने {matchDay} {matchDate} के मैच से अपना नाम हटा लिया है। <strong style=\"background-color:#fef2f2;padding:2px 6px;border-radius:4px;color:#991b1b;\">⚠️ खेल अब 5v5 पर वापस आ गया है। {demotedName} दुर्भाग्य से प्रतीक्षा सूची में चला गया है।</strong> यहां अपडेटेड सूची है।",
    promotedSubject: "🎉 आप खेल रहे हैं! — {matchDay} {matchDate}",
    promotedHeading: "अपना सामान तैयार करो!",
    promotedBody:
      "{playerName} के जाने के बाद, अब आप {matchDay} {matchDate} के मैच के खिलाड़ियों में शामिल हैं। तैयार हो जाओ!",
    demotedSubject: "😔 वापस प्रतीक्षा सूची में — {matchDay} {matchDate}",
    demotedHeading: "आप वापस प्रतीक्षा सूची में हैं",
    demotedBody:
      "{playerName} के जाने के बाद, खेल 5v5 पर वापस आ गया है और आप दुर्भाग्य से {matchDay} {matchDate} के मैच की प्रतीक्षा सूची में चले गए हैं।",
    playersTitle: "खिलाड़ी",
    waitingListTitle: "प्रतीक्षा सूची",
    cta: "मैच देखें",
  },
  pt: {
    joinedSubject: "🆕 Novo jogador — {matchDay} {matchDate}",
    joinedHeading: "Um novo jogador na área!",
    joinedBody:
      "{playerName} acabou de se inscrever para o jogo de {matchDay} {matchDate}. Aqui está a lista atualizada.",
    joinedFormatUpBody:
      "{playerName} acabou de se inscrever para o jogo de {matchDay} {matchDate}. <strong style=\"background-color:#ecfdf5;padding:2px 6px;border-radius:4px;color:#065f46;\">🎉 Boa notícia: {promotedName} sai da lista de espera e junta-se aos jogadores! O jogo passa a 6v6.</strong> Aqui está a lista atualizada.",
    leftSubject: "👋 Um jogador saiu — {matchDay} {matchDate}",
    leftHeading: "Um jogador nos deixou...",
    leftBody:
      "{playerName} cancelou a inscrição do jogo de {matchDay} {matchDate}. {promotedLine}Aqui está a lista atualizada.",
    leftFormatDownBody:
      "{playerName} cancelou a inscrição do jogo de {matchDay} {matchDate}. <strong style=\"background-color:#fef2f2;padding:2px 6px;border-radius:4px;color:#991b1b;\">⚠️ O jogo volta a 5v5. {demotedName} volta infelizmente para a lista de espera.</strong> Aqui está a lista atualizada.",
    promotedSubject: "🎉 Você joga! — {matchDay} {matchDate}",
    promotedHeading: "Prepare as suas chuteiras!",
    promotedBody:
      "Após a saída de {playerName}, agora faz parte dos jogadores para o jogo de {matchDay} {matchDate}. Prepare-se!",
    demotedSubject: "😔 De volta à lista de espera — {matchDay} {matchDate}",
    demotedHeading: "Está de volta à lista de espera",
    demotedBody:
      "Após a saída de {playerName}, o jogo volta a 5v5 e infelizmente volta à lista de espera para o jogo de {matchDay} {matchDate}.",
    playersTitle: "Jogadores",
    waitingListTitle: "Lista de espera",
    cta: "Ver jogo",
  },
  it: {
    joinedSubject: "🆕 Nuovo giocatore — {matchDay} {matchDate}",
    joinedHeading: "Un nuovo giocatore in campo!",
    joinedBody:
      "{playerName} si è appena iscritto per la partita di {matchDay} {matchDate}. Ecco la lista aggiornata.",
    joinedFormatUpBody:
      "{playerName} si è appena iscritto per la partita di {matchDay} {matchDate}. <strong style=\"background-color:#ecfdf5;padding:2px 6px;border-radius:4px;color:#065f46;\">🎉 Buone notizie: {promotedName} esce dalla lista d'attesa e si unisce ai giocatori! La partita passa a 6v6.</strong> Ecco la lista aggiornata.",
    leftSubject: "👋 Un giocatore se ne va — {matchDay} {matchDate}",
    leftHeading: "Un giocatore ci lascia...",
    leftBody:
      "{playerName} si è cancellato dalla partita di {matchDay} {matchDate}. {promotedLine}Ecco la lista aggiornata.",
    leftFormatDownBody:
      "{playerName} si è cancellato dalla partita di {matchDay} {matchDate}. <strong style=\"background-color:#fef2f2;padding:2px 6px;border-radius:4px;color:#991b1b;\">⚠️ La partita torna a 5v5. {demotedName} torna purtroppo in lista d'attesa.</strong> Ecco la lista aggiornata.",
    promotedSubject: "🎉 Giochi! — {matchDay} {matchDate}",
    promotedHeading: "Prepara le tue scarpe!",
    promotedBody:
      "Dopo l'uscita di {playerName}, ora fai parte dei giocatori per la partita di {matchDay} {matchDate}. Preparati!",
    demotedSubject: "😔 Di nuovo in lista d'attesa — {matchDay} {matchDate}",
    demotedHeading: "Sei di nuovo in lista d'attesa",
    demotedBody:
      "Dopo l'uscita di {playerName}, la partita torna a 5v5 e purtroppo sei di nuovo in lista d'attesa per la partita di {matchDay} {matchDate}.",
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

function replacePlaceholders(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function buildRosterEmailHtml(opts: {
  locale: SupportedLocale;
  heading: string;
  body: string;
  matchDay: string;
  matchDate: string;
  appUrl: string;
  players: { displayName: string }[];
  waitingList: { displayName: string }[];
  headerColor?: string;
}): string {
  const t = emailTranslations[opts.locale];
  const headerBg = opts.headerColor || "linear-gradient(135deg,#059669,#15803d)";

  const playersList = opts.players
    .map((p, idx) => `<li>${idx + 1}. ${p.displayName}</li>`)
    .join("");
  const waitingListItems = opts.waitingList
    .map((p, idx) => `<li>${idx + 1}. ${p.displayName}</li>`)
    .join("");

  const waitingListSection = opts.waitingList.length > 0
    ? `<td style="width:50%;vertical-align:top;padding-left:8px;">
                  <h3 style="margin:0 0 8px;font-size:14px;color:#374151;">${t.waitingListTitle}</h3>
                  <ol style="padding-left:20px;margin:0 0 12px 0;">
                    ${waitingListItems}
                  </ol>
                </td>`
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
          <td style="background:${headerBg};padding:28px 32px;text-align:center;">
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
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="width:${opts.waitingList.length > 0 ? "50%" : "100%"};vertical-align:top;padding-right:8px;">
                  <h3 style="margin:0 0 8px;font-size:14px;color:#374151;">${t.playersTitle}</h3>
                  <ol style="padding-left:20px;margin:0 0 12px 0;">
                    ${playersList}
                  </ol>
                </td>
                ${waitingListSection}
              </tr>
            </table>
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

interface RosterRequest {
  event: RosterEvent;
  playerName: string; // the player who joined or left
  formatChange: FormatChange;
  promotedPlayer: Recipient | null;  // WL → players (on leave)
  demotedPlayer: Recipient | null;   // players → WL (on format down)
  allPlayerEmails: Recipient[];
  waitingListEmails: Recipient[];
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

  const body = (await req.json()) as RosterRequest;
  const {
    event, playerName, formatChange,
    promotedPlayer, demotedPlayer,
    allPlayerEmails, waitingListEmails,
    matchDay, matchDate, players, waitingList,
  } = body;

  const allRecipients = [...(allPlayerEmails ?? []), ...(waitingListEmails ?? [])];
  if (allRecipients.length === 0 && !promotedPlayer && !demotedPlayer) {
    return NextResponse.json({ success: false, error: "no-recipients" }, { status: 400 });
  }

  const appUrl = getAppUrl();
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS || "AAA-BelAir <onboarding@resend.dev>";

  const vars = { playerName, matchDay, matchDate, promotedName: promotedPlayer?.displayName ?? "", demotedName: demotedPlayer?.displayName ?? "" };

  const batch: Array<{ from: string; to: string[]; subject: string; html: string }> = [];
  const htmlCache: Record<string, string> = {};

  function getCachedHtml(key: string, locale: SupportedLocale, heading: string, bodyText: string, headerColor?: string): string {
    const cacheKey = `${key}_${locale}`;
    if (!htmlCache[cacheKey]) {
      htmlCache[cacheKey] = buildRosterEmailHtml({
        locale, heading, body: bodyText, matchDay, matchDate, appUrl, players, waitingList, headerColor,
      });
    }
    return htmlCache[cacheKey];
  }

  // --- Build emails for the promoted player (special email) ---
  if (event === "player-left" && promotedPlayer?.email) {
    const locale = isValidLocale(promotedPlayer.locale) ? promotedPlayer.locale : "fr";
    const t = emailTranslations[locale];
    const subject = replacePlaceholders(t.promotedSubject, vars);
    const heading = t.promotedHeading;
    const bodyText = replacePlaceholders(t.promotedBody, vars);
    batch.push({
      from: fromAddress,
      to: [promotedPlayer.email],
      subject,
      html: getCachedHtml("promoted", locale, heading, bodyText),
    });
  }

  // --- Build emails for the demoted player (special email) ---
  if (event === "player-left" && formatChange === "6v6-to-5v5" && demotedPlayer?.email) {
    const locale = isValidLocale(demotedPlayer.locale) ? demotedPlayer.locale : "fr";
    const t = emailTranslations[locale];
    const subject = replacePlaceholders(t.demotedSubject, vars);
    const heading = t.demotedHeading;
    const bodyText = replacePlaceholders(t.demotedBody, vars);
    batch.push({
      from: fromAddress,
      to: [demotedPlayer.email],
      subject,
      html: getCachedHtml("demoted", locale, heading, bodyText, "linear-gradient(135deg,#f59e0b,#d97706)"),
    });
  }

  // --- Build emails for all other recipients (players + WL) ---
  const specialUids = new Set<string>();
  if (promotedPlayer?.email) specialUids.add(promotedPlayer.email);
  if (demotedPlayer?.email) specialUids.add(demotedPlayer.email);

  for (const recipient of allRecipients) {
    if (specialUids.has(recipient.email)) continue; // skip, they got a special email

    const locale = isValidLocale(recipient.locale) ? recipient.locale : "fr";
    const t = emailTranslations[locale];

    let subject: string;
    let heading: string;
    let bodyText: string;

    if (event === "player-joined") {
      subject = replacePlaceholders(t.joinedSubject, vars);
      heading = t.joinedHeading;
      if (formatChange === "5v5-to-6v6") {
        bodyText = replacePlaceholders(t.joinedFormatUpBody, vars);
      } else {
        bodyText = replacePlaceholders(t.joinedBody, vars);
      }
    } else {
      subject = replacePlaceholders(t.leftSubject, vars);
      heading = t.leftHeading;
      if (formatChange === "6v6-to-5v5") {
        bodyText = replacePlaceholders(t.leftFormatDownBody, vars);
      } else {
        // Normal leave: mention promoted player if any
        const promotedLine = promotedPlayer
          ? replacePlaceholders(
              locale === "fr" ? "🎉 {promotedName}, prépare tes crampons, tu joues maintenant ! "
                : locale === "es" ? "🎉 {promotedName}, ¡prepara tus botas, ahora juegas! "
                : locale === "pt" ? "🎉 {promotedName}, prepara as chuteiras, agora jogas! "
                : locale === "it" ? "🎉 {promotedName}, prepara le scarpe, ora giochi! "
                : locale === "hi" ? "🎉 {promotedName}, तैयार हो जाओ, अब तुम खेल रहे हो! "
                : "🎉 {promotedName}, get your gear ready, you're playing now! ",
              vars,
            )
          : "";
        bodyText = replacePlaceholders(t.leftBody, { ...vars, promotedLine });
      }
    }

    batch.push({
      from: fromAddress,
      to: [recipient.email],
      subject,
      html: getCachedHtml(event, locale, heading, bodyText),
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
