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

type CachedPool = {
  currency0: `0x${string}`; currency1: `0x${string}`;
  fee: number; tickSpacing: number; hooks: `0x${string}`;
  zeroForOne: boolean; baseIsNative: boolean;
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
      } catch { /* skip token */ }
    }
  }
  cache = { at: Date.now(), prices, ethUsd };
  return cache;
}
