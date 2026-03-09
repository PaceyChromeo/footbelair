import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const requiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: requiredEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: requiredEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: requiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: requiredEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requiredEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requiredEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const KEEP = new Set([
  "monday-2026-03-09",
  "tuesday-2026-03-10",
  "wednesday-2026-03-11",
  "thursday-2026-03-12",
  "friday-2026-03-13",
]);

async function cleanup() {
  const snapshot = await getDocs(collection(db, "matches"));
  let deleted = 0;
  let kept = 0;

  for (const d of snapshot.docs) {
    if (KEEP.has(d.id)) {
      console.log(`  ✓ KEEP ${d.id}`);
      kept++;
    } else {
      await deleteDoc(doc(db, "matches", d.id));
      console.log(`  ✗ DELETED ${d.id}`);
      deleted++;
    }
  }

  console.log(`\nDone. Kept: ${kept}, Deleted: ${deleted}`);
  process.exit(0);
}

cleanup().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
