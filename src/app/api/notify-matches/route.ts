import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

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

function buildEmailHtml(weekLabel: string, appUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
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
            <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Les matchs de la semaine sont ouverts !</h2>
            <p style="margin:0 0 4px;font-size:14px;color:#71717a;">Semaine du</p>
            <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#18181b;">${weekLabel}</p>
            <p style="margin:0 0 24px;font-size:14px;color:#3f3f46;line-height:1.6;">
              Les inscriptions sont ouvertes pour les matchs de cette semaine.
              Réserve ta place dès maintenant — les places partent vite !
            </p>
            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:16px;">
                <a href="${appUrl}" style="display:inline-block;background-color:#059669;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                  S'inscrire aux matchs
                </a>
              </td></tr>
            </table>
            <!-- Weather -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background-color:#f0fdf4;border-radius:8px;">
              <tr><td style="padding:16px;">
                <p style="margin:0 0 8px;font-size:13px;color:#166534;font-weight:600;">🌤️ Météo Villeneuve-Loubet</p>
                <p style="margin:0 0 12px;font-size:13px;color:#3f3f46;line-height:1.5;">
                  Consulte la météo de la semaine pour anticiper les conditions de jeu.
                </p>
                <a href="${WEATHER_URL}" style="font-size:13px;color:#059669;font-weight:600;text-decoration:underline;">
                  Voir les prévisions →
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e4e4e7;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">
              Tous les jours à 12h30 · 12 places par match
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface NotifyRequest {
  emails: string[];
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

  const { emails, weekLabel } = (await req.json()) as NotifyRequest;

  if (!emails || emails.length === 0) {
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
  const html = buildEmailHtml(weekLabel, appUrl);
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS || "AAA-BelAir <onboarding@resend.dev>";

  const batch = emails.map((email) => ({
    from: fromAddress,
    to: [email],
    subject: `⚽ Matchs de la semaine ouverts — ${weekLabel}`,
    html,
  }));

  // Resend batch supports up to 100 emails per call
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

  return NextResponse.json({ success: true, sent: emails.length, results });
}
