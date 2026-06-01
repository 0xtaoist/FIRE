"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type BuyEntry = {
  rank: number;
  address: string;
  totalBought: string;
  buyCount: number;
  firstBuyBlock: number;
  lastBuyBlock: number;
  lastBuyTx: string;
};

type LeaderboardResponse = {
  success: boolean;
  competition: { startBlock: number; endBlock: number; topN: number };
  count: number;
  leaderboard: BuyEntry[];
  updatedAt: string;
};

function fmtFire(s: string): string {
  const n = parseFloat(s);
  if (!isFinite(n)) return s;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortTx(tx: string): string {
  return `${tx.slice(0, 8)}...${tx.slice(-6)}`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-9 h-9 bg-[var(--fr-fire)] border-2 border-[var(--fr-ink)] rounded-full flex items-center justify-center shadow-[3px_3px_0_var(--fr-ink)]">
      <img src="/icons/diamond-01.svg" alt="1st" className="w-4 h-4 invert" />
    </div>
  );
  if (rank === 2) return (
    <div className="w-8 h-8 bg-[var(--fr-ink)] border-2 border-[var(--fr-ink)] rounded-full flex items-center justify-center shadow-[3px_3px_0_var(--fr-ink)]">
      <span className="text-[var(--fr-paper)] font-[family-name:var(--font-mono-jb)] text-xs font-black">2</span>
    </div>
  );
  if (rank === 3) return (
    <div className="w-8 h-8 bg-[var(--fr-ember)] border-2 border-[var(--fr-ink)] rounded-full flex items-center justify-center shadow-[3px_3px_0_var(--fr-ink)]">
      <span className="text-[var(--fr-ink)] font-[family-name:var(--font-mono-jb)] text-xs font-black">3</span>
    </div>
  );
  return <span className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-ink)] opacity-50 text-sm">#{rank}</span>;
}

export default function BiggestBuyPage() {
  const [data, setData]       = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      fetch("/api/biggest-buy")
        .then(r => {
          if (!r.ok) throw new Error("Failed to load");
          return r.json();
        })
        .then((d: LeaderboardResponse) => {
          if (!d.success) throw new Error("Tracker unavailable");
          setData(d);
          setLoading(false);
        })
        .catch(e => {
          setError(e.message);
          setLoading(false);
        });
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const board = data?.leaderboard ?? [];

  return (
    <div className="fr-page min-h-screen bg-[var(--fr-paper)]">
      <nav className="flex items-center justify-between px-6 py-4 border-b-2 border-[var(--fr-ink)]">
        <Link href="/" className="flex items-center gap-2.5 no-underline text-[var(--fr-ink)] group">
          <Image src="/fire-mark.svg" alt="" width={32} height={32} className="w-8 h-8" />
          <span className="font-[family-name:var(--font-display)] text-[20px] tracking-[0.06em]">
            <span className="text-[var(--fr-fire)]">$FIRE</span>
            <small className="font-[family-name:var(--font-mono-jb)] text-[9px] tracking-[0.2em] opacity-60 block leading-none mt-0.5">CLUB &middot; RETIRE EARLY</small>
          </span>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="text-[var(--fr-ink)] no-underline text-[13px] font-semibold relative group">
            Dashboard
            <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-[var(--fr-fire)] scale-x-0 origin-left transition-transform duration-250 group-hover:scale-x-100" />
          </Link>
          <Link href="/leaderboard" className="text-[var(--fr-ink)] no-underline text-[13px] font-semibold relative group">
            Leaderboard
            <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-[var(--fr-fire)] scale-x-0 origin-left transition-transform duration-250 group-hover:scale-x-100" />
          </Link>
          <Link href="/biggest-buy" className="text-[var(--fr-ink)] no-underline text-[13px] font-semibold relative group">
            Biggest Buy
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

      <div className="max-w-[1400px] mx-auto px-6 py-12 sm:py-16">
        <div className="mb-12">
          <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3.5">CUMULATIVE BUY COMPETITION &middot; 2 WEEKS</div>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]">
            Biggest<em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)] [-webkit-text-stroke:2px_var(--fr-ink)]"> Buy.</em>
          </h1>
          <p className="font-[family-name:var(--font-serif-inst)] italic text-[22px] mt-4 opacity-75 max-w-xl">
            Stack the most FIRE during the window. Sell once and you&apos;re out.
            One transaction or a hundred — total bought is what counts.
          </p>
          {data && (
            <p className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-ink)] opacity-50 text-[10px] mt-3 tracking-[0.1em]">
              Start #{data.competition.startBlock.toLocaleString()} &middot;{" "}
              End #{data.competition.endBlock.toLocaleString()} &middot;{" "}
              Top {data.competition.topN} shown &middot;{" "}
              Updated {new Date(data.updatedAt).toLocaleString()}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-[2.5px] border-[var(--fr-fire)] border-t-transparent rounded-full animate-spin mb-5" />
            <p className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-ink)] opacity-50 text-xs tracking-[0.1em]">Loading on-chain buys...</p>
            <p className="font-[family-name:var(--font-serif-inst)] italic text-[var(--fr-ink)] opacity-40 text-sm mt-2">This may take a moment</p>
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <p className="font-[family-name:var(--font-display)] text-[var(--fr-ink)] text-3xl mb-3">Failed to load</p>
            <p className="text-[var(--fr-ink)] opacity-50 text-sm">{error}</p>
          </div>
        ) : board.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-[family-name:var(--font-display)] text-[var(--fr-ink)] text-3xl mb-3">No buys yet</p>
            <p className="text-[var(--fr-ink)] opacity-50 text-sm">First buy after block #{data?.competition.startBlock.toLocaleString()} takes #1.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              {board.slice(0, 3).map((b, i) => (
                <a
                  key={b.address}
                  href={`https://basescan.org/address/${b.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] p-6 shadow-[8px_8px_0_var(--fr-ink)] hover:translate-x-[-3px] hover:translate-y-[-3px] transition-all duration-200 no-underline text-[var(--fr-ink)] ${i === 0 ? "hover:shadow-[11px_11px_0_var(--fr-fire)]" : "hover:shadow-[11px_11px_0_var(--fr-ink)]"}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <RankBadge rank={i + 1} />
                    <span className="text-[10px] font-[family-name:var(--font-mono-jb)] font-bold px-2.5 py-1 rounded-full border border-[var(--fr-ink)] bg-[var(--fr-fire)] text-white">
                      {b.buyCount} {b.buyCount === 1 ? "BUY" : "BUYS"}
                    </span>
                  </div>
                  <p className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-ink)] text-sm font-bold mb-1">{shortAddr(b.address)}</p>
                  <div className="mt-4 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--fr-ink)] opacity-50 font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.1em] uppercase">Total Bought</span>
                      <span className="font-[family-name:var(--font-mono-jb)] font-bold text-[var(--fr-fire)]">{fmtFire(b.totalBought)} <span className="font-[family-name:var(--font-display)] tracking-[0.05em]">FIRE</span></span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-[var(--fr-line)] pt-2">
                      <span className="text-[var(--fr-ink)] opacity-50 font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.1em] uppercase">First Buy</span>
                      <span className="font-[family-name:var(--font-mono-jb)] text-[10px] text-[var(--fr-ink)] opacity-70">#{b.firstBuyBlock.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-[var(--fr-line)] pt-2">
                      <span className="text-[var(--fr-ink)] opacity-50 font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.1em] uppercase">Last Tx</span>
                      <span className="font-[family-name:var(--font-mono-jb)] text-[10px] text-[var(--fr-ink)] opacity-70">{shortTx(b.lastBuyTx)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {board.length > 3 && (
              <div className="border-[2.5px] border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-ink)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--fr-ink)] text-[var(--fr-paper)]">
                        <th className="text-left font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.2em] uppercase px-5 py-3.5 w-14">Rank</th>
                        <th className="text-left font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.2em] uppercase px-5 py-3.5">Address</th>
                        <th className="text-right font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.2em] uppercase px-5 py-3.5">Total Bought</th>
                        <th className="text-right font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.2em] uppercase px-5 py-3.5 hidden sm:table-cell">Buys</th>
                        <th className="text-right font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.2em] uppercase px-5 py-3.5 hidden md:table-cell">Last Tx</th>
                      </tr>
                    </thead>
                    <tbody className="bg-[var(--fr-paper)]">
                      {board.slice(3).map((b) => (
                        <tr key={b.address} className="border-b border-[var(--fr-line)] hover:bg-[rgba(255,91,31,0.08)] transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-ink)] opacity-50 text-xs">#{b.rank}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <a
                              href={`https://basescan.org/address/${b.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-ink)] text-xs font-bold no-underline hover:text-[var(--fr-fire)]"
                            >
                              {shortAddr(b.address)}
                            </a>
                          </td>
                          <td className="px-5 py-3.5 text-right font-[family-name:var(--font-mono-jb)] text-xs font-bold text-[var(--fr-fire)]">{fmtFire(b.totalBought)}</td>
                          <td className="px-5 py-3.5 text-right font-[family-name:var(--font-mono-jb)] text-xs text-[var(--fr-ink)] hidden sm:table-cell">{b.buyCount}</td>
                          <td className="px-5 py-3.5 text-right hidden md:table-cell">
                            <a
                              href={`https://basescan.org/tx/${b.lastBuyTx}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-[family-name:var(--font-mono-jb)] text-xs text-[var(--fr-ink)] opacity-70 no-underline hover:opacity-100 hover:text-[var(--fr-fire)]"
                            >
                              {shortTx(b.lastBuyTx)}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between flex-wrap gap-3 font-[family-name:var(--font-mono-jb)] text-[11px] tracking-[0.16em] uppercase opacity-55 mt-8">
              <span>Ranked by total FIRE bought during the window. Any sell = disqualified.</span>
              <span>Not financial advice. <em className="font-[family-name:var(--font-serif-inst)] italic normal-case tracking-normal text-sm">Possibly spiritual advice.</em></span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
