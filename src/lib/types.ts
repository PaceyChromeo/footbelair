import { Timestamp } from "firebase/firestore";

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export type MatchStatus = "open" | "full" | "cancelled" | "completed";

export type CancellationReasonType = "not_enough_players" | "unplayable_field" | "custom";

export interface CancellationReason {
  type: CancellationReasonType;
  customText?: string;
}

export type UserRole = "admin" | "player";

export interface PlayerEntry {
  uid: string;
  displayName: string;
  photoURL: string | null;
  joinedAt: Timestamp;
}

export interface Penalty {
  active: boolean;
  until: Timestamp;
  reason: "no-show" | "late-cancellation";
  declaredBy: string; // admin uid
  declaredAt: Timestamp;
}

export interface UserQuota {
  remaining: number;
  month: string; // format: "2026-03"
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: UserRole;
  quota: UserQuota;
  penalty: Penalty | null;
  createdAt: Timestamp;
}

export interface Match {
  id: string;
  date: Timestamp;
  dayOfWeek: DayOfWeek;
  status: MatchStatus;
  players: PlayerEntry[];
  waitingList: PlayerEntry[];
  maxPlayers: number; // always 12
  createdBy: string; // admin uid
  createdAt: Timestamp;
  cancellationReason?: CancellationReason;
}

export const MAX_PLAYERS = 12;
export const MIN_PLAYERS = 10;
export const MAX_QUOTA = 10;
export const PENALTY_DURATION_DAYS = 14;
export const LATE_CANCEL_HOURS = 4;

export const DAYS_ORDER: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];
