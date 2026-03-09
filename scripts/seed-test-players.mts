import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, updateDoc, Timestamp } from "firebase/firestore";

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

const FAKE_PLAYERS = [
  { uid: "fake-01", displayName: "Lucas Martin", email: "lucas.martin@test.com" },
  { uid: "fake-02", displayName: "Emma Bernard", email: "emma.bernard@test.com" },
  { uid: "fake-03", displayName: "Hugo Dubois", email: "hugo.dubois@test.com" },
  { uid: "fake-04", displayName: "Léa Thomas", email: "lea.thomas@test.com" },
  { uid: "fake-05", displayName: "Gabriel Robert", email: "gabriel.robert@test.com" },
  { uid: "fake-06", displayName: "Chloé Richard", email: "chloe.richard@test.com" },
  { uid: "fake-07", displayName: "Raphaël Petit", email: "raphael.petit@test.com" },
  { uid: "fake-08", displayName: "Jade Moreau", email: "jade.moreau@test.com" },
  { uid: "fake-09", displayName: "Louis Laurent", email: "louis.laurent@test.com" },
  { uid: "fake-10", displayName: "Alice Simon", email: "alice.simon@test.com" },
  { uid: "fake-11", displayName: "Nathan Michel", email: "nathan.michel@test.com" },
  { uid: "fake-12", displayName: "Manon Lefèvre", email: "manon.lefevre@test.com" },
  { uid: "fake-13", displayName: "Ethan Garcia", email: "ethan.garcia@test.com" },
  { uid: "fake-14", displayName: "Camille Roux", email: "camille.roux@test.com" },
  { uid: "fake-15", displayName: "Théo Fournier", email: "theo.fournier@test.com" },
];

async function seed() {
  const now = Timestamp.now();
  const month = "2026-03";

  console.log("Creating 15 fake user profiles...");
  for (const p of FAKE_PLAYERS) {
    const userRef = doc(db, "users", p.uid);
    await setDoc(userRef, {
      uid: p.uid,
      displayName: p.displayName,
      email: p.email,
      photoURL: null,
      role: "player",
      quota: { remaining: 10, month },
      penalty: null,
      createdAt: now,
    });
    console.log(`  ✓ ${p.displayName}`);
  }

  const matchId = "monday-2026-03-09";
  const matchDate = new Date(2026, 2, 9, 12, 30, 0, 0);
  console.log(`\nRegistering 15 players to match ${matchId}...`);

  // Use timestamps from 24 hours ago so fake players clearly registered before any real user
  const baseTime = Date.now() - 24 * 60 * 60 * 1000;
  const playerEntries = FAKE_PLAYERS.map((p, i) => ({
    uid: p.uid,
    displayName: p.displayName,
    photoURL: null,
    joinedAt: Timestamp.fromMillis(baseTime + i * 60000),
  }));

  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);

  if (matchSnap.exists()) {
    await updateDoc(matchRef, {
      players: playerEntries.slice(0, 12),
      waitingList: playerEntries.slice(12),
      status: "full",
    });
    console.log("  ✓ Updated existing match");
  } else {
    await setDoc(matchRef, {
      date: Timestamp.fromDate(matchDate),
      dayOfWeek: "monday",
      status: "full",
      players: playerEntries.slice(0, 12),
      waitingList: playerEntries.slice(12),
      maxPlayers: 12,
      createdBy: "seed-script",
      createdAt: now,
    });
    console.log("  ✓ Created match with players");
  }

  console.log("\nDone! 12 players + 3 in waiting list.");
  console.log("Players (6v6): " + FAKE_PLAYERS.slice(0, 12).map(p => p.displayName).join(", "));
  console.log("Waiting list: " + FAKE_PLAYERS.slice(12).map(p => p.displayName).join(", "));
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
