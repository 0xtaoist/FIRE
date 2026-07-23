import { formatUnits } from "viem";
import { FIRE_CONTRACT } from "@/lib/contract";

export const dynamic = "force-dynamic";

/**
 * StreakBroken(address indexed holder, uint256 newBalance, uint256 oldPeak)
 *
 * Why this exists: when a streak breaks, the contract resets peakBalance to
 * whatever is left. So the peak a holder sees afterwards is NOT the peak they
 * broke against — which makes every break look unexplained. These events carry
 * the original peak, so the dashboard can show what actually happened.
 *
 * Source: Blockscout's log API (no 10k-block window, unlike the RPC).
 * Best-effort: any failure returns an empty list and the UI hides the section.
 */
const EXPLORER = process.env.NEXT_PUBLIC_RH_EXPLORER_URL || "https://robinhoodchain.blockscout.com";
const LAUNCH_BLOCK = process.env.LAUNCH_BLOCK || "13459116";

// keccak256("StreakBroken(address,uint256,uint256)")
const STREAK_BROKEN_TOPIC =
  "0x567337f90331c3ed58970c211016d9fdc69cfce638052b00aac87a7c57ae4b70";

type Broken = { at: string | null; block: number; newBalance: string; oldPeak: string };

const cache = new Map<string, { at: number; data: Broken[] }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.toLowerCase();
  if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
    return Response.json({ breaks: [] });
  }

  const hit = cache.get(address);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) {
    return Response.json({ breaks: hit.data, cached: true });
  }

  const topic1 = "0x" + address.slice(2).padStart(64, "0");
  const url =
    `${EXPLORER}/api?module=logs&action=getLogs` +
    `&fromBlock=${LAUNCH_BLOCK}&toBlock=latest` +
    `&address=${FIRE_CONTRACT}` +
    `&topic0=${STREAK_BROKEN_TOPIC}&topic1=${topic1}&topic0_1_opr=and`;

  let breaks: Broken[] = [];
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    const json = await res.json();
    const logs: Array<{ data: string; blockNumber: string; timeStamp?: string }> =
      Array.isArray(json?.result) ? json.result : [];
    breaks = logs.map((l) => {
      // data = abi.encode(uint256 newBalance, uint256 oldPeak) — 2 × 32 bytes
      const hex = (l.data || "0x").slice(2);
      const newBalance = hex.length >= 64 ? BigInt("0x" + hex.slice(0, 64)) : BigInt(0);
      const oldPeak = hex.length >= 128 ? BigInt("0x" + hex.slice(64, 128)) : BigInt(0);
      const tsHex = l.timeStamp;
      const ts = tsHex ? Number(BigInt(tsHex)) * 1000 : null;
      return {
        at: ts ? new Date(ts).toISOString() : null,
        block: Number(BigInt(l.blockNumber || "0")),
        newBalance: formatUnits(newBalance, 18),
        oldPeak: formatUnits(oldPeak, 18),
      };
    });
    breaks.sort((a, b) => b.block - a.block);
  } catch {
    breaks = [];
  }

  cache.set(address, { at: Date.now(), data: breaks });
  return Response.json({ breaks });
}
