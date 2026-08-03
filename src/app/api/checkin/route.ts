import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The daily check-in — a COSMETIC visit streak.
 *
 * This is not the hold streak. The hold streak lives on-chain
 * (FireToken.streakDays), can only be broken by selling below half of peak,
 * and is the thing that actually pays. It must never depend on whether
 * somebody opened a website.
 *
 * This counts consecutive UTC days a wallet tapped "check in". It breaks when
 * you skip a day, which is exactly why it's worth coming back for — but it
 * moves nothing except a badge and how hard Ember burns.
 *
 * Because it pays nothing, it is not signature-gated: anyone could POST
 * somebody else's address, and the worst they can do is make a stranger's
 * cosmetic counter go up. If check-ins are ever wired to real value, this needs
 * a signed message (SIWE-style) first.
 *
 * GET  ?address=0x…  → status, no write
 * POST { address }   → records today (idempotent), returns updated status
 */

const MAX_DAYS_SCANNED = 400; // enough for a year-long streak + slack

/** UTC date as YYYY-MM-DD. Every day boundary in here is UTC, everywhere. */
function utcDay(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(aIso + "T00:00:00Z");
  const b = Date.parse(bIso + "T00:00:00Z");
  return Math.round((a - b) / 86_400_000);
}

type Status = {
  address: string;
  checkedInToday: boolean;
  visitStreak: number;
  longestStreak: number;
  totalCheckins: number;
  lastCheckin: string | null;
  recent: string[];
};

/**
 * Current streak = the unbroken run ending today or yesterday. Yesterday still
 * counts as alive: a holder who checked in yesterday and is looking at the page
 * right now has not lost anything, they just haven't tapped yet today.
 */
function computeStatus(address: string, days: string[]): Status {
  const today = utcDay();
  const checkedInToday = days[0] === today;

  let visitStreak = 0;
  if (days.length > 0) {
    const gap = daysBetween(today, days[0]);
    if (gap <= 1) {
      visitStreak = 1;
      for (let i = 1; i < days.length; i++) {
        if (daysBetween(days[i - 1], days[i]) === 1) visitStreak++;
        else break;
      }
    }
  }

  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    if (i === 0 || daysBetween(days[i - 1], days[i]) === 1) run++;
    else run = 1;
    if (run > longestStreak) longestStreak = run;
  }

  return {
    address,
    checkedInToday,
    visitStreak,
    longestStreak: Math.max(longestStreak, visitStreak),
    totalCheckins: days.length,
    lastCheckin: days[0] ?? null,
    recent: days.slice(0, 30),
  };
}

let schemaReady = false;

/**
 * Created here rather than by a migration step: the worker owns its own tables
 * the same way (worker/index.js ensureSchema), and the site can be deployed
 * without a separate manual step. IF NOT EXISTS makes it a no-op after the
 * first request in a process.
 */
async function ensureSchema(pool: NonNullable<ReturnType<typeof getPool>>) {
  if (schemaReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS checkins (
      address     TEXT        NOT NULL,
      day         DATE        NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (address, day)
    );
  `);
  await pool
    .query(`CREATE INDEX IF NOT EXISTS idx_checkins_address_day ON checkins (address, day DESC);`)
    .catch(() => {});
  schemaReady = true;
}

/** DATE comes back as a JS Date in local time, which can shift the day across
 *  the boundary — format it in SQL instead and keep everything a plain string. */
async function readDays(
  pool: NonNullable<ReturnType<typeof getPool>>,
  address: string
): Promise<string[]> {
  const { rows } = await pool.query<{ day: string }>(
    `SELECT to_char(day, 'YYYY-MM-DD') AS day
       FROM checkins WHERE address = $1
      ORDER BY day DESC LIMIT ${MAX_DAYS_SCANNED}`,
    [address]
  );
  return rows.map((r) => r.day);
}

function parseAddress(value: string | null | undefined): string | null {
  const addr = value?.toLowerCase();
  return addr && /^0x[a-f0-9]{40}$/.test(addr) ? addr : null;
}

export async function GET(request: Request) {
  const address = parseAddress(new URL(request.url).searchParams.get("address"));
  if (!address) {
    return Response.json({ error: "valid ?address= required" }, { status: 400 });
  }

  const pool = getPool();
  if (!pool) {
    // The client falls back to localStorage so the check-in still works
    // locally and during a database outage — it just isn't portable.
    return Response.json({ error: "checkin database not configured" }, { status: 503 });
  }

  try {
    await ensureSchema(pool);
    return Response.json(computeStatus(address, await readDays(pool, address)));
  } catch (e) {
    console.error("checkin GET failed:", e);
    return Response.json({ error: "query failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { address?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body — falls through to the 400 below */
  }

  const address = parseAddress(body.address);
  if (!address) {
    return Response.json({ error: "valid address required" }, { status: 400 });
  }

  const pool = getPool();
  if (!pool) {
    return Response.json({ error: "checkin database not configured" }, { status: 503 });
  }

  try {
    await ensureSchema(pool);
    // ON CONFLICT DO NOTHING: the primary key already guarantees one row per
    // wallet per day, so a double-tap is a no-op rather than an error.
    const res = await pool.query(
      `INSERT INTO checkins (address, day) VALUES ($1, $2::date)
       ON CONFLICT (address, day) DO NOTHING`,
      [address, utcDay()]
    );
    const status = computeStatus(address, await readDays(pool, address));
    return Response.json({ ...status, firstToday: (res.rowCount ?? 0) > 0 });
  } catch (e) {
    console.error("checkin POST failed:", e);
    return Response.json({ error: "write failed" }, { status: 500 });
  }
}
