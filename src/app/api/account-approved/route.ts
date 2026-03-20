import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

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

interface ApprovedRequest {
  playerName: string;
  playerEmail: string;
}

function buildEmailHtml(playerName: string, appUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 32px;text-align:center;">
            <span style="font-size:32px;">✅</span>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Account Approved!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#18181b;">
              Welcome ${playerName}! 🎉
            </p>
            <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;line-height:1.6;">
              Your account has been approved by an administrator. You can now register for upcoming matches.
            </p>
            <p style="margin:0 0 8px;font-size:14px;color:#3f3f46;line-height:1.6;">
              Ton compte a été approuvé par un administrateur. Tu peux maintenant t'inscrire aux prochains matchs.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
              <tr><td align="center">
                <a href="${appUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                  View Matches
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e4e4e7;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">AAA-BelAir · Account approved</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const resend = getResend();
  if (!resend) {
    return NextResponse.json(
      { success: false, error: "server-misconfigured" },
      { status: 500 }
    );
  }

  const body = (await req.json()) as ApprovedRequest;
  const { playerName, playerEmail } = body;

  if (!playerName || !playerEmail) {
    return NextResponse.json(
      { success: false, error: "missing-fields" },
      { status: 400 }
    );
  }

  const appUrl = getAppUrl();
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS || "AAA-BelAir <onboarding@resend.dev>";

  const html = buildEmailHtml(playerName, appUrl);

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [playerEmail],
    subject: "✅ Your account has been approved! / Ton compte a été approuvé !",
    html,
  });

  if (error) {
    console.error("Resend account-approved error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}
