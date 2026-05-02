import { formatUnits } from "viem";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  address: string;
  total_claimed_wei: string;
  pending_rewards_wei: string;
  current_balance_wei: string;
  hold_start_unix: number | null;
  updated_at: string;
};

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

  try {
    const { rows } = await pool.query<Row>(
      `SELECT address, total_claimed_wei::text, pending_rewards_wei::text,
              current_balance_wei::text, hold_start_unix, updated_at
       FROM holder_stats WHERE address = $1`,
      [address]
    );

    if (rows.length === 0) {
      return Response.json(
        { address, found: false, totalClaimed: "0", pendingRewards: "0", allTimeTotal: "0", daysHeld: 0 },
        { status: 200 }
      );
    }

    const r = rows[0];
    const totalClaimed = BigInt(r.total_claimed_wei);
    const pendingRewards = BigInt(r.pending_rewards_wei);
    const allTime = totalClaimed + pendingRewards;
    const daysHeld = r.hold_start_unix
      ? Math.floor((Date.now() / 1000 - r.hold_start_unix) / 86400)
      : 0;

    return Response.json({
      address,
      found: true,
      totalClaimed: formatUnits(totalClaimed, 18),
      pendingRewards: formatUnits(pendingRewards, 18),
      allTimeTotal: formatUnits(allTime, 18),
      currentBalance: formatUnits(BigInt(r.current_balance_wei), 18),
      holdStartUnix: r.hold_start_unix,
      daysHeld,
      updatedAt: r.updated_at,
    });
  } catch (e) {
    console.error("holder-stats query failed:", e);
    return Response.json({ error: "Query failed" }, { status: 500 });
  }
}
