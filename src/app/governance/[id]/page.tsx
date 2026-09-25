"use client";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { NavShell, FooterV3 } from "@/components/fire-v3/shared";

const ProposalDetail = dynamic(() => import("@/components/fire-v4/proposal-detail").then(m => m.ProposalDetail), {
  ssr: false,
  loading: () => <div className="font-[family-name:var(--font-mono)]" style={{ padding: 40, textAlign: "center", color: "var(--fv-faint)" }}>loading…</div>,
});

export default function ProposalPage() {
  const params = useParams();
  const id = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  return (
    <div className="fv-page min-h-screen">
      <NavShell active="governance" />
      <ProposalDetail id={id} />
      <FooterV3 />
    </div>
  );
}
