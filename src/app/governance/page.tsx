"use client";
import dynamic from "next/dynamic";
import { NavShell, FooterV3 } from "@/components/fire-v3/shared";

// Wallet-interactive: render fully client-side to avoid SSR/hydration issues
// with the Privy/wagmi hooks (same reason wallet pages don't prerender).
const Governance = dynamic(() => import("@/components/fire-v4/governance").then(m => m.Governance), {
  ssr: false,
  loading: () => <div className="font-[family-name:var(--font-mono)]" style={{ padding: 40, textAlign: "center", color: "var(--fv-faint)" }}>loading governance…</div>,
});

export default function GovernancePage() {
  return (
    <div className="fv-page min-h-screen">
      <NavShell active="governance" />
      <Governance />
      <FooterV3 />
    </div>
  );
}
