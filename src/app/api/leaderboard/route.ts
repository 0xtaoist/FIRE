import { formatUnits } from "viem";
import { FIRE_CONTRACT } from "@/lib/contract";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";
const LP_PAIR      = "0x4fe3941b13ac5942e4fea0d0a1b10e31a92e7c9a";
const EXCLUDED = new Set([
  FIRE_CONTRACT.toLowerCase(),
  LP_PAIR,
  ZERO_ADDRESS,
  DEAD_ADDRESS,
]);

let cachedResult: { data: HolderEntry[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min — DB query is cheap, dex price needs refresh

type HolderEntry = {
  address: string;
  balance: number;
  balanceUsd: number;
  pendingRewards: number;
  rewardsUsd: number;
  totalClaimed: number;       // cumulative across all contracts
  allTimeTotal: number;       // claimed + pending
  daysHeld: number;
  score: number;
};

type DbRow = {
  address: string;
  current_balance_wei: string;
  pending_rewards_wei: string;
  total_claimed_wei: string;
  hold_start_unix: number | null;
};

async function getTokenPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/pairs/base/0x4Fe3941B13AC5942E4FEa0D0a1B10E31A92E7c9A",
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    return parseFloat(data.pair?.priceUsd || "0");
  } catch {
    return 0;
  }
}

async function buildLeaderboard(): Promise<HolderEntry[]> {
  const pool = getPool();
  if (!pool) {
    console.error("Leaderboard: DATABASE_URL missing — cannot query holder_stats");
    return [];
  }

  const [{ rows }, price] = await Promise.all([
    pool.query<DbRow>(
      `SELECT address,
              current_balance_wei::text,
              pending_rewards_wei::text,
              total_claimed_wei::text,
              hold_start_unix
       FROM holder_stats
       WHERE current_balance_wei::numeric > 0
       ORDER BY current_balance_wei::numeric DESC
       LIMIT 200`
    ),
    getTokenPrice(),
  ]);

  console.log(`Leaderboard: pulled ${rows.length} holders from DB`);

  const entries: HolderEntry[] = [];
  const nowSec = Date.now() / 1000;

  for (const r of rows) {
    if (EXCLUDED.has(r.address)) continue;

    const balance = Number(formatUnits(BigInt(r.current_balance_wei), 18));
    if (balance <= 0) continue;

    const pending = Number(formatUnits(BigInt(r.pending_rewards_wei), 18));
    const claimed = Number(formatUnits(BigInt(r.total_claimed_wei), 18));
    const daysHeld = r.hold_start_unix
      ? Math.floor((nowSec - r.hold_start_unix) / 86400)
      : 0;

    entries.push({
      address: r.address,
      balance,
      balanceUsd: balance * price,
      pendingRewards: pending,
      rewardsUsd: pending * price,
      totalClaimed: claimed,
      allTimeTotal: claimed + pending,
      daysHeld,
      score: balance,
    });

    if (entries.length >= 100) break;
  }

  return entries;
}

export async function GET() {
  try {
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
      return Response.json({
        holders: cachedResult.data,
        cached: true,
        updatedAt: new Date(cachedResult.timestamp).toISOString(),
      });
    }

    const holders = await buildLeaderboard();
    cachedResult = { data: holders, timestamp: Date.now() };

    return Response.json({
      holders,
      cached: false,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Leaderboard error:", e);
    if (cachedResult) {
      return Response.json({
        holders: cachedResult.data,
        cached: true,
        stale: true,
        updatedAt: new Date(cachedResult.timestamp).toISOString(),
      });
    }
    return Response.json({ error: "Failed to build leaderboard" }, { status: 500 });
  }
}
