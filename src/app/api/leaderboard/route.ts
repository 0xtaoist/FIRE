import { createPublicClient, http, formatUnits, getAddress } from "viem";
import { base } from "viem/chains";
import { FIRE_CONTRACT, FIRE_ABI } from "@/lib/contract";

export const dynamic = "force-dynamic";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
// Contract itself, LP pair, and other non-holder addresses to exclude
const EXCLUDED = new Set([
  FIRE_CONTRACT.toLowerCase(),
  "0x5e5eb173dcf889ed60c5294d70eca17bdcc91c2f", // LP pair
  ZERO_ADDRESS,
  DEAD_ADDRESS.toLowerCase(),
]);

const client = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

// Cache for 30 minutes
let cachedResult: { data: HolderEntry[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

type HolderEntry = {
  address: string;
  balance: number;
  balanceUsd: number;
  pendingRewards: number;
  rewardsUsd: number;
  rewardSharePct: number;
  daysHeld: number;
  isWhale: boolean;
  score: number;
};

async function getTokenPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/pairs/base/0x5e5eb173dcf889ed60c5294d70eca17bdcc91c2f",
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    return parseFloat(data.pair?.priceUsd || "0");
  } catch {
    return 0;
  }
}

type BlockscoutHolder = {
  address: { hash: string };
  value: string;
};

async function getHolderAddresses(): Promise<string[]> {
  const holders: string[] = [];
  const baseUrl =
    "https://base.blockscout.com/api/v2/tokens/0x6774D36C037ba6465f21b189eb4FfF9011e2Eb98/holders";

  let nextParams: Record<string, string> | null = null;
  let page = 0;

  while (page < 50) {
    // safety limit
    let url = baseUrl;
    if (nextParams) {
      const params = new URLSearchParams(nextParams);
      url = `${baseUrl}?${params.toString()}`;
    }

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "FIRE-Leaderboard/1.0" },
      });
      const data = await res.json();
      const items: BlockscoutHolder[] = data.items || [];

      if (items.length === 0) break;

      for (const item of items) {
        const addr = item.address.hash;
        if (!EXCLUDED.has(addr.toLowerCase())) {
          holders.push(getAddress(addr));
        }
      }

      nextParams = data.next_page_params || null;
      if (!nextParams) break;

      page++;
      // Small delay to be polite to Blockscout
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.error(`Blockscout page ${page} failed:`, e);
      break;
    }
  }

  return holders;
}

async function buildLeaderboard(): Promise<HolderEntry[]> {
  const [addresses, price] = await Promise.all([
    getHolderAddresses(),
    getTokenPrice(),
  ]);

  console.log(`Found ${addresses.length} holder addresses from Blockscout`);

  const batchSize = 30;
  const entries: HolderEntry[] = [];

  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    const calls = batch.map((addr) => ({
      address: FIRE_CONTRACT,
      abi: FIRE_ABI,
      functionName: "holderStatus" as const,
      args: [addr as `0x${string}`] as const,
    }));

    try {
      const results = await client.multicall({ contracts: calls });

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status !== "success" || !result.result) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = result.result as any;
        const balanceRaw: bigint = r.balance ?? r[0] ?? BigInt(0);
        const pendingRaw: bigint = r.pendingRewards ?? r[1] ?? BigInt(0);
        const rewardShareRaw: bigint = r.rewardSharePct ?? r[2] ?? BigInt(0);
        const secondsHeldRaw: bigint = r.secondsHeld ?? r[3] ?? BigInt(0);
        const isWhale: boolean = r.isWhale ?? r[9] ?? false;

        const balance = Number(formatUnits(balanceRaw, 18));
        if (balance <= 0) continue;

        const pending = Number(formatUnits(pendingRaw, 18));
        const daysHeld = Number(secondsHeldRaw) / 86400;
        const rewardSharePct = Number(formatUnits(rewardShareRaw, 16));

        entries.push({
          address: batch[j],
          balance,
          balanceUsd: balance * price,
          pendingRewards: pending,
          rewardsUsd: pending * price,
          rewardSharePct,
          daysHeld,
          isWhale,
          score: balance,
        });
      }
    } catch (e) {
      console.error(`Multicall batch failed at ${i}:`, e);
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < addresses.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Sort by score (rewardSharePct) descending
  entries.sort((a, b) => b.score - a.score);
  return entries.slice(0, 100);
}

export async function GET() {
  try {
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
      return Response.json({
        holders: cachedResult.data,
        cached: true,
        updatedAt: new Date(cachedResult.timestamp).toISOString(),
      });
    }

    const holders = await buildLeaderboard();
    cachedResult = { data: holders, timestamp: Date.now() };

    return Response.json({
      holders,
      cached: false,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Leaderboard error:", e);
    if (cachedResult) {
      return Response.json({
        holders: cachedResult.data,
        cached: true,
        stale: true,
        updatedAt: new Date(cachedResult.timestamp).toISOString(),
      });
    }
    return Response.json(
      { error: "Failed to build leaderboard" },
      { status: 500 }
    );
  }
}
