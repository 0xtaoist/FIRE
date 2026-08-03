"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// @privy-io/wagmi's WagmiProvider/createConfig register Privy wallets
// (embedded + external) as wagmi connectors — required for useAccount /
// useWriteContract to see the connected wallet at all.
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { http } from "viem";
import { mainnet } from "viem/chains";
import { robinhoodChain } from "./chains";
import { rhTransport } from "./rpc";
import { CheckInGate } from "@/components/fire-v3/checkin-gate";

const queryClient = new QueryClient();

// Mainnet is included ONLY as a WalletConnect handshake chain. The WC v2
// registry + session negotiation filter by the chains the dapp declares, and
// no wallet in the registry declares chainId 4663 — so with robinhoodChain
// alone, the Privy 'wallet_connect' list renders empty on mobile and session
// proposals get rejected. Pairing over eip155:1 succeeds everywhere; the app
// then switchChain()s to 4663 (already handled on swap/dashboard).
const wagmiConfig = createConfig({
  chains: [robinhoodChain, mainnet],
  transports: {
    [robinhoodChain.id]: rhTransport,
    [mainnet.id]: http(),
  },
});

// Rabby has no dedicated Privy entry ('rabby_wallet' is deprecated), so it's
// reached three ways, all covered by ONE list — entries that don't apply on a
// platform simply don't render, so no UA sniffing is needed:
//  - 'detected_ethereum_wallets': Rabby extension on desktop (EIP-6963) AND
//    the injected provider inside Rabby's mobile in-app dApp browser.
//    (Empty in plain mobile Safari/Chrome — that's expected.)
//  - 'wallet_connect': full WC registry (100+ wallets incl. Rabby); on a
//    phone this deep-links into the Rabby app. Works desktop + mobile.
//  - 'wallet_connect_qr': desktop-only QR for scanning with the Rabby phone
//    app; hidden automatically on mobile.
const walletList = [
  "detected_ethereum_wallets",
  "metamask",
  "wallet_connect_qr",
  "wallet_connect",
] as const;

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-mono text-ink-muted text-sm">
          Missing NEXT_PUBLIC_PRIVY_APP_ID
        </p>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#D4722A",
          walletList: [...walletList],
        },
        defaultChain: robinhoodChain,
        // mainnet here only unlocks WalletConnect registry filtering +
        // session approval; defaultChain keeps everything anchored on 4663.
        supportedChains: [robinhoodChain, mainnet],
        // WalletConnect is the mobile path for external wallets like Rabby —
        // without a project id, phone users can't reach injected-only wallets.
        // Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (free at cloud.reown.com).
        externalWallets: {
          walletConnect: { enabled: true },
        },
        walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
          {/* Daily check-in — auto-opens once per UTC day on any connected page. */}
          <CheckInGate />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
