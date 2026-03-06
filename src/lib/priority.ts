import { PlayerEntry, UserProfile, MIN_PLAYERS } from "./types";

/**
 * Priority sort — complex business rule:
 * 1. Non-penalized: quota DESC → joinedAt ASC
 * 2. Penalized: always last, penalty-end ASC → joinedAt ASC
 */
export function sortByPriority(
  entries: PlayerEntry[],
  usersMap: Map<string, UserProfile>
): PlayerEntry[] {
  const now = new Date();

  return [...entries].sort((a, b) => {
    const userA = usersMap.get(a.uid);
    const userB = usersMap.get(b.uid);

    const isPenalizedA = userA?.penalty?.active && userA.penalty.until.toDate() > now;
    const isPenalizedB = userB?.penalty?.active && userB.penalty.until.toDate() > now;

    if (isPenalizedA && !isPenalizedB) return 1;
    if (!isPenalizedA && isPenalizedB) return -1;

    if (isPenalizedA && isPenalizedB) {
      const penaltyDiff =
        userA!.penalty!.until.toMillis() - userB!.penalty!.until.toMillis();
      if (penaltyDiff !== 0) return penaltyDiff;
      return a.joinedAt.toMillis() - b.joinedAt.toMillis();
    }

    const quotaA = userA?.quota?.remaining ?? 0;
    const quotaB = userB?.quota?.remaining ?? 0;

    if (quotaA !== quotaB) return quotaB - quotaA;

    return a.joinedAt.toMillis() - b.joinedAt.toMillis();
  });
}

/**
 * Even-number enforcement only kicks in at MIN_PLAYERS (10) or above.
 * Below 10: everyone is a player (match won't happen anyway).
 * At 10+: must be even (10 or 12), so 11th goes to WL.
 */
export function splitPlayersAndWaitingList(
  allEntries: PlayerEntry[],
  maxPlayers: number
): { players: PlayerEntry[]; waitingList: PlayerEntry[] } {
  const total = allEntries.length;
  const activeCount = Math.min(total, maxPlayers);

  let evenCount: number;
  if (activeCount < MIN_PLAYERS) {
    // Below minimum: everyone plays, no even-number rule
    evenCount = activeCount;
  } else {
    // At or above minimum: enforce even numbers (10 or 12)
    evenCount = activeCount % 2 === 0 ? activeCount : activeCount - 1;
  }

  return {
    players: allEntries.slice(0, evenCount),
    waitingList: allEntries.slice(evenCount),
  };
}
