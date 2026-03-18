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

interface ReportRequest {
  reporterName: string;
  reportedPlayerName: string;
  matchDate: string;
  matchDay: string;
  adminEmails: string[];
}

export async function POST(req: NextRequest) {
  const resend = getResend();
  if (!resend) {
    return NextResponse.json(
      { success: false, error: "server-misconfigured" },
      { status: 500 }
    );
  }

  const body = (await req.json()) as ReportRequest;
  const { reporterName, reportedPlayerName, matchDate, matchDay, adminEmails } = body;

  if (!reporterName || !reportedPlayerName || !adminEmails?.length) {
    return NextResponse.json(
      { success: false, error: "missing-fields" },
      { status: 400 }
    );
  }

  const appUrl = getAppUrl();
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS || "AAA-BelAir <onboarding@resend.dev>";

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:28px 32px;text-align:center;">
            <span style="font-size:32px;">🚫</span>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">No-Show Report</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#18181b;">
              ${reporterName} reported a no-show
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:16px;">
                <p style="margin:0 0 8px;font-size:14px;color:#3f3f46;">
                  <strong>Reported player:</strong> ${reportedPlayerName}
                </p>
                <p style="margin:0 0 8px;font-size:14px;color:#3f3f46;">
                  <strong>Match:</strong> ${matchDay} ${matchDate}
                </p>
                <p style="margin:0;font-size:14px;color:#3f3f46;">
                  <strong>Reported by:</strong> ${reporterName}
                </p>
              </td></tr>
            </table>
            <p style="margin:0 0 24px;font-size:14px;color:#3f3f46;line-height:1.6;">
              Please review this report and apply the penalty if confirmed via the admin panel.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${appUrl}/admin" style="display:inline-block;background-color:#dc2626;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                  Open Admin Panel
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e4e4e7;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">AAA-BelAir · No-show report</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const batch = adminEmails.map((email) => ({
    from: fromAddress,
    to: [email],
    subject: `🚫 No-show report: ${reportedPlayerName} — ${matchDay} ${matchDate}`,
    html,
  }));

  const { data, error } = await resend.batch.send(batch);
  if (error) {
    console.error("Resend report-noshow error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, sent: adminEmails.length, data });
}
