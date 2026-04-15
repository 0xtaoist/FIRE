"use client";

import { useMemo, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PrivyProvider } from "@privy-io/react-auth";

import "@solana/wallet-adapter-react-ui/styles.css";

export function Providers({ children }: { children: ReactNode }) {
  const network =
    (process.env.NEXT_PUBLIC_SOLANA_NETWORK as string) === "mainnet-beta"
      ? WalletAdapterNetwork.Mainnet
      : WalletAdapterNetwork.Devnet;

  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.mainnet-beta.solana.com";

  // Empty array — Phantom/Solflare auto-register as Standard Wallets.
  // No Privy connectors for external wallets — this prevents Privy's
  // iframe from proxying signing requests (which causes Phantom to show
  // "example.com" as the origin and block the request).
  const wallets = useMemo(() => [], []);

  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!privyAppId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[providers] NEXT_PUBLIC_PRIVY_APP_ID is not set; Privy login disabled.",
      );
    }
    return (
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    );
  }

  // Privy handles embedded wallets (email/social logins).
  // External wallets (Phantom, Solflare) connect directly through
  // wallet-adapter's Standard Wallet interface — no Privy proxy.
  // This ensures Phantom sees proveit.fun as the origin, not example.com.
  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["email", "wallet", "google", "twitter"],
        appearance: {
          theme: "dark",
          accentColor: "#22d3ee",
          walletChainType: "solana-only",
        },
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
        },
        solanaClusters: [
          {
            name: "mainnet-beta",
            rpcUrl: endpoint,
          },
        ],
      }}
    >
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </PrivyProvider>
  );
}
