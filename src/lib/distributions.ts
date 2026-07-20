/**
 * Single source of truth for reading push-distribution records — the SAME
 * dedupe everywhere (a --resume retry re-write within 6h of the original
 * counts once), so the dashboard, the API, and the share card can never
 * disagree on totals.
 */
import fs from "fs";
import path from "path";

export type DistributionRecord = {
  id: string; date: string; asset: string; symbol: string; decimals: number;
  totalDistributed: string; jackpotCarve: string; holdersPaid: number;
  holders: Record<string, string>;
};

export function loadDistributionRecords(): DistributionRecord[] {
  const dir = process.env.DIST_DIR || path.join(process.cwd(), "distributions");
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.startsWith("dist_") && f.endsWith(".json"));
  } catch {
    return [];
  }
  const records: DistributionRecord[] = [];
  for (const f of files) {
    try { records.push(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))); } catch { /* skip */ }
  }
  // dedupe: same asset within 6h = one distribution — keep the earliest
  const lastKept: Record<string, number> = {};
  return records
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .filter((r) => {
      const t = Date.parse(r.date);
      const prev = lastKept[r.asset.toLowerCase()];
      if (prev !== undefined && t - prev < 6 * 3600 * 1000) return false;
      lastKept[r.asset.toLowerCase()] = t;
      return true;
    })
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function lifetimeFor(address: string) {
  const addr = address.toLowerCase();
  const lifetime: Record<string, { symbol: string; decimals: number; amount: bigint }> = {};
  for (const r of loadDistributionRecords()) {
    const amt = BigInt(r.holders?.[addr] || "0");
    if (amt > BigInt(0)) {
      const k = r.asset.toLowerCase();
      if (!lifetime[k]) lifetime[k] = { symbol: r.symbol, decimals: r.decimals, amount: BigInt(0) };
      lifetime[k].amount += amt;
    }
  }
  return lifetime;
}
