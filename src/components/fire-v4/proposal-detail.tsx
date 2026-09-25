"use client";
import { useEffect, useState, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

/* Proposal detail — full view of one proposal: description, your voting power,
   vote, live tally with quorum bar, the full voter breakdown, share link, and
   (deployer only) close-early. */

const MONO = "font-[family-name:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)]";
const GREEN = "#00c805";
const DEPLOYER = (process.env.NEXT_PUBLIC_DEPLOYER || "0xAcc79E7b9F8dBB22e197c76d92Ff8c0472Ac81B4").toLowerCase();

type ProposalType = "yes_no" | "choices";
type Proposal = { id: number; title: string; description: string; type: ProposalType; choices: string[]; createdBy: string; createdAt: string; endsAt: string; snapshotBlock: string; status: "active" | "closed" };
type Tally = { totals: Record<string, string>; voterCount: number; totalWeight: string; supply: string; quorumNeeded: string; quorumMet: boolean; winner: string | null };
type Voter = { voter: string; choice: string; weight: string; votedAt: string };

const fmtFire = (wei: string) => { const n = Number(wei) / 1e18; if (n >= 1e9) return (n/1e9).toFixed(2)+"B"; if (n >= 1e6) return (n/1e6).toFixed(2)+"M"; if (n >= 1e3) return (n/1e3).toFixed(1)+"K"; return n.toFixed(0); };
const pct = (part: string, whole: string) => { const w = Number(whole); return w ? Math.min(100, (Number(part)/w)*100) : 0; };
const short = (a: string) => `${a.slice(0,6)}…${a.slice(-4)}`;
const timeLeft = (endsAt: string) => { const ms = new Date(endsAt).getTime() - Date.now(); if (ms <= 0) return "ended"; const h = Math.floor(ms/3600000), d = Math.floor(h/24); if (d>0) return `${d}d ${h%24}h left`; const m = Math.floor((ms%3600000)/60000); return `${h}h ${m}m left`; };
const voteMessage = (id: number, choice: string, snap: string) => `FIRE Governance Vote\nProposal: ${id}\nChoice: ${choice}\nSnapshot block: ${snap}\n\nSigning proves you control this wallet. No gas, no transaction.`;

export function ProposalDetail({ id }: { id: number }) {

  const { ready, authenticated, login } = usePrivy();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [p, setP] = useState<Proposal | null>(null);
  const [tally, setTally] = useState<Tally | null>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [power, setPower] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    const q = address ? `?id=${id}&address=${address}&detail=1` : `?id=${id}&detail=1`;
    const r = await fetch(`/api/governance/vote${q}`).then(r => r.json()).catch(() => null);
    if (!r || r.error) { setNotFound(true); return; }
    setP(r.proposal); setTally(r.tally); setVoters(r.voters || []); setMyVote(r.myVote ?? null);
  }, [id, address]);
  useEffect(() => { load(); }, [load]);

  // fetch this wallet's snapshot voting power
  useEffect(() => {
    if (!address) { setPower(null); return; }
    fetch(`/api/governance/power?id=${id}&address=${address}`).then(r => r.json())
      .then(d => setPower(d.weight ?? null)).catch(() => setPower(null));
  }, [id, address]);

  const closed = !p || p.status === "closed" || new Date(p.endsAt).getTime() < Date.now();
  const isDeployer = address?.toLowerCase() === DEPLOYER;

  const vote = async (choice: string) => {
    if (!address) { setMsg("connect a wallet to vote"); return; }
    if (!p) return;
    setBusy(choice); setMsg(null);
    try {
      const signature = await signMessageAsync({ message: voteMessage(p.id, choice, p.snapshotBlock) });
      const r = await fetch("/api/governance/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proposalId: p.id, address, choice, signature }) }).then(r => r.json());
      if (r.error) setMsg(r.error);
      else { setMyVote(choice); setMsg(`voted with ${fmtFire(r.weight)} FIRE`); await load(); }
    } catch (e: unknown) { setMsg(e instanceof Error && /reject|denied/i.test(e.message) ? "signature cancelled" : "vote failed"); }
    finally { setBusy(null); }
  };

  const closeEarly = async () => {
    if (!address || !p) return;
    if (!confirm("Close this proposal now? Voting ends immediately.")) return;
    const r = await fetch("/api/governance/proposals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, address }) }).then(r => r.json());
    if (r.error) setMsg(r.error); else await load();
  };

  const share = () => { navigator.clipboard?.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); };

  if (!mounted) return null;
  if (notFound) return (
    <main style={{ maxWidth: 720, margin: "0 auto" }} className="px-5 sm:px-8 pt-20">
      <div className="fv-panel" style={{ padding: 28, textAlign: "center", color: "var(--fv-muted)" }}>
        Proposal not found. <Link href="/governance" style={{ color: GREEN }}>Back to governance</Link>
      </div>
    </main>
  );
  if (!p) return <main className="pt-20"><div className={MONO} style={{ textAlign: "center", color: "var(--fv-faint)" }}>loading…</div></main>;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }} className="px-5 sm:px-8">
      <section className="pt-12 sm:pt-16 pb-6">
        <Link href="/governance" className={MONO} style={{ fontSize: 11, color: "var(--fv-muted)", textDecoration: "none" }}>← all proposals</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginTop: 12 }}>
          <h1 className="text-[26px] sm:text-[34px] font-semibold leading-tight tracking-tight">{p.title}</h1>
          <span className={MONO} style={{ fontSize: 12, color: closed ? "var(--fv-faint)" : GREEN, whiteSpace: "nowrap" }}>{closed ? "closed" : timeLeft(p.endsAt)}</span>
        </div>
        <div className={MONO} style={{ fontSize: 11, color: "var(--fv-faint)", marginTop: 8, display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
          <span>by {short(p.createdBy)}</span>
          <span>snapshot #{p.snapshotBlock}</span>
          <span>ends {new Date(p.endsAt).toLocaleString()}</span>
          <button onClick={share} style={{ background: "none", border: "none", color: GREEN, cursor: "pointer", padding: 0, font: "inherit" }}>{copied ? "link copied" : "share ↗"}</button>
          {isDeployer && !closed && <button onClick={closeEarly} style={{ background: "none", border: "none", color: "#e5484d", cursor: "pointer", padding: 0, font: "inherit" }}>close early</button>}
        </div>
      </section>

      {p.description && <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--fv-muted)", marginBottom: 24, whiteSpace: "pre-wrap" }}>{p.description}</p>}

      {/* your voting power */}
      {ready && !authenticated && (
        <button onClick={login} className={MONO} style={{ fontSize: 12, padding: "10px 18px", borderRadius: 10, border: "none", background: GREEN, color: "#0a0a0a", fontWeight: 600, cursor: "pointer", marginBottom: 20 }}>Connect wallet to vote</button>
      )}
      {address && power !== null && (
        <div className={MONO} style={{ fontSize: 11.5, color: "var(--fv-muted)", marginBottom: 16 }}>
          Your voting power: <span style={{ color: power === "0" ? "#e5484d" : GREEN }}>{fmtFire(power)} FIRE</span> {power === "0" && "(no balance at snapshot — can't vote)"}
        </div>
      )}

      {/* choices */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {p.choices.map(c => {
          const w = tally?.totals[c] || "0";
          const barPct = tally ? pct(w, tally.totalWeight || "1") : 0;
          const mine = myVote === c;
          const winner = closed && tally?.quorumMet && tally.winner === c;
          return (
            <button key={c} disabled={closed || busy !== null || power === "0"} onClick={() => vote(c)}
              style={{ position: "relative", textAlign: "left", padding: "14px 16px", borderRadius: 12, border: `1px solid ${mine ? GREEN : "var(--fv-line)"}`, background: "transparent", cursor: closed ? "default" : "pointer", overflow: "hidden", opacity: closed && !winner ? 0.75 : 1 }}>
              <div style={{ position: "absolute", inset: 0, width: `${barPct}%`, background: winner ? "rgba(0,200,5,0.18)" : "rgba(245,243,238,0.05)", transition: "width .4s" }} />
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: mine || winner ? 600 : 400, color: winner ? GREEN : "var(--fv-text)" }}>{c}{mine ? " ✓ your vote" : ""}{winner ? " · winner" : ""}</span>
                {tally && <span className={MONO} style={{ fontSize: 11.5, color: "var(--fv-muted)" }}>{fmtFire(w)} · {barPct.toFixed(1)}%</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* quorum bar */}
      {tally && (
        <div className="fv-panel" style={{ padding: 18, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className={MONO} style={{ fontSize: 11, color: "var(--fv-muted)" }}>Quorum (10% of supply)</span>
            <span className={MONO} style={{ fontSize: 11, color: tally.quorumMet ? GREEN : "var(--fv-faint)" }}>{tally.quorumMet ? "✓ met" : `${pct(tally.totalWeight, tally.quorumNeeded).toFixed(0)}%`}</span>
          </div>
          <div style={{ height: 10, background: "rgba(245,243,238,0.05)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${pct(tally.totalWeight, tally.quorumNeeded)}%`, height: "100%", background: tally.quorumMet ? GREEN : "rgba(245,243,238,0.3)", transition: "width .4s" }} />
          </div>
          <div className={MONO} style={{ fontSize: 10.5, color: "var(--fv-faint)", marginTop: 8 }}>
            {fmtFire(tally.totalWeight)} of {fmtFire(tally.quorumNeeded)} FIRE needed · {tally.voterCount} voters
          </div>
        </div>
      )}

      {msg && <div className={MONO} style={{ fontSize: 12, color: GREEN, marginBottom: 16 }}>{msg}</div>}
      {busy && <div className={MONO} style={{ fontSize: 12, color: "var(--fv-muted)", marginBottom: 16 }}>sign in your wallet…</div>}

      {/* voter list */}
      {voters.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div className={`${MONO} text-[10px] tracking-[0.18em] uppercase mb-3`} style={{ color: "var(--fv-muted)" }}>Votes ({voters.length})</div>
          <div className="fv-panel" style={{ padding: 6 }}>
            {voters.map((v, i) => (
              <div key={v.voter} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderTop: i ? "1px solid var(--fv-line)" : "none" }}>
                <a href={`https://robinhoodchain.blockscout.com/address/${v.voter}`} target="_blank" rel="noopener noreferrer" className={MONO} style={{ fontSize: 12, color: "var(--fv-text)", textDecoration: "none" }}>{short(v.voter)}</a>
                <div className={MONO} style={{ fontSize: 11.5, color: "var(--fv-muted)", display: "flex", gap: 12 }}>
                  <span style={{ color: GREEN }}>{v.choice}</span>
                  <span>{fmtFire(v.weight)} FIRE</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
