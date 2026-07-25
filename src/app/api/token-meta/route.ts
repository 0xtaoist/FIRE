import { rhClient } from "@/lib/rpc";

export const dynamic = "force-dynamic";

const ABI = [
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

const cache = new Map<string, { symbol: string; decimals: number }>();

/** symbol + decimals for a token, cached in-process. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.toLowerCase();
  if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
    return Response.json({ error: "valid ?address= required" }, { status: 400 });
  }
  if (cache.has(address)) return Response.json(cache.get(address));

  try {
    const [symbol, decimals] = await Promise.all([
      rhClient.readContract({ address: address as `0x${string}`, abi: ABI, functionName: "symbol" }),
      rhClient.readContract({ address: address as `0x${string}`, abi: ABI, functionName: "decimals" }),
    ]);
    const meta = { symbol: symbol as string, decimals: Number(decimals) };
    cache.set(address, meta);
    return Response.json(meta);
  } catch {
    return Response.json({ symbol: address.slice(0, 6), decimals: 18 });
  }
}
