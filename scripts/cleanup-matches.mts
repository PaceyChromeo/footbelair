import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDeori5nzM-gxwTaK0DCQjo1kQn1QESdkI",
  authDomain: "aaa-belair.firebaseapp.com",
  projectId: "aaa-belair",
  storageBucket: "aaa-belair.firebasestorage.app",
  messagingSenderId: "749161292260",
  appId: "1:749161292260:web:6a3b04eb80024568fca7f1",
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
