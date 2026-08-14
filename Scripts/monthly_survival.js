#!/usr/bin/env node
/* monthly_survival.js — build the TRUE monthly survival curve.
 *
 * The FE survival chart needs "N wallets started their streak this month,
 * and M are still unbroken" — including the ones that started and QUIT.
 * That break history isn't in holder_stats (which only knows current
 * state), but it IS on-chain: the token emits
 *   StreakBroken(address indexed holder, uint256 newBalance, uint256 oldPeak)
 * on every break. This script indexes the current UTC month's cohort and
 * writes monthly_survival.json for the API to serve — keeping log-scanning
 * off the request path.
 *
 * Cohort = wallets whose streak START (streakStart) falls in the month.
 * A wallet counts as "quit" if it has a StreakBroken event AFTER its
 * cohort start and is not currently holding an unbroken streak from that
 * start. The curve steps down on the day each such break occurred.
 *
 *   node monthly_survival.js          # index current month, write json
 *   node monthly_survival.js --month 2026-08
 *
 * Run on a cron (every ~15-30 min is plenty; breaks are infrequent).
 * env: ROBINHOOD_RPC_URL, TOKEN_ADDRESS, DATABASE_URL (for the starter set)
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const RPC = process.env.ROBINHOOD_RPC_URL || "https://robinhood-rpc.publicnode.com";
const TOKEN = process.env.TOKEN_ADDRESS || "0x43eeA882B845a8493152Ebc55cF30aE9281b02d5";
const LAUNCH_BLOCK = Number(process.env.LAUNCH_BLOCK || 13459116);
const CHUNK = Number(process.env.LOG_CHUNK || 9999);
const OUT = process.env.SURVIVAL_OUT || path.join(__dirname, "monthly_survival.json");
const MIN_BAL_FIRE = Number(process.env.MONTHLY_MIN_BALANCE_FIRE || "1");

const EXCLUDED = new Set([
  TOKEN,
  (process.env.DISTRIBUTOR_ADDRESS || "0x4AC257e8443f465dB515331c113895bf077f851A"),
  (process.env.HOOK_ADDRESS || "0xE3Fa8fA0D0A3f59C9B08Ea0Fe36d654A506850cC"),
  "0x0000000000000000000000000000000000000000",
  "0x000000000000000000000000000000000000dead",
  ...(process.env.BONUS_EXCLUDE || "").split(",").filter(Boolean),
].map((a) => a.toLowerCase()));

const ABI = [
  "function streakStart(address) view returns (uint64)",
  "function balanceOf(address) view returns (uint256)",
];
const STREAK_BROKEN = ethers.id("StreakBroken(address,uint256,uint256)");
const log = (m) => console.log(`[${new Date().toISOString().slice(0, 19)}] ${m}`);

function monthWindow(monthArg) {
  const now = monthArg ? new Date(`${monthArg}-01T00:00:00Z`) : new Date();
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  return {
    start: Date.UTC(y, m, 1) / 1000,
    end: Date.UTC(y, m + 1, 1) / 1000,
    monthKey: `${y}-${String(m + 1).padStart(2, "0")}`,
    label: now.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    resetsAt: new Date(Date.UTC(y, m + 1, 1)).toISOString(),
  };
}

async function scanLogs(provider, filter, from, to) {
  const out = [];
  for (let b = from; b <= to; ) {
    const end = Math.min(b + CHUNK - 1, to);
    const logs = await provider.getLogs({ ...filter, fromBlock: b, toBlock: end });
    out.push(...logs);
    b = end + 1;
  }
  return out;
}

// resolve a block near a target timestamp (binary search) — for mapping a
// break's block to a day-of-month bucket we just use the block's timestamp
async function main() {
  const monthArg = (() => { const i = process.argv.indexOf("--month"); return i !== -1 ? process.argv[i + 1] : null; })();
  const win = monthWindow(monthArg);
  const provider = new ethers.JsonRpcProvider(RPC);
  const token = new ethers.Contract(TOKEN, ABI, provider);
  const latest = await provider.getBlockNumber();
  const nowSec = Math.floor(Date.now() / 1000);

  // 1. cohort starters — wallets whose streakStart is in the month.
  //    Sourced from the DB if available (fast), else fall back to scanning
  //    the token's holder set is impractical, so DB is required here.
  let starters = [];
  if (process.env.DATABASE_URL) {
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const { rows } = await pool.query(
      `SELECT address, hold_start_unix FROM holder_stats
       WHERE hold_start_unix >= $1 AND hold_start_unix < $2`,
      [win.start, win.end]
    );
    await pool.end();
    starters = rows.map((r) => ({ addr: r.address.toLowerCase(), start: Number(r.hold_start_unix) }))
      .filter((s) => !EXCLUDED.has(s.addr));
    log(`cohort from DB: ${starters.length} wallets started in ${win.monthKey}`);
  } else {
    log("⚠️ DATABASE_URL unset — cannot resolve cohort starters. Aborting.");
    process.exit(1);
  }

  if (!starters.length) {
    fs.writeFileSync(OUT, JSON.stringify({ ...win, startedInMonth: 0, stillUnbroken: 0, survivalRate: 0, monthDay: 1, survivalSeries: [], updatedAt: new Date().toISOString() }, null, 2));
    log("no starters — wrote empty survival file");
    return;
  }

  const cohort = new Set(starters.map((s) => s.addr));
  const startByAddr = new Map(starters.map((s) => [s.addr, s.start]));

  // 2. StreakBroken events this month, filtered to cohort wallets.
  //    Scan from the month's first block (approx: LAUNCH_BLOCK is safe lower
  //    bound; breaks before the month can't affect a streak that started
  //    this month anyway).
  log("scanning StreakBroken events...");
  const breaks = await scanLogs(provider, { address: TOKEN, topics: [STREAK_BROKEN] }, LAUNCH_BLOCK, latest);
  log(`${breaks.length} StreakBroken events total; filtering to cohort + month`);

  // map each break to (addr, timestamp)
  const brokeInMonth = new Map(); // addr -> earliest break timestamp within month that ended their cohort streak
  for (const lg of breaks) {
    const addr = ethers.getAddress("0x" + lg.topics[1].slice(26)).toLowerCase();
    if (!cohort.has(addr)) continue;
    const blk = await provider.getBlock(lg.blockNumber);
    const ts = blk.timestamp;
    if (ts < win.start || ts >= win.end) continue;
    const cohortStart = startByAddr.get(addr) || 0;
    if (ts <= cohortStart) continue; // a break before/at their current start is irrelevant
    // earliest qualifying break marks their exit day
    if (!brokeInMonth.has(addr) || ts < brokeInMonth.get(addr)) brokeInMonth.set(addr, ts);
  }
  log(`${brokeInMonth.size} cohort wallets broke this month`);

  // 3. build the daily survival series.
  //    day d (1-indexed from month start). For each day, alive = starters
  //    who had started by day d AND had not yet broken by day d AND (for the
  //    current day) still hold a real balance.
  const dayNow = Math.max(1, Math.floor((nowSec - win.start) / 86400) + 1);
  const dayOf = (ts) => Math.floor((ts - win.start) / 86400) + 1;

  // verify current holders (survivors) still hold >= min balance, so a wallet
  // that dusted out without a StreakBroken event (edge case) doesn't inflate
  const MIN_WEI = BigInt(Math.round(MIN_BAL_FIRE * 1e6)) * 10n ** 12n;
  const survivorNow = new Set();
  for (const s of starters) {
    if (brokeInMonth.has(s.addr)) continue;
    try {
      const bal = await token.balanceOf(s.addr);
      if (bal >= MIN_WEI) survivorNow.add(s.addr);
    } catch {}
  }

  const series = [];
  for (let d = 1; d <= dayNow; d++) {
    let alive = 0;
    for (const s of starters) {
      if (dayOf(s.start) > d) continue;            // hadn't started yet by day d
      const broke = brokeInMonth.get(s.addr);
      if (broke && dayOf(broke) <= d) continue;    // already broken by day d
      if (d === dayNow && !survivorNow.has(s.addr) && !brokeInMonth.has(s.addr)) continue; // dusted out silently
      alive++;
    }
    series.push({ day: d, alive });
  }

  const startedInMonth = starters.length;
  const stillUnbroken = series.length ? series[series.length - 1].alive : startedInMonth;
  const survivalRate = startedInMonth > 0 ? Math.round((stillUnbroken / startedInMonth) * 100) : 0;

  const payload = {
    cohort: win.monthKey, cohortLabel: win.label, resetsAt: win.resetsAt,
    startedInMonth, stillUnbroken, survivalRate, monthDay: dayNow,
    quit: brokeInMonth.size, survivalSeries: series,
    updatedAt: new Date().toISOString(),
  };
  const tmp = OUT + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
  fs.renameSync(tmp, OUT);
  log(`✅ ${win.monthKey}: ${startedInMonth} started, ${stillUnbroken} unbroken (${survivalRate}%), ${brokeInMonth.size} quit → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
