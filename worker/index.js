/**
 * FIRE Reward Worker
 * ─────────────────────────────────────────────────
 * Incremental scan of RewardClaimed events + per-holder snapshot into
 * Postgres. Designed to run as a Railway cron (hourly) — exits when done.
 *
 * Environment:
 *   TOKEN_ADDRESS   — FIRE contract on Base
 *   DATABASE_URL    — Postgres connection string (Railway-injected)
 *   BASE_RPC_URL    — optional; falls back to public Base RPC
 *
 * Usage:
 *   node index.js          # single run (cron mode)
 *   node index.js --watch  # loop hourly (long-running mode)
 */

const { ethers } = require("ethers");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const DATABASE_URL  = process.env.DATABASE_URL;
const RPC_URLS      = (process.env.BASE_RPC_URL ? [process.env.BASE_RPC_URL] : []).concat([
  "https://base-rpc.publicnode.com",
  "https://base.llamarpc.com",
  "https://base.publicnode.com",
  "https://mainnet.base.org",
]);
const START_BLOCK   = process.env.START_BLOCK ? BigInt(process.env.START_BLOCK) : 0n;
const CHUNK         = parseInt(process.env.CHUNK || "500", 10);
const CALL_DELAY_MS = 100;
const INTERVAL_MS   = 60 * 60 * 1000; // 1h
const WATCH         = process.argv.includes("--watch");

const ABI = [
  "event RewardClaimed(address indexed holder, uint256 tokenAmount)",
  "function holderCount() external view returns (uint256)",
  "function holderList(uint256 index) external view returns (address)",
  "function pendingReward(address) external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)",
  "function holdStart(address) external view returns (uint256)",
];

const ts    = () => new Date().toISOString().replace("T", " ").split(".")[0];
const log   = (...a) => console.log(`[${ts()}]`, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ensureSchema(db) {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await db.query(sql);
}

async function getLastBlock(db) {
  const { rows } = await db.query("SELECT last_block_processed FROM scan_state WHERE id = 1");
  return BigInt(rows[0]?.last_block_processed ?? 0);
}

async function setLastBlock(db, block) {
  await db.query(
    "UPDATE scan_state SET last_block_processed = $1, last_run_at = NOW() WHERE id = 1",
    [String(block)]
  );
}

async function scanNewEvents(db, providers, contracts, fromBlock, toBlock) {
  if (fromBlock > toBlock) {
    log(`No new blocks to scan (last=${fromBlock}, head=${toBlock})`);
    return { inserted: 0, lastSafe: toBlock };
  }
  log(`Scanning RewardClaimed events from #${fromBlock} → #${toBlock} (${toBlock - fromBlock + 1n} blocks, chunk=${CHUNK})`);

  let inserted = 0;
  let lastSafe = fromBlock - 1n;

  for (let from = fromBlock; from <= toBlock; from += BigInt(CHUNK)) {
    const to = from + BigInt(CHUNK) - 1n > toBlock ? toBlock : from + BigInt(CHUNK) - 1n;

    let events = null;
    let lastErr = null;
    // Try each RPC in turn, with one extra retry per RPC after backoff
    outer: for (const contract of contracts) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const filter = contract.filters.RewardClaimed();
          events = await contract.queryFilter(filter, Number(from), Number(to));
          break outer;
        } catch (e) {
          lastErr = e;
          await sleep(300 * (attempt + 1));
        }
      }
    }

    if (events == null) {
      const msg = lastErr?.shortMessage || lastErr?.info?.error?.message || lastErr?.message || "unknown";
      log(`  ✗ Block ${from}-${to} failed across all RPCs: ${msg}`);
      // Don't advance lastSafe — caller will retry this range next run
      break;
    }

    for (const evt of events) {
      const holder = evt.args.holder.toLowerCase();
      const amount = evt.args.tokenAmount.toString();
      try {
        const r = await db.query(
          `INSERT INTO reward_claimed_events (tx_hash, log_index, block_number, holder, amount_wei)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (tx_hash, log_index) DO NOTHING`,
          [evt.transactionHash, evt.index, evt.blockNumber, holder, amount]
        );
        if (r.rowCount > 0) inserted++;
      } catch (e) {
        log(`  Insert failed for ${evt.transactionHash}#${evt.index}: ${e.message}`);
      }
    }

    lastSafe = to;
    await sleep(50);
  }

  log(`Inserted ${inserted} new events. Safe through block #${lastSafe}`);
  return { inserted, lastSafe };
}

async function refreshHolderSnapshots(db, token) {
  const count = Number(await token.holderCount());
  log(`Refreshing snapshots for ${count} holders...`);

  const holders = [];
  for (let i = 0; i < count; i++) {
    let addr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { addr = await token.holderList(i); break; } catch { await sleep(300 * (attempt + 1)); }
    }
    if (addr) holders.push(addr.toLowerCase());
    if ((i + 1) % 100 === 0) log(`  Read ${i + 1} / ${count} holders`);
    await sleep(CALL_DELAY_MS);
  }

  let upserted = 0;
  for (let i = 0; i < holders.length; i++) {
    const addr = holders[i];

    let pending = 0n, balance = 0n, holdStart = 0n;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        [pending, balance, holdStart] = await Promise.all([
          token.pendingReward(addr).catch(() => 0n),
          token.balanceOf(addr).catch(() => 0n),
          token.holdStart(addr).catch(() => 0n),
        ]);
        break;
      } catch { await sleep(300 * (attempt + 1)); }
    }

    const { rows } = await db.query(
      "SELECT COALESCE(SUM(amount_wei), 0) AS total FROM reward_claimed_events WHERE holder = $1",
      [addr]
    );
    const totalClaimed = rows[0].total.toString();

    await db.query(
      `INSERT INTO holder_stats (address, total_claimed_wei, pending_rewards_wei, current_balance_wei, hold_start_unix, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (address) DO UPDATE SET
         total_claimed_wei   = EXCLUDED.total_claimed_wei,
         pending_rewards_wei = EXCLUDED.pending_rewards_wei,
         current_balance_wei = EXCLUDED.current_balance_wei,
         hold_start_unix     = EXCLUDED.hold_start_unix,
         updated_at          = NOW()`,
      [addr, totalClaimed, pending.toString(), balance.toString(), holdStart > 0n ? Number(holdStart) : null]
    );
    upserted++;

    if ((i + 1) % 100 === 0) log(`  Snapshotted ${i + 1} / ${holders.length}`);
    await sleep(CALL_DELAY_MS);
  }

  log(`Snapshotted ${upserted} holders`);
  return upserted;
}

async function runOnce() {
  const startTime = Date.now();
  const db = new Client({
    connectionString: DATABASE_URL,
    // Railway Postgres uses self-signed certs over the internal network;
    // accept them. Internal hostnames are not publicly routable.
    ssl: DATABASE_URL.includes("railway.internal") ? false : { rejectUnauthorized: false },
  });
  await db.connect();
  await ensureSchema(db);

  const providers = RPC_URLS.map(url => new ethers.JsonRpcProvider(url));
  const contracts = providers.map(p => new ethers.Contract(TOKEN_ADDRESS, ABI, p));
  const primary = contracts[0];

  let head;
  for (const p of providers) {
    try { head = BigInt(await p.getBlockNumber()); break; } catch { /* try next */ }
  }
  if (head === undefined) throw new Error("All RPCs failed to return a block number");

  const lastBlock = await getLastBlock(db);
  // Floor by START_BLOCK so a fresh DB doesn't scan from genesis
  const effectiveLast = lastBlock > START_BLOCK ? lastBlock : START_BLOCK;
  const from = effectiveLast + 1n;

  log(`────────────────────────────────────────`);
  log(`Run start. Head=${head}, lastProcessed=${lastBlock}, effectiveStart=${effectiveLast}`);

  const { lastSafe } = await scanNewEvents(db, providers, contracts, from, head);
  // Only advance to where we actually completed; partial progress is preserved
  if (lastSafe >= effectiveLast) await setLastBlock(db, lastSafe);
  await refreshHolderSnapshots(db, primary);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const summary = await db.query(`
    SELECT COUNT(*)::int AS holders,
           COALESCE(SUM(total_claimed_wei + pending_rewards_wei), 0)::text AS all_time_wei
    FROM holder_stats
  `);
  const allTime = ethers.formatEther(BigInt(summary.rows[0].all_time_wei || "0"));
  log(`✅ Done in ${elapsed}s. holders=${summary.rows[0].holders}, all-time pool distributed/pending=${allTime} FIRE`);
  log(`────────────────────────────────────────\n`);

  await db.end();
}

async function main() {
  if (!TOKEN_ADDRESS) { console.error("Missing TOKEN_ADDRESS"); process.exit(1); }
  if (!DATABASE_URL) { console.error("Missing DATABASE_URL"); process.exit(1); }

  console.log("════════════════════════════════════════════");
  console.log("  FIRE Reward Worker");
  console.log(`  Token : ${TOKEN_ADDRESS}`);
  console.log(`  RPCs  : ${RPC_URLS.join(", ")}`);
  console.log(`  Mode  : ${WATCH ? "watch (hourly loop)" : "single run (cron)"}`);
  console.log("════════════════════════════════════════════\n");

  await runOnce();

  if (WATCH) {
    log(`Next run in 1h...`);
    setInterval(async () => {
      try { await runOnce(); log("Next run in 1h..."); }
      catch (e) { log(`Run failed: ${e.message}`); }
    }, INTERVAL_MS);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
