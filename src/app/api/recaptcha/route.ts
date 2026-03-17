import { NextRequest, NextResponse } from "next/server";

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY ?? "";
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
const SCORE_THRESHOLD = 0.5;

export async function GET() {
  return NextResponse.json({
    hasSecretKey: RECAPTCHA_SECRET_KEY.length > 0,
    hasSiteKey: RECAPTCHA_SITE_KEY.length > 0,
    siteKeyPrefix: RECAPTCHA_SITE_KEY.slice(0, 4) || "EMPTY",
  });
}

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
}

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };

  if (!token) {
    return NextResponse.json({ success: false, error: "missing-token" }, { status: 400 });
  }

  if (!RECAPTCHA_SECRET_KEY) {
    return NextResponse.json({ success: false, error: "server-misconfigured" }, { status: 500 });
  }

  const params = new URLSearchParams();
  params.set("secret", RECAPTCHA_SECRET_KEY);
  params.set("response", token);

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data: RecaptchaResponse = await res.json();

  if (!data.success || (data.score ?? 0) < SCORE_THRESHOLD) {
    return NextResponse.json({ success: false, score: data.score ?? 0 }, { status: 403 });
  }

  return NextResponse.json({ success: true, score: data.score });
}
