/**
 * FIRE Token — Biggest Buy Competition Tracker
 * ──────────────────────────────────────────────
 * Tracks the top-N largest single buys on FIRE token
 * starting from a specified block number.
 *
 * Detects buys through:
 *   - Direct EOA -> pair swaps
 *   - Any router/aggregator (GMGN, 1inch, etc) — uses tx.from
 *   - Aggregator allowlist (AGGREGATOR_ROUTERS env) — forces tx.from
 *   - ERC-4337 smart account buys (FOMO etc) — uses UserOperationEvent.sender
 *
 * HTTP API on PORT (default 3001):
 *   GET /leaderboard          — top-N buyers
 *   GET /leaderboard/:address — single buyer stats
 *   GET /stats                — competition stats
 *   GET /health               — liveness
 */

require("dotenv").config();
const { ethers } = require("ethers");
const http  = require("http");
const fs    = require("fs");

// ─── Config ───────────────────────────────────────────────────

const TOKEN_ADDRESS    = process.env.TOKEN_ADDRESS;
const PAIR_ADDRESS     = process.env.PAIR_ADDRESS;
const RPC_URL          = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const WS_RPC_URL       = process.env.BASE_WS_RPC_URL;
const START_BLOCK      = parseInt(process.env.START_BLOCK || "0");
const END_BLOCK        = parseInt(process.env.COMPETITION_END_BLOCK || "0");
const PORT             = parseInt(process.env.PORT || process.env.TRACKER_PORT || "3001");
const TOP_N            = parseInt(process.env.LEADERBOARD_TOP_N || "100");
const STATE_FILE       = process.env.STATE_FILE || "buy_tracker_state.json";
const SCAN_CHUNK       = parseInt(process.env.SCAN_CHUNK || "2000");

function parseAddrList(envValue, fallback = []) {
  const fromEnv = (envValue || "")
    .split(",")
    .map(a => a.trim().toLowerCase())
    .filter(a => /^0x[a-f0-9]{40}$/.test(a));
  return new Set([...fallback.map(a => a.toLowerCase()), ...fromEnv]);
}

// ERC-4337 EntryPoints on Base — extend via ERC4337_ENTRY_POINTS env
const DEFAULT_ENTRY_POINTS = [
  "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789",
  "0x0000000071727de22e5e9d8baf0edac6f37da032",
  "0x4337084d9e255ff0702461cf8895ce9e3b5ff108",
  "0xb92fe925dc43a0ecde6c8b1a2709c170ec4fff4f",
];
const ENTRY_POINTS = parseAddrList(process.env.ERC4337_ENTRY_POINTS, DEFAULT_ENTRY_POINTS);

// Known aggregators / trading bot routers — extend via AGGREGATOR_ROUTERS env (comma-separated)
// When the FIRE recipient matches one of these, we know it's a router holding briefly /
// relaying — force tx.from extraction and label the source.
//
// Populate addresses for: FOMO, GMGN, + 3rd aggregator.
// Names are best-effort labels for logging only — matching is done by address.
const DEFAULT_AGGREGATOR_LABELS = {
  // "0x...": "fomo",
  // "0x...": "gmgn",
};
const AGGREGATOR_ROUTERS = parseAddrList(
  process.env.AGGREGATOR_ROUTERS,
  Object.keys(DEFAULT_AGGREGATOR_LABELS)
);

function labelFor(addr) {
  return DEFAULT_AGGREGATOR_LABELS[addr.toLowerCase()] || "router";
}

const TOKEN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function balanceOf(address) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

const ENTRY_POINT_ABI = [
  "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
];

// ─── State ────────────────────────────────────────────────────

// buys: address -> { address, largestBuy (bigint), largestBuyTx, largestBuyBlock }
let buys        = new Map();
let lastBlock   = START_BLOCK;

// ─── Helpers ──────────────────────────────────────────────────

const ts    = () => new Date().toISOString().replace("T", " ").split(".")[0];
const log   = (...args) => console.log(`[${ts()}]`, ...args);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function serializeBuys() {
  // Map<address, {largestBuy: bigint, ...}>  →  plain object with bigints as strings
  const out = {};
  for (const [k, v] of buys) {
    out[k] = { ...v, largestBuy: v.largestBuy.toString() };
  }
  return out;
}

function deserializeBuys(obj) {
  const m = new Map();
  for (const [k, v] of Object.entries(obj || {})) {
    m.set(k, { ...v, largestBuy: BigInt(v.largestBuy) });
  }
  return m;
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return;
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    lastBlock = s.lastBlock || START_BLOCK;
    buys = deserializeBuys(s.buys);
    log(`Loaded state: ${buys.size} buyers, last block ${lastBlock.toLocaleString()}`);
  } catch (e) { log("No valid state file — starting fresh", e.message); }
}

function saveState() {
  const s = {
    lastBlock,
    buys:    serializeBuys(),
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function recordBuy(address, amount, blockNumber, txHash) {
  const addr     = address.toLowerCase();
  const existing = buys.get(addr);

  // Only update if this buy is larger than their previous best
  if (!existing || amount > existing.largestBuy) {
    buys.set(addr, {
      address:         addr,
      largestBuy:      amount,
      largestBuyTx:    txHash,
      largestBuyBlock: blockNumber,
    });
    if (existing) {
      log(`  New personal best for ${addr.slice(0, 10)}... — ${ethers.formatEther(amount)} FIRE`);
    }
  }
}

function getLeaderboard(limit = TOP_N) {
  return [...buys.values()]
    .sort((a, b) => (b.largestBuy > a.largestBuy ? 1 : -1))
    .slice(0, limit)
    .map((e, i) => ({
      rank:            i + 1,
      address:         e.address,
      largestBuy:      ethers.formatEther(e.largestBuy),
      largestBuyTx:    e.largestBuyTx,
      largestBuyBlock: e.largestBuyBlock,
    }));
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

// ─── Buy detection ────────────────────────────────────────────

async function processBuyTransfer(recipient, value, blockNumber, txHash, provider) {
  // recipient = address that received FIRE (`to` of the Transfer event)
  // We need to find the actual human buyer.

  const recipientLower = recipient.toLowerCase();

  // 1. Explicit aggregator allowlist → tx.from
  if (AGGREGATOR_ROUTERS.has(recipientLower)) {
    try {
      const tx    = await provider.getTransaction(txHash);
      const buyer = tx.from.toLowerCase();
      log(`  ${labelFor(recipientLower)} buy: ${buyer} bought ${ethers.formatEther(value)} FIRE via ${recipientLower.slice(0, 10)}...`);
      recordBuy(buyer, value, blockNumber, txHash);
    } catch (e) { log(`  Aggregator lookup failed for ${txHash}: ${e.message}`); }
    return;
  }

  // 2. Receipt — needed for ERC-4337 detection + contract check
  let receipt;
  try {
    receipt = await provider.getTransactionReceipt(txHash);
  } catch { return; }
  if (!receipt) return;

  // 3. ERC-4337 (FOMO and similar smart-wallet flows)
  const userOpSenders = extractUserOpSenders(receipt);
  if (userOpSenders.length > 0) {
    for (const sender of userOpSenders) {
      log(`  ERC-4337 buy: ${sender} bought ${ethers.formatEther(value)} FIRE`);
      recordBuy(sender, value, blockNumber, txHash);
    }
    return;
  }

  // 4. Unknown contract recipient → fall back to tx.from
  const code = await provider.getCode(recipientLower).catch(() => "0x");
  if (code !== "0x") {
    try {
      const tx    = await provider.getTransaction(txHash);
      const buyer = tx.from.toLowerCase();
      log(`  Router buy: ${buyer} bought ${ethers.formatEther(value)} FIRE (via ${recipientLower.slice(0, 10)}...)`);
      recordBuy(buyer, value, blockNumber, txHash);
    } catch {}
    return;
  }

  // 5. Direct EOA buy
  log(`  Direct buy: ${recipientLower} bought ${ethers.formatEther(value)} FIRE`);
  recordBuy(recipientLower, value, blockNumber, txHash);
}

// ─── Historical scan ──────────────────────────────────────────

async function scanHistorical(provider, token, currentBlock) {
  if (lastBlock >= currentBlock) return;

  const pairLower = PAIR_ADDRESS.toLowerCase();
  const filter    = token.filters.Transfer(PAIR_ADDRESS, null);

  log(`Scanning blocks ${lastBlock.toLocaleString()} → ${currentBlock.toLocaleString()}...`);

  for (let from = lastBlock; from <= currentBlock; from += SCAN_CHUNK) {
    const to = Math.min(from + SCAN_CHUNK - 1, currentBlock);

    if (END_BLOCK > 0 && from > END_BLOCK) break;

    try {
      const events = await token.queryFilter(filter, from, to);

      for (const evt of events) {
        if (END_BLOCK > 0 && evt.blockNumber > END_BLOCK) continue;
        const recipient = evt.args.to.toLowerCase();

        // Skip pair, token contract, zero address (LP add/burn noise)
        if (recipient === pairLower) continue;
        if (recipient === TOKEN_ADDRESS.toLowerCase()) continue;
        if (recipient === ethers.ZeroAddress) continue;

        await processBuyTransfer(
          recipient,
          evt.args.value,
          evt.blockNumber,
          evt.transactionHash,
          provider
        );

        await sleep(50);
      }
    } catch (err) {
      log(`Scan error at ${from}-${to}: ${err.message}`);
      await sleep(500);
    }

    lastBlock = to;
    await sleep(100);
  }

  saveState();
  log(`Scan complete. ${buys.size} unique buyers tracked.`);
}

// ─── Live listener ────────────────────────────────────────────

async function startLiveListener(provider, token) {
  const pairLower = PAIR_ADDRESS.toLowerCase();

  token.on(token.filters.Transfer(PAIR_ADDRESS, null), async (from, to, value, event) => {
    try {
      if (!from || !to || value === undefined) return;
      if (END_BLOCK > 0 && event.blockNumber > END_BLOCK) return;

      const recipient = to.toLowerCase();
      if (recipient === pairLower) return;
      if (recipient === TOKEN_ADDRESS.toLowerCase()) return;
      if (recipient === ethers.ZeroAddress) return;

      log(`Buy detected — block ${event.blockNumber}`);

      await processBuyTransfer(
        recipient,
        value,
        event.blockNumber,
        event.log.transactionHash,
        provider
      );

      lastBlock = event.blockNumber;
      saveState();
    } catch (err) {
      log(`Live listener error: ${err.message}`);
    }
  });

  log("Live listener active — watching for buys...");
}

// ─── HTTP API ─────────────────────────────────────────────────

function startApiServer() {
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    const [pathname, query] = req.url.split("?");
    const params = new URLSearchParams(query || "");

    if (pathname === "/health") {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, lastBlock, buyers: buys.size }));
      return;
    }

    if (pathname === "/leaderboard") {
      const limit = Math.min(parseInt(params.get("limit") || String(TOP_N)) || TOP_N, TOP_N);
      const board = getLeaderboard(limit);
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        competition: {
          startBlock: START_BLOCK,
          endBlock:   END_BLOCK || "ongoing",
          topN:       TOP_N,
        },
        count:       board.length,
        leaderboard: board,
        updatedAt:   new Date().toISOString(),
      }));
      return;
    }

    const addrMatch = pathname.match(/^\/leaderboard\/(0x[a-fA-F0-9]{40})$/i);
    if (addrMatch) {
      const addr  = addrMatch[1].toLowerCase();
      const entry = buys.get(addr);
      const board = getLeaderboard();
      const rank  = board.findIndex(e => e.address === addr) + 1;

      if (!entry) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, message: "Address not found" }));
        return;
      }

      res.writeHead(200);
      res.end(JSON.stringify({
        success:         true,
        rank:            rank || null,
        address:         addr,
        largestBuy:      ethers.formatEther(entry.largestBuy),
        largestBuyTx:    entry.largestBuyTx,
        largestBuyBlock: entry.largestBuyBlock,
      }));
      return;
    }

    if (pathname === "/stats") {
      const board = getLeaderboard();
      res.writeHead(200);
      res.end(JSON.stringify({
        success:     true,
        totalBuyers: buys.size,
        topBuyer:    board[0] || null,
        startBlock:  START_BLOCK,
        endBlock:    END_BLOCK || "ongoing",
        lastScanned: lastBlock,
        updatedAt:   new Date().toISOString(),
      }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ success: false, message: "Not found" }));
  });

  server.listen(PORT, "0.0.0.0", () => {
    log(`API server running on 0.0.0.0:${PORT}`);
    log(`  GET /leaderboard          — top ${TOP_N} buyers`);
    log(`  GET /leaderboard/:address — single buyer`);
    log(`  GET /stats                — competition stats`);
    log(`  GET /health               — liveness`);
  });
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  if (!TOKEN_ADDRESS) { console.error("TOKEN_ADDRESS not set"); process.exit(1); }
  if (!PAIR_ADDRESS)  { console.error("PAIR_ADDRESS not set");  process.exit(1); }
  if (!START_BLOCK)   { console.error("START_BLOCK not set in env"); process.exit(1); }

  console.log("════════════════════════════════════════════");
  console.log("  FIRE Biggest Buy Competition Tracker");
  console.log(`  Token       : ${TOKEN_ADDRESS}`);
  console.log(`  Pair        : ${PAIR_ADDRESS}`);
  console.log(`  Start block : ${START_BLOCK.toLocaleString()}`);
  console.log(`  End block   : ${END_BLOCK || "ongoing"}`);
  console.log(`  Top N       : ${TOP_N}`);
  console.log(`  API port    : ${PORT}`);
  console.log(`  Aggregators : ${AGGREGATOR_ROUTERS.size} address(es) on allowlist`);
  console.log(`  EntryPoints : ${ENTRY_POINTS.size} ERC-4337 entry points`);
  console.log("════════════════════════════════════════════\n");

  loadState();

  const httpProvider = new ethers.JsonRpcProvider(RPC_URL);
  const liveProvider = WS_RPC_URL
    ? new ethers.WebSocketProvider(WS_RPC_URL)
    : httpProvider;

  const tokenHttp = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, httpProvider);
  const tokenLive = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, liveProvider);

  // Start API first so FE can query while scan runs
  startApiServer();

  const currentBlock = await httpProvider.getBlockNumber();
  await scanHistorical(httpProvider, tokenHttp, currentBlock);

  if (END_BLOCK === 0 || currentBlock < END_BLOCK) {
    await startLiveListener(liveProvider, tokenLive);
  } else {
    log("Competition has ended — no live listener needed");
  }

  setInterval(saveState, 5 * 60 * 1000);
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
