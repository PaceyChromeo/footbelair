# footbelair

A Next.js app for managing matches, profiles, and weekly schedules.

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Environment Variables

Create a .env.local with the Firebase web config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
RESEND_API_KEY=
```

Get a reCAPTCHA v3 site key at https://www.google.com/recaptcha/admin (choose "Score based (v3)").

Get a Resend API key at https://resend.com/api-keys (free tier: 100 emails/day, 3000/month).
Optionally set `RESEND_FROM_ADDRESS` (e.g. `AAA-BelAir <notifications@yourdomain.com>`) if you have a verified domain. Defaults to `onboarding@resend.dev` (dev only).

## Useful Scripts

```bash
npm run lint
npm run build
npm run start
npm run scan:secrets
```

## Security Notes

### Firebase API key rotation

1) In Firebase Console, rotate the Web API key for the project.
2) Update .env.local with the new key.
3) Redeploy any environments that use the old key.

### Firestore rules review checklist

- Require authentication for any write.
- Validate input types and required fields.
- Prevent users from reading or writing other users' data.
- Deny list or mass export queries for sensitive collections.

### Pre-commit secret scan

This repo includes a lightweight secret scan hook.

Enable it once per clone:

```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```
