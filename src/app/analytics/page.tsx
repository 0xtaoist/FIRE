import { NavShell, FooterV3 } from "@/components/fire-v3/shared";
import { Analytics } from "@/components/fire-v4/analytics";

export const metadata = {
  title: "FIRE — On-chain analytics",
  description: "Live FIRE protocol metrics: dividends distributed, holders paid, and the stock basket over time. Verified on-chain, mirrored from the Dune dashboard.",
};

export default function AnalyticsPage() {
  return (
    <div className="fv-page min-h-screen">
      <NavShell active="analytics" />
      <Analytics />
      <FooterV3 />
    </div>
  );
}
