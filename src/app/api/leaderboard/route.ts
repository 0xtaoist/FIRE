import { formatUnits } from "viem";
import { FIRE_CONTRACT } from "@/lib/contract";
import { getPool } from "@/lib/db";
import { getFireStats } from "@/lib/firePrice";

export const dynamic = "force-dynamic";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";
const POOL_MANAGER = "0x8366a39cc670b4001a1121b8f6a443a643e40951";
const EXCLUDED = new Set([
  FIRE_CONTRACT.toLowerCase(),
  POOL_MANAGER,
  (process.env.NEXT_PUBLIC_HOOK_CONTRACT || "0xE3Fa8fA0D0A3f59C9B08Ea0Fe36d654A506850cC").toLowerCase(),
  (process.env.NEXT_PUBLIC_DISTRIBUTOR_CONTRACT || "0x4AC257e8443f465dB515331c113895bf077f851A").toLowerCase(),
  ZERO_ADDRESS,
  DEAD_ADDRESS,
]);

let cachedResult: { data: HolderEntry[]; totals: Totals; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min — DB query is cheap, dex price needs refresh

type HolderEntry = {
  address: string;
  balance: number;
  balanceUsd: number;
  daysHeld: number;           // = streak days
  streakDays: number;
  tier: number;               // multiplier, e.g. 5.25
  migrated: boolean;          // carried a Base streak
  jackpotEligible: boolean;
  jackpotWeight: number;              // streak days × bag — the draw odds
  dividendsUsd: number;               // lifetime pushed, in USD (0 until priced)
  dividends: Record<string, number>;  // lifetime pushed, per symbol
  score: number;              // dividend weight = balance × tier
  // legacy fields kept so older clients don't break
  pendingRewards: number;
  rewardsUsd: number;
  totalClaimed: number;
  allTimeTotal: number;
};

type DbRow = {
  address: string;
  current_balance_wei: string;
  score_snapshot_wei: string;
  hold_start_unix: number | null;
  streak_days: number | null;
  tier_x100: number | null;
  migrated: boolean | null;
  jackpot_weight: string | null;
  lifetime_dividends: Record<string, string> | null;
};

// live price from the Robinhood Chain v4 pool (the Base v1 pair is dead)
async function getTokenPrice(): Promise<number> {
  try {
    return (await getFireStats()).priceUsd;
  } catch {
    return 0;
  }
}

type Totals = { holders: number; diamond: number; steady: number; totalBalance: number; totalValueUsd: number };

async function buildLeaderboard(): Promise<{ entries: HolderEntry[]; totals: Totals }> {
  const emptyTotals: Totals = { holders: 0, diamond: 0, steady: 0, totalBalance: 0, totalValueUsd: 0 };
  const pool = getPool();
  if (!pool) {
    console.error("Leaderboard: DATABASE_URL missing — cannot query holder_stats");
    return { entries: [], totals: emptyTotals };
  }

  const excludedList = [...EXCLUDED];

  const [{ rows }, agg, price] = await Promise.all([
    pool.query<DbRow>(
      `SELECT address,
              current_balance_wei::text,
              score_snapshot_wei::text,
              hold_start_unix,
              streak_days,
              tier_x100,
              migrated,
              jackpot_weight::text,
              lifetime_dividends
       FROM holder_stats
       WHERE current_balance_wei::numeric > 0
       ORDER BY score_snapshot_wei::numeric DESC, current_balance_wei::numeric DESC
       LIMIT 200`
    ),
    // protocol-wide totals — the stats strip must not reflect only the top slice
    pool.query<{ holders: string; diamond: string; steady: string; total_balance: string }>(
      `SELECT count(*)::text AS holders,
              count(*) FILTER (WHERE COALESCE(streak_days, 0) >= 90)::text AS diamond,
              count(*) FILTER (WHERE COALESCE(streak_days, 0) >= 30)::text AS steady,
              COALESCE(trunc(sum(current_balance_wei::numeric)), 0)::text AS total_balance
       FROM holder_stats
       WHERE current_balance_wei::numeric > 0
         AND address <> ALL($1::text[])`,
      [excludedList]
    ),
    getTokenPrice(),
  ]);

  const a = agg.rows[0];
  const totalBalance = Number(formatUnits(BigInt(a?.total_balance || "0"), 18));
  const totals = {
    holders: Number(a?.holders || 0),
    diamond: Number(a?.diamond || 0),
    steady: Number(a?.steady || 0),
    totalBalance,
    totalValueUsd: totalBalance * price,
  };

  console.log(`Leaderboard: pulled ${rows.length} of ${totals.holders} holders from DB`);

  const entries: HolderEntry[] = [];
  const nowSec = Date.now() / 1000;

  for (const r of rows) {
    if (EXCLUDED.has(r.address)) continue;

    const balance = Number(formatUnits(BigInt(r.current_balance_wei), 18));
    if (balance <= 0) continue;

    const streakDays = r.streak_days ?? (r.hold_start_unix ? Math.floor((nowSec - r.hold_start_unix) / 86400) : 0);
    const tier = (r.tier_x100 ?? 100) / 100;
    const dividends: Record<string, number> = {};
    for (const [sym, wei] of Object.entries(r.lifetime_dividends || {})) {
      dividends[sym] = Number(formatUnits(BigInt(wei), 18));
    }

    entries.push({
      address: r.address,
      balance,
      balanceUsd: balance * price,
      daysHeld: streakDays,
      streakDays,
      tier,
      migrated: Boolean(r.migrated),
      jackpotEligible: streakDays >= 90,
      jackpotWeight: Number(formatUnits(BigInt(r.jackpot_weight || "0"), 18)),
      dividendsUsd: 0,
      dividends,
      score: Number(formatUnits(BigInt(r.score_snapshot_wei || "0"), 18)),
      pendingRewards: 0,
      rewardsUsd: 0,
      totalClaimed: 0,
      allTimeTotal: 0,
    });

    if (entries.length >= 100) break;
  }

  return { entries, totals };
}

export async function GET() {
  try {
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
      return Response.json({
        holders: cachedResult.data,
        totals: cachedResult.totals,
        cached: true,
        updatedAt: new Date(cachedResult.timestamp).toISOString(),
      });
    }

    const holders = await buildLeaderboard();
    cachedResult = { data: holders.entries, totals: holders.totals, timestamp: Date.now() };

    return Response.json({
      holders: holders.entries,
      totals: holders.totals,
      cached: false,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Leaderboard error:", e);
    if (cachedResult) {
      return Response.json({
        holders: cachedResult.data,
        totals: cachedResult.totals,
        cached: true,
        stale: true,
        updatedAt: new Date(cachedResult.timestamp).toISOString(),
      });
    }
    return Response.json({ error: "Failed to build leaderboard" }, { status: 500 });
  }
}
