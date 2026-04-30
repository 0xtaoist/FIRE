import { createPublicClient, fallback, http, type Transport } from "viem";
import { base } from "viem/chains";

// Public Base RPCs ordered by priority. fallback() rotates on rate-limit /
// failure, which keeps us moving when mainnet.base.org throttles.
function buildTransport(): Transport {
  const userRpc = process.env.NEXT_PUBLIC_BASE_RPC_URL;
  const transports = [
    ...(userRpc ? [http(userRpc)] : []),
    http("https://base.publicnode.com"),
    http("https://base.llamarpc.com"),
    http("https://base-rpc.publicnode.com"),
    http("https://mainnet.base.org"),
  ];
  return fallback(transports, { rank: false, retryCount: 1 });
}

export const baseTransport = buildTransport();

export const baseClient = createPublicClient({
  chain: base,
  transport: baseTransport,
});
