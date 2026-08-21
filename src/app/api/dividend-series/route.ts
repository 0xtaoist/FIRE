import { formatUnits } from "viem";
import { loadDistributionRecords } from "@/lib/distributions";
import { getStockPricesUsd } from "@/lib/stockPrices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dividend-series?address=0x…
 *
 * The per-wallet payment history, which nothing else exposed — `lifetimeFor()`
 * only ever gave a lifetime total per asset, so the dashboard could show what
 * you had been paid but never when.
 *
 * Every distribution record already carries a `date` and a per-holder amount,
 * so the series is just those records walked in order. Returns:
 *   points[]  cumulative USD after each distribution this wallet was in
 *   assets[]  one entry per asset, with its own cumulative series for a sparkline
 *
 * USD is priced at CURRENT prices, not at the price on the day of each drop —
 * we don't keep historical stock marks. So this answers "what is everything I
 * was ever paid worth today", which is the question the dashboard asks. It is
 * not a P&L and must never be labelled as one.
 */

type SeriesPoint = { t: string; day: number; usd: number };

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address")?.toLowerCase();
  if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
    return Response.json({ error: "valid ?address= required" }, { status: 400 });
  }

  const { prices } = await getStockPricesUsd().catch(() => ({ prices: {} as Record<string, number> }));

  // Records this wallet actually appears in, oldest first.
  const mine = loadDistributionRecords()
    .map((r) => ({ ...r, amount: BigInt(r.holders?.[address] || "0") }))
    .filter((r) => r.amount > BigInt(0))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  if (!mine.length) {
    return Response.json({
      address, totalUsd: 0, drops: 0, firstAt: null, points: [], assets: [], pricedAssets: 0,
    });
  }

  const firstMs = Date.parse(mine[0].date);
  const dayOf = (iso: string) => Math.floor((Date.parse(iso) - firstMs) / 86_400_000) + 1;

  const usdOf = (r: { asset: string; decimals: number; amount: bigint }) => {
    const px = prices[r.asset.toLowerCase()];
    if (!px) return 0; // unpriced asset contributes 0 rather than poisoning the total
    return Number(formatUnits(r.amount, r.decimals)) * px;
  };

  // ── cumulative across everything
  let running = 0;
  const points: SeriesPoint[] = mine.map((r) => {
    running += usdOf(r);
    return { t: r.date, day: dayOf(r.date), usd: +running.toFixed(4) };
  });

  // ── one cumulative series per asset, for the sparkline rows
  const byAsset = new Map<string, { symbol: string; total: number; points: SeriesPoint[] }>();
  for (const r of mine) {
    const key = r.asset.toLowerCase();
    let e = byAsset.get(key);
    if (!e) {
      e = { symbol: r.symbol, total: 0, points: [] };
      byAsset.set(key, e);
    }
    e.total += usdOf(r);
    e.points.push({ t: r.date, day: dayOf(r.date), usd: +e.total.toFixed(4) });
  }

  const assets = [...byAsset.entries()]
    .map(([asset, e]) => ({
      asset,
      symbol: e.symbol,
      totalUsd: +e.total.toFixed(2),
      priced: prices[asset] !== undefined,
      points: e.points,
    }))
    .sort((a, b) => b.totalUsd - a.totalUsd);

  // per-drop rows for the detail module: date, asset, token amount, USD
  const history = mine.map((r) => ({
    date: r.date,
    asset: r.asset,
    symbol: r.symbol,
    amount: formatUnits(r.amount, r.decimals),
    usd: +usdOf(r).toFixed(4),
    priced: prices[r.asset.toLowerCase()] !== undefined,
  })).reverse(); // newest first

  return Response.json({
    address,
    totalUsd: +running.toFixed(2),
    drops: mine.length,
    firstAt: mine[0].date,
    points,
    assets,
    history,
    pricedAssets: assets.filter((a) => a.priced).length,
  });
}
