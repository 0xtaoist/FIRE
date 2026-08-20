"use client";

/* v4 dashboard — the streak/login/badge refresh, built from the Claude Design
   prototype. Lives at /new-dashboard so /dashboard keeps working while this is
   reviewed; swapping is a one-line change in src/app/dashboard/page.tsx.

   Width is NOT capped here — the component ships both breakpoints from the mock
   (stacked under 1024px, a 480px+1fr two-column grid above it).

   ?address=0x… renders any wallet read-only, no connect required. */

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
