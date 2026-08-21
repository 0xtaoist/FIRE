"use client";

/* FIRE dashboard — v4 streak/login/badge refresh (from the Claude Design
   prototype), now the primary dashboard at /dashboard.

   Full web3 wiring lives in @/components/fire-v4/dashboard-v4:
     • wagmi useAccount / useReadContract(holderStatus) for on-chain streak/tier
     • Privy connect (usePrivy/login), read-only when no wallet
     • /api/badges, /api/checkin, /api/dividend-series, /api/monthly-leaderboard
   ?address=0x… renders any wallet read-only, no connect required.

   The previous "Terminal Dark" dashboard is preserved at
   page.terminal-dark.bak.tsx if it needs to be restored. */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { NavShell, FooterV3 } from "@/components/fire-v3/shared";
import { DashboardV4, DashboardV4Page } from "@/components/fire-v4/dashboard-v4";

function Inner() {
  const q = useSearchParams().get("address");
  const readOnly = q && /^0x[a-fA-F0-9]{40}$/.test(q) ? (q as `0x${string}`) : null;
  return readOnly ? <DashboardV4 address={readOnly} /> : <DashboardV4Page />;
}

export default function Page() {
  return (
    <div className="fv-page min-h-screen">
      <NavShell active="dashboard" />
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Suspense fallback={null}>
          <Inner />
        </Suspense>
      </div>
      <FooterV3 />
    </div>
  );
}
