import fs from "node:fs";
import path from "node:path";
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
// dust filter — wallets under this many whole FIRE don't make the board
// (sub-0.5 balances render as "0 FIRE" after rounding and look broken)
const MIN_BALANCE_FIRE = Number(process.env.MONTHLY_MIN_BALANCE_FIRE || "1");
// micro-FIRE × 1e12 = wei, all via BigInt() — the tsconfig targets ES2017,
// where BigInt literals (10n) are a compile error. No floats touch wei.
const MIN_BALANCE_WEI = BigInt(Math.round(MIN_BALANCE_FIRE * 1e6)) * BigInt("1000000000000");

const EXCLUDED = [
  FIRE_CONTRACT.toLowerCase(),
  POOL_MANAGER,
  (process.env.NEXT_PUBLIC_HOOK_CONTRACT || "0xE3Fa8fA0D0A3f59C9B08Ea0Fe36d654A506850cC").toLowerCase(),
  (process.env.NEXT_PUBLIC_DISTRIBUTOR_CONTRACT || "0x4AC257e8443f465dB515331c113895bf077f851A").toLowerCase(),
  ZERO_ADDRESS,
  DEAD_ADDRESS,
];

type SurvivalPoint = { day: number; alive: number };

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

const cached = new Map<string, { body: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/** The window for a given month. `monthArg` is YYYY-MM; omitted means the
 *  current UTC month. Any month can be asked for — a wallet's cohort is the
 *  month ITS streak began, which is usually not the month it is reading in. */
function monthWindow(now: Date, monthArg?: string | null) {
  const base = monthArg ? new Date(`${monthArg}-01T00:00:00Z`) : now;
  const y = base.getUTCFullYear(), m = base.getUTCMonth();
  const start = Date.UTC(y, m, 1) / 1000;
  const end = Date.UTC(y, m + 1, 1) / 1000; // exclusive
  const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  const label = base.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, monthKey, label, resetsAt: new Date(end * 1000).toISOString() };
}

export async function GET(request: Request) {
  const now = new Date();
  const asked = new URL(request.url).searchParams.get("cohort");
  const monthArg = asked && /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) ? asked : null;
  const win = monthWindow(now, monthArg);

  const hit = cached.get(win.monthKey);
  if (hit && Date.now() - hit.timestamp < CACHE_TTL) {
    return new Response(hit.body, { headers: { "Content-Type": "application/json" } });
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
     WHERE current_balance_wei::numeric >= $4::numeric
       AND hold_start_unix IS NOT NULL
       AND hold_start_unix >= $1 AND hold_start_unix < $2
       AND address <> ALL($3::text[])
     ORDER BY hold_start_unix ASC
     LIMIT 500`,
    [win.start, win.end, EXCLUDED, MIN_BALANCE_WEI.toString()]
  );

  // The whole cohort's start times, unLIMITed — the board above is capped for
  // display, but the count and the curve must see every wallet. Just the
  // timestamps, so this stays cheap even on a big month.
  const { rows: allStarts } = await pool.query<{ hold_start_unix: number }>(
    `SELECT hold_start_unix
     FROM holder_stats
     WHERE current_balance_wei::numeric >= $4::numeric
       AND hold_start_unix IS NOT NULL
       AND hold_start_unix >= $1 AND hold_start_unix < $2
       AND address <> ALL($3::text[])`,
    [win.start, win.end, EXCLUDED, MIN_BALANCE_WEI.toString()]
  );
  const survivorCount = allStarts.length;

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

  // ── survival curve ────────────────────────────────────────────
  // "started this month" = every wallet whose CURRENT streak began in the
  // window and still holds a real balance (entries). A wallet that broke and
  // rebought this month still counts as an August starter at its new date.
  // The curve shows, for each day D of the month so far, how many of the
  // cohort had an unbroken streak reaching at least day D — i.e. started on
  // or before (today − D). Survivors only, so it's monotonic and honest.
  // For the live month this runs to today; for a past month it runs to the end
  // of that month, so an old cohort's curve covers the whole month it belongs to.
  const throughSec = Math.min(Date.now() / 1000, win.end);
  const maxDay = Math.max(1, Math.floor((throughSec - win.start) / 86400));
  // streak length in whole days for EVERY wallet in the cohort, capped at the
  // month's age — derived from allStarts, not the LIMITed board.
  const streaks = allStarts.map((r) =>
    Math.min(Math.max(0, Math.floor((throughSec - r.hold_start_unix) / 86400)), maxDay)
  );
  // entries is LIMITed for display, so counting it undercounts any month with
  // more than LIMIT starters — the live August cohort hit exactly 500 and
  // silently dropped everyone who joined after the 14th. Count separately.
  const startedInMonth = survivorCount;
  // survivor-derived fallback series (used only if the keeper's true survival
  // file isn't present). Monotonic, honest, but counts only current holders.
  const survivalSeries: { day: number; alive: number }[] = [];
  for (let d = 1; d <= maxDay; d++) {
    survivalSeries.push({ day: d, alive: streaks.filter((s) => s >= d).length });
  }
  // Everything holder_stats returned is, by definition, still holding — the query
  // filters on a live balance. So the survivor-derived "still unbroken" is the
  // whole set, not the tail of the curve: alive[maxDay] counts only wallets that
  // started on day 1 and would badly understate it. The 100% that falls out of
  // this is an artefact of only being able to see survivors, which is exactly
  // what hasTrueSurvival=false tells the client not to render as a rate.
  let stillUnbroken = survivorCount;
  let survivalRate = startedInMonth > 0 ? Math.round((stillUnbroken / startedInMonth) * 100) : 0;
  let series = survivalSeries;
  let trueStarted = startedInMonth;

  // Prefer the keeper's TRUE survival curve — it includes wallets that started
  // AND quit, read from on-chain StreakBroken events, which the survivor-derived
  // series above cannot see (holder_stats only knows current state, so a wallet
  // that started this month and broke has simply vanished from it).
  //
  // Postgres first: the keeper (Scripts/monthly_survival.js) runs as its own
  // Railway service with its own filesystem, so a file it writes never reaches
  // this container. The file read is kept as a fallback for the committed
  // snapshot and for local development.
  const applySurvival = (sv: {
    cohort?: string;
    survivalSeries?: SurvivalPoint[];
    startedInMonth?: number;
    stillUnbroken?: number;
    survivalRate?: number;
  }) => {
    if (sv.cohort !== win.monthKey) return false;
    if (!Array.isArray(sv.survivalSeries) || !sv.survivalSeries.length) return false;
    series = sv.survivalSeries;
    trueStarted = sv.startedInMonth ?? startedInMonth;
    stillUnbroken = sv.stillUnbroken ?? stillUnbroken;
    survivalRate = sv.survivalRate ?? survivalRate;
    return true;
  };

  let gotSurvival = false;
  try {
    const { rows } = await pool.query<{ payload: Record<string, unknown> }>(
      `SELECT payload FROM monthly_survival WHERE cohort = $1`,
      [win.monthKey]
    );
    if (rows.length) gotSurvival = applySurvival(rows[0].payload);
  } catch {
    /* table not created yet (keeper has never run) — fall through to the file */
  }

  if (!gotSurvival) {
    try {
      const p = process.env.SURVIVAL_FILE || path.join(process.cwd(), "monthly_survival.json");
      if (fs.existsSync(p)) gotSurvival = applySurvival(JSON.parse(fs.readFileSync(p, "utf8")));
    } catch { /* fall back to survivor-derived */ }
  }

  const body = JSON.stringify({
    cohort: win.monthKey,
    cohortLabel: win.label,
    resetsAt: win.resetsAt,
    count: entries.length,
    // true when the curve came from the keeper's StreakBroken index, i.e. it
    // includes wallets that started and quit. False means survivors-only: every
    // wallet still holds, so the "rate" is an artefact and must not be shown as
    // one. For any month the keeper has not indexed this is always false.
    hasTrueSurvival: gotSurvival,
    startedInMonth: trueStarted,
    stillUnbroken,
    survivalRate,
    monthDay: maxDay,
    survivalSeries: series,
    entries,
    updatedAt: new Date().toISOString(),
  });
  cached.set(win.monthKey, { body, timestamp: Date.now() });
  return new Response(body, { headers: { "Content-Type": "application/json" } });
}
