import { FIRE_CONTRACT, FIRE_ABI } from "@/lib/contract";
import { rhClient } from "@/lib/rpc";
import { loadDistributionRecords } from "@/lib/distributions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/protocol-stats
 *
 * The three headline figures the landing page quotes: how many distributions
 * have run, how many distinct assets they covered, and how many wallets the
 * token tracks. Cheap enough to serve on every page load, but cached for a
 * minute anyway — none of these move faster than that.
 */

let cache: { at: number; body: string } | null = null;
const TTL = 60_000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return new Response(cache.body, { headers: { "Content-Type": "application/json" } });
  }

  const records = loadDistributionRecords();
  const assets = new Set(records.map((r) => r.asset.toLowerCase()));

  const wallets = await rhClient
    .readContract({ address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "holderCount" })
    .then((v) => Number(v))
    .catch(() => 0);

  const body = JSON.stringify({
    distributions: records.length,
    assets: assets.size,
    wallets,
    updatedAt: new Date().toISOString(),
  });
  cache = { at: Date.now(), body };
  return new Response(body, { headers: { "Content-Type": "application/json" } });
}
