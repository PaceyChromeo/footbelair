import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getAdminAuth } from "@/lib/firebase-admin";

type SupportedLocale = "fr" | "en" | "es" | "hi" | "pt" | "ar" | "it";

const VALID_LOCALES: SupportedLocale[] = ["fr", "en", "es", "hi", "pt", "ar", "it"];

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

const emailTranslations: Record<SupportedLocale, { subject: string; heading: string; body: string; cta: string; footer: string }> = {
  fr: {
    subject: "✉️ Vérifiez votre email — Foot Bel-Air",
    heading: "Vérifiez votre adresse email",
    body: "Cliquez sur le bouton ci-dessous pour vérifier votre adresse email et activer votre compte.",
    cta: "Vérifier mon email",
    footer: "Foot Bel-Air · Vérification d'email",
  },
  en: {
    subject: "✉️ Verify your email — Foot Bel-Air",
    heading: "Verify your email address",
    body: "Click the button below to verify your email address and activate your account.",
    cta: "Verify my email",
    footer: "Foot Bel-Air · Email verification",
  },
  es: {
    subject: "✉️ Verifica tu email — Foot Bel-Air",
    heading: "Verifica tu dirección de email",
    body: "Haz clic en el botón de abajo para verificar tu dirección de email y activar tu cuenta.",
    cta: "Verificar mi email",
    footer: "Foot Bel-Air · Verificación de email",
  },
  hi: {
    subject: "✉️ अपना ईमेल सत्यापित करें — Foot Bel-Air",
    heading: "अपना ईमेल पता सत्यापित करें",
    body: "अपना ईमेल पता सत्यापित करने और अपना खाता सक्रिय करने के लिए नीचे दिए गए बटन पर क्लिक करें।",
    cta: "मेरा ईमेल सत्यापित करें",
    footer: "Foot Bel-Air · ईमेल सत्यापन",
  },
  pt: {
    subject: "✉️ Verifique seu email — Foot Bel-Air",
    heading: "Verifique seu endereço de email",
    body: "Clique no botão abaixo para verificar seu endereço de email e ativar sua conta.",
    cta: "Verificar meu email",
    footer: "Foot Bel-Air · Verificação de email",
  },
  ar: {
    subject: "✉️ تحقق من بريدك الإلكتروني — Foot Bel-Air",
    heading: "تحقق من عنوان بريدك الإلكتروني",
    body: "انقر على الزر أدناه للتحقق من عنوان بريدك الإلكتروني وتفعيل حسابك.",
    cta: "تحقق من بريدي الإلكتروني",
    footer: "Foot Bel-Air · التحقق من البريد الإلكتروني",
  },
  it: {
    subject: "✉️ Verifica la tua email — Foot Bel-Air",
    heading: "Verifica il tuo indirizzo email",
    body: "Clicca sul pulsante qui sotto per verificare il tuo indirizzo email e attivare il tuo account.",
    cta: "Verifica la mia email",
    footer: "Foot Bel-Air · Verifica email",
  },
};

function buildEmailHtml(
  verifyUrl: string,
  locale: SupportedLocale,
  displayName: string
): string {
  const t = emailTranslations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const lang = locale === "ar" ? "ar" : locale;
  const greeting = displayName ? (locale === "fr" ? `Bonjour ${displayName},` : locale === "es" ? `Hola ${displayName},` : locale === "it" ? `Ciao ${displayName},` : locale === "pt" ? `Olá ${displayName},` : locale === "ar" ? `مرحبا ${displayName}،` : locale === "hi" ? `नमस्ते ${displayName},` : `Hello ${displayName},`) : "";

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
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Foot Bel-Air</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${greeting ? `<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">${greeting}</p>` : ""}
            <h2 style="margin:0 0 12px;font-size:18px;color:#18181b;">${t.heading}</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">${t.body}</p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${verifyUrl}" style="display:inline-block;background-color:#059669;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
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

interface SendVerificationRequest {
  email: string;
  displayName?: string;
  locale?: string;
}

export async function POST(req: NextRequest) {
  const resend = getResend();
  if (!resend) {
    return NextResponse.json(
      { success: false, error: "server-misconfigured" },
      { status: 500 }
    );
  }

  const body = (await req.json()) as SendVerificationRequest;
  const { email, displayName, locale: rawLocale } = body;

  if (!email) {
    return NextResponse.json(
      { success: false, error: "missing-email" },
      { status: 400 }
    );
  }

  const locale = isValidLocale(rawLocale) ? rawLocale : "fr";
  const appUrl = getAppUrl();
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS || "Foot Bel-Air <onboarding@resend.dev>";

  try {
    // Generate Firebase verification link (points to firebaseapp.com)
    const firebaseLink = await getAdminAuth().generateEmailVerificationLink(email, {
      url: `${appUrl}/login`,
    });

    // Rewrite the link to go through our /verify page on our domain
    // Extract oobCode and other params from the Firebase link
    const firebaseUrl = new URL(firebaseLink);
    const oobCode = firebaseUrl.searchParams.get("oobCode");
    const fbKey = firebaseUrl.searchParams.get("apiKey");

    if (!oobCode || !fbKey) {
      console.error("Failed to extract oobCode/fbKey from Firebase link:", firebaseLink);
      return NextResponse.json(
        { success: false, error: "link-generation-failed" },
        { status: 500 }
      );
    }

    // Build verification URL on our domain
    const verifyParams = new URLSearchParams({
      oobCode,
      apiKey: fbKey,
      mode: "verifyEmail",
    });
    const verifyUrl = `${appUrl}/verify?${verifyParams.toString()}`;

    const t = emailTranslations[locale];
    const html = buildEmailHtml(verifyUrl, locale, displayName || "");

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject: t.subject,
      html,
    });

    if (error) {
      console.error("Resend send-verification error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Send verification error:", err);
    return NextResponse.json(
      { success: false, error: "internal-error" },
      { status: 500 }
    );
  }
}
