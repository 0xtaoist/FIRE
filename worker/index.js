/**
 * FIRE v2 indexer — Robinhood Chain
 * ─────────────────────────────────────────────────────────────────────────
 * Snapshots every holder's live v2 state (balance, streak, tier, dividend
 * score, jackpot weight) into Postgres so the leaderboard / holder-stats
 * APIs can serve them without thousands of RPC calls per request.
 *
 * v2 has no claim mechanics — dividends are PUSHED — so the legacy
 * pendingReward / rewardPerScore / RewardClaimed pipeline is gone. Lifetime
 * dividends come from the keeper's distribution records (DIST_DIR), folded
 * in here so the leaderboard can rank by real payouts.
 *
 * env:
 *   DATABASE_URL        — Postgres
 *   TOKEN_ADDRESS       — FIRE v2 (defaults to the live deployment)
 *   ROBINHOOD_RPC_URL   — RH chain RPC (Alchemy recommended)
 *   DIST_DIR            — optional; path to keeper/distributions
 *
 * usage:
 *   node index.js           # single run (cron)
 *   node index.js --watch   # hourly loop
 */

const { ethers } = require("ethers");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const TOKEN = (process.env.TOKEN_ADDRESS || "0x43eeA882B845a8493152Ebc55cF30aE9281b02d5").toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL;
const RPC_URLS = (process.env.ROBINHOOD_RPC_URL ? [process.env.ROBINHOOD_RPC_URL] : [])
  .concat(["https://rpc.mainnet.chain.robinhood.com"]);
const DIST_DIR = process.env.DIST_DIR || path.join(__dirname, "..", "distributions");
const CALL_DELAY_MS = Number(process.env.CALL_DELAY_MS || 40);
const INTERVAL_MS = 60 * 60 * 1000;
const WATCH = process.argv.includes("--watch");

const ABI = [
  "function holderCount() view returns (uint256)",
  "function holderList(uint256) view returns (address)",
  "function holderStatus(address) view returns (tuple(uint256 balance,uint256 streakDays_,uint256 tierMultX100,uint256 peak,uint256 breakBelowBalance,uint256 tranches_,bool migrated))",
  "function jackpotWeight(address) view returns (uint256)",
  "function dividendScore(address) view returns (uint256)",
];

const ts = () => new Date().toISOString().replace("T", " ").split(".")[0];
const log = (...a) => console.log(`[${ts()}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureSchema(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS holder_stats (
      address TEXT PRIMARY KEY,
      current_balance_wei NUMERIC DEFAULT 0,
      score_snapshot_wei  NUMERIC DEFAULT 0,
      hold_start_unix     BIGINT,
      total_claimed_wei   NUMERIC DEFAULT 0,
      pending_rewards_wei NUMERIC DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  for (const [col, type] of [
    ["streak_days", "INTEGER DEFAULT 0"],
    ["tier_x100", "INTEGER DEFAULT 100"],
    ["jackpot_weight", "NUMERIC DEFAULT 0"],
    ["migrated", "BOOLEAN DEFAULT FALSE"],
    ["peak_balance_wei", "NUMERIC DEFAULT 0"],
    ["break_below_wei", "NUMERIC DEFAULT 0"],
    ["lifetime_dividends", "JSONB DEFAULT '{}'::jsonb"],
  ]) {
    await db.query(`ALTER TABLE holder_stats ADD COLUMN IF NOT EXISTS ${col} ${type};`).catch(() => {});
  }
}

/** lifetime pushed dividends per holder, from the keeper's records */
function loadLifetimeDividends() {
  const out = {};
  let files = [];
  try {
    files = fs.readdirSync(DIST_DIR).filter((f) => f.startsWith("dist_") && f.endsWith(".json"));
  } catch {
    return out;
  }
  const records = [];
  for (const f of files) {
    try { records.push(JSON.parse(fs.readFileSync(path.join(DIST_DIR, f), "utf8"))); } catch { /* skip */ }
  }
  // same 6h same-asset dedupe the FE uses, so totals agree everywhere
  const lastKept = {};
  const deduped = records
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .filter((r) => {
      const t = Date.parse(r.date), k = (r.asset || "").toLowerCase();
      if (lastKept[k] !== undefined && t - lastKept[k] < 6 * 3600 * 1000) return false;
      lastKept[k] = t;
      return true;
    });
  for (const r of deduped) {
    for (const [addr, amt] of Object.entries(r.holders || {})) {
      const a = addr.toLowerCase();
      out[a] = out[a] || {};
      out[a][r.symbol] = (BigInt(out[a][r.symbol] || "0") + BigInt(amt)).toString();
    }
  }
  return out;
}

async function getProvider() {
  for (const url of RPC_URLS) {
    try {
      const p = new ethers.JsonRpcProvider(url, undefined, { batchMaxCount: 1 });
      await p.getBlockNumber();
      return p;
    } catch { /* next */ }
  }
  throw new Error("no working RPC");
}

async function runOnce() {
  if (!DATABASE_URL) { console.error("Missing DATABASE_URL"); process.exit(1); }
  const db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  await ensureSchema(db);

  const provider = await getProvider();
  const token = new ethers.Contract(TOKEN, ABI, provider);
  const dividends = loadLifetimeDividends();
  log(`Lifetime dividend records: ${Object.keys(dividends).length} wallets`);

  const count = Number(await token.holderCount());
  log(`Snapshotting ${count} holders from ${TOKEN}...`);

  const nowSec = Math.floor(Date.now() / 1000);
  let upserted = 0, skipped = 0;

  for (let i = 0; i < count; i++) {
    try {
      const addr = (await token.holderList(i)).toLowerCase();
      const s = await token.holderStatus(addr);
      const balance = s.balance ?? s[0];
      if (balance === 0n) { skipped++; await sleep(CALL_DELAY_MS); continue; }

      const streakDays = Number(s.streakDays_ ?? s[1]);
      const tierX100 = Number(s.tierMultX100 ?? s[2]);
      const peak = (s.peak ?? s[3]).toString();
      const breakBelow = (s.breakBelowBalance ?? s[4]).toString();
      const migrated = Boolean(s.migrated ?? s[6]);
      const jw = await token.jackpotWeight(addr);
      const score = await token.dividendScore(addr);
      const holdStart = streakDays > 0 ? nowSec - streakDays * 86400 : null;

      await db.query(
        `INSERT INTO holder_stats
           (address, current_balance_wei, score_snapshot_wei, hold_start_unix,
            streak_days, tier_x100, jackpot_weight, migrated, peak_balance_wei,
            break_below_wei, lifetime_dividends, total_claimed_wei, pending_rewards_wei, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,0,NOW())
         ON CONFLICT (address) DO UPDATE SET
           current_balance_wei = EXCLUDED.current_balance_wei,
           score_snapshot_wei  = EXCLUDED.score_snapshot_wei,
           hold_start_unix     = EXCLUDED.hold_start_unix,
           streak_days         = EXCLUDED.streak_days,
           tier_x100           = EXCLUDED.tier_x100,
           jackpot_weight      = EXCLUDED.jackpot_weight,
           migrated            = EXCLUDED.migrated,
           peak_balance_wei    = EXCLUDED.peak_balance_wei,
           break_below_wei     = EXCLUDED.break_below_wei,
           lifetime_dividends  = EXCLUDED.lifetime_dividends,
           updated_at          = NOW()`,
        [addr, balance.toString(), score.toString(), holdStart, streakDays, tierX100,
         jw.toString(), migrated, peak, breakBelow, JSON.stringify(dividends[addr] || {})]
      );
      upserted++;
    } catch {
      skipped++;
    }
    if ((i + 1) % 200 === 0) log(`  ${i + 1}/${count} — ${upserted} written`);
    await sleep(CALL_DELAY_MS);
  }

  log(`✅ ${upserted} holders written, ${skipped} skipped (zero balance / read error)`);
  await db.end();
}

async function main() {
  await runOnce();
  if (!WATCH) return;
  log(`Watch mode — next run in ${INTERVAL_MS / 60000}m`);
  setInterval(() => { runOnce().catch((e) => console.error("run failed:", e.message)); }, INTERVAL_MS);
}
main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
