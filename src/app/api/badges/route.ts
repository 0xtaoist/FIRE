import { FIRE_CONTRACT, FIRE_ABI, DISTRIBUTOR_CONTRACT, DISTRIBUTOR_ABI, TIER, tierConfigFromChain } from "@/lib/contract";
import { rhClient } from "@/lib/rpc";
import { getPool } from "@/lib/db";
import { loadDistributionRecords } from "@/lib/distributions";
import { ranksFor } from "@/lib/ranks";
import { resolveBadges, type BadgeInputs } from "@/lib/badges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/badges?address=0x…
 *
 * Assembles the permanent half of a holder's identity. Deliberately has NO
 * table of its own — 17 of the 18 badges fall out of data that already exists:
 *
 *   chain reads    streakDays · isMigrated · holderList · jackpotMinStreakDays
 *   chain events   StreakBroken (Unbroken) · JackpotPaid (Jackpot)
 *   distributions  the keeper's dist_*.json records
 *   postgres       the checkins table
 *
 * Every source is wrapped so one outage degrades that badge to "not earned"
 * instead of failing the response.
 */

const EXPLORER = process.env.NEXT_PUBLIC_RH_EXPLORER_URL || "https://robinhoodchain.blockscout.com";
const LAUNCH_BLOCK = process.env.LAUNCH_BLOCK || "13459116";

// keccak256("StreakBroken(address,uint256,uint256)") — holder is topic1
const STREAK_BROKEN_TOPIC = "0x567337f90331c3ed58970c211016d9fdc69cfce638052b00aac87a7c57ae4b70";
// keccak256("JackpotPaid(address,address,uint256,uint256)") — winner is topic1
const JACKPOT_PAID_TOPIC = "0x5d4bc443ab3eccc2ce060e1d26b170ef59a52f7196b733bf407d26e9ce29676a";

const topicFor = (addr: string) => "0x" + addr.slice(2).padStart(64, "0");

/** Scoped to the emitting contract — topic0 alone would search every contract. */
async function getLogs(contract: string, topic0: string, topic1: string) {
  const url =
    `${EXPLORER}/api?module=logs&action=getLogs` +
    `&fromBlock=${LAUNCH_BLOCK}&toBlock=latest&address=${contract}` +
    `&topic0=${topic0}&topic1=${topic1}&topic0_1_opr=and`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  const json = await res.json();
  return Array.isArray(json?.result) ? json.result : [];
}

/**
 * holderList is append-ordered, so an address's index IS its join order and
 * "founding N" is a membership test on the first N entries — no database, no
 * sorting by timestamp. Scanned once and cached for a day: the first 1000
 * entries can only ever be appended to, never reordered.
 */
const FOUNDING_N = 1000;
let foundingCache: { list: string[]; at: number } | null = null;
let foundingInFlight: Promise<string[]> | null = null;
const FOUNDING_TTL = 24 * 60 * 60 * 1000;

async function getFoundingList(): Promise<string[]> {
  if (foundingCache && Date.now() - foundingCache.at < FOUNDING_TTL) return foundingCache.list;
  if (foundingInFlight) return foundingInFlight; // single-flight; a scan is ~1000 calls

  foundingInFlight = (async () => {
    const total = Number(
      await rhClient.readContract({ address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "holderCount" })
    );
    const want = Math.min(total, FOUNDING_N);
    const out: string[] = [];
    const CHUNK = 100;
    for (let i = 0; i < want; i += CHUNK) {
      const idx = Array.from({ length: Math.min(CHUNK, want - i) }, (_, k) => i + k);
      const batch = await Promise.all(
        idx.map((n) =>
          rhClient
            .readContract({
              address: FIRE_CONTRACT,
              abi: FIRE_ABI,
              functionName: "holderList",
              args: [BigInt(n)],
            })
            .then((a) => String(a).toLowerCase())
            .catch(() => "")
        )
      );
      out.push(...batch);
    }
    foundingCache = { list: out, at: Date.now() };
    return out;
  })().finally(() => {
    foundingInFlight = null;
  });

  return foundingInFlight;
}

/** Consecutive check-in days, plus the best run ever. Mirrors /api/checkin. */
async function checkinStreaks(address: string): Promise<{ current: number; best: number }> {
  const pool = getPool();
  if (!pool) return { current: 0, best: 0 };
  const { rows } = await pool.query<{ day: string }>(
    `SELECT to_char(day, 'YYYY-MM-DD') AS day FROM checkins
      WHERE address = $1 ORDER BY day DESC LIMIT 400`,
    [address]
  );
  const days = rows.map((r) => r.day);
  if (!days.length) return { current: 0, best: 0 };

  const n = (iso: string) => Math.round(Date.parse(iso + "T00:00:00Z") / 86_400_000);
  const today = Math.floor(Date.now() / 86_400_000);

  let current = 0;
  if (today - n(days[0]) <= 1) {
    current = 1;
    for (let i = 1; i < days.length; i++) {
      if (n(days[i - 1]) - n(days[i]) === 1) current++;
      else break;
    }
  }
  let best = 0, run = 0;
  for (let i = 0; i < days.length; i++) {
    if (i === 0 || n(days[i - 1]) - n(days[i]) === 1) run++;
    else run = 1;
    if (run > best) best = run;
  }
  return { current, best: Math.max(best, current) };
}

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address")?.toLowerCase();
  if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
    return Response.json({ error: "valid ?address= required" }, { status: 400 });
  }
  const addr = address as `0x${string}`;
  const read = <T,>(fn: string, args?: unknown[]) =>
    rhClient.readContract({ address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: fn, args } as never) as Promise<T>;

  const [
    streakRaw, migratedRaw, tierRaw, jackpotMinRaw, founding, breaks, jackpotWins, checkins,
  ] = await Promise.all([
    read<bigint>("streakDays", [addr]).catch(() => BigInt(0)),
    read<boolean>("isMigrated", [addr]).catch(() => false),
    Promise.all([
      read<bigint>("tierRampPeriod"), read<bigint>("prestige1Days"), read<bigint>("prestige2Days"),
      read<bigint>("tierBaseMult"), read<bigint>("tierMaxBase"), read<bigint>("tierHardCap"),
      read<bigint>("prestigeBump"),
    ]).catch(() => null),
    rhClient
      .readContract({ address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI, functionName: "jackpotMinStreakDays" })
      .then((v) => Number(v))
      .catch(() => null),
    getFoundingList().catch(() => [] as string[]),
    getLogs(FIRE_CONTRACT, STREAK_BROKEN_TOPIC, topicFor(address)).catch(() => []),
    // JackpotPaid indexes the winner first, so the same topic1 filter applies.
    getLogs(DISTRIBUTOR_CONTRACT, JACKPOT_PAID_TOPIC, topicFor(address)).catch(() => []),
    checkinStreaks(address).catch(() => ({ current: 0, best: 0 })),
  ]);

  const tier = tierRaw
    ? tierConfigFromChain({
        tierRampPeriod: tierRaw[0], prestige1Days: tierRaw[1], prestige2Days: tierRaw[2],
        tierBaseMult: tierRaw[3], tierMaxBase: tierRaw[4], tierHardCap: tierRaw[5],
        prestigeBump: tierRaw[6],
      })
    : TIER;
  const ranks = ranksFor(tier);
  const at = (key: string) => ranks.find((r) => r.key === key)?.atDays ?? 0;

  // ── distributions: how many this wallet appeared in, and in how many assets
  const records = loadDistributionRecords();
  const assetsAll = new Set(records.map((r) => r.asset.toLowerCase()));
  const mine = records.filter((r) => BigInt(r.holders?.[address] || "0") > BigInt(0));
  const assetsPaid = new Set(mine.map((r) => r.asset.toLowerCase()));

  // ── best streak we can actually evidence.
  // holder_stats only knows the CURRENT streak, and a broken streak leaves no
  // record of how long it ran. The gaps between StreakBroken events are a
  // provable lower bound on past runs, so a holder who reached FORGED and broke
  // still keeps the badge. It can under-count, never over-count.
  const breakTimes = breaks
    .map((l: { timeStamp?: string }) => (l.timeStamp ? Number(BigInt(l.timeStamp)) : 0))
    .filter(Boolean)
    .sort((a: number, b: number) => a - b);
  let bestPast = 0;
  for (let i = 1; i < breakTimes.length; i++) {
    bestPast = Math.max(bestPast, Math.floor((breakTimes[i] - breakTimes[i - 1]) / 86400));
  }

  const inputs: BadgeInputs = {
    streakDays: Number(streakRaw),
    bestStreakDays: bestPast,
    migrated: Boolean(migratedRaw),
    holderIndex: founding.indexOf(address),
    jackpotMinStreakDays: jackpotMinRaw,
    visitStreak: checkins.current,
    bestVisitStreak: checkins.best,
    distributionCount: mine.length,
    assetsPaid: assetsPaid.size,
    assetsTotal: assetsAll.size,
    hasBroken: breaks.length > 0,
    wonJackpot: jackpotWins.length > 0,
    rankAtDays: { forged: at("forged"), tempered: at("tempered"), diamond: at("diamond") },
  };

  const badges = resolveBadges(inputs);
  return Response.json({
    address,
    earned: badges.filter((b) => b.earned).length,
    total: badges.length,
    badges,
    // surfaced so the dashboard never has to re-read them
    tier,
    jackpotMinStreakDays: jackpotMinRaw,
  });
}
