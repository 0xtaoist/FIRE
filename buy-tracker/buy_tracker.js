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

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const PAIR_ADDRESS  = process.env.PAIR_ADDRESS;
const RPC_URL       = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const WS_RPC_URL    = process.env.BASE_WS_RPC_URL;
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

// ─── State ────────────────────────────────────────────────────

// participants: address -> { address, totalBought, buyCount, firstBuyBlock, lastBuyBlock, lastBuyTx, disqualified, disqualifiedBlock, disqualifiedTx }
let participants = new Map();
let lastBlock    = START_BLOCK;

// De-dup set: "txHash-logIndex" — prevents WS + HTTP-poller paths from double-counting the same event.
// Bounded by pruning entries from blocks > DEDUP_KEEP_BLOCKS old.
let processedEvents = new Set();
const DEDUP_KEEP_BLOCKS = 200;
const eventKey = (txHash, logIndex) => `${txHash.toLowerCase()}-${logIndex}`;

// Live-mode bookkeeping
let liveMode      = "none";   // "ws" | "http" | "none"
let httpPollTimer = null;

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
      p.totalBought = BigInt(p.totalBought || "0");
    }
    processedEvents = new Set(s.processedEvents || []);
    const active = [...participants.values()].filter(p => !p.disqualified).length;
    log(`Loaded state: ${participants.size} tracked (${active} active), ${processedEvents.size} de-duped events, last block ${lastBlock.toLocaleString()}`);
  } catch { log("No valid state file — starting fresh"); }
}

function saveState() {
  const obj = {};
  for (const [addr, p] of participants) {
    obj[addr] = { ...p, totalBought: p.totalBought.toString() };
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    lastBlock,
    participants:    obj,
    processedEvents: Array.from(processedEvents),
    savedAt:         new Date().toISOString(),
  }, null, 2));
}

function pruneProcessedEvents() {
  // Soft cap so the Set doesn't grow unbounded. Old entries can be dropped
  // safely because lastBlock advances past their block.
  if (processedEvents.size > 5000) {
    const arr = Array.from(processedEvents);
    processedEvents = new Set(arr.slice(-2500));
  }
}

function recordBuy(address, amount, blockNumber, txHash) {
  const addr = address.toLowerCase();

  // Skip excluded addresses
  if (addr === PAIR_ADDRESS.toLowerCase()) return;
  if (addr === TOKEN_ADDRESS.toLowerCase()) return;
  if (addr === DEAD_ADDRESS) return;
  if (addr === ethers.ZeroAddress) return;

  const existing = participants.get(addr);

  if (existing) {
    if (existing.disqualified) {
      log(`  Skipping buy for disqualified: ${addr.slice(0,10)}...`);
      return;
    }
    existing.totalBought += amount;
    existing.buyCount++;
    existing.lastBuyBlock = blockNumber;
    existing.lastBuyTx    = txHash;
    log(`  Buy: ${addr.slice(0,10)}... +${ethers.formatEther(amount)} FIRE → total: ${ethers.formatEther(existing.totalBought)} FIRE`);
  } else {
    participants.set(addr, {
      address:        addr,
      totalBought:    amount,
      buyCount:       1,
      firstBuyBlock:  blockNumber,
      lastBuyBlock:   blockNumber,
      lastBuyTx:      txHash,
      disqualified:   false,
      disqualifiedBlock: null,
      disqualifiedTx:    null,
    });
    log(`  New buyer: ${addr.slice(0,10)}... ${ethers.formatEther(amount)} FIRE`);
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
    .sort((a, b) => (b.totalBought > a.totalBought ? 1 : -1))
    .slice(0, TOP_N)
    .map((e, i) => ({
      rank:          i + 1,
      address:       e.address,
      totalBought:   ethers.formatEther(e.totalBought),
      buyCount:      e.buyCount,
      firstBuyBlock: e.firstBuyBlock,
      lastBuyBlock:  e.lastBuyBlock,
      lastBuyTx:     e.lastBuyTx,
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

// ─── Transaction processing ───────────────────────────────────

async function resolveRealAddress(fromOrTo, txHash, provider) {
  // Returns the real user address for a tx that may go through a router/bundler
  let receipt;
  try { receipt = await provider.getTransactionReceipt(txHash); } catch { return null; }
  if (!receipt) return null;

  // Check ERC-4337 first
  const userOpSenders = extractUserOpSenders(receipt);
  if (userOpSenders.length > 0) return userOpSenders[0];

  // Check if address is a contract (router)
  const code = await provider.getCode(fromOrTo).catch(() => "0x");
  if (code !== "0x") {
    // Router — real user is tx.from
    try {
      const tx = await provider.getTransaction(txHash);
      return tx.from.toLowerCase();
    } catch { return null; }
  }

  // EOA — address is the real user
  return fromOrTo.toLowerCase();
}

// ─── Historical scan ──────────────────────────────────────────

async function scanHistorical(provider, token, currentBlock) {
  const scanTo = Math.min(currentBlock, END_BLOCK);
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
        const seller = evt.args.from.toLowerCase();
        if (seller === pairLower) continue; // pair sending to itself on liquidity ops

        const realSeller = await resolveRealAddress(seller, evt.transactionHash, provider);
        if (realSeller) recordSell(realSeller, evt.blockNumber, evt.transactionHash);
        await sleep(30);
      }

      // Process buys
      for (const evt of buyEvents) {
        const buyer = evt.args.to.toLowerCase();
        if (buyer === pairLower) continue;
        if (buyer === TOKEN_ADDRESS.toLowerCase()) continue;
        if (buyer === DEAD_ADDRESS) continue;

        const realBuyer = await resolveRealAddress(buyer, evt.transactionHash, provider);
        if (realBuyer) recordBuy(realBuyer, evt.args.value, evt.blockNumber, evt.transactionHash);
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
  if (END_BLOCK > 0 && eventBlock > END_BLOCK) return false;
  const key = eventKey(txHash, logIndex);
  if (processedEvents.has(key)) return false;

  const buyer = to.toLowerCase();
  if (buyer === PAIR_ADDRESS.toLowerCase())  return false;
  if (buyer === TOKEN_ADDRESS.toLowerCase()) return false;
  if (buyer === DEAD_ADDRESS)                return false;
  if (buyer === ethers.ZeroAddress)          return false;

  const realBuyer = await resolveRealAddress(buyer, txHash, lookupProvider);
  if (!realBuyer) return false;

  recordBuy(realBuyer, value, eventBlock, txHash);
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

  const realSeller = await resolveRealAddress(seller, txHash, lookupProvider);
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
      const currentBlock = await provider.getBlockNumber();
      const scanTo       = END_BLOCK > 0 ? Math.min(currentBlock, END_BLOCK) : currentBlock;
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
      if (END_BLOCK > 0 && head > END_BLOCK) return; // competition over
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

    // GET /stats
    if (url === "/stats") {
      const board         = getLeaderboard();
      const disqualified  = [...participants.values()].filter(p => p.disqualified).length;
      const totalBought   = [...participants.values()]
        .filter(p => !p.disqualified)
        .reduce((s, p) => s + p.totalBought, 0n);

      res.writeHead(200);
      res.end(JSON.stringify({
        success:         true,
        startBlock:      START_BLOCK,
        endBlock:        END_BLOCK,
        lastScanned:     lastBlock,
        activeBuyers:    board.length,
        disqualified:    disqualified,
        totalFIREBought: ethers.formatEther(totalBought),
        topBuyer:        board[0] || null,
        updatedAt:       new Date().toISOString(),
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
  console.log(`  State file  : ${STATE_FILE}`);
  console.log("════════════════════════════════════════════\n");

  loadState();

  const httpProvider = new ethers.JsonRpcProvider(RPC_URL);
  const tokenHttp    = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, httpProvider);

  startApiServer();

  const currentBlock = await httpProvider.getBlockNumber();
  await scanHistorical(httpProvider, tokenHttp, currentBlock);

  if (currentBlock >= END_BLOCK) {
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
