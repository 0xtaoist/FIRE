/**
 * FIRE Token — Cumulative Buy Competition Tracker
 * ─────────────────────────────────────────────────
 * Tracks total cumulative FIRE bought per address over a 2-week window.
 * Any sell disqualifies the address entirely — removed from leaderboard.
 *
 * Detects buys and sells through:
 *   - Direct Uniswap V2 swaps (EOA → pair)
 *   - Any router/aggregator (GMGN, 1inch, OKX, etc)
 *   - ERC-4337 smart account txs (FOMO, etc)
 *
 * HTTP API on port 3001:
 *   GET /leaderboard          — top 100 by total bought
 *   GET /leaderboard/:address — single address stats
 *   GET /stats                — competition overview
 *
 * .env config:
 *   START_BLOCK=45000000        — competition start block
 *   COMPETITION_END_BLOCK=0     — 0 = calculate from START_BLOCK + 2 weeks
 *   TRACKER_PORT=3001
 */

require("dotenv").config();
const { ethers } = require("ethers");
const http = require("http");
const fs   = require("fs");

// ─── Config ───────────────────────────────────────────────────

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "0x43eeA882B845a8493152Ebc55cF30aE9281b02d5";
// v4: every pool settles through the PoolManager singleton, so FIRE transfers
// to/from it are sells/buys — the same role the v2 pair played on Base.
const PAIR_ADDRESS  = process.env.PAIR_ADDRESS || "0x8366a39cc670b4001a1121b8f6a443a643e40951";
const RPC_URL       = process.env.ROBINHOOD_RPC_URL || process.env.BASE_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const WS_RPC_URL    = process.env.ROBINHOOD_WS_RPC_URL || process.env.BASE_WS_RPC_URL;
const FIRE_POOL_ID  = (process.env.FIRE_POOL_ID || "0x2276440d38b33394989f7819f63b1df5ed62e48192706c172cabef1480547efd").toLowerCase();
const START_BLOCK   = parseInt(process.env.START_BLOCK || "0");
const PORT          = parseInt(process.env.TRACKER_PORT || "3001");
const TOP_N         = 100;
const STATE_FILE = (() => {
  // Use explicit env var if set
  if (process.env.STATE_FILE) return process.env.STATE_FILE;
  // Use /data if the directory exists (Railway volume mounted)
  try {
    fs.accessSync("/data", fs.constants.W_OK);
    return "/data/buy_tracker_state.json";
  } catch {
    // Fallback to local directory
    return "buy_tracker_state.json";
  }
})();

// 2 weeks at 1 block per 2 seconds = 604800 blocks
const TWO_WEEKS_BLOCKS = 604_800;
const END_BLOCK = process.env.COMPETITION_END_BLOCK && parseInt(process.env.COMPETITION_END_BLOCK) > 0
  ? parseInt(process.env.COMPETITION_END_BLOCK)
  : START_BLOCK + TWO_WEEKS_BLOCKS;

// ─── Showdown (king-of-the-hill countdown) config ─────────────
// A separate, time-driven contest that begins when the cumulative window
// closes: a 60s countdown that resets to 60s every time a new buy takes the
// lead. Each new lead must beat the current one by SHOWDOWN_MIN_PCT% OR
// SHOWDOWN_MIN_ABS_USD (whichever is easier to clear). The last wallet leading
// when the clock hits 0 wins. Entirely driven by on-chain block timestamps so
// the outcome is deterministic and verifiable from chain data alone.
//
// SHOWDOWN_START accepts:
//   - "auto" / "end"  → anchor to the moment the cumulative window closes
//                       (END_BLOCK). The two contests run seamlessly back-to-back;
//                       the exact opening time is END_BLOCK's on-chain timestamp,
//                       resolved once that block is mined. No EST/EDT guesswork.
//   - a unix-seconds integer, or any Date-parseable string
//                       (e.g. "2026-06-15T20:40:47Z").
//   - empty            → disabled.
const SHOWDOWN_START_RAW = (process.env.SHOWDOWN_START || "").trim();
const SHOWDOWN_AUTO = /^(auto|end|endblock|end-block)$/i.test(SHOWDOWN_START_RAW);
// Resolved opening timestamp (unix seconds). 0 = not yet known. Mutable: auto
// mode fills it in from END_BLOCK's timestamp; explicit values set it at boot.
let showdownStartTs = (() => {
  if (!SHOWDOWN_START_RAW || SHOWDOWN_AUTO) return 0;
  if (/^\d+$/.test(SHOWDOWN_START_RAW)) return parseInt(SHOWDOWN_START_RAW);
  const ms = Date.parse(SHOWDOWN_START_RAW);
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
})();
// Estimated opening time for display only, while auto mode waits for END_BLOCK.
let showdownStartEstimate = 0;
const SHOWDOWN_ENABLED   = SHOWDOWN_AUTO || showdownStartTs > 0;
// True once the opening timestamp is known (always, for explicit starts; for
// auto mode, only after END_BLOCK has been reached and its timestamp read).
const showdownStartResolved = () => showdownStartTs > 0;
const SHOWDOWN_RESET     = parseInt(process.env.SHOWDOWN_RESET_SECONDS || "60");
const SHOWDOWN_MIN_PCT   = parseFloat(process.env.SHOWDOWN_MIN_PCT || "5");     // percent
const SHOWDOWN_MIN_ABS   = parseFloat(process.env.SHOWDOWN_MIN_ABS_USD || "200"); // dollars
const SHOWDOWN_MIN_FIRST = parseFloat(process.env.SHOWDOWN_MIN_FIRST_USD || "0"); // dollars floor for first bid
const SHOWDOWN_PRIZES    = [5000, 1000, 500]; // USD value, paid in $FIRE
const SHOWDOWN_HOLD_WEEKS = parseInt(process.env.SHOWDOWN_HOLD_WEEKS || "4");
// Pre-computed BigInt thresholds in micro-USD (6 decimals) to match totalUsdSpent units.
const SHOWDOWN_PCT_BPS   = BigInt(Math.round(SHOWDOWN_MIN_PCT * 100));          // 5% → 500 bps
const SHOWDOWN_ABS_MICRO = BigInt(Math.round(SHOWDOWN_MIN_ABS * 1e6));
const SHOWDOWN_FIRST_MICRO = BigInt(Math.round(SHOWDOWN_MIN_FIRST * 1e6));

// ERC-4337 EntryPoints on Base
const ENTRY_POINTS = new Set([
  "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789",
  "0x0000000071727de22e5e9d8baf0edac6f37da032",
  "0x4337084d9e255ff0702461cf8895ce9e3b5ff108",
  "0xb92fe925dc43a0ecde6c8b1a2709c170ec4fff4f",
]);

const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";

const TOKEN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const ENTRY_POINT_ABI = [
  "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
];

// Uniswap V2 Swap event on FIRE/WETH pair. Token addresses sort as WETH<FIRE,
// so token0=WETH, token1=FIRE. A buy of FIRE pays WETH in (amount0In>0) and
// receives FIRE out (amount1Out>0).
const PAIR_ABI = [
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)",
];
// Uniswap v4 PoolManager:
// Swap(PoolId indexed id, address indexed sender, int128 amount0, int128 amount1,
//      uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)
const SWAP_TOPIC = ethers.id("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)");
const V4_SWAP_TYPES = ["int128", "int128", "uint160", "uint128", "int24", "uint24"];
const PAIR_IFACE = new ethers.Interface(PAIR_ABI);

// Chainlink ETH/USD aggregator on Base (8 decimals)
const CHAINLINK_ETH_USD = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";
const CHAINLINK_ABI = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
];

// ─── State ────────────────────────────────────────────────────

// participants: address -> { address, totalBought, buyCount, firstBuyBlock, lastBuyBlock, lastBuyTx, disqualified, disqualifiedBlock, disqualifiedTx }
let participants = new Map();
let lastBlock    = START_BLOCK;

// De-dup set: "txHash-logIndex" — prevents WS + HTTP-poller paths from double-counting the same event.
// Bounded by pruning entries from blocks > DEDUP_KEEP_BLOCKS old.
let processedEvents = new Set();
const DEDUP_KEEP_BLOCKS = 200;
const eventKey = (txHash, logIndex) => `${txHash.toLowerCase()}-${logIndex}`;

// USD attribution dedup: "buyer-txHash". A single tx may emit multiple Transfer
// events to the same buyer (split routing); USD should be attributed once per tx.
let usdAttributed = new Set();

// Per-block ETH/USD cache (rounded to ETH_PRICE_GRAIN blocks)
const ethPriceCache = new Map();
const ETH_PRICE_GRAIN = 30; // ~1 min on Base — Chainlink updates ~daily, so plenty

// Live-mode bookkeeping
let liveMode      = "none";   // "ws" | "http" | "none"
let httpPollTimer = null;

// ─── Showdown state ───────────────────────────────────────────
// Ordered list of lead events. Each: { wallet, usd (BigInt micro), fire (wei
// string), block, tx, ts (unix seconds, block timestamp) }. Append-only — the
// last element is the current leader; the takeover history drives the podium.
let showdownLeads   = [];
// One bid per tx: a single tx can emit several FIRE Transfer logs (split
// routing), but it is a single on-chain buy and must be evaluated once.
let showdownSeenTx  = new Set();
// Cache block number → unix timestamp so we don't refetch the same block.
const blockTsCache  = new Map();

// ─── Helpers ──────────────────────────────────────────────────

const ts    = () => new Date().toISOString().replace("T", " ").split(".")[0];
const log   = (...args) => console.log(`[${ts()}]`, ...args);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return;
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    lastBlock    = s.lastBlock || START_BLOCK;
    participants = new Map(Object.entries(s.participants || {}));
    // Restore BigInt values
    for (const [addr, p] of participants) {
      p.totalBought    = BigInt(p.totalBought    || "0");
      p.totalUsdSpent  = BigInt(p.totalUsdSpent  || "0");
    }
    processedEvents = new Set(s.processedEvents || []);
    usdAttributed   = new Set(s.usdAttributed   || []);
    showdownLeads   = (s.showdownLeads || []).map(l => ({ ...l, usd: BigInt(l.usd || "0") }));
    showdownSeenTx  = new Set(s.showdownSeenTx || []);
    // Restore the resolved auto-start so a redeploy doesn't reopen the window.
    if (SHOWDOWN_AUTO && s.showdownStartTs) showdownStartTs = s.showdownStartTs;
    const active = [...participants.values()].filter(p => !p.disqualified).length;
    log(`Loaded state: ${participants.size} tracked (${active} active), ${processedEvents.size} de-duped events, last block ${lastBlock.toLocaleString()}`);
  } catch { log("No valid state file — starting fresh"); }
}

function saveState() {
  const obj = {};
  for (const [addr, p] of participants) {
    obj[addr] = {
      ...p,
      totalBought:   p.totalBought.toString(),
      totalUsdSpent: (p.totalUsdSpent || 0n).toString(),
    };
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    lastBlock,
    participants:    obj,
    processedEvents: Array.from(processedEvents),
    usdAttributed:   Array.from(usdAttributed),
    showdownLeads:   showdownLeads.map(l => ({ ...l, usd: l.usd.toString() })),
    showdownSeenTx:  Array.from(showdownSeenTx),
    showdownStartTs: showdownStartTs,
    savedAt:         new Date().toISOString(),
  }, null, 2));
}

// One-time reattributions: gasless/relayed buys credited to the relayer EOA
// (tx.from) before traceTransferChain existed. Verified on-chain — the FIRE
// was delivered to the real wallet (pair → settler/router → wallet); the
// credited address was only the relayer that paid gas. Idempotent: each entry
// is applied once (source entry is deleted), guarded by exact tx-hash match.
const REATTRIBUTIONS = [
  {
    // Buy #1: block 46,780,332 — 3.40M FIRE via relayed swap
    fromAddr: "0x64ddc0430eec16dbf928e985177b5a93f4cb3d27",
    toAddr:   "0xf226fb663fe28f76fe38e6672b38afb740b1cc14",
    txHash:   "0xadf8946d22cc5f5047393efdeefda4aceb4ed87fa9e0ccbd42c76c6436aa3799",
  },
  {
    // Buy #2: block 46,878,945 — 1.95M FIRE via 0x Settler gasless swap
    fromAddr: "0xff9494895962373266f763d37c07e5fb1eb7e1fb",
    toAddr:   "0xf226fb663fe28f76fe38e6672b38afb740b1cc14",
    txHash:   "0x583c31e26dc19b0dd32631f2ae9dac315def37d4b3efcb87f66fe078abb2a3e9",
  },
];

function applyReattributions() {
  let applied = 0;
  for (const r of REATTRIBUTIONS) {
    const src = participants.get(r.fromAddr);
    if (!src) continue; // already applied (or never tracked)
    if ((src.lastBuyTx || "").toLowerCase() !== r.txHash.toLowerCase()) {
      log(`Reattribution skipped: ${r.fromAddr.slice(0, 10)}... lastBuyTx mismatch`);
      continue;
    }

    participants.delete(r.fromAddr);
    usdAttributed.delete(`${r.fromAddr}-${r.txHash.toLowerCase()}`);
    usdAttributed.add(`${r.toAddr}-${r.txHash.toLowerCase()}`);

    const dst = participants.get(r.toAddr);
    if (dst) {
      dst.totalBought   += src.totalBought;
      dst.totalUsdSpent  = (dst.totalUsdSpent || 0n) + (src.totalUsdSpent || 0n);
      dst.buyCount      += src.buyCount;
      dst.firstBuyBlock  = Math.min(dst.firstBuyBlock, src.firstBuyBlock);
      if (src.lastBuyBlock >= dst.lastBuyBlock) {
        dst.lastBuyBlock = src.lastBuyBlock;
        dst.lastBuyTx    = src.lastBuyTx;
      }
    } else {
      participants.set(r.toAddr, { ...src, address: r.toAddr });
    }
    applied++;
    log(`Reattributed: ${r.fromAddr.slice(0, 10)}... → ${r.toAddr.slice(0, 10)}... (+${ethers.formatEther(src.totalBought)} FIRE / +$${(Number(src.totalUsdSpent || 0n) / 1e6).toFixed(2)})`);
  }
  if (applied > 0) saveState();
}

function pruneProcessedEvents() {
  // Soft cap so the Set doesn't grow unbounded. Old entries can be dropped
  // safely because lastBlock advances past their block.
  if (processedEvents.size > 5000) {
    const arr = Array.from(processedEvents);
    processedEvents = new Set(arr.slice(-2500));
  }
}

function recordBuy(address, amount, usdSpentMicro, blockNumber, txHash) {
  const addr = address.toLowerCase();

  // Skip excluded addresses
  if (addr === PAIR_ADDRESS.toLowerCase()) return;
  if (addr === TOKEN_ADDRESS.toLowerCase()) return;
  if (addr === DEAD_ADDRESS) return;
  if (addr === ethers.ZeroAddress) return;

  // Only attribute USD once per (buyer, txHash) — split routing can emit
  // multiple Transfer events to the same buyer for one tx, but the Swap
  // event sum we compute is already the tx total.
  const usdKey = `${addr}-${txHash.toLowerCase()}`;
  const usdToAdd = usdAttributed.has(usdKey) ? 0n : (usdSpentMicro || 0n);
  if (usdToAdd > 0n) usdAttributed.add(usdKey);

  const existing = participants.get(addr);

  if (existing) {
    if (existing.disqualified) {
      log(`  Skipping buy for disqualified: ${addr.slice(0,10)}...`);
      return;
    }
    existing.totalBought    += amount;
    existing.totalUsdSpent   = (existing.totalUsdSpent || 0n) + usdToAdd;
    existing.buyCount++;
    existing.lastBuyBlock = blockNumber;
    existing.lastBuyTx    = txHash;
    log(`  Buy: ${addr.slice(0,10)}... +${ethers.formatEther(amount)} FIRE / +$${(Number(usdToAdd) / 1e6).toFixed(2)} → total $${(Number(existing.totalUsdSpent) / 1e6).toFixed(2)}`);
  } else {
    participants.set(addr, {
      address:           addr,
      totalBought:       amount,
      totalUsdSpent:     usdToAdd,
      buyCount:          1,
      firstBuyBlock:     blockNumber,
      lastBuyBlock:      blockNumber,
      lastBuyTx:         txHash,
      disqualified:      false,
      disqualifiedBlock: null,
      disqualifiedTx:    null,
    });
    log(`  New buyer: ${addr.slice(0,10)}... ${ethers.formatEther(amount)} FIRE / $${(Number(usdToAdd) / 1e6).toFixed(2)}`);
  }
}

function recordSell(address, blockNumber, txHash) {
  const addr = address.toLowerCase();

  // Skip excluded addresses
  if (addr === PAIR_ADDRESS.toLowerCase()) return;
  if (addr === TOKEN_ADDRESS.toLowerCase()) return;
  if (addr === DEAD_ADDRESS) return;
  if (addr === ethers.ZeroAddress) return;

  const existing = participants.get(addr);
  if (!existing) return; // never bought — not in competition
  if (existing.disqualified) return; // already disqualified

  existing.disqualified      = true;
  existing.disqualifiedBlock = blockNumber;
  existing.disqualifiedTx    = txHash;

  log(`  ❌ DISQUALIFIED: ${addr.slice(0,10)}... sold at block ${blockNumber}`);
}

function getLeaderboard() {
  return [...participants.values()]
    .filter(p => !p.disqualified)
    .sort((a, b) => {
      const au = a.totalUsdSpent || 0n;
      const bu = b.totalUsdSpent || 0n;
      return bu > au ? 1 : bu < au ? -1 : 0;
    })
    .slice(0, TOP_N)
    .map((e, i) => ({
      rank:          i + 1,
      address:       e.address,
      totalUsdSpent: Number(e.totalUsdSpent || 0n) / 1e6,
      totalBought:   ethers.formatEther(e.totalBought),
      buyCount:      e.buyCount,
      firstBuyBlock: e.firstBuyBlock,
      lastBuyBlock:  e.lastBuyBlock,
      lastBuyTx:     e.lastBuyTx,
    }));
}

// ─── Showdown (king-of-the-hill countdown) ────────────────────

async function getBlockTimestamp(provider, blockNumber) {
  if (blockTsCache.has(blockNumber)) return blockTsCache.get(blockNumber);
  try {
    const blk = await provider.getBlock(blockNumber);
    if (!blk) return null;
    blockTsCache.set(blockNumber, blk.timestamp);
    if (blockTsCache.size > 5000) {
      const firstKey = blockTsCache.keys().next().value;
      blockTsCache.delete(firstKey);
    }
    return blk.timestamp;
  } catch (e) {
    log(`getBlock timestamp failed at ${blockNumber}: ${e.message}`);
    return null;
  }
}

// The minimum micro-USD a new buy must reach to steal the lead from `lastUsd`:
// beat by SHOWDOWN_MIN_PCT% OR SHOWDOWN_MIN_ABS_USD, whichever is easier.
function showdownThreshold(lastUsd) {
  const needPct = (lastUsd * (10000n + SHOWDOWN_PCT_BPS)) / 10000n;
  const needAbs = lastUsd + SHOWDOWN_ABS_MICRO;
  return needPct < needAbs ? needPct : needAbs;
}

// Has the countdown already hit zero? The clock is anchored to the current
// leader's block timestamp (or the contest start before anyone leads).
function showdownEnded() {
  if (!SHOWDOWN_ENABLED) return false;
  if (!showdownStartResolved()) return false; // auto mode: window hasn't opened yet
  const now    = Math.floor(Date.now() / 1000);
  const last   = showdownLeads[showdownLeads.length - 1];
  const anchor = last ? last.ts : showdownStartTs;
  return now > anchor + SHOWDOWN_RESET;
}

// Auto mode: once END_BLOCK is mined, lock the opening timestamp to its real
// on-chain time so the Showdown begins exactly when the cumulative window
// closes. Until then, keep a rough estimate for the "starts in" display.
async function resolveShowdownAutoStart(provider) {
  if (!SHOWDOWN_AUTO || showdownStartResolved()) return;
  try {
    const head = await provider.getBlockNumber();
    if (head >= END_BLOCK) {
      const ts = await getBlockTimestamp(provider, END_BLOCK);
      if (ts) {
        showdownStartTs = ts;
        log(`Showdown auto-start resolved: END_BLOCK ${END_BLOCK.toLocaleString()} @ ${new Date(ts * 1000).toISOString()}`);
        saveState();
      }
    } else {
      // Base holds ~2s/block; good enough for a countdown to the bell.
      showdownStartEstimate = Math.floor(Date.now() / 1000) + (END_BLOCK - head) * 2;
    }
  } catch (e) {
    log(`resolveShowdownAutoStart error: ${e.message}`);
  }
}

// Highest block we should scan/poll to. While the Showdown is live we must keep
// reading past the cumulative END_BLOCK; otherwise we clamp at the window close.
function scanCeiling(currentBlock) {
  if (SHOWDOWN_ENABLED && !showdownEnded()) return currentBlock;
  if (END_BLOCK > 0) return Math.min(currentBlock, END_BLOCK);
  return currentBlock;
}

// Evaluate an on-chain buy as a potential new lead. `usdMicro` is the total
// micro-USD spent in the tx; `ts` is the block timestamp (authoritative clock).
function recordShowdownBid(wallet, usdMicro, fireWei, blockNumber, txHash, ts) {
  if (!SHOWDOWN_ENABLED) return;
  if (!showdownStartResolved()) return;            // auto mode: window not open yet
  if (ts < showdownStartTs) return;                // before the contest opens
  if (!usdMicro || usdMicro <= 0n) return;

  const txKey = txHash.toLowerCase();
  if (showdownSeenTx.has(txKey)) return;           // one bid per tx
  showdownSeenTx.add(txKey);                       // mark seen regardless of outcome

  const last = showdownLeads[showdownLeads.length - 1];

  if (!last) {
    // First throne. Must arrive within the opening countdown, and clear the floor.
    if (ts > showdownStartTs + SHOWDOWN_RESET) return; // opening window expired, no winner
    if (usdMicro < SHOWDOWN_FIRST_MICRO) return;
    showdownLeads.push({ wallet, usd: usdMicro, fire: fireWei.toString(), block: blockNumber, tx: txHash, ts });
    log(`  🔥 SHOWDOWN lead #1: ${wallet.slice(0, 10)}... $${(Number(usdMicro) / 1e6).toFixed(2)} — clock → ${SHOWDOWN_RESET}s`);
    saveState();
    return;
  }

  if (ts > last.ts + SHOWDOWN_RESET) return;       // clock already hit 0 — locked
  if (usdMicro < showdownThreshold(last.usd)) return; // didn't beat by 5% or $200

  showdownLeads.push({ wallet, usd: usdMicro, fire: fireWei.toString(), block: blockNumber, tx: txHash, ts });
  log(`  🔥 SHOWDOWN new lead: ${wallet.slice(0, 10)}... $${(Number(usdMicro) / 1e6).toFixed(2)} (prev $${(Number(last.usd) / 1e6).toFixed(2)}) — clock reset → ${SHOWDOWN_RESET}s`);
  saveState();
}

function serializeLead(l) {
  return {
    wallet:   l.wallet,
    usdSpent: Number(l.usd) / 1e6,
    fire:     ethers.formatEther(BigInt(l.fire || "0")),
    block:    l.block,
    tx:       l.tx,
    ts:       l.ts,
  };
}

function getShowdownState() {
  const now      = Math.floor(Date.now() / 1000);
  const leads    = showdownLeads;
  const current  = leads.length ? leads[leads.length - 1] : null;
  const resolved = showdownStartResolved();
  const start    = showdownStartTs; // 0 while an auto start is still pending
  const anchor   = current ? current.ts : start;
  const countdownEndsAt = resolved ? anchor + SHOWDOWN_RESET : null;
  // Best-known opening time: exact once resolved, else the auto estimate.
  const startsAt = resolved ? start : (SHOWDOWN_AUTO ? (showdownStartEstimate || null) : null);

  let phase = "disabled";
  if (SHOWDOWN_ENABLED) {
    if (!resolved || now < start)       phase = "scheduled";
    else if (!current)                  phase = now <= countdownEndsAt ? "awaiting" : "void";
    else                                phase = now <= countdownEndsAt ? "live" : "ended";
  }
  const ended  = phase === "ended" || phase === "void";
  const winner = phase === "ended" && current ? current.wallet : null;

  // Podium = last distinct wallets to hold the lead, most-recent first
  // (most-recent throne-holder = winner). Reflects "last leader wins".
  const seen = new Set();
  const podium = [];
  for (let i = leads.length - 1; i >= 0 && podium.length < 3; i--) {
    if (seen.has(leads[i].wallet)) continue;
    seen.add(leads[i].wallet);
    podium.push({ rank: podium.length + 1, ...serializeLead(leads[i]) });
  }

  return {
    success:          true,
    enabled:          SHOWDOWN_ENABLED,
    phase,
    auto:             SHOWDOWN_AUTO,
    startResolved:    resolved,
    startsAt:         startsAt,
    serverTime:       now,
    resetSeconds:     SHOWDOWN_RESET,
    minPct:           SHOWDOWN_MIN_PCT,
    minAbsUsd:        SHOWDOWN_MIN_ABS,
    countdownEndsAt,
    ended,
    winner,
    currentLeader:    current ? serializeLead(current) : null,
    nextThresholdUsd: current ? Number(showdownThreshold(current.usd)) / 1e6 : null,
    podium,
    totalBids:        leads.length,
    leadHistory:      leads.slice(-30).map(serializeLead).reverse(),
    prizes:           SHOWDOWN_PRIZES,
    holdWeeks:        SHOWDOWN_HOLD_WEEKS,
    updatedAt:        new Date().toISOString(),
  };
}

// ─── ETH/USD + Swap-event helpers ─────────────────────────────

async function getEthUsdAtBlock(provider, blockNumber) {
  const cacheKey = Math.floor(blockNumber / ETH_PRICE_GRAIN) * ETH_PRICE_GRAIN;
  if (ethPriceCache.has(cacheKey)) return ethPriceCache.get(cacheKey);
  try {
    const chainlink = new ethers.Contract(CHAINLINK_ETH_USD, CHAINLINK_ABI, provider);
    const result = await chainlink.latestRoundData({ blockTag: cacheKey });
    const price  = result.answer; // BigInt, 8 decimals
    if (price <= 0n) return null;
    ethPriceCache.set(cacheKey, price);
    if (ethPriceCache.size > 2000) {
      const firstKey = ethPriceCache.keys().next().value;
      ethPriceCache.delete(firstKey);
    }
    return price;
  } catch (e) {
    log(`Chainlink ETH/USD read failed at block ${blockNumber}: ${e.message}`);
    return null;
  }
}

// Returns BigInt micro-USD (6 decimals) spent across all Swap events on the
// FIRE/WETH pair in this tx, or null if it can't be computed.
async function computeUsdSpentForTx(provider, receipt, blockNumber) {
  if (!receipt) return null;
  const pairLower = PAIR_ADDRESS.toLowerCase();
  let wethIn = 0n;
  for (const lg of receipt.logs) {
    if (lg.address.toLowerCase() !== pairLower) continue;
    if (lg.topics[0] !== SWAP_TOPIC)            continue;
    if ((lg.topics[1] || "").toLowerCase() !== FIRE_POOL_ID) continue;  // our pool only
    try {
      const [amount0] = ethers.AbiCoder.defaultAbiCoder().decode(V4_SWAP_TYPES, lg.data);
      // currency0 = native ETH; positive amount0 = ETH into the pool = a buy
      if (amount0 > 0n) wethIn += amount0;
    } catch {}
  }
  if (wethIn === 0n) return 0n;
  const ethUsd = await getEthUsdAtBlock(provider, blockNumber);
  if (!ethUsd) return null;
  // WETH (18 dec) × price (8 dec) / 10^20 = microUSD (6 dec)
  return (wethIn * ethUsd) / 10n ** 20n;
}

// ─── ERC-4337 sender extraction ───────────────────────────────

function extractUserOpSenders(receipt) {
  const senders = [];
  const iface   = new ethers.Interface(ENTRY_POINT_ABI);
  for (const log_ of receipt.logs) {
    if (!ENTRY_POINTS.has(log_.address.toLowerCase())) continue;
    try {
      const parsed = iface.parseLog(log_);
      if (parsed?.name === "UserOperationEvent" && parsed.args.success) {
        senders.push(parsed.args.sender.toLowerCase());
      }
    } catch {}
  }
  return senders;
}

// ─── Transaction processing ───────────────────────────────────

// Follows the FIRE Transfer chain inside one receipt to find where the tokens
// actually end up (direction "down", for buys) or where they came from
// (direction "up", for sells). Needed for gasless/relayed swaps (0x Settler,
// Matcha, Coinbase Wallet): tokens hop pair → settler → user while tx.from is
// a relayer EOA that has nothing to do with the user.
function traceTransferChain(receipt, startAddr, direction) {
  const fireLower = TOKEN_ADDRESS.toLowerCase();
  const iface     = new ethers.Interface(TOKEN_ABI);
  const transfers = [];
  for (const lg of receipt.logs) {
    if (lg.address.toLowerCase() !== fireLower) continue;
    try {
      const p = iface.parseLog(lg);
      if (p?.name === "Transfer") {
        transfers.push({
          from:  p.args.from.toLowerCase(),
          to:    p.args.to.toLowerCase(),
          value: p.args.value,
        });
      }
    } catch {}
  }

  let cur = startAddr.toLowerCase();
  for (let hop = 0; hop < 5; hop++) {
    const next = transfers
      // skip tax/reflection payouts emitted by the token contract itself
      .filter(t => t.from !== fireLower)
      .filter(t => (direction === "up" ? t.to === cur : t.from === cur))
      .sort((a, b) => (b.value > a.value ? 1 : b.value < a.value ? -1 : 0))[0];
    if (!next) break;
    cur = direction === "up" ? next.from : next.to;
  }
  return cur;
}

async function resolveRealAddressFromReceipt(fromOrTo, receipt, provider, direction = "down") {
  // Returns the real user address using a pre-fetched receipt.
  if (!receipt) return null;

  // Check ERC-4337 first
  const userOpSenders = extractUserOpSenders(receipt);
  if (userOpSenders.length > 0) return userOpSenders[0];

  // Check if address is a contract (router)
  const code = await provider.getCode(fromOrTo).catch(() => "0x");
  if (code !== "0x") {
    // Router/settler — trace the token transfer chain in this receipt to the
    // final EOA. Handles gasless swaps where tx.from is just a relayer.
    const traced = traceTransferChain(receipt, fromOrTo, direction);
    if (traced && traced !== fromOrTo.toLowerCase()) {
      const tracedCode = await provider.getCode(traced).catch(() => "0xunknown");
      if (tracedCode === "0x") return traced; // EOA — the real user
    }
    // Fallback — real user is tx.from
    try {
      const tx = await provider.getTransaction(receipt.hash || receipt.transactionHash);
      return tx.from.toLowerCase();
    } catch { return null; }
  }

  // EOA — address is the real user
  return fromOrTo.toLowerCase();
}

async function resolveRealAddress(fromOrTo, txHash, provider, direction = "down") {
  // Legacy single-call wrapper — fetches receipt then defers.
  let receipt;
  try { receipt = await provider.getTransactionReceipt(txHash); } catch { return null; }
  return resolveRealAddressFromReceipt(fromOrTo, receipt, provider, direction);
}

// ─── Historical scan ──────────────────────────────────────────

async function scanHistorical(provider, token, currentBlock) {
  const scanTo = scanCeiling(currentBlock);
  if (lastBlock >= scanTo) return;

  const CHUNK      = 2000;
  const pairLower  = PAIR_ADDRESS.toLowerCase();

  log(`Scanning blocks ${lastBlock.toLocaleString()} → ${scanTo.toLocaleString()}...`);

  for (let fromBlock = lastBlock; fromBlock <= scanTo; fromBlock += CHUNK) {
    const toBlock = Math.min(fromBlock + CHUNK - 1, scanTo);

    try {
      // Scan both buy events (pair → buyer) and sell events (seller → pair)
      const [buyEvents, sellEvents] = await Promise.all([
        token.queryFilter(token.filters.Transfer(PAIR_ADDRESS, null), fromBlock, toBlock),
        token.queryFilter(token.filters.Transfer(null, PAIR_ADDRESS), fromBlock, toBlock),
      ]);

      // Process sells first — disqualify before adding any buys in same block
      for (const evt of sellEvents) {
        await handleSellEvent(evt.blockNumber, evt.transactionHash, evt.index, evt.args.from, provider);
        await sleep(30);
      }

      // Process buys
      for (const evt of buyEvents) {
        await handleBuyEvent(evt.blockNumber, evt.transactionHash, evt.index, evt.args.to, evt.args.value, provider);
        await sleep(30);
      }

    } catch (err) {
      log(`Scan error at ${fromBlock}-${toBlock}: ${err.message}`);
      await sleep(500);
    }

    lastBlock = toBlock;
    await sleep(100);
  }

  saveState();
  const active = [...participants.values()].filter(p => !p.disqualified).length;
  log(`Scan complete. ${active} active buyers, ${participants.size - active} disqualified.`);
}

// ─── Live listener: WSS with HTTP polling fallback ────────────

async function handleBuyEvent(eventBlock, txHash, logIndex, to, value, lookupProvider) {
  // A buy counts toward the cumulative competition only inside its window, but
  // may still count toward the Showdown (which runs after the window closes).
  const inCumulative   = END_BLOCK <= 0 || eventBlock <= END_BLOCK;
  const showdownActive = SHOWDOWN_ENABLED && !showdownEnded();
  if (!inCumulative && !showdownActive) return false;

  const key = eventKey(txHash, logIndex);
  if (processedEvents.has(key)) return false;

  const buyer = to.toLowerCase();
  if (buyer === PAIR_ADDRESS.toLowerCase())  return false;
  if (buyer === TOKEN_ADDRESS.toLowerCase()) return false;
  if (buyer === DEAD_ADDRESS)                return false;
  if (buyer === ethers.ZeroAddress)          return false;

  // Fetch the receipt once and reuse it for both buyer resolution AND USD calc.
  let receipt;
  try { receipt = await lookupProvider.getTransactionReceipt(txHash); } catch {}
  if (!receipt) return false;

  const realBuyer = await resolveRealAddressFromReceipt(buyer, receipt, lookupProvider, "down");
  if (!realBuyer) return false;

  const usdSpent = await computeUsdSpentForTx(lookupProvider, receipt, eventBlock);
  if (usdSpent === null) {
    log(`  Skipping ${realBuyer.slice(0,10)}... — couldn't price WETH→USD at block ${eventBlock}`);
    return false;
  }

  if (showdownActive && showdownStartResolved()) {
    const ts = await getBlockTimestamp(lookupProvider, eventBlock);
    if (ts !== null) recordShowdownBid(realBuyer, usdSpent, value, eventBlock, txHash, ts);
  }
  if (inCumulative) recordBuy(realBuyer, value, usdSpent, eventBlock, txHash);

  processedEvents.add(key);
  lastBlock = Math.max(lastBlock, eventBlock);
  return true;
}

async function handleSellEvent(eventBlock, txHash, logIndex, from, lookupProvider) {
  if (END_BLOCK > 0 && eventBlock > END_BLOCK) return false;
  const key = eventKey(txHash, logIndex);
  if (processedEvents.has(key)) return false;

  const seller = from.toLowerCase();
  if (seller === PAIR_ADDRESS.toLowerCase()) return false;

  const realSeller = await resolveRealAddress(seller, txHash, lookupProvider, "up");
  if (!realSeller) return false;

  recordSell(realSeller, eventBlock, txHash);
  processedEvents.add(key);
  lastBlock = Math.max(lastBlock, eventBlock);
  return true;
}

function stopHttpPolling() {
  if (httpPollTimer) { clearInterval(httpPollTimer); httpPollTimer = null; }
}

function startHttpPolling(provider, token, periodMs = 15_000) {
  if (liveMode === "http") return;
  liveMode = "http";
  log(`Live mode: HTTP polling every ${periodMs / 1000}s on ${RPC_URL}`);

  const tick = async () => {
    try {
      await resolveShowdownAutoStart(provider);
      const currentBlock = await provider.getBlockNumber();
      const scanTo       = scanCeiling(currentBlock);
      if (lastBlock >= scanTo) return;

      // Scan from lastBlock (inclusive) — de-dup catches any overlap.
      const [buyEvents, sellEvents] = await Promise.all([
        token.queryFilter(token.filters.Transfer(PAIR_ADDRESS, null), lastBlock, scanTo),
        token.queryFilter(token.filters.Transfer(null, PAIR_ADDRESS), lastBlock, scanTo),
      ]);

      let buys = 0, sells = 0;
      for (const evt of sellEvents) {
        if (await handleSellEvent(evt.blockNumber, evt.transactionHash, evt.index, evt.args.from, provider)) sells++;
        await sleep(20);
      }
      for (const evt of buyEvents) {
        if (await handleBuyEvent(evt.blockNumber, evt.transactionHash, evt.index, evt.args.to, evt.args.value, provider)) buys++;
        await sleep(20);
      }

      lastBlock = scanTo;
      pruneProcessedEvents();
      if (buys || sells) {
        log(`Poll [${lastBlock.toLocaleString()}]: +${buys} buys, +${sells} sells`);
        saveState();
      }
    } catch (e) {
      log(`Poll error: ${e.message}`);
    }
  };

  httpPollTimer = setInterval(tick, periodMs);
  tick();
}

async function startWsListener(wsProvider, wsToken, httpProvider, httpToken) {
  liveMode = "ws";
  let switched = false;
  const switchToHttp = (reason) => {
    if (switched || liveMode !== "ws") return;
    switched = true;
    log(`Switching to HTTP polling: ${reason}`);
    try { wsToken.removeAllListeners();  } catch {}
    try { wsProvider.removeAllListeners(); } catch {}
    try { wsProvider.destroy?.();          } catch {}
    liveMode = "none";
    startHttpPolling(httpProvider, httpToken);
  };

  // Lag watchdog: HTTP-poll the head every 30s and compare to lastBlock.
  // Detects both a dead socket AND the case where the socket is alive but the
  // logs subscription silently dropped (block headers keep arriving, but
  // Transfer events stop). Threshold = 30 blocks ≈ 1 min of Base time.
  const LAG_THRESHOLD = 30;
  const watchdog = setInterval(async () => {
    if (liveMode !== "ws") { clearInterval(watchdog); return; }
    try {
      const head = await httpProvider.getBlockNumber();
      // Stop only when both contests are over (cumulative window + Showdown).
      if (END_BLOCK > 0 && head > END_BLOCK && !(SHOWDOWN_ENABLED && !showdownEnded())) return;
      if (head - lastBlock > LAG_THRESHOLD) {
        clearInterval(watchdog);
        switchToHttp(`lag ${head - lastBlock} blocks (head=${head}, lastBlock=${lastBlock})`);
      }
    } catch (e) {
      log(`Watchdog error: ${e.message}`);
    }
  }, 30_000);

  // Underlying socket close/error (ethers v6 exposes _websocket on WebSocketProvider).
  const ws = wsProvider._websocket;
  if (ws) {
    ws.on("close", (code, reason) => {
      switchToHttp(`WS close code=${code} reason=${reason?.toString() || "none"}`);
    });
    ws.on("error", (e) => {
      log(`WS error: ${e?.message || e}`);
    });
  }

  // Buy events
  wsToken.on(wsToken.filters.Transfer(PAIR_ADDRESS, null), async (from, to, value, event) => {
    try {
      if (!from || !to || !value) return;
      const changed = await handleBuyEvent(event.blockNumber, event.log.transactionHash, event.log.index, to, value, httpProvider);
      if (changed) { pruneProcessedEvents(); saveState(); }
    } catch (err) { log(`Buy listener error: ${err.message}`); }
  });

  // Sell events
  wsToken.on(wsToken.filters.Transfer(null, PAIR_ADDRESS), async (from, to, value, event) => {
    try {
      if (!from || !to || !value) return;
      const changed = await handleSellEvent(event.blockNumber, event.log.transactionHash, event.log.index, from, httpProvider);
      if (changed) { pruneProcessedEvents(); saveState(); }
    } catch (err) { log(`Sell listener error: ${err.message}`); }
  });

  log("Live mode: WSS (Alchemy) with 30s newHeads heartbeat; HTTP polling on failure");
}

// ─── HTTP API ─────────────────────────────────────────────────

function startApiServer() {
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    const url = req.url.split("?")[0];

    // GET /leaderboard
    if (url === "/leaderboard") {
      const board = getLeaderboard();
      res.writeHead(200);
      res.end(JSON.stringify({
        success:     true,
        competition: { startBlock: START_BLOCK, endBlock: END_BLOCK, topN: TOP_N },
        count:       board.length,
        leaderboard: board,
        updatedAt:   new Date().toISOString(),
      }));
      return;
    }

    // GET /leaderboard/:address
    const addrMatch = url.match(/^\/leaderboard\/(0x[a-fA-F0-9]{40})$/i);
    if (addrMatch) {
      const addr  = addrMatch[1].toLowerCase();
      const entry = participants.get(addr);

      if (!entry) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, message: "Address not found in competition" }));
        return;
      }

      const board = getLeaderboard();
      const rank  = board.findIndex(e => e.address === addr) + 1;

      res.writeHead(200);
      res.end(JSON.stringify({
        success:           true,
        rank:              entry.disqualified ? null : (rank || null),
        address:           addr,
        totalUsdSpent:     Number(entry.totalUsdSpent || 0n) / 1e6,
        totalBought:       ethers.formatEther(entry.totalBought),
        buyCount:          entry.buyCount,
        firstBuyBlock:     entry.firstBuyBlock,
        lastBuyBlock:      entry.lastBuyBlock,
        lastBuyTx:         entry.lastBuyTx,
        disqualified:      entry.disqualified,
        disqualifiedBlock: entry.disqualifiedBlock,
        disqualifiedTx:    entry.disqualifiedTx,
      }));
      return;
    }

    // GET /showdown
    if (url === "/showdown") {
      res.writeHead(200);
      res.end(JSON.stringify(getShowdownState()));
      return;
    }

    // GET /stats
    if (url === "/stats") {
      const board        = getLeaderboard();
      const disqualified = [...participants.values()].filter(p => p.disqualified).length;
      const activeList   = [...participants.values()].filter(p => !p.disqualified);
      const totalBought  = activeList.reduce((s, p) => s + p.totalBought, 0n);
      const totalUsd     = activeList.reduce((s, p) => s + (p.totalUsdSpent || 0n), 0n);

      res.writeHead(200);
      res.end(JSON.stringify({
        success:           true,
        startBlock:        START_BLOCK,
        endBlock:          END_BLOCK,
        lastScanned:       lastBlock,
        activeBuyers:      board.length,
        disqualified:      disqualified,
        totalUsdSpent:     Number(totalUsd) / 1e6,
        totalFIREBought:   ethers.formatEther(totalBought),
        topBuyer:          board[0] || null,
        rankedBy:          "totalUsdSpent",
        updatedAt:         new Date().toISOString(),
      }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ success: false, message: "Not found" }));
  });

  server.listen(PORT, () => {
    log(`API running on http://localhost:${PORT}`);
    log(`  GET /leaderboard          — top ${TOP_N} cumulative buyers`);
    log(`  GET /leaderboard/:address — single address`);
    log(`  GET /showdown             — king-of-the-hill countdown state`);
    log(`  GET /stats                — competition overview`);
  });
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  if (!TOKEN_ADDRESS) { console.error("TOKEN_ADDRESS not set"); process.exit(1); }
  if (!PAIR_ADDRESS)  { console.error("PAIR_ADDRESS not set");  process.exit(1); }
  if (!START_BLOCK)   { console.error("START_BLOCK not set");   process.exit(1); }

  console.log("════════════════════════════════════════════");
  console.log("  FIRE Cumulative Buy Competition");
  console.log(`  Token       : ${TOKEN_ADDRESS}`);
  console.log(`  Pair        : ${PAIR_ADDRESS}`);
  console.log(`  Start block : ${START_BLOCK.toLocaleString()}`);
  console.log(`  End block   : ${END_BLOCK.toLocaleString()} (2 weeks)`);
  console.log(`  API port    : ${PORT}`);
  console.log(`  Rules       : cumulative buys | any sell = disqualified`);
  if (SHOWDOWN_ENABLED) {
    const startLabel = SHOWDOWN_AUTO
      ? (showdownStartResolved() ? `${new Date(showdownStartTs * 1000).toISOString()} (auto: END_BLOCK)` : `auto — opens at END_BLOCK ${END_BLOCK.toLocaleString()}`)
      : new Date(showdownStartTs * 1000).toISOString();
    console.log(`  Showdown    : starts ${startLabel}`);
    console.log(`                ${SHOWDOWN_RESET}s reset | beat by ${SHOWDOWN_MIN_PCT}% or $${SHOWDOWN_MIN_ABS} | hold ${SHOWDOWN_HOLD_WEEKS}w`);
  } else {
    console.log(`  Showdown    : disabled (set SHOWDOWN_START to enable)`);
  }
  console.log(`  State file  : ${STATE_FILE}`);
  console.log("════════════════════════════════════════════\n");

  loadState();
  applyReattributions();

  const httpProvider = new ethers.JsonRpcProvider(RPC_URL);
  const tokenHttp    = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, httpProvider);

  startApiServer();

  const currentBlock = await httpProvider.getBlockNumber();
  if (SHOWDOWN_AUTO) await resolveShowdownAutoStart(httpProvider);
  await scanHistorical(httpProvider, tokenHttp, currentBlock);

  // Auto mode: keep checking until END_BLOCK is mined and the start locks in.
  // Covers WS live mode, where the poll-tick resolver isn't running.
  if (SHOWDOWN_AUTO) {
    const resolver = setInterval(() => {
      if (showdownStartResolved()) { clearInterval(resolver); return; }
      resolveShowdownAutoStart(httpProvider);
    }, 15_000);
  }

  const showdownActive = SHOWDOWN_ENABLED && !showdownEnded();
  if (currentBlock >= END_BLOCK && !showdownActive) {
    log("Competition has ended — no live listener needed");
  } else if (WS_RPC_URL) {
    const wsProvider = new ethers.WebSocketProvider(WS_RPC_URL);
    const tokenWs    = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wsProvider);
    await startWsListener(wsProvider, tokenWs, httpProvider, tokenHttp);
  } else {
    log("No WS RPC configured — using HTTP polling");
    startHttpPolling(httpProvider, tokenHttp);
  }

  setInterval(saveState, 5 * 60 * 1000);
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
