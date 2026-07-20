import { loadDistributionRecords } from "@/lib/distributions";

export const dynamic = "force-dynamic";

/**
 * Push-distribution records (written by keeper/distribute_stocks.js).
 * GET /api/distributions                → run summaries
 * GET /api/distributions?address=0x... → that holder's amounts + lifetime per asset
 * Dedupe lives in lib/distributions — shared with the OG share card.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.toLowerCase() || null;
  const records = loadDistributionRecords();

  if (!address) {
    return Response.json({
      distributions: records.map((r) => ({
        id: r.id, date: r.date, asset: r.asset, symbol: r.symbol, decimals: r.decimals,
        totalDistributed: r.totalDistributed, jackpotCarve: r.jackpotCarve, holdersPaid: r.holdersPaid,
      })),
    });
  }

  const lifetime: Record<string, { symbol: string; decimals: number; amount: bigint }> = {};
  const mine = records.map((r) => {
    const amt = BigInt(r.holders[address] || "0");
    if (amt > BigInt(0)) {
      const k = r.asset.toLowerCase();
      if (!lifetime[k]) lifetime[k] = { symbol: r.symbol, decimals: r.decimals, amount: BigInt(0) };
      lifetime[k].amount += amt;
    }
    return { id: r.id, date: r.date, asset: r.asset, symbol: r.symbol, decimals: r.decimals, amount: amt.toString() };
  }).filter((x) => x.amount !== "0");

  return Response.json({
    distributions: mine,
    lifetime: Object.fromEntries(Object.entries(lifetime).map(([k, v]) => [k, { symbol: v.symbol, decimals: v.decimals, amount: v.amount.toString() }])),
  });
}
