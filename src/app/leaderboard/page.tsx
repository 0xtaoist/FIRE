"use client";

/* The Board — v3 Terminal Dark leaderboard.
   Data comes from /api/leaderboard (worker DB). Reranks every Friday with
   the jackpot draw; diamond status and jackpot eligibility start at the
   90-day streak, matching the contract's jackpotMinStreakDays default. */

import { useEffect, useMemo, useState } from "react";
import { NavShell, FooterV3, Kicker, FadeUp, fmtUsd, MONO, SERIF } from "@/components/fire-v3/shared";

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

function tierBadge(days: number): { label: string; cls: string } {
  if (days >= 90)
    return { label: "DIAMOND", cls: "border-[var(--fv-green)] text-[var(--fv-green)]" };
  if (days >= 30)
    return { label: "IRON", cls: "border-[var(--fv-line-strong)] text-[var(--fv-text)]" };
  if (days >= 7)
    return { label: "STEADY", cls: "border-[var(--fv-line)] text-[var(--fv-muted)]" };
  return { label: "FRESH", cls: "border-[var(--fv-line)] text-[var(--fv-faint)]" };
}

const PODIUM_LABELS = ["Top dog", "Closer", "Rainmaker"];

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

  const [sortBy, setSortBy] = useState<"score" | "balance" | "streak" | "jackpot">("score");

  const SORTS = [
    { id: "score" as const,   label: "Dividend weight", note: "bag × tier — what sets your payout" },
    { id: "balance" as const, label: "Balance",         note: "raw $FIRE held" },
    { id: "streak" as const,  label: "Streak",          note: "days held, unbroken" },
    { id: "jackpot" as const, label: "Jackpot odds",    note: "streak × bag — 90d+ only" },
  ];

  const ranked = useMemo(() => {
    const list = [...holders];
    switch (sortBy) {
      case "balance": return list.sort((a, b) => b.balance - a.balance);
      case "streak":  return list.sort((a, b) => b.daysHeld - a.daysHeld || b.balance - a.balance);
      case "jackpot": return list
        .filter((h) => (h.jackpotEligible ?? h.daysHeld >= 90))
        .sort((a, b) => (b.jackpotWeight ?? b.daysHeld * b.balance) - (a.jackpotWeight ?? a.daysHeld * a.balance));
      default:        return list.sort((a, b) => b.score - a.score);
    }
  }, [holders, sortBy]);

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
            Streaks on display, receipts public. Diamond status starts at day 90 — the same
            streak that puts you in the Friday jackpot.
          </p>
          {updatedAt && (
            <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-4 tracking-[0.12em] uppercase`}>
              Updated {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </FadeUp>

        {/* stats strip */}
        {!loading && !error && holders.length > 0 && (
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

        {/* content */}
        {loading ? (
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
            <div className="flex flex-wrap items-center gap-1.5 mt-10 mb-1">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id)}
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
                            {h.daysHeld >= 90 && <span className="text-[var(--fv-green)]"> · in the draw</span>}
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
                {ranked.slice(3).map((h, i) => {
                  const tier = tierBadge(h.daysHeld);
                  return (
                    <div key={h.address} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`${MONO} text-[10px] text-[var(--fv-faint)]`}>#{i + 4}</span>
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
                        {ranked.slice(3).map((h, i) => {
                          const tier = tierBadge(h.daysHeld);
                          return (
                            <tr key={h.address} className="border-b border-[var(--fv-line)] last:border-b-0 hover:bg-[rgba(0,200,5,0.03)] transition-colors">
                              <td className={`${MONO} px-5 py-3.5 text-xs text-[var(--fv-faint)]`}>#{i + 4}</td>
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

            <p className={`${MONO} flex justify-between flex-wrap gap-3 text-[10px] tracking-[0.14em] uppercase text-[var(--fv-faint)] mt-8`}>
              <span>Ranked by bag. Sell big and your streak resets.</span>
              <span>90d+ streak = Friday jackpot entry</span>
            </p>
          </>
        )}
      </div>

      <FooterV3 />
    </div>
  );
}
