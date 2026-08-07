import { formatUnits } from "viem";
import { FIRE_CONTRACT } from "@/lib/contract";
import { getPool } from "@/lib/db";
import { getFireStats } from "@/lib/firePrice";

export const dynamic = "force-dynamic";

/* Monthly Leaderboard — the month's cohort, ranked by streak.
 *
 * A wallet whose streak STARTED inside the current UTC month is in the
 * cohort. Ranking is pure streak length (which, within one cohort, is the
 * same as "who started earliest and never broke"). Bag size shows but
 * never ranks. The cohort resets at 00:00 UTC on the 1st.
 *
 * Migrated wallets (carried Base streaks) have pre-cohort hold_start
 * values and fall out naturally.
 */

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";
const POOL_MANAGER = "0x8366a39cc670b4001a1121b8f6a443a643e40951";
const EXCLUDED = [
  FIRE_CONTRACT.toLowerCase(),
  POOL_MANAGER,
  (process.env.NEXT_PUBLIC_HOOK_CONTRACT || "0xE3Fa8fA0D0A3f59C9B08Ea0Fe36d654A506850cC").toLowerCase(),
  (process.env.NEXT_PUBLIC_DISTRIBUTOR_CONTRACT || "0x4AC257e8443f465dB515331c113895bf077f851A").toLowerCase(),
  ZERO_ADDRESS,
  DEAD_ADDRESS,
];

type MonthlyEntry = {
  address: string;
  streakDays: number;
  startedAt: string;   // ISO date the streak began
  balance: number;
  balanceUsd: number;
};

type DbRow = {
  address: string;
  current_balance_wei: string;
  hold_start_unix: number;
};

let cached: { body: string; monthKey: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

function monthWindow(now: Date) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const start = Date.UTC(y, m, 1) / 1000;
  const end = Date.UTC(y, m + 1, 1) / 1000; // exclusive
  const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  const label = now.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, monthKey, label, resetsAt: new Date(end * 1000).toISOString() };
}

export async function GET() {
  const now = new Date();
  const win = monthWindow(now);

  if (cached && cached.monthKey === win.monthKey && Date.now() - cached.timestamp < CACHE_TTL) {
    return new Response(cached.body, { headers: { "Content-Type": "application/json" } });
  }

  const pool = getPool();
  if (!pool) {
    return Response.json({ error: "DATABASE_URL missing" }, { status: 500 });
  }

  let price = 0;
  try { price = (await getFireStats()).priceUsd; } catch {}

  const { rows } = await pool.query<DbRow>(
    `SELECT address, current_balance_wei::text, hold_start_unix
     FROM holder_stats
     WHERE current_balance_wei::numeric > 0
       AND hold_start_unix IS NOT NULL
       AND hold_start_unix >= $1 AND hold_start_unix < $2
       AND address <> ALL($3::text[])
     ORDER BY hold_start_unix ASC
     LIMIT 500`,
    [win.start, win.end, EXCLUDED]
  );

  const nowSec = Date.now() / 1000;
  const entries: MonthlyEntry[] = rows.map((r) => {
    const balance = Number(formatUnits(BigInt(r.current_balance_wei), 18));
    return {
      address: r.address,
      // streak derived live from the start time — the same clock that
      // defines the cohort, so rank and cohort can never disagree
      streakDays: Math.max(0, Math.floor((nowSec - r.hold_start_unix) / 86400)),
      startedAt: new Date(r.hold_start_unix * 1000).toISOString(),
      balance,
      balanceUsd: balance * price,
    };
  });
  // hold_start ASC === streak DESC within a cohort, but sort explicitly
  // in case of same-day starts, tiebreak by earlier exact start
  entries.sort((a, b) => b.streakDays - a.streakDays || a.startedAt.localeCompare(b.startedAt));

  const body = JSON.stringify({
    cohort: win.monthKey,
    cohortLabel: win.label,
    resetsAt: win.resetsAt,
    count: entries.length,
    entries,
    updatedAt: new Date().toISOString(),
  });
  cached = { body, monthKey: win.monthKey, timestamp: Date.now() };
  return new Response(body, { headers: { "Content-Type": "application/json" } });
}
