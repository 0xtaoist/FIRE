"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  NavNew,
  FooterNew,
  TickerTape,
  useDexData,
  fmtUsd,
  MONO,
  DISPLAY,
  SERIF,
} from "@/components/fire-new/shared";

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

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function tierBadge(days: number): { label: string; cls: string } {
  if (days >= 30)
    return { label: "DIAMOND", cls: "border-[var(--fn-gold)] text-[var(--fn-gold)] bg-[rgba(229,185,78,0.1)]" };
  if (days >= 14)
    return { label: "IRON", cls: "border-[var(--fn-cream)]/40 text-[var(--fn-cream)]/80 bg-[rgba(245,235,216,0.06)]" };
  if (days >= 7)
    return { label: "STEADY", cls: "border-[var(--fn-line-strong)] text-[var(--fn-muted)] bg-transparent" };
  return { label: "FRESH", cls: "border-[var(--fn-line)] text-[var(--fn-muted)] bg-transparent" };
}

const PODIUM = [
  {
    label: "TOP DOG",
    labelCls: "bg-[#e3b62f] text-[#0a0a0a] border-2 border-[var(--fn-edge)]",
    rank: "text-[var(--fn-fire)] [-webkit-text-stroke:2px_var(--fn-edge)]",
  },
  {
    label: "CLOSER",
    labelCls: "bg-[#0a0a0a] text-[#f1ead8] border-2 border-[var(--fn-edge)]",
    rank: "text-[var(--fn-cream)]",
  },
  {
    label: "RAINMAKER",
    labelCls: "bg-[var(--fn-fire)] text-[#0a0a0a] border-2 border-[var(--fn-edge)]",
    rank: "text-[var(--fn-fire)]",
  },
];

export default function LeaderboardNewPage() {
  const [holders, setHolders] = useState<HolderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const dex = useDexData();

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

  const totalValue = holders.reduce((s, h) => s + h.balanceUsd, 0);
  const diamondCount = holders.filter((h) => h.daysHeld >= 30).length;
  const whaleCount = holders.filter((h) => h.isWhale).length;

  return (
    <div className="fn-page min-h-screen">
      <TickerTape />
      <NavNew active="leaderboard" />

      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="relative mb-14">
          <div className={`${MONO} text-[11px] font-bold tracking-[0.3em] uppercase text-[var(--fn-gold)] mb-4 flex items-center gap-3`}>
            <span className="w-8 h-px bg-[var(--fn-line-strong)]" />
            THE SALES BOARD · WEEKLY BEST HOLDERS
          </div>
          <h1 className={`${DISPLAY} text-[clamp(48px,8vw,120px)] leading-[0.9]`}>
            THE <em className={`${SERIF} italic font-normal text-[var(--fn-fire)] [-webkit-text-stroke:2px_var(--fn-edge)]`}>board.</em>
          </h1>
          <p className={`${SERIF} italic text-lg sm:text-[22px] mt-5 text-[var(--fn-muted)] max-w-xl`}>
            Biggest bags at the top, like any honest boiler room.
            Except here nobody made a single phone call.
          </p>
          {updatedAt && (
            <p className={`${MONO} text-[10px] text-[var(--fn-muted)] mt-4 tracking-[0.12em] uppercase`}>
              Board updated {new Date(updatedAt).toLocaleString()}
            </p>
          )}

          {/* corner art */}
          <div className="absolute right-0 top-0 w-[180px] hidden xl:block opacity-90 rotate-3">
            <div className="fn-cert bg-[var(--fn-panel)] p-1.5">
              <Image src="/wojak-watch.png" alt="" width={300} height={300} className="w-full h-auto block" />
            </div>
          </div>
        </div>

        {/* Board stats strip */}
        {!loading && !error && holders.length > 0 && (
          <div className="grid grid-cols-3 border-[2.5px] border-[var(--fn-edge)] bg-[var(--fn-panel)] shadow-[7px_7px_0_var(--fn-edge)] mb-12">
            {[
              { label: "VALUE ON THE BOARD", value: fmtUsd(totalValue) },
              { label: "DIAMOND HANDS (30D+)", value: String(diamondCount) },
              { label: "WHALES (100K+)", value: String(whaleCount) },
            ].map((s, i) => (
              <div key={s.label} className={`p-5 sm:p-7 text-center ${i < 2 ? "border-r border-[var(--fn-line)]" : ""}`}>
                <p className={`${MONO} text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--fn-muted)] mb-2`}>{s.label}</p>
                <p className={`${DISPLAY} text-[clamp(22px,4vw,40px)] leading-none`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28">
            <div className="w-10 h-10 border-2 border-[var(--fn-gold)] border-t-transparent rounded-full animate-spin mb-5" />
            <p className={`${MONO} text-xs tracking-[0.15em] text-[var(--fn-muted)] uppercase`}>Reading the tape...</p>
            <p className={`${SERIF} italic text-sm mt-2 text-[var(--fn-muted)]`}>The board takes a moment to chalk up</p>
          </div>
        ) : error ? (
          <div className="text-center py-28">
            <p className={`${DISPLAY} text-3xl mb-3 text-[var(--fn-cream)]`}>BOARD&apos;S DOWN</p>
            <p className="text-sm text-[var(--fn-muted)]">{error}</p>
          </div>
        ) : (
          <>
            {/* Podium — top 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              {holders.slice(0, 3).map((h, i) => {
                const tier = tierBadge(h.daysHeld);
                const p = PODIUM[i];
                return (
                  <div key={h.address} className={`fn-card fn-card-hover relative p-6 sm:p-7 ${i === 0 ? "sm:-translate-y-3" : ""}`}>
                    <div className={`absolute -top-3 left-5 px-3 py-1 ${MONO} text-[9px] font-bold tracking-[0.25em] ${p.labelCls}`}>
                      {p.label}
                    </div>
                    <div className="flex items-center justify-between mb-5 mt-1">
                      <span className={`${DISPLAY} text-[44px] leading-none ${p.rank}`}>#{i + 1}</span>
                      <span className={`${MONO} text-[9px] font-bold tracking-[0.15em] px-2.5 py-1 border rounded-full ${tier.cls}`}>
                        {tier.label}
                      </span>
                    </div>
                    <p className={`${MONO} text-sm font-bold text-[var(--fn-cream)] mb-1`}>{shortAddr(h.address)}</p>
                    {h.isWhale && (
                      <span className={`${MONO} text-[10px] text-[var(--fn-fire)] font-bold tracking-[0.15em] uppercase`}>⟁ WHALE</span>
                    )}
                    <div className="mt-5 space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className={`${MONO} text-[10px] tracking-[0.12em] uppercase text-[var(--fn-muted)]`}>Bag</span>
                        <span className={`${MONO} text-xs font-bold text-[var(--fn-cream)]`}>
                          {fmtTokens(h.balance)} <span className="text-[var(--fn-gold)]">FIRE</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline border-t border-[var(--fn-line)] pt-3">
                        <span className={`${MONO} text-[10px] tracking-[0.12em] uppercase text-[var(--fn-muted)]`}>Value</span>
                        <span className={`${DISPLAY} text-lg text-[var(--fn-green)]`}>{fmtUsd(h.balanceUsd)}</span>
                      </div>
                      <div className="flex justify-between items-baseline border-t border-[var(--fn-line)] pt-3">
                        <span className={`${MONO} text-[10px] tracking-[0.12em] uppercase text-[var(--fn-muted)]`}>Hold time</span>
                        <span className={`${DISPLAY} text-lg text-[var(--fn-cream)]`}>
                          {Math.floor(h.daysHeld)} <span className="text-[var(--fn-muted)] text-sm">DAYS</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* The rest of the board */}
            {holders.length > 3 && (
              <div className="border-[2.5px] border-[var(--fn-edge)] shadow-[7px_7px_0_var(--fn-edge)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#0a0a0a]">
                        {["RANK", "ADDRESS", "BAG", "VALUE", "DAYS"].map((th, i) => (
                          <th
                            key={th}
                            className={`${MONO} text-[10px] tracking-[0.22em] uppercase text-[#e5b94e] px-5 py-4 font-bold ${
                              i < 2 ? "text-left" : "text-right"
                            } ${th === "VALUE" ? "hidden sm:table-cell" : ""} ${th === "DAYS" ? "hidden md:table-cell" : ""}`}
                          >
                            {th}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-[var(--fn-panel)]">
                      {holders.slice(3).map((h, i) => {
                        const tier = tierBadge(h.daysHeld);
                        return (
                          <tr key={h.address} className="border-b border-[var(--fn-line)] hover:bg-[rgba(229,185,78,0.05)] transition-colors">
                            <td className="px-5 py-4">
                              <span className={`${MONO} text-xs text-[var(--fn-muted)]`}>#{i + 4}</span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className={`${MONO} text-xs font-bold text-[var(--fn-cream)]`}>{shortAddr(h.address)}</span>
                                <span className={`${MONO} text-[8px] font-bold tracking-[0.12em] px-2 py-0.5 border rounded-full ${tier.cls}`}>
                                  {tier.label}
                                </span>
                                {h.isWhale && (
                                  <span className={`${MONO} text-[9px] text-[var(--fn-fire)] font-bold tracking-[0.08em] uppercase`}>⟁ WHALE</span>
                                )}
                              </div>
                            </td>
                            <td className={`px-5 py-4 text-right ${MONO} text-xs text-[var(--fn-cream)]/80`}>{fmtTokens(h.balance)}</td>
                            <td className={`px-5 py-4 text-right ${MONO} text-xs font-bold text-[var(--fn-green)] hidden sm:table-cell`}>{fmtUsd(h.balanceUsd)}</td>
                            <td className={`px-5 py-4 text-right ${MONO} text-xs text-[var(--fn-cream)]/70 hidden md:table-cell`}>{Math.floor(h.daysHeld)}d</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className={`flex justify-between flex-wrap gap-3 ${MONO} text-[10px] tracking-[0.15em] uppercase text-[var(--fn-muted)] mt-8`}>
              <span>Ranked by bag size. Selling resets your hold clock to zero.</span>
              <span>
                Not financial advice.{" "}
                <em className={`${SERIF} italic normal-case tracking-normal text-[13px] text-[var(--fn-gold)]`}>Possibly spiritual advice.</em>
              </span>
            </div>
          </>
        )}
      </div>

      <FooterNew />
    </div>
  );
}
