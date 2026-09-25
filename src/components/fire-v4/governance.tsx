"use client";
import { useEffect, useState, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

/* FIRE Governance — Snapshot-style off-chain voting. Connect wallet, vote by
   signing (no gas); weight = FIRE balance at the proposal's snapshot block.
   Eligible wallets (deployer or >=1% holder) can submit proposals. Lives in
   fire-v4 alongside the other current-gen components. */

const MONO = "font-[family-name:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)]";
const GREEN = "#00c805";

type ProposalType = "yes_no" | "choices";
type Proposal = {
  id: number; title: string; description: string; type: ProposalType;
  choices: string[]; createdBy: string; createdAt: string; endsAt: string;
  snapshotBlock: string; status: "active" | "closed";
};
type Tally = {
  totals: Record<string, string>; voterCount: number; totalWeight: string;
  supply: string; quorumNeeded: string; quorumMet: boolean; winner: string | null;
};

const fmtFire = (wei: string) => {
  const n = Number(wei) / 1e18;
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
};
const pct = (part: string, whole: string) => {
  const w = Number(whole); if (!w) return 0;
  return Math.min(100, (Number(part) / w) * 100);
};
const timeLeft = (endsAt: string) => {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "ended";
  const h = Math.floor(ms / 3600000), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h left`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m left`;
};

function voteMessage(id: number, choice: string, snap: string) {
  return `FIRE Governance Vote\nProposal: ${id}\nChoice: ${choice}\nSnapshot block: ${snap}\n\nSigning proves you control this wallet. No gas, no transaction.`;
}

function ProposalCard({ p }: { p: Proposal }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [tally, setTally] = useState<Tally | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const closed = p.status === "closed" || new Date(p.endsAt).getTime() < Date.now();

  const load = useCallback(async () => {
    const q = address ? `?id=${p.id}&address=${address}` : `?id=${p.id}`;
    const r = await fetch(`/api/governance/vote${q}`).then(r => r.json()).catch(() => null);
    if (r?.tally) setTally(r.tally);
    if (r?.myVote !== undefined) setMyVote(r.myVote);
  }, [p.id, address]);
  useEffect(() => { load(); }, [load]);

  const vote = async (choice: string) => {
    if (!address) { setMsg("connect a wallet to vote"); return; }
    setBusy(choice); setMsg(null);
    try {
      const signature = await signMessageAsync({ message: voteMessage(p.id, choice, p.snapshotBlock) });
      const r = await fetch("/api/governance/vote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: p.id, address, choice, signature }),
      }).then(r => r.json());
      if (r.error) { setMsg(r.error); }
      else { setMyVote(choice); setTally(r.tally); setMsg(`voted with ${fmtFire(r.weight)} FIRE`); }
    } catch (e: unknown) {
      setMsg(e instanceof Error && /reject|denied/i.test(e.message) ? "signature cancelled" : "vote failed");
    } finally { setBusy(null); }
  };

  return (
    <div className="fv-panel" style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <Link href={`/governance/${p.id}`} style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--fv-text)", textDecoration: "none" }}>{p.title}</Link>
        <span className={MONO} style={{ fontSize: 11, color: closed ? "var(--fv-faint)" : GREEN, whiteSpace: "nowrap" }}>
          {closed ? "closed" : timeLeft(p.endsAt)}
        </span>
      </div>
      {p.description && <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--fv-muted)", marginTop: 8 }}>{p.description}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {p.choices.map(c => {
          const w = tally?.totals[c] || "0";
          const barPct = tally ? pct(w, tally.totalWeight || "1") : 0;
          const mine = myVote === c;
          const winner = closed && tally?.quorumMet && tally.winner === c;
          return (
            <button key={c} disabled={closed || busy !== null}
              onClick={() => vote(c)}
              style={{
                position: "relative", textAlign: "left", padding: "11px 14px", borderRadius: 10,
                border: `1px solid ${mine ? GREEN : "var(--fv-line)"}`, background: "transparent",
                cursor: closed ? "default" : "pointer", overflow: "hidden", opacity: closed && !winner ? 0.75 : 1,
              }}>
              <div style={{ position: "absolute", inset: 0, width: `${barPct}%`, background: winner ? "rgba(0,200,5,0.18)" : "rgba(245,243,238,0.05)", transition: "width .4s" }} />
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: mine || winner ? 600 : 400, color: winner ? GREEN : "var(--fv-text)" }}>
                  {c}{mine ? " ✓" : ""}{winner ? " · winner" : ""}
                </span>
                {tally && <span className={MONO} style={{ fontSize: 11, color: "var(--fv-muted)" }}>{fmtFire(w)} · {barPct.toFixed(0)}%</span>}
              </div>
            </button>
          );
        })}
      </div>

      {tally && (
        <div className={MONO} style={{ fontSize: 10.5, color: "var(--fv-faint)", marginTop: 12, display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
          <span>{tally.voterCount} voters</span>
          <span>{fmtFire(tally.totalWeight)} / {fmtFire(tally.quorumNeeded)} FIRE for quorum</span>
          <span style={{ color: tally.quorumMet ? GREEN : "var(--fv-faint)" }}>{tally.quorumMet ? "✓ quorum met" : "quorum not met"}</span>
          <span>snapshot #{p.snapshotBlock}</span>
        </div>
      )}
      {msg && <div className={MONO} style={{ fontSize: 11, color: GREEN, marginTop: 8 }}>{msg}</div>}
      {busy && <div className={MONO} style={{ fontSize: 11, color: "var(--fv-muted)", marginTop: 8 }}>sign in your wallet…</div>}
    </div>
  );
}

function SubmitForm({ onCreated }: { onCreated: () => void }) {
  const { address } = useAccount();
  const [open, setOpen] = useState(false);
  const [elig, setElig] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState("");
  const [type, setType] = useState<ProposalType>("yes_no");
  const [choices, setChoices] = useState<string[]>(["", ""]);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);

  // check eligibility when opened
  useEffect(() => {
    if (!open || !address) return;
    fetch("/api/governance/proposals").catch(() => {}); // warm
    fetch("/api/governance/vote?id=0"); // noop; real check happens server-side on submit
  }, [open, address]);

  const submit = async () => {
    if (!address) { setMsg("connect a wallet"); return; }
    if (!title.trim()) { setMsg("title required"); return; }
    setBusy(true); setMsg(null);
    const body: Record<string, unknown> = {
      address, title, description: desc, type, durationHours: days * 24,
    };
    if (type === "choices") body.choices = choices.map(c => c.trim()).filter(Boolean);
    const r = await fetch("/api/governance/proposals", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).then(r => r.json()).catch(() => ({ error: "network error" }));
    setBusy(false);
    if (r.error) { setElig({ ok: false, reason: r.error }); setMsg(r.error); }
    else { setMsg("proposal created"); setTitle(""); setDesc(""); setChoices(["", ""]); setType("yes_no"); setOpen(false); onCreated(); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className={MONO}
      style={{ fontSize: 12, padding: "10px 16px", borderRadius: 10, border: `1px solid ${GREEN}`, color: GREEN, background: "transparent", cursor: "pointer" }}>
      + New proposal
    </button>
  );

  return (
    <div className="fv-panel" style={{ padding: 22 }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>New proposal</div>
      <div className={MONO} style={{ fontSize: 11, color: "var(--fv-muted)", marginBottom: 14 }}>Deployer or wallets holding ≥1% of supply can submit.</div>

      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title — e.g. Stock basket for this week"
        style={inputStyle} />
      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
        rows={3} style={{ ...inputStyle, resize: "vertical" }} />

      <div style={{ display: "flex", gap: 8, margin: "6px 0 12px" }}>
        {(["yes_no", "choices"] as ProposalType[]).map(t => (
          <button key={t} onClick={() => setType(t)} className={MONO}
            style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${type === t ? GREEN : "var(--fv-line)"}`, color: type === t ? GREEN : "var(--fv-muted)", background: "transparent" }}>
            {t === "yes_no" ? "Yes / No" : "Multiple choices"}
          </button>
        ))}
      </div>

      {type === "choices" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {choices.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <input value={c} onChange={e => setChoices(cs => cs.map((x, j) => j === i ? e.target.value : x))}
                placeholder={`Choice ${i + 1}`} style={{ ...inputStyle, marginBottom: 0 }} />
              {choices.length > 2 && <button onClick={() => setChoices(cs => cs.filter((_, j) => j !== i))} className={MONO}
                style={{ padding: "0 12px", borderRadius: 8, border: "1px solid var(--fv-line)", background: "transparent", color: "var(--fv-muted)", cursor: "pointer" }}>×</button>}
            </div>
          ))}
          {choices.length < 8 && <button onClick={() => setChoices(cs => [...cs, ""])} className={MONO}
            style={{ fontSize: 11, alignSelf: "flex-start", padding: "6px 10px", borderRadius: 8, border: "1px solid var(--fv-line)", background: "transparent", color: "var(--fv-muted)", cursor: "pointer" }}>+ add choice</button>}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span className={MONO} style={{ fontSize: 12, color: "var(--fv-muted)" }}>Duration</span>
        <input type="number" min={1} max={30} value={days} onChange={e => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 7)))}
          style={{ ...inputStyle, width: 70, marginBottom: 0 }} />
        <span className={MONO} style={{ fontSize: 12, color: "var(--fv-muted)" }}>days</span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={submit} disabled={busy} className={MONO}
          style={{ fontSize: 12, padding: "10px 18px", borderRadius: 10, border: "none", background: GREEN, color: "#0a0a0a", fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "creating…" : "Create proposal"}
        </button>
        <button onClick={() => { setOpen(false); setMsg(null); }} className={MONO}
          style={{ fontSize: 12, padding: "10px 16px", borderRadius: 10, border: "1px solid var(--fv-line)", background: "transparent", color: "var(--fv-muted)", cursor: "pointer" }}>Cancel</button>
      </div>
      {msg && <div className={MONO} style={{ fontSize: 11, color: elig?.ok === false ? "#e5484d" : GREEN, marginTop: 10 }}>{msg}</div>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", marginBottom: 10, borderRadius: 8,
  border: "1px solid var(--fv-line)", background: "rgba(245,243,238,0.03)",
  color: "var(--fv-text)", fontSize: 14, fontFamily: "inherit", outline: "none",
};

export function Governance() {
  const { ready, authenticated, login } = usePrivy();
  const { address } = useAccount();
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/governance/proposals").then(r => r.json()).then(d => {
      if (d.error) setErr(d.error); else setProposals(d.proposals || []);
    }).catch(() => setErr("couldn't load proposals"));
  }, []);
  useEffect(() => { load(); }, [load]);

  const active = (proposals || []).filter(p => p.status === "active");
  const closed = (proposals || []).filter(p => p.status === "closed");

  return (
    <main style={{ maxWidth: 760, margin: "0 auto" }} className="px-5 sm:px-8">
      <section className="pt-14 sm:pt-20 pb-6">
        <div className={`${MONO} text-[11px] tracking-[0.22em] uppercase`} style={{ color: GREEN }}>Governance</div>
        <h1 className="mt-4 text-[32px] sm:text-[44px] font-semibold leading-[1.05] tracking-tight">
          Hold FIRE, <span style={{ color: GREEN }}>shape the protocol.</span>
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed max-w-[560px]" style={{ color: "var(--fv-muted)" }}>
          Vote on protocol decisions by signing with your wallet — no gas. Your weight is your FIRE
          balance at the proposal&apos;s snapshot block. Quorum is 10% of supply.
        </p>
        <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {ready && !authenticated
            ? <button onClick={login} className={MONO} style={{ fontSize: 12, padding: "10px 18px", borderRadius: 10, border: "none", background: GREEN, color: "#0a0a0a", fontWeight: 600, cursor: "pointer" }}>Connect wallet</button>
            : address && <SubmitForm onCreated={load} />}
        </div>
      </section>

      {err && <div className="fv-panel" style={{ padding: 20, color: "var(--fv-muted)" }}>{err === "governance db not configured" ? "Governance is being set up — check back soon." : err}</div>}
      {!proposals && !err && <div className={MONO} style={{ padding: 40, textAlign: "center", color: "var(--fv-faint)" }}>loading proposals…</div>}

      {proposals && proposals.length === 0 && (
        <div className="fv-panel" style={{ padding: 28, textAlign: "center", color: "var(--fv-muted)" }}>
          No proposals yet.{address ? " Be the first to submit one." : " Connect a wallet to participate."}
        </div>
      )}

      {active.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 32 }}>
          <div className={`${MONO} text-[10px] tracking-[0.18em] uppercase`} style={{ color: "var(--fv-muted)" }}>Active</div>
          {active.map(p => <ProposalCard key={p.id} p={p} />)}
        </section>
      )}
      {closed.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 48 }}>
          <div className={`${MONO} text-[10px] tracking-[0.18em] uppercase`} style={{ color: "var(--fv-muted)" }}>Closed</div>
          {closed.map(p => <ProposalCard key={p.id} p={p} />)}
        </section>
      )}

      <p className={`${MONO} text-[11px] pb-16`} style={{ color: "var(--fv-faint)" }}>
        Voting is off-chain and gasless — signatures are verified and weighted by on-chain balance at snapshot.
        Results are advisory; the team executes winning proposals.
      </p>
    </main>
  );
}
