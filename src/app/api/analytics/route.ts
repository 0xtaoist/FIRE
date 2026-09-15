import { loadDistributionRecords } from "@/lib/distributions";
import { getStockPricesUsd } from "@/lib/stockPrices";
import { rhClient } from "@/lib/rpc";
import { FIRE_CONTRACT, FIRE_ABI } from "@/lib/contract";
import { formatUnits } from "viem";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/* Analytics rollup for the branded /analytics page. Distribution totals come
 * from the on-chain records; holder count is read live from the token; launch
 * block/time and diamond-hands (never-sold) come from constants / a keeper file
 * since they're either fixed or too expensive to compute per request. Mirrors
 * the FIRE Dune dashboard. */

// Protocol launch — fixed facts (FIRE's first block on Robinhood Chain).
// Override via env if ever needed; these don't change.
const LAUNCH_BLOCK = Number(process.env.FIRE_LAUNCH_BLOCK || "12584263");
const LAUNCH_TIME = process.env.FIRE_LAUNCH_TIME || "2026-07-18 01:25:22 UTC";

let cache: { at: number; body: unknown } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) return Response.json(cache.body);

  const records = loadDistributionRecords();
  const { prices } = await getStockPricesUsd().catch(() => ({ prices: {} as Record<string, number> }));

  // ── per-asset lifetime totals ──
  const byAsset = new Map<string, { symbol: string; decimals: number; amount: bigint }>();
  // ── per-day distributed (USD) + drops + max holders paid ──
  const byDay = new Map<string, { usd: number; drops: number; holders: number }>();
  let totalUsd = 0;
  let totalDrops = 0;
  let maxHolders = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;

  for (const r of records) {
    const k = r.asset.toLowerCase();
    const dec = r.decimals ?? 18;
    const cur = byAsset.get(k) || { symbol: r.symbol, decimals: dec, amount: BigInt(0) };
    cur.amount += BigInt(r.totalDistributed || "0");
    byAsset.set(k, cur);

    const tokens = Number(formatUnits(BigInt(r.totalDistributed || "0"), dec));
    const px = prices[k];
    const usd = px ? tokens * px : 0;
    totalUsd += usd;
    totalDrops += 1;

    const day = (r.date || "").slice(0, 10);
    if (day) {
      const d = byDay.get(day) || { usd: 0, drops: 0, holders: 0 };
      d.usd += usd;
      d.drops += 1;
      d.holders = Math.max(d.holders, r.holdersPaid || 0);
      byDay.set(day, d);
      if (!firstDate || day < firstDate) firstDate = day;
      if (!lastDate || day > lastDate) lastDate = day;
    }
    maxHolders = Math.max(maxHolders, r.holdersPaid || 0);
  }

  const assets = [...byAsset.entries()].map(([addr, a]) => {
    const amount = Number(formatUnits(a.amount, a.decimals));
    const usd = prices[addr] ? amount * prices[addr] : null;
    return { symbol: a.symbol, address: addr, amount, usd };
  }).sort((x, y) => (y.usd ?? 0) - (x.usd ?? 0));

  // daily series sorted, plus a cumulative line
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  let running = 0;
  const daily = days.map(([day, d]) => {
    running += d.usd;
    return { day, usd: +d.usd.toFixed(2), cumulative: +running.toFixed(2), holders: d.holders };
  });

  const daysLive = firstDate ? Math.max(1, Math.round((Date.now() - new Date(firstDate + "T00:00:00Z").getTime()) / 86400000)) : 0;

  // ── current holders — live from the token (one cheap call) ──
  let currentHolders: number | null = null;
  try {
    const c = await rhClient.readContract({ address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "holderCount" });
    currentHolders = Number(c as bigint);
  } catch { /* leave null — page shows "—" */ }

  // ── diamond hands (never sold) — too expensive to compute per request, so
  //    the keeper writes it to diamond_hands.json; read it if present. ──
  let diamondHands: number | null = null;
  try {
    const f = process.env.DIAMOND_HANDS_FILE || path.join(process.cwd(), "diamond_hands.json");
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    diamondHands = Number(j.count ?? j.diamondHands ?? null) || null;
  } catch { /* optional — page hides the card if null */ }

  const body = {
    totalUsd: +totalUsd.toFixed(2),
    totalDrops,
    maxHolders,
    daysLive,
    firstDate,
    lastDate,
    assetCount: assets.length,
    assets,
    daily,
    currentHolders,
    diamondHands,
    launchBlock: LAUNCH_BLOCK,
    launchTime: LAUNCH_TIME,
    updatedAt: new Date().toISOString(),
  };
  cache = { at: Date.now(), body };
  return Response.json(body);
}
