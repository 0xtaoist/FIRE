"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HolderEntry = {
  address: string;
  balance: number;
  balanceUsd: number;
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

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: n >= 1 ? 0 : 2 })}`;
}

function fmtPct(n: number): string {
  // n is already a human-readable percentage (e.g. 3.0 for 3%)
  if (n < 0.01) return "<0.01%";
  return `${n.toFixed(2)}%`;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function tierBadge(days: number): { label: string; color: string } {
  if (days >= 30) return { label: "Diamond", color: "bg-fire text-white" };
  if (days >= 14) return { label: "Iron", color: "bg-ink text-white" };
  if (days >= 7) return { label: "Steady", color: "bg-ink-light text-white" };
  return { label: "Fresh", color: "bg-divider text-ink" };
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-8 h-8 bg-fire rounded-full flex items-center justify-center">
      <img src="/icons/diamond-01.svg" alt="1st" className="w-4 h-4 invert" />
    </div>
  );
  if (rank === 2) return (
    <div className="w-7 h-7 bg-ink rounded-full flex items-center justify-center">
      <span className="text-white font-mono text-xs font-black">2</span>
    </div>
  );
  if (rank === 3) return (
    <div className="w-7 h-7 bg-ink-light rounded-full flex items-center justify-center">
      <span className="text-white font-mono text-xs font-black">3</span>
    </div>
  );
  return <span className="font-mono text-ink-muted text-sm">#{rank}</span>;
}

export default function LeaderboardPage() {
  const [holders, setHolders] = useState<HolderEntry[]>([]);
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
        setUpdatedAt(data.updatedAt);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Nav */}
        <nav className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group w-fit">
            <div className="bg-ink text-cream font-black text-xs px-2.5 py-1 rounded-lg">$FIRE</div>
            <span className="font-mono text-ink-muted text-xs group-hover:text-fire transition-colors">/ leaderboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-mono text-xs text-fire hover:underline">
              Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="bg-fire hover:bg-fire-dark text-white font-mono text-xs px-4 py-2 rounded transition-colors"
            >
              Claim Rewards
            </Link>
          </div>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-2">Weekly Best Holders</p>
          <h1 className="font-serif font-black text-ink text-3xl sm:text-4xl leading-tight mb-2">
            Leaderboard
          </h1>
          <p className="text-ink-light text-sm max-w-lg">
            Ranked by holdings. The biggest bags rise to the top.
            Diamond hands hold the longest.
          </p>
          {updatedAt && (
            <p className="font-mono text-ink-muted text-[10px] mt-2">
              Updated {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-fire border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-mono text-ink-muted text-xs">Loading on-chain data...</p>
            <p className="font-mono text-ink-muted text-[10px] mt-1">This may take a moment</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="font-serif font-black text-ink text-xl mb-2">Failed to load</p>
            <p className="text-ink-muted text-sm">{error}</p>
          </div>
        ) : (
          <>
            {/* Top 3 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {holders.slice(0, 3).map((h, i) => {
                const tier = tierBadge(h.daysHeld);
                return (
                  <div
                    key={h.address}
                    className={`bg-white border rounded-xl p-5 ${i === 0 ? "border-fire shadow-lg ring-1 ring-fire/20" : "border-divider"}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <RankBadge rank={i + 1} />
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${tier.color}`}>
                        {tier.label}
                      </span>
                    </div>
                    <p className="font-mono text-ink text-sm font-bold mb-1">{shortAddr(h.address)}</p>
                    {h.isWhale && <span className="text-[10px] font-mono text-fire">Whale</span>}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-ink-muted">Holdings</span>
                        <span className="font-mono font-bold text-ink">{fmtTokens(h.balance)} FIRE</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-ink-muted">Value</span>
                        <span className="font-mono font-bold text-fire">{fmtUsd(h.balanceUsd)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-ink-muted">Hold Time</span>
                        <span className="font-mono font-bold text-ink">{Math.floor(h.daysHeld)}d</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table for rest */}
            {holders.length > 3 && (
              <div className="bg-white border border-divider rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-divider bg-cream/50">
                        <th className="text-left font-mono text-ink-muted text-[10px] tracking-wider uppercase px-4 py-3 w-12">Rank</th>
                        <th className="text-left font-mono text-ink-muted text-[10px] tracking-wider uppercase px-4 py-3">Address</th>
                        <th className="text-right font-mono text-ink-muted text-[10px] tracking-wider uppercase px-4 py-3">Holdings</th>
                        <th className="text-right font-mono text-ink-muted text-[10px] tracking-wider uppercase px-4 py-3 hidden sm:table-cell">Value</th>
                        <th className="text-right font-mono text-ink-muted text-[10px] tracking-wider uppercase px-4 py-3 hidden md:table-cell">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holders.slice(3).map((h, i) => {
                        const tier = tierBadge(h.daysHeld);
                        return (
                          <tr key={h.address} className="border-b border-divider/50 hover:bg-cream/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-ink-muted text-xs">#{i + 4}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-ink text-xs font-bold">{shortAddr(h.address)}</span>
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${tier.color}`}>
                                  {tier.label}
                                </span>
                                {h.isWhale && <span className="text-[9px] font-mono text-fire">Whale</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs">{fmtTokens(h.balance)}</td>
                            <td className="px-4 py-3 text-right font-mono text-xs text-fire hidden sm:table-cell">{fmtUsd(h.balanceUsd)}</td>
                            <td className="px-4 py-3 text-right font-mono text-xs hidden md:table-cell">{Math.floor(h.daysHeld)}d</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="font-mono text-ink-muted text-[10px] text-center mt-6">
              Ranked by token balance. Selling resets your hold clock to zero.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
