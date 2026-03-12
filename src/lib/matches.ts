import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  getDoc,
  onSnapshot,
  DocumentSnapshot,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Match,
  PlayerEntry,
  UserProfile,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MAX_QUOTA,
  PENALTY_DURATION_DAYS,
  DayOfWeek,
  CancellationReason,
} from "@/lib/types";
import { sortByPriority, splitPlayersAndWaitingList } from "@/lib/priority";

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getWeekDates(weekOffset: number = 0): { day: DayOfWeek; date: Date }[] {
  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  const days: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  return days.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { day, date };
  });
}

export async function fetchMatchesForWeek(
  weekOffset: number = 0
): Promise<Match[]> {
  const weekDates = getWeekDates(weekOffset);
  const startOfWeek = Timestamp.fromDate(weekDates[0].date);
  const endOfFriday = new Date(weekDates[4].date);
  endOfFriday.setHours(23, 59, 59, 999);
  const endOfWeek = Timestamp.fromDate(endOfFriday);

  const matchesRef = collection(db, "matches");
  const q = query(
    matchesRef,
    where("date", ">=", startOfWeek),
    where("date", "<=", endOfWeek)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d: DocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Match));
}

export function subscribeToMatchesForWeek(
  weekOffset: number,
  callback: (matches: Match[]) => void
): () => void {
  const weekDates = getWeekDates(weekOffset);
  const startOfWeek = Timestamp.fromDate(weekDates[0].date);
  const endOfFriday = new Date(weekDates[4].date);
  endOfFriday.setHours(23, 59, 59, 999);
  const endOfWeek = Timestamp.fromDate(endOfFriday);

  const matchesRef = collection(db, "matches");
  const q = query(
    matchesRef,
    where("date", ">=", startOfWeek),
    where("date", "<=", endOfWeek)
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const matches = snapshot.docs.map((d: DocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Match));
    callback(matches);
  });
}

export function subscribeToMatch(
  matchId: string,
  callback: (match: Match | null) => void
): () => void {
  const matchRef = doc(db, "matches", matchId);
  return onSnapshot(matchRef, (snap: DocumentSnapshot<DocumentData>) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as Match);
    } else {
      callback(null);
    }
  });
}

export async function fetchAllUsers(): Promise<Map<string, UserProfile>> {
  const usersRef = collection(db, "users");
  const snapshot = await getDocs(usersRef);
  const map = new Map<string, UserProfile>();
  snapshot.docs.forEach((d: DocumentSnapshot<DocumentData>) => {
    map.set(d.id, d.data() as UserProfile);
  });
  return map;
}

export function subscribeToUsers(
  callback: (users: Map<string, UserProfile>) => void
): () => void {
  const usersRef = collection(db, "users");
  return onSnapshot(usersRef, (snapshot: QuerySnapshot<DocumentData>) => {
    const map = new Map<string, UserProfile>();
    snapshot.docs.forEach((d: DocumentSnapshot<DocumentData>) => {
      map.set(d.id, d.data() as UserProfile);
    });
    callback(map);
  });
}

export async function createMatch(
  date: Date,
  dayOfWeek: DayOfWeek,
  adminUid: string
): Promise<string> {
  const matchDate = new Date(date);
  matchDate.setHours(12, 30, 0, 0);

  const matchId = `${dayOfWeek}-${matchDate.toISOString().split("T")[0]}`;
  const matchRef = doc(db, "matches", matchId);

  const matchData: Omit<Match, "id"> = {
    date: Timestamp.fromDate(matchDate),
    dayOfWeek,
    status: "open",
    players: [],
    waitingList: [],
    maxPlayers: MAX_PLAYERS,
    createdBy: adminUid,
    createdAt: Timestamp.now(),
  };

  await setDoc(matchRef, matchData);
  return matchId;
}

export async function createWeekMatches(
  weekOffset: number,
  adminUid: string
): Promise<string[]> {
  const weekDates = getWeekDates(weekOffset);
  const ids: string[] = [];

  for (const { day, date } of weekDates) {
    const id = await createMatch(date, day, adminUid);
    ids.push(id);
  }

  return ids;
}

export async function deleteWeekMatches(weekOffset: number): Promise<void> {
  const matches = await fetchMatchesForWeek(weekOffset);
  for (const match of matches) {
    await deleteDoc(doc(db, "matches", match.id));
  }
}


export async function joinMatch(
  matchId: string,
  player: PlayerEntry,
  usersMap: Map<string, UserProfile>
): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("Match not found");

  const match = { id: matchSnap.id, ...matchSnap.data() } as Match;

  const alreadyIn = [...match.players, ...match.waitingList].find(
    (p) => p.uid === player.uid
  );
  if (alreadyIn) throw new Error("Already registered");

  const allEntries = [...match.players, ...match.waitingList, player];
  const sorted = sortByPriority(allEntries, usersMap);
  const { players, waitingList } = splitPlayersAndWaitingList(sorted, MAX_PLAYERS);

  const newStatus = players.length >= MAX_PLAYERS ? "full" : "open";

  await updateDoc(matchRef, {
    players,
    waitingList,
    status: newStatus,
  });
}

export async function leaveMatch(
  matchId: string,
  uid: string,
  usersMap: Map<string, UserProfile>,
  isLateCancel: boolean = false
): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("Match not found");

  const match = { id: matchSnap.id, ...matchSnap.data() } as Match;

  const allEntries = [...match.players, ...match.waitingList].filter(
    (p) => p.uid !== uid
  );
  const sorted = sortByPriority(allEntries, usersMap);
  const { players, waitingList } = splitPlayersAndWaitingList(sorted, MAX_PLAYERS);

  const newStatus = players.length >= MAX_PLAYERS ? "full" : "open";

  await updateDoc(matchRef, {
    players,
    waitingList,
    status: newStatus,
  });
}

export async function declareNoShow(
  targetUid: string,
  adminUid: string,
  reason: "no-show" | "late-cancellation"
): Promise<void> {
  const userRef = doc(db, "users", targetUid);
  const penaltyUntil = new Date();
  penaltyUntil.setDate(penaltyUntil.getDate() + PENALTY_DURATION_DAYS);

  await updateDoc(userRef, {
    penalty: {
      active: true,
      until: Timestamp.fromDate(penaltyUntil),
      reason,
      declaredBy: adminUid,
      declaredAt: Timestamp.now(),
    },
  });
}

export async function removePenalty(targetUid: string): Promise<void> {
  const userRef = doc(db, "users", targetUid);
  await updateDoc(userRef, { penalty: null });
}

export async function setUserRole(
  targetUid: string,
  role: "admin" | "player"
): Promise<void> {
  const userRef = doc(db, "users", targetUid);
  await updateDoc(userRef, { role });
}

export async function cancelMatch(
  matchId: string,
  reason?: CancellationReason
): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  const update: Record<string, unknown> = { status: "cancelled" };
  if (reason) {
    update.cancellationReason = reason;
  }
  await updateDoc(matchRef, update);
}

export async function adminMoveToPlayers(
  matchId: string,
  uid: string,
  usersMap: Map<string, UserProfile>
): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("Match not found");

  const match = { id: matchSnap.id, ...matchSnap.data() } as Match;
  const entry = match.waitingList.find((p) => p.uid === uid);
  if (!entry) throw new Error("Player not in waiting list");

  const newWL = match.waitingList.filter((p) => p.uid !== uid);
  const newPlayers = [...match.players, entry];
  const newStatus = newPlayers.length >= MAX_PLAYERS ? "full" : "open";

  await updateDoc(matchRef, { players: newPlayers, waitingList: newWL, status: newStatus });
}

export async function adminMoveToWaitingList(
  matchId: string,
  uid: string,
  usersMap: Map<string, UserProfile>
): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("Match not found");

  const match = { id: matchSnap.id, ...matchSnap.data() } as Match;
  const demoted = match.players.find((p) => p.uid === uid);
  if (!demoted) throw new Error("Player not in players list");

  const newPlayers = match.players.filter((p) => p.uid !== uid);
  const newWL = [...match.waitingList, demoted];
  const newStatus = newPlayers.length >= MAX_PLAYERS ? "full" : "open";

  await updateDoc(matchRef, { players: newPlayers, waitingList: newWL, status: newStatus });
}

export async function reopenMatch(matchId: string): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("Match not found");

  const match = matchSnap.data() as Match;
  const newStatus = match.players.length >= MAX_PLAYERS ? "full" : "open";
  await updateDoc(matchRef, { status: newStatus });
}

export async function completeMatchAndDeductQuotas(matchId: string): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) return;

  const match = matchSnap.data() as Match;
  const currentMonth = getCurrentMonth();

  for (const player of match.players) {
    const userRef = doc(db, "users", player.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) continue;

    const userData = userSnap.data() as UserProfile;
    const quota = userData.quota;

    if (quota.month !== currentMonth) {
      await updateDoc(userRef, {
        quota: { remaining: MAX_QUOTA - 1, month: currentMonth },
      });
    } else {
      await updateDoc(userRef, {
        quota: { remaining: Math.max(0, quota.remaining - 1), month: currentMonth },
      });
    }
  }

  await updateDoc(matchRef, { status: "completed" });
}

export async function autoResolveExpiredMatches(
  weekOffset: number
): Promise<void> {
  const weekDates = getWeekDates(weekOffset);
  const startOfWeek = Timestamp.fromDate(weekDates[0].date);
  const endOfFriday = new Date(weekDates[4].date);
  endOfFriday.setHours(23, 59, 59, 999);
  const endOfWeek = Timestamp.fromDate(endOfFriday);

  const matchesRef = collection(db, "matches");
  const q = query(
    matchesRef,
    where("date", ">=", startOfWeek),
    where("date", "<=", endOfWeek)
  );

  const snapshot = await getDocs(q);
  const now = new Date();

  for (const d of snapshot.docs) {
    const match = d.data() as Match;
    if (match.status !== "open" && match.status !== "full") continue;

    const matchStart = match.date.toDate();
    const matchEnd = new Date(matchStart.getTime() + 90 * 60 * 1000);

    if (match.players.length >= MIN_PLAYERS) {
      if (matchEnd > now) continue;
      await completeMatchAndDeductQuotas(d.id);
    } else {
      if (matchStart > now) continue;
      await cancelMatch(d.id, { type: "not_enough_players" });
    }
  }
}

export async function cleanupOutOfRangeMatches(): Promise<void> {
  const currentWeekDates = getWeekDates(0);
  const startOfCurrentWeek = currentWeekDates[0].date;
  startOfCurrentWeek.setHours(0, 0, 0, 0);

  const fourWeeksOut = getWeekDates(4);
  const endOfFourthWeekFriday = new Date(fourWeeksOut[4].date);
  endOfFourthWeekFriday.setHours(23, 59, 59, 999);

  const matchesRef = collection(db, "matches");

  const pastQuery = query(
    matchesRef,
    where("date", "<", Timestamp.fromDate(startOfCurrentWeek))
  );
  const pastSnapshot = await getDocs(pastQuery);
  for (const d of pastSnapshot.docs) {
    await deleteDoc(doc(db, "matches", d.id));
  }

  const futureQuery = query(
    matchesRef,
    where("date", ">", Timestamp.fromDate(endOfFourthWeekFriday))
  );
  const futureSnapshot = await getDocs(futureQuery);
  for (const d of futureSnapshot.docs) {
    await deleteDoc(doc(db, "matches", d.id));
  }
}
