/**
 * FIRE Reward Worker
 * ─────────────────────────────────────────────────
 * Scans RewardClaimed events across ALL FIRE contracts the project has
 * launched (current + legacy), then snapshots per-holder cumulative state
 * into Postgres for the dashboard's 30-day projection.
 *
 * Event scan uses Blockscout's `getLogs` API (indexed, fast) instead of
 * eth_getLogs over public RPCs (chunked, rate-limited, slow).
 *
 * Environment:
 *   TOKEN_ADDRESS       — primary/current contract (live state read from here)
 *   LEGACY_CONTRACTS    — comma-separated past contracts to also scan for events
 *   DATABASE_URL        — Postgres (Railway-injected)
 *   BASE_RPC_URL        — optional; multi-RPC fallback otherwise
 *   BLOCKSCOUT_BASE_URL — optional; defaults to https://base.blockscout.com
 *   START_BLOCK         — global floor for fresh contracts (default 0)
 *
 * Usage:
 *   node index.js          # cron mode, single run
 *   node index.js --watch  # long-running, hourly loop
 */

const { ethers } = require("ethers");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const PRIMARY_CONTRACT     = (process.env.TOKEN_ADDRESS || "").toLowerCase();
const LEGACY_CONTRACTS     = (process.env.LEGACY_CONTRACTS || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const ALL_CONTRACTS        = [PRIMARY_CONTRACT, ...LEGACY_CONTRACTS].filter(Boolean);
const DATABASE_URL         = process.env.DATABASE_URL;
const BLOCKSCOUT_BASE_URL  = process.env.BLOCKSCOUT_BASE_URL || "https://base.blockscout.com";
const RPC_URLS             = (process.env.BASE_RPC_URL ? [process.env.BASE_RPC_URL] : []).concat([
  "https://base-rpc.publicnode.com",
  "https://base.llamarpc.com",
  "https://base.publicnode.com",
  "https://mainnet.base.org",
]);
const START_BLOCK          = process.env.START_BLOCK ? BigInt(process.env.START_BLOCK) : 0n;
const CALL_DELAY_MS        = 100;
const INTERVAL_MS          = 60 * 60 * 1000;
const WATCH                = process.argv.includes("--watch");

const REWARD_CLAIMED_TOPIC = "0x106f923f993c2149d49b4255ff723acafa1f2d94393f561d3eda32ae348f7241";

const ABI = [
  "function holderCount() external view returns (uint256)",
  "function holderList(uint256 index) external view returns (address)",
  "function pendingReward(address) external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)",
  "function holdStart(address) external view returns (uint256)",
];

const ts    = () => new Date().toISOString().replace("T", " ").split(".")[0];
const log   = (...a) => console.log(`[${ts()}]`, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms: ${label}`)), ms)),
  ]);
}

async function ensureSchema(db) {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await db.query(sql);
}

async function maybeMigrateFromLegacy(db) {
  // Old worker version had single-contract `scan_state` table and didn't
  // populate `contract` on events. If we still have that legacy state and
  // no per-contract state has been written yet, wipe and re-scan everything
  // — we know the legacy scan was incomplete (missed pre-START_BLOCK events
  // and entire legacy contracts).
  const { rows } = await db.query(`
    SELECT
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_state') AS legacy_exists,
      (SELECT COUNT(*) FROM contract_scan_state) AS new_count
  `);
  const legacyExists = rows[0].legacy_exists;
  const newCount = Number(rows[0].new_count);

  if (legacyExists && newCount === 0) {
    log("⚠️  Migrating from single-contract legacy state. Wiping incomplete data and re-scanning from START_BLOCK...");
    await db.query("TRUNCATE TABLE reward_claimed_events");
    await db.query("TRUNCATE TABLE holder_stats");
    await db.query("DROP TABLE IF EXISTS scan_state");
    log("Migration cleanup done.");
  }
}

async function getLastBlockForContract(db, contract) {
  const { rows } = await db.query(
    "SELECT last_block_processed FROM contract_scan_state WHERE contract = $1",
    [contract.toLowerCase()]
  );
  return BigInt(rows[0]?.last_block_processed ?? 0);
}

async function setLastBlockForContract(db, contract, block) {
  await db.query(
    `INSERT INTO contract_scan_state (contract, last_block_processed, last_run_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (contract) DO UPDATE SET
       last_block_processed = EXCLUDED.last_block_processed,
       last_run_at          = NOW()`,
    [contract.toLowerCase(), String(block)]
  );
}

async function fetchLogsPage(contract, fromBlock, toBlock) {
  const url = `${BLOCKSCOUT_BASE_URL}/api?module=logs&action=getLogs`
    + `&address=${contract}`
    + `&topic0=${REWARD_CLAIMED_TOPIC}`
    + `&fromBlock=${fromBlock}`
    + `&toBlock=${toBlock}`;
  const res = await withTimeout(fetch(url), 30000, "blockscout getLogs");
  const data = await res.json();
  if (data.status === "1" && Array.isArray(data.result)) return data.result;
  if (data.status === "0" && data.message === "No logs found") return [];
  throw new Error(`Blockscout error: ${JSON.stringify(data).slice(0, 200)}`);
}

async function scanContractViaBlockscout(db, contract, fromBlock, head) {
  if (fromBlock > head) {
    log(`[${contract}] No new blocks (last=${fromBlock - 1n}, head=${head})`);
    return { inserted: 0, lastSafe: head };
  }
  log(`[${contract}] Scanning #${fromBlock} → #${head} (${head - fromBlock + 1n} blocks)`);

  let inserted = 0;
  let cursor = fromBlock;
  let lastSafe = fromBlock - 1n;
  let pageCount = 0;

  while (cursor <= head) {
    let result;
    try {
      result = await fetchLogsPage(contract, cursor.toString(), head.toString());
    } catch (e) {
      log(`  [${contract}] Page ${pageCount + 1} failed: ${e.message}`);
      // Don't advance lastSafe past the failed range
      break;
    }

    if (result.length === 0) {
      lastSafe = head;
      break;
    }

    let pageMaxBlock = cursor;
    for (const evt of result) {
      const block = BigInt(parseInt(evt.blockNumber, 16));
      const txHash = evt.transactionHash;
      const logIndex = parseInt(evt.logIndex, 16);
      // RewardClaimed(address indexed holder, uint256 amount):
      //   topics[1] = padded holder; data = uint256 amount
      const holder = ("0x" + evt.topics[1].slice(26)).toLowerCase();
      const amountWei = BigInt(evt.data).toString();

      try {
        const r = await db.query(
          `INSERT INTO reward_claimed_events (tx_hash, log_index, block_number, contract, holder, amount_wei)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (tx_hash, log_index) DO NOTHING`,
          [txHash, logIndex, block.toString(), contract.toLowerCase(), holder, amountWei]
        );
        if (r.rowCount > 0) inserted++;
      } catch (e) {
        log(`  Insert failed ${txHash}#${logIndex}: ${e.message}`);
      }
      if (block > pageMaxBlock) pageMaxBlock = block;
    }

    pageCount++;
    log(`  [${contract}] Page ${pageCount}: ${result.length} events through #${pageMaxBlock} (inserted ${inserted})`);
    lastSafe = pageMaxBlock;

    // Blockscout v1 returns max 1000 logs; if we got that, paginate forward
    if (result.length >= 1000) {
      cursor = pageMaxBlock + 1n;
      await sleep(200);
    } else {
      // Got everything in range
      lastSafe = head;
      break;
    }
  }

  log(`[${contract}] Inserted ${inserted} new events. Safe through #${lastSafe}`);
  return { inserted, lastSafe };
}

async function getHead(providers) {
  for (let i = 0; i < providers.length; i++) {
    const label = RPC_URLS[i].replace(/^https?:\/\//, "");
    try {
      const head = BigInt(await withTimeout(providers[i].getBlockNumber(), 10000, `getBlockNumber ${label}`));
      log(`Block head from ${label}: ${head}`);
      return head;
    } catch (e) {
      log(`✗ ${label} getBlockNumber failed: ${e.message}`);
    }
  }
  throw new Error("All RPCs failed to return a block number");
}

async function refreshHolderSnapshots(db, primaryContract) {
  // Holders we care about = current contract's tracked holders ∪ anyone with claim history
  const { rows: eventHolderRows } = await db.query("SELECT DISTINCT holder FROM reward_claimed_events");
  const eventHolders = new Set(eventHolderRows.map(r => r.holder));

  let count = 0;
  try { count = Number(await withTimeout(primaryContract.holderCount(), 10000, "holderCount")); } catch (e) {
    log(`holderCount failed: ${e.message}`);
  }
  log(`Refreshing snapshots — primary holderCount=${count}, event holders=${eventHolders.size}`);

  const liveHolders = new Set();
  for (let i = 0; i < count; i++) {
    let addr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        addr = await withTimeout(primaryContract.holderList(i), 10000, `holderList(${i})`);
        break;
      } catch { await sleep(300 * (attempt + 1)); }
    }
    if (addr) liveHolders.add(addr.toLowerCase());
    if ((i + 1) % 200 === 0) log(`  Read ${i + 1} / ${count} live holders`);
    await sleep(CALL_DELAY_MS);
  }

  const allHolders = Array.from(new Set([...liveHolders, ...eventHolders]));
  log(`Total holders to snapshot: ${allHolders.length}`);

  let upserted = 0;
  for (let i = 0; i < allHolders.length; i++) {
    const addr = allHolders[i];

    let pending = 0n, balance = 0n, holdStart = 0n;
    if (liveHolders.has(addr)) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          [pending, balance, holdStart] = await Promise.all([
            withTimeout(primaryContract.pendingReward(addr), 8000, "pendingReward").catch(() => 0n),
            withTimeout(primaryContract.balanceOf(addr), 8000, "balanceOf").catch(() => 0n),
            withTimeout(primaryContract.holdStart(addr), 8000, "holdStart").catch(() => 0n),
          ]);
          break;
        } catch { await sleep(300 * (attempt + 1)); }
      }
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

    if ((i + 1) % 200 === 0) log(`  Snapshotted ${i + 1} / ${allHolders.length}`);
    if (liveHolders.has(addr)) await sleep(CALL_DELAY_MS);
  }

  log(`Snapshotted ${upserted} holders`);
  return upserted;
}

async function runOnce() {
  const startTime = Date.now();
  const db = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("railway.internal") ? false : { rejectUnauthorized: false },
  });
  await db.connect();
  await ensureSchema(db);
  await maybeMigrateFromLegacy(db);

  const providers = RPC_URLS.map(url => new ethers.JsonRpcProvider(url));
  const primaryContract = new ethers.Contract(PRIMARY_CONTRACT, ABI, providers[0]);
  const head = await getHead(providers);

  log(`────────────────────────────────────────`);
  log(`Run start. Head=${head}. Contracts: primary=${PRIMARY_CONTRACT}, legacy=[${LEGACY_CONTRACTS.join(", ")}]`);

  for (const contract of ALL_CONTRACTS) {
    const lastBlock = await getLastBlockForContract(db, contract);
    const effectiveLast = lastBlock > START_BLOCK ? lastBlock : START_BLOCK;
    const from = effectiveLast + 1n;
    const { lastSafe } = await scanContractViaBlockscout(db, contract, from, head);
    if (lastSafe >= effectiveLast) await setLastBlockForContract(db, contract, lastSafe);
  }

  await refreshHolderSnapshots(db, primaryContract);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const summary = await db.query(`
    SELECT COUNT(*)::int AS holders,
           COALESCE(SUM(total_claimed_wei + pending_rewards_wei), 0)::text AS all_time_wei
    FROM holder_stats
  `);
  const allTime = ethers.formatEther(BigInt(summary.rows[0].all_time_wei || "0"));
  log(`✅ Done in ${elapsed}s. holders=${summary.rows[0].holders}, all-time across all contracts=${allTime} FIRE`);
  log(`────────────────────────────────────────\n`);

  await db.end();
}

async function main() {
  if (!PRIMARY_CONTRACT) { console.error("Missing TOKEN_ADDRESS"); process.exit(1); }
  if (!DATABASE_URL)     { console.error("Missing DATABASE_URL"); process.exit(1); }

  console.log("════════════════════════════════════════════");
  console.log("  FIRE Reward Worker");
  console.log(`  Primary  : ${PRIMARY_CONTRACT}`);
  console.log(`  Legacy   : ${LEGACY_CONTRACTS.join(", ") || "(none)"}`);
  console.log(`  Blockscout: ${BLOCKSCOUT_BASE_URL}`);
  console.log(`  RPCs     : ${RPC_URLS.join(", ")}`);
  console.log(`  Mode     : ${WATCH ? "watch (hourly loop)" : "single run (cron)"}`);
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
