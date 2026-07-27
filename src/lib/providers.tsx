"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// @privy-io/wagmi's WagmiProvider/createConfig register Privy wallets
// (embedded + external) as wagmi connectors — required for useAccount /
// useWriteContract to see the connected wallet at all.
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { robinhoodChain } from "./chains";
import { rhTransport } from "./rpc";

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  transports: {
    [robinhoodChain.id]: rhTransport,
  },
});

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
        },
        defaultChain: robinhoodChain,
        supportedChains: [robinhoodChain],
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
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
