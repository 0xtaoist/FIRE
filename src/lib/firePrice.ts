/**
 * Live $FIRE market stats straight from the Robinhood Chain v4 pool
 * (StateView slot0 + liquidity) × CoinGecko ETH/USD. 60s memory cache.
 * volume24h / priceChange24h need an indexer and return 0 until the
 * worker is ported — consumers render "—" for zeros.
 */
import { rhClient } from "./rpc";

const STATE_VIEW = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b" as const;
const FIRE_POOL_ID = "0x2276440d38b33394989f7819f63b1df5ed62e48192706c172cabef1480547efd" as const;
const TOTAL_SUPPLY = 1_000_000_000;

const SV_ABI = [
  { name: "getSlot0", type: "function", stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" }, { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" }, { name: "lpFee", type: "uint24" },
    ] },
  { name: "getLiquidity", type: "function", stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "liquidity", type: "uint128" }] },
] as const;

export type FireStats = {
  priceUsd: number; marketCap: number; liquidity: number;
  volume24h: number; priceChange24h: number; ethUsd: number;
};

let cache: { at: number; stats: FireStats } | null = null;

export async function getFireStats(): Promise<FireStats> {
  if (cache && Date.now() - cache.at < 60_000) return cache.stats;
  let stats: FireStats = { priceUsd: 0, marketCap: 0, liquidity: 0, volume24h: 0, priceChange24h: 0, ethUsd: 0 };
  try {
    const [slot0, liq, cg] = await Promise.all([
      rhClient.readContract({ address: STATE_VIEW, abi: SV_ABI, functionName: "getSlot0", args: [FIRE_POOL_ID] }),
      rhClient.readContract({ address: STATE_VIEW, abi: SV_ABI, functionName: "getLiquidity", args: [FIRE_POOL_ID] }),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
        { next: { revalidate: 60 } }).then((r) => r.json()),
    ]);
    const sqrtPf = Number((slot0 as readonly [bigint, number, number, number])[0]) / 2 ** 96;
    const firePerEth = sqrtPf * sqrtPf;
    const ethUsd = cg?.ethereum?.usd || 0;
    const priceUsd = firePerEth > 0 && ethUsd > 0 ? ethUsd / firePerEth : 0;
    // in-range reserves from L and sqrtP (single-sided full-range approximation)
    const L = Number(liq as bigint);
    const ethReserve = L / sqrtPf / 1e18;
    stats = {
      priceUsd,
      marketCap: priceUsd * TOTAL_SUPPLY,
      liquidity: ethReserve * ethUsd * 2,
      volume24h: 0, priceChange24h: 0, ethUsd,
    };
  } catch { /* zeros */ }
  cache = { at: Date.now(), stats };
  return stats;
}
