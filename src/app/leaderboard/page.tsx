"use client";

/* The Board — v3 Terminal Dark leaderboard.
   Data comes from /api/leaderboard (worker DB). Reranks every Friday with
   the jackpot draw. Diamond status starts at the 90-day streak; jackpot
   eligibility starts at 30 days (contract jackpotMinStreakDays = 30). */

import { useEffect, useMemo, useState } from "react";
import { NavShell, FooterV3, Kicker, FadeUp, fmtUsd, MONO, SERIF } from "@/components/fire-v3/shared";
import { rankAtDays } from "@/lib/ranks";
import { TIER } from "@/lib/contract";

type HolderEntry = {
  address: string;
  balance: number;
  balanceUsd: number;
  jackpotWeight?: number;
  tier?: number;
  migrated?: boolean;
  jackpotEligible?: boolean;
  dividends?: Record<string, number>;
  pendingRewards: number;
  rewardsUsd: number;
  rewardSharePct: number;
  daysHeld: number;
  isWhale: boolean;
  score: number;
};

function fmtTokens(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* Spark → Iron → Steel → Forged → Tempered → Diamond. The thresholds and
   labels now come from the shared ladder (src/lib/ranks.ts) so the board, the
   daily check-in and the OG share cards can't drift apart again — only the
   styling stays local: green from FORGED (90d) up, where the multiplier maxes
   and jackpot entry opens. */
function tierBadge(days: number): { label: string; cls: string } {
  const rank = rankAtDays(days);
  const cls =
    rank.atDays >= TIER.rampDays
      ? "border-[var(--fv-green)] text-[var(--fv-green)]"
      : rank.key === "steel"
        ? "border-[var(--fv-line-strong)] text-[var(--fv-text)]"
        : rank.key === "iron"
          ? "border-[var(--fv-line-strong)] text-[var(--fv-muted)]"
          : "border-[var(--fv-line)] text-[var(--fv-faint)]";
  return { label: rank.label, cls };
}

const PODIUM_LABELS = ["Top dog", "Closer", "Rainmaker"];

/* ── Monthly Leaderboard — August cohort survival curve ──
   Wallets whose current streak STARTED this month. The chart shows how many
   of that cohort remain unbroken as the month progresses — a survival curve.
   Fresh cohort on the 1st (UTC). Styled in brand palette (--fv-green #00c805). */

type SurvivalPoint = { day: number; alive: number };
type MonthlyEntry = { address: string; streakDays: number; startedAt: string; balance: number; balanceUsd: number };
type MonthlyData = {
  cohortLabel: string; resetsAt: string; count: number;
  startedInMonth: number; stillUnbroken: number; survivalRate: number; monthDay: number;
  survivalSeries: SurvivalPoint[]; entries: MonthlyEntry[];
};

function SurvivalChart({ series, cap }: { series: SurvivalPoint[]; cap: number }) {
  // dimensions in an SVG viewBox; responsive via width:100%
  const W = 720, H = 300, padL = 40, padR = 16, padT = 16, padB = 28;
  const days = series.length;
  if (!days) return null;
  const yMax = Math.max(cap, ...series.map((s) => s.alive));
  // round yMax up to a clean tick
  const tick = yMax <= 10 ? 2 : yMax <= 50 ? 10 : yMax <= 100 ? 20 : 50;
  const yTop = Math.ceil(yMax / tick) * tick || tick;
  const x = (d: number) => padL + ((d - 1) / Math.max(1, days - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / yTop) * (H - padT - padB);

  // build a stepped path (survival curves are step functions)
  let d = `M ${x(series[0].day)} ${y(series[0].alive)}`;
  for (let i = 1; i < series.length; i++) {
    d += ` L ${x(series[i].day)} ${y(series[i - 1].alive)} L ${x(series[i].day)} ${y(series[i].alive)}`;
  }
  // area fill path (down to baseline)
  const area = `${d} L ${x(series[series.length - 1].day)} ${y(0)} L ${x(series[0].day)} ${y(0)} Z`;

  const yTicks: number[] = [];
  for (let v = 0; v <= yTop; v += tick) yTicks.push(v);
  const xTicks = series.filter((_, i) => days <= 14 || i % Math.ceil(days / 14) === 0).map((s) => s.day);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Streak survival curve">
      <defs>
        <linearGradient id="fvSurvFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--fv-green)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--fv-green)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--fv-line)" strokeWidth="1" />
          <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize="11" fill="var(--fv-faint)" fontFamily="var(--font-mono, monospace)">{v}</text>
        </g>
      ))}
      {xTicks.map((dd) => (
        <text key={dd} x={x(dd)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--fv-faint)" fontFamily="var(--font-mono, monospace)">{dd}</text>
      ))}
      <path d={area} fill="url(#fvSurvFill)" />
      <path d={d} fill="none" stroke="var(--fv-green)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function MonthlySection() {
  const [data, setData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/monthly-leaderboard")
      .then((r) => { if (!r.ok) throw new Error("Failed to load"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-28">
      <div className="w-9 h-9 border-2 border-[var(--fv-green)] border-t-transparent rounded-full animate-spin mb-5" />
      <p className={`${MONO} text-xs tracking-[0.15em] text-[var(--fv-muted)] uppercase`}>Assembling the cohort…</p>
    </div>
  );
  if (error || !data) return (
    <div className="text-center py-28">
      <p className="text-2xl font-semibold mb-2">Board&apos;s down</p>
      <p className={`${MONO} text-sm text-[var(--fv-muted)]`}>{error ?? "no data"}</p>
    </div>
  );

  const daysToReset = Math.max(0, Math.ceil((new Date(data.resetsAt).getTime() - Date.now()) / 86400000));
  const monthName = (data.cohortLabel || "").split(" ")[0] || "this month";
  const leaders = data.entries.slice(0, 5);

  const stat = (label: string, value: string) => (
    <div>
      <p className={`${MONO} text-[11px] sm:text-xs tracking-[0.12em] uppercase text-[var(--fv-muted)] mb-1.5`}>{label}</p>
      <p className="text-[32px] sm:text-[40px] font-semibold leading-none tracking-tight">{value}</p>
    </div>
  );

  return (
    <>
      <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-8 mb-5 tracking-[0.06em]`}>
        Wallets whose streak began in {monthName}, and how many are still unbroken as the month runs.
        Fresh cohort in {daysToReset}d.
      </p>

      {data.startedInMonth === 0 ? (
        <div className="fv-panel p-10 text-center mt-2">
          <p className="text-xl font-semibold mb-2">Nobody yet.</p>
          <p className={`${MONO} text-sm text-[var(--fv-muted)]`}>
            No streaks started in {data.cohortLabel} so far. First buy plants the flag.
          </p>
        </div>
      ) : (
        <>
          {/* stat row */}
          <FadeUp>
            <div className="grid grid-cols-3 gap-4 sm:gap-8 mb-8">
              {stat(`Started in ${monthName}`, String(data.startedInMonth))}
              {stat("Still unbroken", String(data.stillUnbroken))}
              {stat("Survival rate", `${data.survivalRate}%`)}
            </div>
          </FadeUp>

          {/* survival curve */}
          <FadeUp delay={80}>
            <div className="fv-panel p-4 sm:p-6">
              <SurvivalChart series={data.survivalSeries} cap={data.startedInMonth} />
              <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-3 text-center tracking-[0.08em]`}>
                Day of streak (1–{data.monthDay}) · wallets still holding
              </p>
            </div>
          </FadeUp>

          {/* longest-streak leaders — compact, chart is the headline */}
          {leaders.length > 0 && (
            <FadeUp delay={140}>
              <div className="mt-8">
                <p className={`${MONO} text-[10px] tracking-[0.18em] uppercase text-[var(--fv-muted)] mb-3`}>
                  Longest {monthName} streaks
                </p>
                <div className="fv-panel divide-y divide-[var(--fv-line)]">
                  {leaders.map((h, i) => (
                    <div key={h.address} className="flex items-center justify-between px-4 sm:px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`${MONO} text-[11px] ${i === 0 ? "text-[var(--fv-green)]" : "text-[var(--fv-faint)]"}`}>#{i + 1}</span>
                        <span className={`${MONO} text-xs sm:text-sm font-medium truncate`}>{shortAddr(h.address)}</span>
                      </div>
                      <span className={`${MONO} text-xs sm:text-sm text-[var(--fv-green)] shrink-0`}>{Math.floor(h.streakDays)}d</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          )}
        </>
      )}
    </>
  );
}

export default function LeaderboardPage() {
  const [holders, setHolders] = useState<HolderEntry[]>([]);
  const [totals, setTotals] = useState<{ holders: number; diamond: number; steady: number; totalValueUsd: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        setHolders(data.holders);
        if (data.totals) setTotals(data.totals);
        setUpdatedAt(data.updatedAt);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const [boardMode, setBoardMode] = useState<"all" | "monthly">("all");
  const [sortBy, setSortBy] = useState<"score" | "balance" | "streak" | "jackpot">("streak");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const SORTS = [
    { id: "score" as const,   label: "Dividend weight", note: "bag × tier — what sets your payout" },
    { id: "balance" as const, label: "Balance",         note: "raw $FIRE held" },
    { id: "streak" as const,  label: "Streak",          note: "days held, unbroken" },
    { id: "jackpot" as const, label: "Jackpot odds",    note: "streak × bag — 30d+ only" },
  ];

  const ranked = useMemo(() => {
    const list = [...holders];
    switch (sortBy) {
      case "balance": return list.sort((a, b) => b.balance - a.balance);
      case "streak":  return list.sort((a, b) => b.daysHeld - a.daysHeld || b.balance - a.balance);
      case "jackpot": return list
        .filter((h) => (h.jackpotEligible ?? h.daysHeld >= 30))
        .sort((a, b) => (b.jackpotWeight ?? b.daysHeld * b.balance) - (a.jackpotWeight ?? a.daysHeld * a.balance));
      default:        return list.sort((a, b) => b.score - a.score);
    }
  }, [holders, sortBy]);

  const rest = ranked.slice(3);
  const pageCount = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pageRows = rest.slice(pageStart, pageStart + PAGE_SIZE);

  const totalValue = totals?.totalValueUsd ?? holders.reduce((s, h) => s + h.balanceUsd, 0);
  const diamondCount = totals?.diamond ?? holders.filter((h) => h.daysHeld >= 90).length;
  const steadyCount = totals?.steady ?? holders.filter((h) => h.daysHeld >= 30).length;

  return (
    <div className="fv-page min-h-screen">
      <NavShell active="board" />

      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 py-14 sm:py-20">
        {/* header */}
        <FadeUp>
          <Kicker>The board · reranks every Friday</Kicker>
          <h1 className="text-[clamp(38px,6vw,72px)] leading-[1.02] tracking-[-0.03em] font-semibold [text-wrap:balance]">
            Ranked by who <em className={`${SERIF} italic font-normal text-[var(--fv-green)]`}>stays.</em>
          </h1>
          <p className="text-[15px] leading-[1.65] text-[var(--fv-muted)] mt-4 max-w-[560px] [text-wrap:pretty]">
            Streaks on display, receipts public. Diamond status starts at day 90. The Friday
            jackpot opens earlier — a 30-day streak puts you in the draw.
          </p>
          {updatedAt && (
            <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-4 tracking-[0.12em] uppercase`}>
              Updated {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </FadeUp>

        {/* stats strip (all-time figures — hidden in monthly view) */}
        {boardMode === "all" && !loading && !error && holders.length > 0 && (
          <FadeUp delay={80}>
            <div className="fv-panel grid grid-cols-3 mt-10 overflow-hidden">
              {[
                { label: "Value on the board", value: fmtUsd(totalValue) },
                { label: "Diamond hands (90d+)", value: String(diamondCount) },
                { label: "Holding 30d+", value: String(steadyCount) },
              ].map((s, i) => (
                <div key={s.label} className={`p-5 sm:p-7 text-center ${i < 2 ? "border-r border-[var(--fv-line)]" : ""}`}>
                  <p className={`${MONO} text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-[var(--fv-muted)] mb-2`}>{s.label}</p>
                  <p className={`${MONO} text-[clamp(20px,3.5vw,34px)] font-medium leading-none`}>{s.value}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        )}

        {/* board mode: all-time vs this month's cohort */}
        <div className="flex flex-wrap items-center gap-1.5 mt-10">
          {([["all", "All-time"], ["monthly", "Monthly"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setBoardMode(id)}
              className={`${MONO} text-[11px] tracking-[0.08em] uppercase rounded-full px-4 py-1.5 border transition-colors ${
                boardMode === id
                  ? "bg-[var(--fv-green)] text-[var(--fv-bg,#0b0a07)] border-[var(--fv-green)]"
                  : "border-[var(--fv-line)] text-[var(--fv-muted)] hover:text-[var(--fv-text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* content */}
        {boardMode === "monthly" ? (
          <MonthlySection />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-28">
            <div className="w-9 h-9 border-2 border-[var(--fv-green)] border-t-transparent rounded-full animate-spin mb-5" />
            <p className={`${MONO} text-xs tracking-[0.15em] text-[var(--fv-muted)] uppercase`}>Reading the tape…</p>
          </div>
        ) : error ? (
          <div className="text-center py-28">
            <p className="text-2xl font-semibold mb-2">Board&apos;s down</p>
            <p className={`${MONO} text-sm text-[var(--fv-muted)]`}>{error}</p>
          </div>
        ) : (
          <>
            {/* sort tabs */}
            <div className="flex flex-wrap items-center gap-1.5 mt-6 mb-1">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSortBy(s.id); setPage(0); }}
                  title={s.note}
                  className={`${MONO} text-[11px] tracking-[0.08em] uppercase rounded-full px-3.5 py-1.5 border transition-colors ${
                    sortBy === s.id
                      ? "border-[var(--fv-green)] text-[var(--fv-green)]"
                      : "border-[var(--fv-line)] text-[var(--fv-muted)] hover:text-[var(--fv-text)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mb-4`}>
              {SORTS.find((s) => s.id === sortBy)?.note}
              {sortBy === "jackpot"
                ? ` · ${(totals?.diamond ?? ranked.length).toLocaleString()} wallets in the draw protocol-wide`
                : totals ? ` · showing top ${holders.length.toLocaleString()} of ${totals.holders.toLocaleString()} holders` : ""}
            </p>

            {/* podium */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5">
              {ranked.slice(0, 3).map((h, i) => {
                const tier = tierBadge(h.daysHeld);
                return (
                  <FadeUp key={h.address} delay={i * 80}>
                    <div className={`fv-panel p-6 h-full ${i === 0 ? "border-[rgba(0,200,5,0.35)]" : ""}`}>
                      <div className="flex items-center justify-between mb-5">
                        <span className={`${MONO} text-[10px] tracking-[0.2em] uppercase text-[var(--fv-green)]`}>{PODIUM_LABELS[i]}</span>
                        <span className={`${MONO} text-[9px] tracking-[0.14em] px-2.5 py-1 border rounded-full ${tier.cls}`}>{tier.label}</span>
                      </div>
                      <p className={`${MONO} text-[34px] font-medium leading-none mb-3 ${i === 0 ? "text-[var(--fv-green)]" : ""}`}>#{i + 1}</p>
                      <p className={`${MONO} text-sm font-medium mb-5`}>{shortAddr(h.address)}</p>
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-baseline border-t border-[var(--fv-line)] pt-2.5">
                          <span className={`${MONO} text-[10px] tracking-[0.12em] uppercase text-[var(--fv-muted)]`}>Bag</span>
                          <span className={`${MONO} text-xs`}>{fmtTokens(h.balance)} FIRE</span>
                        </div>
                        <div className="flex justify-between items-baseline border-t border-[var(--fv-line)] pt-2.5">
                          <span className={`${MONO} text-[10px] tracking-[0.12em] uppercase text-[var(--fv-muted)]`}>Value</span>
                          <span className={`${MONO} text-xs text-[var(--fv-green)]`}>{fmtUsd(h.balanceUsd)}</span>
                        </div>
                        <div className="flex justify-between items-baseline border-t border-[var(--fv-line)] pt-2.5">
                          <span className={`${MONO} text-[10px] tracking-[0.12em] uppercase text-[var(--fv-muted)]`}>Streak</span>
                          <span className={`${MONO} text-xs`}>
                            {Math.floor(h.daysHeld)}d
                            {(h.jackpotEligible ?? h.daysHeld >= 30) && <span className="text-[var(--fv-green)]"> · in the draw</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </FadeUp>
                );
              })}
            </div>

            {/* mobile: card rows (a 5-column table on a phone loses Value + Streak) */}
            {ranked.length > 3 && (
              <div className="sm:hidden fv-panel mt-5 divide-y divide-[var(--fv-line)]">
                {pageRows.map((h, i) => {
                  const tier = tierBadge(h.daysHeld);
                  return (
                    <div key={h.address} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`${MONO} text-[10px] text-[var(--fv-faint)]`}>#{pageStart + i + 4}</span>
                          <span className={`${MONO} text-xs font-medium truncate`}>{shortAddr(h.address)}</span>
                        </div>
                        <span className={`${MONO} text-[8px] tracking-[0.12em] px-2 py-0.5 border rounded-full shrink-0 ${tier.cls}`}>{tier.label}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className={`${MONO} text-[11px] text-[var(--fv-muted)]`}>{fmtTokens(h.balance)} FIRE</span>
                        <span className={`${MONO} text-[11px] text-[var(--fv-green)]`}>{fmtUsd(h.balanceUsd)}</span>
                        <span className={`${MONO} text-[11px] text-[var(--fv-muted)]`}>
                          {Math.floor(h.daysHeld)}d{h.daysHeld >= 90 ? " ◆" : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* table (sm and up) */}
            {ranked.length > 3 && (
              <FadeUp delay={120} className="hidden sm:block">
                <div className="fv-panel mt-5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--fv-line-strong)]">
                          {["Rank", "Address", "Bag", "Value", "Streak"].map((th, i) => (
                            <th
                              key={th}
                              className={`${MONO} text-[10px] tracking-[0.18em] uppercase text-[var(--fv-muted)] px-5 py-4 font-medium ${
                                i < 2 ? "text-left" : "text-right"
                              } ${th === "Value" ? "hidden sm:table-cell" : ""} ${th === "Streak" ? "hidden md:table-cell" : ""}`}
                            >
                              {th}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((h, i) => {
                          const tier = tierBadge(h.daysHeld);
                          return (
                            <tr key={h.address} className="border-b border-[var(--fv-line)] last:border-b-0 hover:bg-[rgba(0,200,5,0.03)] transition-colors">
                              <td className={`${MONO} px-5 py-3.5 text-xs text-[var(--fv-faint)]`}>#{pageStart + i + 4}</td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className={`${MONO} text-xs font-medium`}>{shortAddr(h.address)}</span>
                                  <span className={`${MONO} text-[8px] tracking-[0.12em] px-2 py-0.5 border rounded-full ${tier.cls}`}>{tier.label}</span>
                                </div>
                              </td>
                              <td className={`${MONO} px-5 py-3.5 text-right text-xs text-[var(--fv-muted)]`}>{fmtTokens(h.balance)}</td>
                              <td className={`${MONO} px-5 py-3.5 text-right text-xs text-[var(--fv-green)] hidden sm:table-cell`}>{fmtUsd(h.balanceUsd)}</td>
                              <td className={`${MONO} px-5 py-3.5 text-right text-xs text-[var(--fv-muted)] hidden md:table-cell`}>{Math.floor(h.daysHeld)}d</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </FadeUp>
            )}

            {/* pager */}
            {rest.length > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 mt-5">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className={`${MONO} text-[11px] tracking-[0.08em] uppercase rounded-full px-4 py-2 border transition-colors ${
                    page === 0
                      ? "border-[var(--fv-line)] text-[var(--fv-faint)] cursor-not-allowed"
                      : "border-[var(--fv-line-strong)] text-[var(--fv-muted)] hover:border-[var(--fv-green)] hover:text-[var(--fv-green)]"
                  }`}
                >
                  ← Prev
                </button>
                <span className={`${MONO} text-[10px] tracking-[0.12em] uppercase text-[var(--fv-faint)] text-center`}>
                  #{pageStart + 4}–#{Math.min(pageStart + PAGE_SIZE + 3, rest.length + 3)}
                  <span className="hidden sm:inline"> · page {page + 1} of {pageCount}</span>
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1}
                  className={`${MONO} text-[11px] tracking-[0.08em] uppercase rounded-full px-4 py-2 border transition-colors ${
                    page >= pageCount - 1
                      ? "border-[var(--fv-line)] text-[var(--fv-faint)] cursor-not-allowed"
                      : "border-[var(--fv-line-strong)] text-[var(--fv-muted)] hover:border-[var(--fv-green)] hover:text-[var(--fv-green)]"
                  }`}
                >
                  Next →
                </button>
              </div>
            )}

            <p className={`${MONO} flex justify-between flex-wrap gap-3 text-[10px] tracking-[0.14em] uppercase text-[var(--fv-faint)] mt-8`}>
              <span>Sell below half your peak and the streak resets.</span>
              <span>30d+ streak = Friday jackpot entry</span>
            </p>
          </>
        )}
      </div>

      <FooterV3 />
    </div>
  );
}
