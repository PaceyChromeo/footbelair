import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  getDoc,
  onSnapshot,
  DocumentSnapshot,
  QuerySnapshot,
  DocumentData,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Match,
  MatchStatus,
  PlayerEntry,
  UserProfile,
  UserStatus,
  NoShowReport,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PENALTY_DURATION_DAYS,
  NO_SHOW_BAN_DAYS,
  LATE_CANCEL_HOURS,
  DayOfWeek,
  CancellationReason,
} from "@/lib/types";
import { sortByPriority, splitPlayersAndWaitingList } from "@/lib/priority";

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


export interface JoinMatchResult {
  matchStatus: MatchStatus;
  players: PlayerEntry[];
  waitingList: PlayerEntry[];
  previousPlayerCount: number;
}

export async function joinMatch(
  matchId: string,
  player: PlayerEntry,
  usersMap: Map<string, UserProfile>
): Promise<JoinMatchResult> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("Match not found");

  const userProfile = usersMap.get(player.uid);
  if (userProfile?.penalty?.active && userProfile.penalty.bannedUntil) {
    const bannedUntilDate = userProfile.penalty.bannedUntil.toDate();
    if (bannedUntilDate > new Date()) {
      throw new Error("BANNED");
    }
  }

  const match = { id: matchSnap.id, ...matchSnap.data() } as Match;

  if (match.kickedPlayers?.includes(player.uid)) {
    throw new Error("KICKED");
  }

  const alreadyIn = [...match.players, ...match.waitingList].find(
    (p) => p.uid === player.uid
  );
  if (alreadyIn) throw new Error("Already registered");

  const previousPlayerCount = match.players.length;

  const allEntries = [...match.players, ...match.waitingList, player];
  const sorted = sortByPriority(allEntries, usersMap);
  const { players, waitingList } = splitPlayersAndWaitingList(sorted, MAX_PLAYERS);

  const newStatus = match.status === "confirmed"
    ? "confirmed"
    : players.length >= MAX_PLAYERS ? "full" : "open";

  await updateDoc(matchRef, {
    players,
    waitingList,
    status: newStatus,
  });

  return { matchStatus: newStatus, players, waitingList, previousPlayerCount };
}

export interface LeaveMatchResult {
  autoLateCancelApplied: boolean;
  matchStatus: MatchStatus;
  promotedPlayers: PlayerEntry[];
  players: PlayerEntry[];
  waitingList: PlayerEntry[];
  previousPlayerCount: number;
}

export async function leaveMatch(
  matchId: string,
  uid: string,
  usersMap: Map<string, UserProfile>,
  isLateCancel: boolean = false
): Promise<LeaveMatchResult> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("Match not found");

  const match = { id: matchSnap.id, ...matchSnap.data() } as Match;

  const matchStart = match.date.toDate();
  const now = new Date();
  const hoursUntilMatch = (matchStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  const autoLateCancel = !isLateCancel && hoursUntilMatch >= 0 && hoursUntilMatch < LATE_CANCEL_HOURS;

  const previousPlayerUids = new Set(match.players.map((p) => p.uid));
  const previousPlayerCount = match.players.length;

  const allEntries = [...match.players, ...match.waitingList].filter(
    (p) => p.uid !== uid
  );
  const sorted = sortByPriority(allEntries, usersMap);
  const { players, waitingList } = splitPlayersAndWaitingList(sorted, MAX_PLAYERS);

  const promotedPlayers = players.filter(
    (p) => !previousPlayerUids.has(p.uid) && p.uid !== uid
  );

  const newStatus = match.status === "confirmed"
    ? "confirmed"
    : players.length >= MAX_PLAYERS ? "full" : "open";

  await updateDoc(matchRef, {
    players,
    waitingList,
    status: newStatus,
  });

  if (autoLateCancel || isLateCancel) {
    const penaltyUntil = new Date();
    penaltyUntil.setDate(penaltyUntil.getDate() + PENALTY_DURATION_DAYS);

    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      penalty: {
        active: true,
        until: Timestamp.fromDate(penaltyUntil),
        reason: "late-cancellation" as const,
        declaredBy: "system",
        declaredAt: Timestamp.now(),
      },
    });

    return { autoLateCancelApplied: true, matchStatus: newStatus, promotedPlayers, players, waitingList, previousPlayerCount };
  }

  return { autoLateCancelApplied: false, matchStatus: newStatus, promotedPlayers, players, waitingList, previousPlayerCount };
}

export async function declareNoShow(
  targetUid: string,
  adminUid: string,
  reason: "no-show" | "late-cancellation"
): Promise<void> {
  const userRef = doc(db, "users", targetUid);
  const now = new Date();

  if (reason === "no-show") {
    const bannedUntil = new Date(now);
    bannedUntil.setDate(bannedUntil.getDate() + NO_SHOW_BAN_DAYS);
    const penaltyUntil = new Date(now);
    penaltyUntil.setDate(penaltyUntil.getDate() + NO_SHOW_BAN_DAYS + PENALTY_DURATION_DAYS);

    await updateDoc(userRef, {
      penalty: {
        active: true,
        until: Timestamp.fromDate(penaltyUntil),
        bannedUntil: Timestamp.fromDate(bannedUntil),
        reason,
        declaredBy: adminUid,
        declaredAt: Timestamp.now(),
      },
    });
  } else {
    const penaltyUntil = new Date(now);
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

  const movedEntry: PlayerEntry = { ...entry, joinedAt: Timestamp.now(), adminPlaced: undefined };
  const newWL = match.waitingList.filter((p) => p.uid !== uid);
  const newPlayers = [...match.players, movedEntry];
  const newStatus = match.status === "confirmed"
    ? "confirmed"
    : newPlayers.length >= MAX_PLAYERS ? "full" : "open";

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

  const demotedEntry: PlayerEntry = { ...demoted, adminPlaced: true, joinedAt: Timestamp.now() };
  const newPlayers = match.players.filter((p) => p.uid !== uid);
  const newWL = [...match.waitingList, demotedEntry];
  const newStatus = match.status === "confirmed"
    ? "confirmed"
    : newPlayers.length >= MAX_PLAYERS ? "full" : "open";

  await updateDoc(matchRef, { players: newPlayers, waitingList: newWL, status: newStatus });
}

export async function adminRemovePlayer(
  matchId: string,
  uid: string,
  usersMap: Map<string, UserProfile>
): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("Match not found");

  const match = { id: matchSnap.id, ...matchSnap.data() } as Match;
  const inPlayers = match.players.some((p) => p.uid === uid);
  const inWL = match.waitingList.some((p) => p.uid === uid);
  if (!inPlayers && !inWL) throw new Error("Player not found in match");

  const allEntries = [...match.players, ...match.waitingList].filter(
    (p) => p.uid !== uid
  );
  const sorted = sortByPriority(allEntries, usersMap);
  const { players, waitingList } = splitPlayersAndWaitingList(sorted, MAX_PLAYERS);

  const kicked = match.kickedPlayers ?? [];
  if (!kicked.includes(uid)) kicked.push(uid);

  const newStatus = match.status === "confirmed"
    ? "confirmed"
    : players.length >= MAX_PLAYERS ? "full" : "open";

  await updateDoc(matchRef, {
    players,
    waitingList,
    kickedPlayers: kicked,
    status: newStatus,
  });
}

export async function adminAddPlayer(
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

  const newEntry: PlayerEntry = { ...player, joinedAt: Timestamp.now() };
  const allEntries = [...match.players, ...match.waitingList, newEntry];
  const sorted = sortByPriority(allEntries, usersMap);
  const { players, waitingList } = splitPlayersAndWaitingList(sorted, MAX_PLAYERS);

  const kicked = (match.kickedPlayers ?? []).filter((k) => k !== player.uid);

  const newStatus = match.status === "confirmed"
    ? "confirmed"
    : players.length >= MAX_PLAYERS ? "full" : "open";

  await updateDoc(matchRef, {
    players,
    waitingList,
    kickedPlayers: kicked,
    status: newStatus,
  });
}

export async function reopenMatch(matchId: string): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("Match not found");

  const match = matchSnap.data() as Match;
  const newStatus = match.players.length >= MAX_PLAYERS ? "full" : "open";
  await updateDoc(matchRef, { status: newStatus });
}

export async function completeMatch(matchId: string): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
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
    if (match.status !== "open" && match.status !== "full" && match.status !== "confirmed") continue;

    const matchStart = match.date.toDate();
    const matchEnd = new Date(matchStart.getTime() + 90 * 60 * 1000);

    if (match.players.length >= MIN_PLAYERS) {
      if (matchEnd > now) continue;
      await completeMatch(d.id);
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

export async function setUserStatus(
  targetUid: string,
  status: UserStatus
): Promise<void> {
  const userRef = doc(db, "users", targetUid);
  await updateDoc(userRef, { status });
}

export async function deleteUserAccount(targetUid: string): Promise<void> {
  const userRef = doc(db, "users", targetUid);
  await deleteDoc(userRef);
}

export function subscribeToPendingUsersCount(
  callback: (count: number) => void
): () => void {
  const q = query(collection(db, "users"), where("status", "==", "pending"));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    callback(snapshot.size);
  });
}

export async function confirmMatch(matchId: string): Promise<Match> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("Match not found");

  const match = { id: matchSnap.id, ...matchSnap.data() } as Match;
  if (match.players.length < MIN_PLAYERS) {
    throw new Error("NOT_ENOUGH_PLAYERS");
  }
  if (match.status === "cancelled" || match.status === "completed" || match.status === "confirmed") {
    throw new Error("INVALID_STATUS");
  }

  await updateDoc(matchRef, { status: "confirmed" });
  return { ...match, status: "confirmed" };
}

export async function createNoShowReport(
  report: Omit<NoShowReport, "id" | "status" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, "noShowReports"), {
    ...report,
    status: "pending",
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export function subscribeToPendingReportsCount(
  callback: (count: number) => void
): () => void {
  const q = query(
    collection(db, "noShowReports"),
    where("status", "==", "pending")
  );
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    callback(snapshot.size);
  });
}

export function subscribeToNoShowReports(
  callback: (reports: NoShowReport[]) => void
): () => void {
  const q = query(
    collection(db, "noShowReports"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const reports = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as NoShowReport[];
    callback(reports);
  });
}

export async function resolveNoShowReport(
  reportId: string,
  status: "confirmed" | "dismissed",
  adminUid: string
): Promise<void> {
  const reportRef = doc(db, "noShowReports", reportId);
  await updateDoc(reportRef, {
    status,
    resolvedAt: Timestamp.now(),
    resolvedBy: adminUid,
  });
}
