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

// Rabby has no dedicated Privy entry anymore ('rabby_wallet' is deprecated),
// so it's reached two ways:
//  - Desktop: the extension is auto-detected via 'detected_ethereum_wallets'
//    (EIP-6963), and 'wallet_connect_qr' shows a QR the Rabby mobile app can scan.
//  - Mobile browsers: nothing is injected, so 'wallet_connect' (the full
//    WalletConnect registry, 100+ wallets incl. Rabby) is the only path — the
//    user picks Rabby from the searchable list and it deep-links to the app.
// 'wallet_connect_qr' and 'detected_ethereum_wallets' render nothing on mobile,
// so the two lists differ. UA sniffing is fine here: the config isn't rendered
// to the DOM, so there's no hydration mismatch risk.
const isMobileBrowser =
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const walletList = isMobileBrowser
  ? (["metamask", "wallet_connect"] as const)
  : ([
      "detected_ethereum_wallets",
      "metamask",
      "wallet_connect_qr",
      "wallet_connect",
    ] as const);

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
