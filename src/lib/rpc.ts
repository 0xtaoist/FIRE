import { createPublicClient, fallback, http, type Transport } from "viem";
import { robinhoodChain } from "./chains";

/**
 * Robinhood Chain transport. NEXT_PUBLIC_RH_RPC_URL takes priority;
 * fallback rotates through any additional public endpoints.
 * (Exported under the legacy `base*` names too so existing imports keep
 * working — everything now points at Robinhood Chain.)
 */
function buildTransport(): Transport {
  const userRpc = process.env.NEXT_PUBLIC_RH_RPC_URL;
  const transports = [
    ...(userRpc ? [http(userRpc)] : []),
    // official public endpoint — always present as fallback
    http("https://rpc.mainnet.chain.robinhood.com"),
  ];
  return fallback(transports, { rank: false, retryCount: 2 });
}

export const rhTransport = buildTransport();

export const rhClient = createPublicClient({
  chain: robinhoodChain,
  transport: rhTransport,
});

// legacy aliases (dashboard-new, api routes import these names)
export const baseTransport = rhTransport;
export const baseClient = rhClient;
