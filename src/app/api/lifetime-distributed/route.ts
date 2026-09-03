import { formatUnits } from "viem";
import { getStockPricesUsd } from "@/lib/stockPrices";
import { loadDistributionRecords } from "@/lib/distributions";

export const dynamic = "force-dynamic";

/**
 * All-time value distributed to holders, across every distribution record.
 * The product-story number: cumulative, only grows as distributions run.
 * USD is at current prices (records store token amounts, not historical USD).
 *
 * Reads through lib/distributions so the 6-hour retry dedupe applies here too.
 * This route used to walk the directory itself, which counted a --resume rewrite
 * as a second distribution and overstated the all-time total by ~7%.
 */

let cache: { at: number; body: unknown } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) return Response.json(cache.body);

  const byAsset = new Map<string, { symbol: string; decimals: number; amount: bigint }>();
  for (const r of loadDistributionRecords()) {
    const k = r.asset.toLowerCase();
    const cur = byAsset.get(k) || { symbol: r.symbol, decimals: r.decimals ?? 18, amount: BigInt(0) };
    cur.amount += BigInt(r.totalDistributed || "0");
    byAsset.set(k, cur);
  }

  const { prices } = await getStockPricesUsd().catch(() => ({ prices: {} as Record<string, number> }));
  let totalUsd = 0;
  const assets = [...byAsset.entries()].map(([addr, a]) => {
    const amount = Number(formatUnits(a.amount, a.decimals));
    const usd = prices[addr] ? amount * prices[addr] : null;
    if (usd) totalUsd += usd;
    return { symbol: a.symbol, address: addr, amount, usd };
  }).sort((x, y) => (y.usd ?? 0) - (x.usd ?? 0));

  const body = { totalUsd, assets, updatedAt: new Date().toISOString() };
  cache = { at: Date.now(), body };
  return Response.json(body);
}
