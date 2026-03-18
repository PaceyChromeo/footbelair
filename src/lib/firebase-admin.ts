import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let _app: App | undefined;
let _auth: Auth | undefined;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length) {
    _app = getApps()[0];
    return _app;
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT environment variable is not set. " +
      "Set it to the JSON string of your Firebase service account key."
    );
  }

  _app = initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  return _app;
}

export function getAdminAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getAdminApp());
  return _auth;
}
