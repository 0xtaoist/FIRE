import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Per-holder stats from the v2 indexer (worker/index.js).
 * v2 pushes dividends — there is no pending/claimed reward accounting — so
 * this serves streak, tier, jackpot standing and lifetime pushed dividends.
 */
type StatsRow = {
  address: string;
  current_balance_wei: string;
  score_snapshot_wei: string;
  hold_start_unix: number | null;
  streak_days: number | null;
  tier_x100: number | null;
  migrated: boolean | null;
  peak_balance_wei: string | null;
  break_below_wei: string | null;
  lifetime_dividends: Record<string, string> | null;
  updated_at: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.toLowerCase();
  if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
    return Response.json({ error: "valid ?address= required" }, { status: 400 });
  }

  const pool = getPool();
  if (!pool) {
    return Response.json({ error: "indexer database not configured" }, { status: 503 });
  }

  try {
    const { rows } = await pool.query<StatsRow>(
      `SELECT address, current_balance_wei::text, score_snapshot_wei::text,
              hold_start_unix, streak_days, tier_x100, migrated,
              peak_balance_wei::text, break_below_wei::text,
              lifetime_dividends, updated_at
       FROM holder_stats WHERE address = $1`,
      [address]
    );

    if (rows.length === 0) {
      return Response.json({
        address, found: false, balance: "0", streakDays: 0, tier: 1,
        jackpotEligible: false, dividends: {},
      });
    }

    const r = rows[0];
    const streakDays = r.streak_days ??
      (r.hold_start_unix ? Math.floor((Date.now() / 1000 - r.hold_start_unix) / 86400) : 0);

    return Response.json({
      address,
      found: true,
      balance: r.current_balance_wei,
      dividendScore: r.score_snapshot_wei,
      streakDays,
      daysHeld: streakDays,
      tier: (r.tier_x100 ?? 100) / 100,
      migrated: Boolean(r.migrated),
      jackpotEligible: streakDays >= 90,
      peakBalance: r.peak_balance_wei ?? "0",
      breakBelowBalance: r.break_below_wei ?? "0",
      dividends: r.lifetime_dividends ?? {},
      updatedAt: r.updated_at,
    });
  } catch (e) {
    console.error("holder-stats query failed:", e);
    return Response.json({ error: "query failed" }, { status: 500 });
  }
}
