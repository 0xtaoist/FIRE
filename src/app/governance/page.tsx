import { NavShell, FooterV3 } from "@/components/fire-v3/shared";
import { Governance } from "@/components/fire-v4/governance";

export const metadata = {
  title: "FIRE — Governance",
  description: "Vote on FIRE protocol decisions by signing with your wallet. Gasless, weighted by your FIRE balance at snapshot. Quorum 10% of supply.",
};

export default function GovernancePage() {
  return (
    <div className="fv-page min-h-screen">
      <NavShell active="governance" />
      <Governance />
      <FooterV3 />
    </div>
  );
}
