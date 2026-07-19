import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Serves push-distribution records written by keeper/distribute_stocks.js
 * (distributions/dist_*.json). FIRE dividends are PUSHED to wallets — no
 * claims — so the dashboard renders history from these records.
 *
 * GET /api/distributions                → list (no holder maps): totals per run
 * GET /api/distributions?address=0x...  → that holder's amount in each run + lifetime per asset
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.toLowerCase() || null;

  const dir = process.env.DIST_DIR || path.join(process.cwd(), "distributions");
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.startsWith("dist_") && f.endsWith(".json"));
  } catch {
    return Response.json({ distributions: [], lifetime: {} });
  }

  type Rec = {
    id: string; date: string; asset: string; symbol: string; decimals: number;
    totalDistributed: string; jackpotCarve: string; holdersPaid: number;
    holders: Record<string, string>;
  };

  const records: Rec[] = [];
  for (const f of files) {
    try { records.push(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))); } catch { /* skip */ }
  }
  records.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

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
