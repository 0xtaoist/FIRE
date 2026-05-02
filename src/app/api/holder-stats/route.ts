import { formatUnits } from "viem";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

type StatsRow = {
  address: string;
  total_claimed_wei: string;
  pending_rewards_wei: string;
  current_balance_wei: string;
  score_snapshot_wei: string;
  hold_start_unix: number | null;
  updated_at: string;
};

type RpsRow = {
  rps_wei: string;
  taken_at: string;
};

const PRECISION = 10n ** 30n;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const addressRaw = searchParams.get("address");

  if (!addressRaw || !/^0x[a-fA-F0-9]{40}$/.test(addressRaw)) {
    return Response.json({ error: "Invalid address" }, { status: 400 });
  }

  const address = addressRaw.toLowerCase();
  const pool = getPool();

  if (!pool) {
    return Response.json(
      { error: "Database not configured (DATABASE_URL missing)" },
      { status: 503 }
    );
  }

  const primary = process.env.NEXT_PUBLIC_FIRE_CONTRACT?.toLowerCase()
    || "0xa7e1e8ab7b7c93f9e3ceb10724843a4b74f5308c";

  try {
    const { rows } = await pool.query<StatsRow>(
      `SELECT address, total_claimed_wei::text, pending_rewards_wei::text,
              current_balance_wei::text, score_snapshot_wei::text,
              hold_start_unix, updated_at
       FROM holder_stats WHERE address = $1`,
      [address]
    );

    if (rows.length === 0) {
      return Response.json({
        address, found: false,
        totalClaimed: "0", pendingRewards: "0", allTimeTotal: "0",
        daysHeld: 0, apr: null,
      });
    }

    const r = rows[0];
    const totalClaimed = BigInt(r.total_claimed_wei);
    const pendingRewards = BigInt(r.pending_rewards_wei);
    const allTime = totalClaimed + pendingRewards;
    const balance = BigInt(r.current_balance_wei);
    const score = BigInt(r.score_snapshot_wei || "0");
    const daysHeld = r.hold_start_unix
      ? Math.floor((Date.now() / 1000 - r.hold_start_unix) / 86400)
      : 0;

    // APR via rewardPerScore delta over the holder's hold-time window.
    // Window = min(daysHeld, days since oldest rps snapshot we have).
    let apr: number | null = null;
    let aprWindowDays = 0;
    let aprDailyRateWei = "0";
    if (balance > 0n && score > 0n) {
      const now = await pool.query<RpsRow>(
        `SELECT rps_wei::text, taken_at::text
         FROM rps_snapshots WHERE contract = $1
         ORDER BY taken_at DESC LIMIT 1`,
        [primary]
      );
      if (now.rows.length > 0) {
        const rpsNow = BigInt(now.rows[0].rps_wei);

        // Pick the oldest snapshot whose timestamp is >= holder's holdStart;
        // if none exist (we don't have history that old), use the oldest we have.
        const targetTs = r.hold_start_unix
          ? new Date(r.hold_start_unix * 1000).toISOString()
          : null;
        const then = targetTs
          ? await pool.query<RpsRow>(
              `SELECT rps_wei::text, taken_at::text
               FROM rps_snapshots
               WHERE contract = $1 AND taken_at >= $2::timestamptz
               ORDER BY taken_at ASC LIMIT 1`,
              [primary, targetTs]
            )
          : { rows: [] as RpsRow[] };
        const fallback = then.rows.length === 0
          ? await pool.query<RpsRow>(
              `SELECT rps_wei::text, taken_at::text
               FROM rps_snapshots WHERE contract = $1
               ORDER BY taken_at ASC LIMIT 1`,
              [primary]
            )
          : { rows: [] as RpsRow[] };

        const baseline = (then.rows[0] || fallback.rows[0]) as RpsRow | undefined;
        if (baseline && baseline.taken_at !== now.rows[0].taken_at) {
          const rpsThen = BigInt(baseline.rps_wei);
          const delta = rpsNow > rpsThen ? rpsNow - rpsThen : 0n;
          const earnedWei = (score * delta) / PRECISION;
          const tsMsThen = new Date(baseline.taken_at).getTime();
          const tsMsNow = new Date(now.rows[0].taken_at).getTime();
          const daysAvailable = Math.max((tsMsNow - tsMsThen) / 86_400_000, 1 / 24);
          aprWindowDays = daysAvailable;

          if (earnedWei > 0n) {
            // Use BigInt × scale trick for ratio: earned/balance × 10^9
            const scaledRatio = (earnedWei * 1_000_000_000n) / balance;
            const ratio = Number(scaledRatio) / 1_000_000_000;
            apr = ratio * (365 / daysAvailable) * 100;

            // Also compute the implied daily rate (in wei) for the dashboard
            const dailyWei = (earnedWei * 1_000_000n) / BigInt(Math.floor(daysAvailable * 1_000_000));
            aprDailyRateWei = dailyWei.toString();
          } else {
            apr = 0;
            aprDailyRateWei = "0";
          }
        }
      }
    }

    return Response.json({
      address,
      found: true,
      totalClaimed: formatUnits(totalClaimed, 18),
      pendingRewards: formatUnits(pendingRewards, 18),
      allTimeTotal: formatUnits(allTime, 18),
      currentBalance: formatUnits(balance, 18),
      scoreSnapshot: formatUnits(score, 18),
      holdStartUnix: r.hold_start_unix,
      daysHeld,
      apr,
      aprWindowDays,
      aprDailyRate: aprDailyRateWei !== "0" ? formatUnits(BigInt(aprDailyRateWei), 18) : null,
      updatedAt: r.updated_at,
    });
  } catch (e) {
    console.error("holder-stats query failed:", e);
    return Response.json({ error: "Query failed" }, { status: 500 });
  }
}
