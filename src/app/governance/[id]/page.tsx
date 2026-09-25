import { NavShell, FooterV3 } from "@/components/fire-v3/shared";
import { ProposalDetail } from "@/components/fire-v4/proposal-detail";

export const metadata = { title: "FIRE — Proposal", description: "FIRE governance proposal — vote by signing with your wallet." };

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="fv-page min-h-screen">
      <NavShell active="governance" />
      <ProposalDetail id={Number(id)} />
      <FooterV3 />
    </div>
  );
}
