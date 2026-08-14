/**
 * The rank ladder — one source of truth for every surface that shows
 * "what am I, and how far to the next thing".
 *
 * Ranks are derived from the ON-CHAIN hold streak (FireToken.streakDays), not
 * from check-ins. The first four thresholds (0/7/30/90) are the ones the
 * leaderboard has always used — they are unchanged so nothing reranks. The two
 * above 90 mirror the contract's prestige bumps (TIER.prestige1Days /
 * prestige2Days) so there is something to chase after the multiplier maxes out.
 *
 * Check-in (visit) streaks are a separate, cosmetic thing — see
 * src/app/api/checkin/route.ts. They never move a rank.
 */

import { TIER } from "./contract";

export type Rank = {
  key: "spark" | "iron" | "steel" | "forged" | "tempered" | "diamond";
  label: string;
  /** Inclusive lower bound, in hold-streak days. */
  atDays: number;
  /** One line, shown under the badge on the check-in. */
  blurb: string;
  /** 0..1 — how hard Ember burns at this rank. Drives the flame. */
  heat: number;
};

/**
 * Forge ladder. The top three sit exactly on the contract's own milestones —
 * FORGED where the multiplier maxes and jackpot entry opens, TEMPERED and
 * DIAMOND on the two prestige bumps — so a rank-up is always a real event and
 * never a cosmetic one.
 */
export const RANKS: Rank[] = [
  { key: "spark",    label: "SPARK",    atDays: 0,                  heat: 0.0,  blurb: "Lit. Now leave it alone." },
  { key: "iron",     label: "IRON",     atDays: 30,                 heat: 0.3,  blurb: "A month of doing nothing. Correctly." },
  { key: "steel",    label: "STEEL",    atDays: 60,                 heat: 0.5,  blurb: "Two months. The soft hands are gone." },
  // No jackpot claim in any blurb: the entry threshold is a contract parameter
  // (jackpotMinStreakDays) that has already moved once, 90 -> 30. Surfaces that
  // mention the jackpot read the live value instead of hardcoding a rank.
  { key: "forged",   label: "FORGED",   atDays: TIER.rampDays,      heat: 0.75, blurb: "Full 5x multiplier. This is the ceiling on your cut." },
  { key: "tempered", label: "TEMPERED", atDays: TIER.prestige1Days, heat: 0.9,  blurb: "Half a year. The multiplier bumps again." },
  { key: "diamond",  label: "DIAMOND",  atDays: TIER.prestige2Days, heat: 1.0,  blurb: "One year held. There is nothing above this." },
];

export function rankAtDays(days: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (days >= r.atDays) current = r;
  }
  return current;
}

export function nextRankAtDays(days: number): Rank | null {
  return RANKS.find((r) => days < r.atDays) ?? null;
}

export type RankProgress = {
  rank: Rank;
  next: Rank | null;
  daysToNext: number;
  /** 0..100 — progress through the CURRENT band, not the whole ladder. */
  pct: number;
  /** True once the top rank is reached and there is nothing left to climb. */
  maxed: boolean;
};

export function rankProgress(days: number): RankProgress {
  const rank = rankAtDays(days);
  const next = nextRankAtDays(days);
  if (!next) {
    return { rank, next: null, daysToNext: 0, pct: 100, maxed: true };
  }
  const span = next.atDays - rank.atDays;
  const done = days - rank.atDays;
  return {
    rank,
    next,
    daysToNext: next.atDays - days,
    pct: span > 0 ? Math.min(Math.max((done / span) * 100, 0), 100) : 0,
    maxed: false,
  };
}

/**
 * Ember's burn level, 0..1. Interpolates between the current rank's heat and
 * the next one's so the flame grows a little every single day — not only on
 * the six days a holder crosses a threshold. That daily visible delta is the
 * entire reason to come back.
 */
export function heatAtDays(days: number): number {
  const { rank, next, pct, maxed } = rankProgress(days);
  if (maxed || !next) return rank.heat;
  return rank.heat + (next.heat - rank.heat) * (pct / 100);
}
