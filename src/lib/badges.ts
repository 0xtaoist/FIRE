/**
 * The badge catalogue.
 *
 * Badges are the PERMANENT half of identity. Rank (src/lib/ranks.ts) is the
 * precarious half — exactly one at a time, lost when a streak breaks. A badge is
 * binary, earned once, and never expires or downgrades. A holder who breaks a
 * streak drops rank but keeps every badge; that's what stops a break from
 * wiping their whole history and is the reason both systems exist.
 *
 * Nothing here needs a new table. 17 of the 18 are computable from data that
 * already exists — see `source` on each definition for where it comes from.
 */

export type BadgeKey =
  | "spark" | "iron" | "steel" | "forged" | "tempered" | "diamond"
  | "week_one" | "thirty" | "century" | "year_one"
  | "first_drop" | "ten_drops" | "full_basket"
  | "unbroken" | "og" | "founding_100"
  | "in_the_draw" | "jackpot";

export type BadgeGroup = "rank" | "checkin" | "payout" | "conviction" | "origin" | "jackpot";

export type BadgeDef = {
  key: BadgeKey;
  label: string;
  /** Shown on the locked state — this is the motivator, so it must be actionable. */
  requirement: string;
  group: BadgeGroup;
  /** What Ember is doing in the medallion. Also the Higgs generation prompt seed. */
  art: string;
  /** Where the earned/not decision comes from. */
  source: "chain" | "checkins" | "distributions" | "chain-events";
};

export const BADGES: BadgeDef[] = [
  // ─── RANK — mirrors the ladder, but permanent ───
  { key: "spark",    label: "Spark",    group: "rank", source: "chain", requirement: "Hold $FIRE",                 art: "newly lit, tiny, one ember mote rising above" },
  { key: "iron",     label: "Iron",     group: "rank", source: "chain", requirement: "Reach a 30-day hold streak", art: "holding a rough iron ingot in both small arms" },
  { key: "steel",    label: "Steel",    group: "rank", source: "chain", requirement: "Reach a 60-day hold streak", art: "beside a polished steel beam throwing a green reflection" },
  { key: "forged",   label: "Forged",   group: "rank", source: "chain", requirement: "Reach the full multiplier",  art: "on an anvil mid-strike, sparks flying off" },
  { key: "tempered", label: "Tempered", group: "rank", source: "chain", requirement: "Reach the first prestige bump", art: "rising out of a quench trough, steam curling" },
  { key: "diamond",  label: "Diamond",  group: "rank", source: "chain", requirement: "Reach the final prestige bump", art: "cradling a faceted diamond that refracts the glow" },

  // ─── CHECK-IN — the cosmetic streak. Never implies earnings. ───
  { key: "week_one", label: "Week One", group: "checkin", source: "checkins", requirement: "Check in 7 days running",   art: "beside 7 small filled dots" },
  { key: "thirty",   label: "Thirty",   group: "checkin", source: "checkins", requirement: "Check in 30 days running",  art: "beside a full month grid" },
  { key: "century",  label: "Century",  group: "checkin", source: "checkins", requirement: "Check in 100 days running", art: "leaning on a carved milestone stone" },
  { key: "year_one", label: "Year One", group: "checkin", source: "checkins", requirement: "Check in 365 days running", art: "inside a complete ring of 12 marks" },

  // ─── PAYOUT — from the keeper's distribution records, NOT chain events.
  //     The Distributor's epoch/claim path is unused (epochCount is 0), so
  //     there are no Claimed logs to read. ───
  { key: "first_drop",  label: "First Drop",  group: "payout", source: "distributions", requirement: "Receive your first stock dividend", art: "catching a single falling coin in cupped arms" },
  { key: "ten_drops",   label: "Ten Drops",   group: "payout", source: "distributions", requirement: "Be paid in 10 distributions",        art: "under a shower of coins, arms up" },
  { key: "full_basket", label: "Full Basket", group: "payout", source: "distributions", requirement: "Be paid in every asset",             art: "holding a basket with six distinct tokens" },

  // ─── CONVICTION / ORIGIN ───
  { key: "unbroken",     label: "Unbroken",     group: "conviction", source: "chain-events", requirement: "Never break your hold streak",    art: "holding one intact chain link" },
  { key: "og",           label: "OG",           group: "origin",     source: "chain",        requirement: "Migrate from Base",               art: "with a weathered explorer's map" },
  // Founding 1000 was cut: the design ships 18 badges and only founding-100 art
  // exists. Re-add both here and in public/badges/ if that changes.
  { key: "founding_100", label: "Founding 100", group: "origin",     source: "chain",        requirement: "Be one of the first 100 wallets", art: "planting a small flag in bare ground" },

  // ─── JACKPOT ───
  { key: "in_the_draw", label: "In The Draw", group: "jackpot", source: "chain",        requirement: "Reach the jackpot entry streak", art: "holding a single ticket" },
  { key: "jackpot",     label: "Jackpot",     group: "jackpot", source: "chain-events", requirement: "Win a Friday draw",              art: "erupting with light, arms up, confetti" },
];

export const BADGE_BY_KEY: Record<BadgeKey, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.key, b])
) as Record<BadgeKey, BadgeDef>;

export type EarnedBadge = BadgeDef & {
  earned: boolean;
  /** Populated only where the underlying source carries a timestamp. */
  earnedAt?: string | null;
  /** Human progress toward a locked badge, e.g. "18 / 30 days". */
  progress?: string;
};

/** Inputs the resolver needs. Every field is optional so a partial outage
 *  degrades to "not earned" rather than failing the whole response. */
export type BadgeInputs = {
  /** Current on-chain hold streak, days. */
  streakDays: number;
  /** Best streak we can evidence — see the note in the API route. */
  bestStreakDays: number;
  migrated: boolean;
  /** Index in holderList; -1 when unknown. Append-ordered, so this IS join order. */
  holderIndex: number;
  jackpotMinStreakDays: number | null;
  /** Consecutive check-in days. */
  visitStreak: number;
  bestVisitStreak: number;
  /** Distinct distributions this wallet appeared in. */
  distributionCount: number;
  /** Distinct assets this wallet has been paid in. */
  assetsPaid: number;
  /** Total assets the protocol has ever distributed — Full Basket needs all of them. */
  assetsTotal: number;
  /** True when the wallet has at least one StreakBroken event. */
  hasBroken: boolean;
  /** True when the wallet has won a jackpot. */
  wonJackpot: boolean;
  /** Rank thresholds, live where available. */
  rankAtDays: { forged: number; tempered: number; diamond: number };
};

export function resolveBadges(i: BadgeInputs): EarnedBadge[] {
  const best = Math.max(i.streakDays, i.bestStreakDays);
  const bestVisit = Math.max(i.visitStreak, i.bestVisitStreak);

  const streakBadge = (need: number) => ({
    earned: best >= need,
    progress: best >= need ? undefined : `${best} / ${need} days`,
  });
  const visitBadge = (need: number) => ({
    earned: bestVisit >= need,
    progress: bestVisit >= need ? undefined : `${bestVisit} / ${need} days`,
  });

  const state: Record<BadgeKey, { earned: boolean; progress?: string }> = {
    spark:    { earned: i.streakDays > 0 || best > 0 },
    iron:     streakBadge(30),
    steel:    streakBadge(60),
    forged:   streakBadge(i.rankAtDays.forged),
    tempered: streakBadge(i.rankAtDays.tempered),
    diamond:  streakBadge(i.rankAtDays.diamond),

    week_one: visitBadge(7),
    thirty:   visitBadge(30),
    century:  visitBadge(100),
    year_one: visitBadge(365),

    first_drop:  { earned: i.distributionCount >= 1 },
    ten_drops:   { earned: i.distributionCount >= 10, progress: i.distributionCount >= 10 ? undefined : `${i.distributionCount} / 10` },
    full_basket: {
      earned: i.assetsTotal > 0 && i.assetsPaid >= i.assetsTotal,
      progress: i.assetsTotal > 0 && i.assetsPaid < i.assetsTotal ? `${i.assetsPaid} / ${i.assetsTotal} assets` : undefined,
    },

    // Only claimable once they actually have a streak — a wallet that has never
    // held anything is not "unbroken", it is absent.
    unbroken:      { earned: !i.hasBroken && i.streakDays > 0 },
    og:            { earned: i.migrated },
    founding_100: { earned: i.holderIndex >= 0 && i.holderIndex < 100 },

    in_the_draw: {
      earned: i.jackpotMinStreakDays !== null && best >= i.jackpotMinStreakDays,
      progress:
        i.jackpotMinStreakDays !== null && best < i.jackpotMinStreakDays
          ? `${best} / ${i.jackpotMinStreakDays} days`
          : undefined,
    },
    jackpot: { earned: i.wonJackpot },
  };

  return BADGES.map((b) => ({ ...b, ...state[b.key] }));
}
