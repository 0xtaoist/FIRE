"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Lead = {
  rank?: number;
  wallet: string;
  usdSpent: number;
  fire: string;
  block: number;
  tx: string;
  ts: number;
};

type ShowdownData = {
  success: boolean;
  enabled: boolean;
  phase: "disabled" | "scheduled" | "awaiting" | "live" | "ended" | "void";
  auto: boolean;
  startResolved: boolean;
  startsAt: number | null;
  serverTime: number;
  resetSeconds: number;
  minPct: number;
  minAbsUsd: number;
  countdownEndsAt: number | null;
  ended: boolean;
  winner: string | null;
  currentLeader: Lead | null;
  nextThresholdUsd: number | null;
  podium: Lead[];
  totalBids: number;
  leadHistory: Lead[];
  prizes: number[];
  holdWeeks: number;
  updatedAt: string;
};

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000)    return `$${Math.round(n).toLocaleString("en-US")}`;
  if (n >= 1)         return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(4)}`;
}

function fmtFire(s: string): string {
  const n = parseFloat(s);
  if (!isFinite(n)) return s;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
const shortTx   = (t: string) => `${t.slice(0, 8)}...${t.slice(-6)}`;
const pad = (n: number) => String(n).padStart(2, "0");

function fmtLong(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(ss)}`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(ss)}`;
  return `${pad(m)}:${pad(ss)}`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-9 h-9 bg-[var(--fr-fire)] border-2 border-[var(--fr-ink)] rounded-full flex items-center justify-center shadow-[3px_3px_0_var(--fr-ink)]">
      <span className="text-white font-[family-name:var(--font-mono-jb)] text-xs font-black">1</span>
    </div>
  );
  if (rank === 2) return (
    <div className="w-8 h-8 bg-[var(--fr-ink)] border-2 border-[var(--fr-ink)] rounded-full flex items-center justify-center shadow-[3px_3px_0_var(--fr-ink)]">
      <span className="text-[var(--fr-paper)] font-[family-name:var(--font-mono-jb)] text-xs font-black">2</span>
    </div>
  );
  return (
    <div className="w-8 h-8 bg-[var(--fr-ember)] border-2 border-[var(--fr-ink)] rounded-full flex items-center justify-center shadow-[3px_3px_0_var(--fr-ink)]">
      <span className="text-[var(--fr-ink)] font-[family-name:var(--font-mono-jb)] text-xs font-black">3</span>
    </div>
  );
}

function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b-2 border-[var(--fr-ink)]">
      <Link href="/" className="flex items-center gap-2.5 no-underline text-[var(--fr-ink)] group">
        <Image src="/fire-mark.svg" alt="" width={32} height={32} className="w-8 h-8" />
        <span className="font-[family-name:var(--font-display)] text-[20px] tracking-[0.06em]">
          <span className="text-[var(--fr-fire)]">$FIRE</span>
          <small className="font-[family-name:var(--font-mono-jb)] text-[9px] tracking-[0.2em] opacity-60 block leading-none mt-0.5">CLUB &middot; RETIRE EARLY</small>
        </span>
      </Link>
      <div className="flex items-center gap-5">
        <Link href="/leaderboard" className="hidden sm:inline text-[var(--fr-ink)] no-underline text-[13px] font-semibold relative group">
          Leaderboard
          <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-[var(--fr-fire)] scale-x-0 origin-left transition-transform duration-250 group-hover:scale-x-100" />
        </Link>
        <Link href="/biggest-buy" className="hidden sm:inline text-[var(--fr-ink)] no-underline text-[13px] font-semibold relative group">
          Biggest Buy
          <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-[var(--fr-fire)] scale-x-0 origin-left transition-transform duration-250 group-hover:scale-x-100" />
        </Link>
        <Link href="/showdown" className="text-[var(--fr-ink)] no-underline text-[13px] font-semibold relative group">
          Showdown
          <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-[var(--fr-fire)] scale-x-100 origin-left" />
        </Link>
        <Link
          href="/dashboard"
          className="bg-[var(--fr-fire)] text-[var(--fr-ink)] border-2 border-[var(--fr-ink)] px-4 py-2 font-[family-name:var(--font-display)] text-xs tracking-[0.08em] cursor-pointer rounded-full shadow-[4px_4px_0_var(--fr-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--fr-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-ink)] transition-all duration-150 flex items-center gap-1.5 no-underline"
        >
          <Image src="/fire-mark.svg" alt="" width={18} height={18} className="w-[18px] h-[18px]" />
          CLAIM PAYOUTS
        </Link>
      </div>
    </nav>
  );
}

function Rules({ d }: { d: ShowdownData }) {
  const lines = [
    `A ${d.resetSeconds}-second clock starts. Every buy that takes the lead resets it to ${d.resetSeconds}.`,
    `Each new lead must beat the current one by ${d.minPct}% or $${d.minAbsUsd.toLocaleString("en-US")} — whichever is easier.`,
    `Anyone can enter. Every buy is onchain.`,
    `Last wallet leading when the clock hits 0 wins. Winner holds ${d.holdWeeks} weeks.`,
  ];
  return (
    <div className="border-[2.5px] border-[var(--fr-ink)] bg-[var(--fr-paper)] shadow-[8px_8px_0_var(--fr-ink)] px-6 py-5">
      <div className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3">HOW IT WORKS</div>
      <ul className="space-y-2.5">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-fire)] text-xs font-black mt-0.5">0{i + 1}</span>
            <span className="font-[family-name:var(--font-serif-inst)] text-[15px] leading-snug opacity-85">{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PrizePool({ d }: { d: ShowdownData }) {
  return (
    <div className="border-[2.5px] border-[var(--fr-ink)] bg-[var(--fr-paper)] shadow-[8px_8px_0_var(--fr-ink)] px-6 py-5">
      <div className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3">
        PRIZE POOL &middot; <span className="text-[var(--fr-fire)]">PAID IN $FIRE</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {d.prizes.map((amt, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <span className={`font-[family-name:var(--font-mono-jb)] text-[12px] font-black tracking-[0.1em] ${i === 0 ? "text-[var(--fr-fire)]" : "text-[var(--fr-ink)] opacity-60"}`}>
              #{i + 1}
            </span>
            <span className={`font-[family-name:var(--font-display)] tracking-[0.02em] ${i === 0 ? "text-[clamp(26px,4vw,42px)] text-[var(--fr-fire)]" : "text-[clamp(20px,3vw,30px)] text-[var(--fr-ink)]"}`}>
              ${amt.toLocaleString("en-US")}
            </span>
          </div>
        ))}
      </div>
      <p className="font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.14em] uppercase opacity-50 mt-4">
        Winner holds {d.holdWeeks} weeks
      </p>
    </div>
  );
}

function LeaderLink({ addr, children, className }: { addr: string; children: ReactNode; className?: string }) {
  return (
    <a href={`https://robinhoodchain.blockscout.com/address/${addr}`} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export default function ShowdownPage() {
  const [data, setData]       = useState<ShowdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [now, setNow]         = useState(() => Date.now() / 1000);

  // server clock offset (serverTime - localTime), keeps the countdown honest
  const offsetRef   = useRef(0);
  const prevLeadTx  = useRef<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/showdown")
        .then(r => r.json())
        .then((d: ShowdownData) => {
          if (!alive) return;
          if (!d.success) throw new Error("Showdown unavailable");
          offsetRef.current = d.serverTime - Date.now() / 1000;
          // flash when the throne changes hands
          const tx = d.currentLeader?.tx ?? null;
          if (prevLeadTx.current && tx && tx !== prevLeadTx.current) {
            setFlash(true);
            setTimeout(() => setFlash(false), 900);
          }
          prevLeadTx.current = tx;
          setData(d);
          setError(null);
          setLoading(false);
        })
        .catch(e => {
          if (!alive) return;
          setError(e.message);
          setLoading(false);
        });
    };
    load();
    const id = setInterval(load, 2500);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000 + offsetRef.current), 200);
    return () => clearInterval(id);
  }, []);

  const phase     = data?.phase ?? "disabled";
  const endsAt    = data?.countdownEndsAt ?? null;
  const startsAt  = data?.startsAt ?? null;
  const remaining = endsAt != null ? Math.max(0, endsAt - now) : 0;
  const toStart   = startsAt != null ? Math.max(0, startsAt - now) : 0;
  const reset     = data?.resetSeconds ?? 60;
  const pct       = Math.max(0, Math.min(1, remaining / reset));
  const urgent    = (phase === "live" || phase === "awaiting") && remaining <= 10;

  return (
    <div className="fr-page min-h-screen bg-[var(--fr-paper)]">
      <Nav />

      <div className="max-w-[1200px] mx-auto px-6 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3.5">
            NEW SEASON &middot; LAST BUY STANDING &middot; <span className="text-[var(--fr-fire)]">{reset}s SUDDEN DEATH</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(48px,8vw,120px)] leading-[0.9] tracking-[0.005em]">
            Show<em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)] [-webkit-text-stroke:2px_var(--fr-ink)]">down.</em>
          </h1>
          <p className="font-[family-name:var(--font-serif-inst)] italic text-[22px] mt-4 opacity-75 max-w-2xl">
            Take the lead with a buy and the clock snaps back to {reset}. Hold the throne when it hits zero and the pot is yours.
            May the most relentless bidder win.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-[2.5px] border-[var(--fr-fire)] border-t-transparent rounded-full animate-spin mb-5" />
            <p className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-ink)] opacity-50 text-xs tracking-[0.1em]">Reading the chain...</p>
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <p className="font-[family-name:var(--font-display)] text-[var(--fr-ink)] text-3xl mb-3">Failed to load</p>
            <p className="text-[var(--fr-ink)] opacity-50 text-sm">{error}</p>
          </div>
        ) : !data || !data.enabled || phase === "disabled" ? (
          <div className="space-y-8">
            <div className="border-[2.5px] border-[var(--fr-ink)] bg-[var(--fr-paper)] shadow-[8px_8px_0_var(--fr-ink)] px-8 py-12 text-center">
              <p className="font-[family-name:var(--font-display)] text-[clamp(28px,4vw,44px)] text-[var(--fr-ink)]">Starting soon</p>
              <p className="font-[family-name:var(--font-serif-inst)] italic text-lg opacity-65 mt-3">
                The Showdown opens Mon Jun 15 (~4 PM EDT), the moment the Biggest Buy season closes.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {data && <PrizePool d={data} />}
              {data && <Rules d={data} />}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ── Countdown stage ── */}
            <div
              className={`relative border-[3px] border-[var(--fr-ink)] bg-[var(--fr-paper)] overflow-hidden transition-shadow duration-300 ${
                flash ? "shadow-[12px_12px_0_var(--fr-fire)]" : "shadow-[10px_10px_0_var(--fr-ink)]"
              }`}
            >
              {/* progress bar */}
              {(phase === "live" || phase === "awaiting") && (
                <div className="absolute top-0 left-0 right-0 h-2 bg-[var(--fr-line)]">
                  <div
                    className={`h-full ${urgent ? "bg-[var(--fr-fire)] animate-pulse" : "bg-[var(--fr-fire)]"}`}
                    style={{ width: `${pct * 100}%`, transition: "width 200ms linear" }}
                  />
                </div>
              )}

              <div className="px-6 sm:px-10 py-10 sm:py-14 text-center">
                {phase === "scheduled" && (
                  <>
                    <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-4">
                      THE SHOWDOWN BEGINS IN{data.auto && !data.startResolved ? " (EST.)" : ""}
                    </div>
                    {startsAt != null ? (
                      <div className="font-[family-name:var(--font-display)] text-[clamp(48px,11vw,140px)] leading-none tabular-nums tracking-tight">{fmtLong(toStart)}</div>
                    ) : (
                      <div className="font-[family-name:var(--font-display)] text-[clamp(36px,7vw,84px)] leading-none">Soon</div>
                    )}
                    <p className="font-[family-name:var(--font-serif-inst)] italic text-lg opacity-65 mt-5">
                      {data.auto
                        ? "Opens the instant the Biggest Buy season closes. The first buy after the bell takes the throne."
                        : "Get ready. The first buy after the bell takes the throne."}
                    </p>
                  </>
                )}

                {phase === "awaiting" && (
                  <>
                    <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase text-[var(--fr-fire)] mb-4">OPEN &middot; FIRST BUY CLAIMS THE THRONE</div>
                    <div className={`font-[family-name:var(--font-display)] text-[clamp(90px,22vw,260px)] leading-none tabular-nums ${urgent ? "text-[var(--fr-fire)]" : "text-[var(--fr-ink)]"}`}>
                      {Math.ceil(remaining)}
                    </div>
                    <p className="font-[family-name:var(--font-serif-inst)] italic text-lg opacity-65 mt-2">
                      No leader yet — buy now and the {reset}-second clock is yours to reset.
                    </p>
                  </>
                )}

                {phase === "live" && data.currentLeader && (
                  <>
                    <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3">CLOCK</div>
                    <div className={`font-[family-name:var(--font-display)] text-[clamp(90px,22vw,260px)] leading-none tabular-nums ${urgent ? "text-[var(--fr-fire)] animate-pulse" : "text-[var(--fr-ink)]"}`}>
                      {Math.ceil(remaining)}
                    </div>
                    <div className="font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.24em] uppercase opacity-50 -mt-1">seconds left</div>

                    <div className="mt-8 inline-flex flex-col items-center gap-1 border-2 border-[var(--fr-ink)] bg-[var(--fr-fire)] text-white px-6 py-4 shadow-[5px_5px_0_var(--fr-ink)]">
                      <span className="font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.2em] uppercase opacity-90">CURRENT LEADER</span>
                      <LeaderLink addr={data.currentLeader.wallet} className="font-[family-name:var(--font-mono-jb)] text-lg font-black no-underline text-white hover:underline">
                        {shortAddr(data.currentLeader.wallet)}
                      </LeaderLink>
                      <span className="font-[family-name:var(--font-display)] text-[clamp(28px,5vw,48px)] leading-none mt-1">{fmtUsd(data.currentLeader.usdSpent)}</span>
                      <span className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-90">{fmtFire(data.currentLeader.fire)} FIRE</span>
                    </div>

                    {data.nextThresholdUsd != null && (
                      <p className="font-[family-name:var(--font-serif-inst)] italic text-lg opacity-80 mt-6">
                        Steal the throne: buy <span className="font-[family-name:var(--font-mono-jb)] not-italic font-black text-[var(--fr-fire)]">{fmtUsd(data.nextThresholdUsd)}+</span> before zero
                        <span className="opacity-60 text-sm"> (+{data.minPct}% or +${data.minAbsUsd})</span>
                      </p>
                    )}
                  </>
                )}

                {phase === "ended" && data.currentLeader && (
                  <>
                    <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase text-[var(--fr-fire)] mb-3">CLOCK HIT ZERO &middot; WINNER</div>
                    <div className="text-[clamp(60px,12vw,120px)] leading-none">🏆</div>
                    <LeaderLink addr={data.currentLeader.wallet} className="block font-[family-name:var(--font-display)] text-[clamp(32px,6vw,72px)] leading-none mt-3 no-underline text-[var(--fr-ink)] hover:text-[var(--fr-fire)]">
                      {shortAddr(data.currentLeader.wallet)}
                    </LeaderLink>
                    <p className="font-[family-name:var(--font-display)] text-[var(--fr-fire)] text-[clamp(24px,4vw,40px)] mt-2">{fmtUsd(data.currentLeader.usdSpent)} &middot; wins ${data.prizes[0].toLocaleString("en-US")}</p>
                    <p className="font-[family-name:var(--font-serif-inst)] italic text-lg opacity-65 mt-3">
                      Held the throne at the buzzer. Must hold {data.holdWeeks} weeks. Season over.
                    </p>
                  </>
                )}

                {phase === "void" && (
                  <>
                    <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3">NO CONTEST</div>
                    <p className="font-[family-name:var(--font-display)] text-[clamp(28px,4vw,44px)]">No bids before the bell</p>
                    <p className="font-[family-name:var(--font-serif-inst)] italic text-lg opacity-65 mt-3">
                      Nobody bought within the opening {reset} seconds. The throne went unclaimed.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* ── Podium (ended) ── */}
            {phase === "ended" && data.podium.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {data.podium.map((p, i) => (
                  <LeaderLink
                    key={p.wallet}
                    addr={p.wallet}
                    className={`bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] p-6 shadow-[8px_8px_0_var(--fr-ink)] hover:translate-x-[-3px] hover:translate-y-[-3px] transition-all duration-200 no-underline text-[var(--fr-ink)] block ${i === 0 ? "hover:shadow-[11px_11px_0_var(--fr-fire)]" : "hover:shadow-[11px_11px_0_var(--fr-ink)]"}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <RankBadge rank={i + 1} />
                      <span className="text-[10px] font-[family-name:var(--font-mono-jb)] font-bold px-2.5 py-1 rounded-full border border-[var(--fr-ink)] bg-[var(--fr-fire)] text-white">
                        WINS ${data.prizes[i]?.toLocaleString("en-US")}
                      </span>
                    </div>
                    <p className="font-[family-name:var(--font-mono-jb)] text-sm font-bold mb-3">{shortAddr(p.wallet)}</p>
                    <div className="flex justify-between text-xs">
                      <span className="opacity-50 font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.1em] uppercase">Lead Buy</span>
                      <span className="font-[family-name:var(--font-mono-jb)] font-bold text-[var(--fr-fire)] text-base">{fmtUsd(p.usdSpent)}</span>
                    </div>
                  </LeaderLink>
                ))}
              </div>
            )}

            {/* ── Prizes + Rules ── */}
            <div className="grid md:grid-cols-2 gap-6">
              <PrizePool d={data} />
              <Rules d={data} />
            </div>

            {/* ── Lead history ── */}
            {data.leadHistory.length > 0 && (
              <div className="border-[2.5px] border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-ink)] overflow-hidden">
                <div className="bg-[var(--fr-ink)] text-[var(--fr-paper)] px-5 py-3 flex items-center justify-between">
                  <span className="font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.2em] uppercase">Takeover Feed</span>
                  <span className="font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.2em] uppercase opacity-70">{data.totalBids} leads</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody className="bg-[var(--fr-paper)]">
                      {data.leadHistory.map((l, i) => (
                        <tr key={`${l.tx}-${i}`} className="border-b border-[var(--fr-line)] hover:bg-[rgba(255,91,31,0.08)] transition-colors">
                          <td className="px-5 py-3">
                            {i === 0 && !data.ended ? (
                              <span className="font-[family-name:var(--font-mono-jb)] text-[9px] font-black tracking-[0.1em] px-2 py-0.5 rounded-full bg-[var(--fr-fire)] text-white">LEADING</span>
                            ) : (
                              <span className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-ink)] opacity-40 text-xs">#{data.leadHistory.length - i}</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <LeaderLink addr={l.wallet} className="font-[family-name:var(--font-mono-jb)] text-xs font-bold no-underline text-[var(--fr-ink)] hover:text-[var(--fr-fire)]">
                              {shortAddr(l.wallet)}
                            </LeaderLink>
                          </td>
                          <td className="px-5 py-3 text-right font-[family-name:var(--font-mono-jb)] text-xs font-bold text-[var(--fr-fire)]">{fmtUsd(l.usdSpent)}</td>
                          <td className="px-5 py-3 text-right font-[family-name:var(--font-mono-jb)] text-xs text-[var(--fr-ink)] opacity-70 hidden sm:table-cell">{fmtFire(l.fire)} FIRE</td>
                          <td className="px-5 py-3 text-right hidden md:table-cell">
                            <a href={`https://robinhoodchain.blockscout.com/tx/${l.tx}`} target="_blank" rel="noopener noreferrer" className="font-[family-name:var(--font-mono-jb)] text-xs text-[var(--fr-ink)] opacity-60 no-underline hover:opacity-100 hover:text-[var(--fr-fire)]">
                              {shortTx(l.tx)}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between flex-wrap gap-3 font-[family-name:var(--font-mono-jb)] text-[11px] tracking-[0.16em] uppercase opacity-55">
              <span>Clock driven by onchain block timestamps. Beat by {data.minPct}% or ${data.minAbsUsd}.</span>
              <span>Not financial advice. <em className="font-[family-name:var(--font-serif-inst)] italic normal-case tracking-normal text-sm">Possibly spiritual advice.</em></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
