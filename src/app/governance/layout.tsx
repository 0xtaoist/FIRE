import type { Metadata } from "next";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "FIRE — Governance",
  description: "Vote on FIRE protocol decisions by signing with your wallet. Gasless, weighted by your FIRE balance at snapshot. Quorum 10% of supply.",
};

export default function GovernanceLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
