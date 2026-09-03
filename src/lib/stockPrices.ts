/**
 * Server-side live USD prices for the basket stocks, derived from the SAME
 * v4 pools the keeper buys through (pools_cache.json — copy it from keeper/
 * alongside distributions/, or set POOLS_FILE). ETH/USD via CoinGecko.
 * In-memory cached 60s. Degrades to {} if the cache file is absent.
 */
import fs from "fs";
import path from "path";
import { rhClient } from "./rpc";
import { V4_QUOTER, V4_QUOTER_ABI } from "./uniswap";
import { parseEther, formatEther } from "viem";

type RouteHop = {
  from: `0x${string}`; to: `0x${string}`;
  fee: number; tickSpacing?: number; zeroForOne?: boolean; decimals?: number;
  protocol?: "v4" | "v3";
  pool?: `0x${string}`; // v3 hops: the pool address (price read from slot0)
};
const V3_POOL_ABI = [
  { name: "slot0", type: "function", stateMutability: "view", inputs: [],
    outputs: [{ type: "uint160" }, { type: "int24" }, { type: "uint16" }, { type: "uint16" }, { type: "uint16" }, { type: "uint8" }, { type: "bool" }] },
  { name: "token0", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;
type CachedPool = {
  currency0: `0x${string}`; currency1: `0x${string}`;
  fee: number; tickSpacing: number; hooks: `0x${string}`;
  zeroForOne: boolean; baseIsNative: boolean;
  probeRate?: number; // stock per ETH, cached at probe time — quote-failure fallback
  multiHop?: boolean;  // GLD etc. — routes ETH→…→token via `route`, not a single hop
  route?: RouteHop[];
  decimals?: number;
};

let cache: { at: number; prices: Record<string, number>; ethUsd: number } | null = null;

export async function getStockPricesUsd(): Promise<{ prices: Record<string, number>; ethUsd: number }> {
  if (cache && Date.now() - cache.at < 60_000) return cache;

  const file = process.env.POOLS_FILE || path.join(process.cwd(), "pools_cache.json");
  let pools: Record<string, CachedPool> = {};
  try { pools = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* absent → prices {} */ }

  let ethUsd = 0;
  try {
    const cg = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { next: { revalidate: 60 } }).then((r) => r.json());
    ethUsd = cg?.ethereum?.usd || 0;
  } catch { /* leave 0 */ }

  const prices: Record<string, number> = {};
  if (ethUsd > 0) {
    // ETH itself is a payable asset (dividend fallback + jackpot reserve),
    // so it needs a price entry too — not just a conversion rate.
    prices["0x0000000000000000000000000000000000000000"] = ethUsd;
    const probe = parseEther("0.01");
    for (const [tokenAddr, pool] of Object.entries(pools)) {
      // Multi-hop asset (e.g. GLD via ETH→USDG→GLD): quote each hop in sequence
      // so we get token-per-ETH through the full route. Falls back to probeRate.
      if (pool.multiHop && Array.isArray(pool.route)) {
        try {
          let amt = probe; // start with 0.01 ETH
          for (const hop of pool.route) {
            if (hop.protocol === "v3" && hop.pool) {
              // v3 hop: derive out from the pool's slot0 price (sqrtP^2 / 2^192 = token1/token0)
              const slot0 = await rhClient.readContract({
                address: hop.pool, abi: V3_POOL_ABI, functionName: "slot0",
              }) as readonly [bigint, number, number, number, number, number, boolean];
              const token0 = (await rhClient.readContract({ address: hop.pool, abi: V3_POOL_ABI, functionName: "token0" }) as string).toLowerCase();
              const sqrtP = slot0[0];
              amt = hop.from.toLowerCase() === token0
                ? (amt * sqrtP * sqrtP) / (BigInt(1) << BigInt(192))
                : (amt * (BigInt(1) << BigInt(192))) / (sqrtP * sqrtP);
            } else {
              const res = await rhClient.readContract({
                address: V4_QUOTER, abi: V4_QUOTER_ABI, functionName: "quoteExactInputSingle",
                args: [{
                  poolKey: { currency0: hop.from, currency1: hop.to, fee: hop.fee, tickSpacing: hop.tickSpacing, hooks: "0x0000000000000000000000000000000000000000" as `0x${string}` },
                  zeroForOne: hop.zeroForOne, exactAmount: amt, hookData: "0x" as `0x${string}`,
                }],
              });
              amt = (res as readonly [bigint, bigint])[0];
            }
            if (amt === BigInt(0)) throw new Error("route hop returned 0");
          }
          // amt is now GLD (18 dec) out for 0.01 ETH → token-per-ETH → USD/token
          const out = Number(formatEther(amt));
          const rate = out / Number(formatEther(probe));
          if (rate > 0) prices[tokenAddr.toLowerCase()] = ethUsd / rate;
        } catch {
          if (pool.probeRate && pool.probeRate > 0) {
            prices[tokenAddr.toLowerCase()] = ethUsd / pool.probeRate;
            console.warn(`stockPrices: multi-hop quote failed for ${tokenAddr} — using cached probeRate`);
          } else {
            console.warn(`stockPrices: multi-hop quote failed for ${tokenAddr} and no probeRate — unpriced`);
          }
        }
        continue;
      }
      try {
        const result = await rhClient.readContract({
          address: V4_QUOTER, abi: V4_QUOTER_ABI, functionName: "quoteExactInputSingle",
          args: [{
            poolKey: { currency0: pool.currency0, currency1: pool.currency1, fee: pool.fee, tickSpacing: pool.tickSpacing, hooks: pool.hooks },
            zeroForOne: pool.zeroForOne, exactAmount: probe, hookData: "0x" as `0x${string}`,
          }],
        });
        const out = Number(formatEther((result as readonly [bigint, bigint])[0]));
        const rate = out / Number(formatEther(probe));          // stock per ETH
        if (rate > 0) prices[tokenAddr.toLowerCase()] = ethUsd / rate;
      } catch {
        // Stale pool key (fee tier changed, pool recreated) → live quote
        // reverts. Fall back to the cached probeRate so the asset stays
        // priced instead of silently vanishing from USD totals.
        if (pool.probeRate && pool.probeRate > 0) {
          prices[tokenAddr.toLowerCase()] = ethUsd / pool.probeRate;
          console.warn(`stockPrices: live quote failed for ${tokenAddr} — using cached probeRate (refresh pools_cache.json)`);
        } else {
          console.warn(`stockPrices: live quote failed for ${tokenAddr} and no probeRate fallback — asset will be unpriced`);
        }
      }
    }
  }
  cache = { at: Date.now(), prices, ethUsd };
  return cache;
}
