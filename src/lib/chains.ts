import { defineChain } from "viem";

/**
 * Robinhood Chain — Arbitrum Orbit L2, chainId 4663, gas in ETH.
 * RPC + explorer come from env so the app tracks official endpoints
 * without a redeploy.
 */
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RH_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: process.env.NEXT_PUBLIC_RH_EXPLORER_URL || "https://robinhoodchain.blockscout.com",
    },
  },
});
