"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from "wagmi";
import { formatUnits } from "viem";
import { base } from "viem/chains";
import Link from "next/link";
import Image from "next/image";
import { FIRE_CONTRACT, FIRE_ABI } from "@/lib/contract";
import { useEffect, useState, useCallback } from "react";

// --- Helpers ---

function fmtTokens(raw: bigint | undefined, dp = 0): string {
  if (!raw) return "0";
  return Number(formatUnits(raw, 18)).toLocaleString("en-US", {
    maximumFractionDigits: dp,
  });
}

function fmtNum(n: number, dp = 0): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: dp });
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: n >= 1 ? 2 : 4 })}`;
}

function fmtDays(seconds: bigint | undefined): string {
  if (!seconds) return "0";
  const d = Number(seconds) / 86400;
  if (d < 1) return `${(Number(seconds) / 3600).toFixed(1)}h`;
  return `${d.toFixed(1)} days`;
}

function fmtDaysShort(seconds: bigint | undefined): string {
  if (!seconds) return "0";
  const d = Number(seconds) / 86400;
  if (d < 1) return `${(Number(seconds) / 3600).toFixed(1)}h`;
  return `${d.toFixed(1)}d`;
}

function fmtPct(raw: bigint | undefined): string {
  if (!raw) return "0%";
  const pct = Number(raw) / 1e16;
  if (pct < 0.01) return "<0.01%";
  return `${pct.toFixed(2)}%`;
}

// Loyalty tiers from contract: [30d → 1.5x, 60d → 2x, 90d → 2.5x, 120d → 3x]
const LOYALTY_TIERS = [
  { days: 30, multiplier: 1.5 },
  { days: 60, multiplier: 2.0 },
  { days: 90, multiplier: 2.5 },
  { days: 120, multiplier: 3.0 },
];

function getLoyaltyMultiplier(status: { loyaltyMultiplierScaled: bigint } | undefined): number {
  if (!status) return 1;
  const scaled = Number(status.loyaltyMultiplierScaled);
  return scaled > 0 ? scaled / 100 : 1;
}

function getNextTier(daysHeld: number): { days: number; multiplier: number } | null {
  for (const tier of LOYALTY_TIERS) {
    if (daysHeld < tier.days) return tier;
  }
  return null;
}

type HolderStatus = {
  balance: bigint;
  pendingRewards: bigint;
  rewardSharePct: bigint;
  secondsHeld: bigint;
  daysHeld: bigint;
  clockActive: boolean;
  windowEligible: boolean;
  maxSellToPreserveClock: bigint;
  secondsUntilNextWindow: bigint;
  isWhale: boolean;
  whaleSecondsHeld: bigint;
  whaleDaysHeld: bigint;
  rewardPoolTokens: bigint;
  rewardPoolAfterBurn: bigint;
  loyaltyMultiplierScaled: bigint;
  daysUntilNextTier: bigint;
};

// --- Price Hook ---

function useTokenPrice() {
  const [price, setPrice] = useState(0);
  useEffect(() => {
    fetch("https://api.dexscreener.com/latest/dex/pairs/base/0x4Fe3941B13AC5942E4FEa0D0a1B10E31A92E7c9A")
      .then((r) => r.json())
      .then((d) => setPrice(parseFloat(d.pair?.priceUsd || "0")))
      .catch(() => {});
    const id = setInterval(() => {
      fetch("https://api.dexscreener.com/latest/dex/pairs/base/0x4Fe3941B13AC5942E4FEa0D0a1B10E31A92E7c9A")
        .then((r) => r.json())
        .then((d) => setPrice(parseFloat(d.pair?.priceUsd || "0")))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return price;
}

// --- Multiplier Hero ---

function MultiplierHero({ status, price }: { status: HolderStatus | undefined; price: number }) {
  if (!status) return null;

  const daysHeld = Number(status.daysHeld);
  const multiplier = getLoyaltyMultiplier(status);
  const nextTier = getNextTier(daysHeld);
  const whaleDays = Number(status.whaleDaysHeld);
  // Burner needs 15 days as whale
  const burnerDaysNeeded = 15;
  const burnerProgress = status.isWhale ? Math.min(whaleDays / burnerDaysNeeded, 1) : 0;
  const burnerRemaining = status.isWhale ? Math.max(burnerDaysNeeded - whaleDays, 0) : 0;

  // Progress toward next loyalty tier
  const prevTierDays = LOYALTY_TIERS.filter(t => t.days <= daysHeld).pop()?.days ?? 0;
  const tierProgress = nextTier
    ? Math.min((daysHeld - prevTierDays) / (nextTier.days - prevTierDays), 1)
    : 1;

  return (
    <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-ink)] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200 p-6 sm:p-8">
      <div className="flex items-start justify-between mb-2">
        <p className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55">Your Multiplier</p>
        {status.isWhale && (
          <span className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-fire)] text-xs font-bold border-2 border-[var(--fr-fire)] bg-[var(--fr-fire)]/5 px-3 py-1 rounded-full">
            Whale Status Active
          </span>
        )}
      </div>

      <p className="font-[family-name:var(--font-display)] text-[var(--fr-fire)] text-6xl sm:text-7xl leading-none mt-2 mb-3">
        {multiplier.toFixed(1)}x
      </p>
      <p className="text-sm opacity-70 mb-4">
        {nextTier
          ? <>Next tier: <span className="text-[var(--fr-fire)] font-bold">{nextTier.multiplier}x</span> in {Number(status.daysUntilNextTier)} days</>
          : <span className="text-[var(--fr-fire)] font-bold">Max tier reached</span>
        }
      </p>

      {/* Tier progress bar */}
      <div className="relative mb-6">
        <div className="w-full h-2.5 bg-[rgba(10,10,10,0.1)] rounded-full overflow-hidden border-[1.5px] border-[var(--fr-ink)]">
          <div
            className="h-full bg-[var(--fr-fire)] shadow-[inset_0_0_8px_rgba(255,182,39,0.5)] rounded-full transition-all duration-500"
            style={{ width: `${tierProgress * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">
            {daysHeld} days held
          </span>
          <span className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-fire)] text-[10px] font-bold">
            {nextTier ? `${nextTier.multiplier}x at ${nextTier.days}d` : "3x max"}
          </span>
        </div>
      </div>

      {/* Whale / Burner progress */}
      <div className="relative">
        <div className="w-full h-2.5 bg-[rgba(10,10,10,0.1)] rounded-full overflow-hidden border-[1.5px] border-[var(--fr-ink)]">
          <div
            className="h-full bg-[var(--fr-fire)] shadow-[inset_0_0_8px_rgba(255,182,39,0.5)] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(burnerProgress * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">
            {status.isWhale ? `${whaleDays}d as whale` : "Not whale yet"}
          </span>
          <span className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-fire)] text-[10px] font-bold">
            {status.isWhale
              ? burnerRemaining > 0
                ? `Burner in ${burnerRemaining}d`
                : "Burner Qualified"
              : "Need whale status"}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Stats Row ---

function StatsRow({ status, price }: { status: HolderStatus | undefined; price: number }) {
  if (!status) return null;

  const balance = Number(formatUnits(status.balance, 18));
  const balanceUsd = balance * price;
  const daysHeld = Number(status.daysHeld);
  const subDayHours = Number(status.secondsHeld) / 3600;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-ink)] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200 p-5">
        <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1.5">Your Balance</p>
        <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-xl">{fmtNum(balance)} FIRE</p>
        {price > 0 && <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55 mt-1">&asymp; {fmtUsd(balanceUsd)}</p>}
      </div>
      <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-ink)] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200 p-5">
        <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1.5">Hold Time</p>
        <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-[var(--fr-fire)] text-xl">{daysHeld < 1 ? `${subDayHours.toFixed(1)} hours` : `${daysHeld} days`}</p>
        <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55 mt-1">{status.clockActive ? "Clock active" : "Clock inactive"}</p>
      </div>
      <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-ink)] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200 p-5">
        <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1.5">Payout Share</p>
        <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-xl">{fmtPct(status.rewardSharePct)}</p>
        <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55 mt-1">of total payout pool</p>
      </div>
    </div>
  );
}

// --- Claimable Payouts ---

function ClaimSection({
  status,
  price,
  address,
}: {
  status: HolderStatus | undefined;
  price: number;
  address: `0x${string}`;
}) {
  const {
    writeContract,
    data: txHash,
    isPending: isClaiming,
    error: claimError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const handleClaim = () => {
    writeContract({
      address: FIRE_CONTRACT,
      abi: FIRE_ABI,
      functionName: "transfer",
      args: [address, BigInt("1000000000000000000")],
      chain: base,
    });
  };

  const pending = status?.pendingRewards ? Number(formatUnits(status.pendingRewards, 18)) : 0;
  const pendingUsd = pending * price;
  const hasBalance = status?.balance && status.balance >= BigInt("1000000000000000000");

  return (
    <div className="bg-[var(--fr-ember)]/10 border-[2.5px] border-[var(--fr-ember)] shadow-[8px_8px_0_var(--fr-ink)] p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase text-[var(--fr-fire)]">Claimable Payouts</p>
          <p className="font-[family-name:var(--font-display)] text-[var(--fr-fire)] text-3xl sm:text-4xl leading-none mt-2">
            {fmtNum(pending)} FIRE
          </p>
          {price > 0 && (
            <p className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-fire)] text-xs mt-1 opacity-70">&asymp; {fmtUsd(pendingUsd)}</p>
          )}
        </div>
        <button
          onClick={handleClaim}
          disabled={!hasBalance || isClaiming || isConfirming}
          className="bg-[var(--fr-fire)] text-[var(--fr-ink)] border-2 border-[var(--fr-ink)] font-[family-name:var(--font-display)] text-sm px-8 py-3.5 rounded-full shadow-[5px_5px_0_var(--fr-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_var(--fr-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-ink)] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_var(--fr-ink)] tracking-[0.06em] whitespace-nowrap"
        >
          {isClaiming ? "CONFIRM IN WALLET..." : isConfirming ? "CLAIMING..." : "CLAIM PAYOUTS"}
        </button>
      </div>

      {isConfirmed && (
        <p className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-fire)] text-xs mt-3">Payouts claimed successfully.</p>
      )}
      {claimError && (
        <p className="font-[family-name:var(--font-mono-jb)] text-red-600 text-xs mt-3 max-w-md break-words">
          {claimError.message.includes("Nothing to claim") ? "No payouts to claim yet." : claimError.message.slice(0, 200)}
        </p>
      )}
    </div>
  );
}

// --- 30-Day Earnings Chart ---

function EarningsChart({ status, price }: { status: HolderStatus | undefined; price: number }) {
  if (!status || !status.balance || status.balance === BigInt(0)) return null;

  const balance = Number(formatUnits(status.balance, 18));
  const pending = Number(formatUnits(status.pendingRewards, 18));
  const daysHeld = Number(status.daysHeld);
  const elapsedDays = Number(status.secondsHeld) / 86400;
  const currentMultiplier = getLoyaltyMultiplier(status);
  const baseRate = elapsedDays > 0 && currentMultiplier > 0 ? pending / elapsedDays / currentMultiplier : 0;
  const dailyRate = baseRate * currentMultiplier;

  // Project 30 days of earnings using tiered multipliers
  const days = 30;
  const dataPoints: { day: number; earned: number; earnedUsd: number }[] = [];
  let cumulative = 0;

  for (let d = 1; d <= days; d++) {
    const futureDay = daysHeld + d;
    // Determine multiplier at futureDay
    let futureMult = 1;
    for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
      if (futureDay >= LOYALTY_TIERS[i].days) { futureMult = LOYALTY_TIERS[i].multiplier; break; }
    }
    const dayEarnings = baseRate * futureMult;
    cumulative += dayEarnings;
    dataPoints.push({
      day: d,
      earned: cumulative,
      earnedUsd: cumulative * price,
    });
  }

  const maxEarned = dataPoints[dataPoints.length - 1]?.earned || 1;
  const chartHeight = 160;

  return (
    <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-ink)] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-1">30-Day Earnings Projection</p>
          <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-[var(--fr-fire)] text-2xl">
            {fmtNum(dataPoints[days - 1]?.earned || 0)} FIRE
          </p>
          {price > 0 && (
            <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">&asymp; {fmtUsd(dataPoints[days - 1]?.earnedUsd || 0)}</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">Current daily rate</p>
          <p className="font-[family-name:var(--font-mono-jb)] font-bold text-sm">{fmtNum(dailyRate)} FIRE/day</p>
          {price > 0 && <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">{fmtUsd(dailyRate * price)}/day</p>}
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight + 30 }}>
        <svg
          viewBox={`0 0 ${days * 20} ${chartHeight + 20}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
            <line
              key={pct}
              x1={0}
              y1={chartHeight - pct * chartHeight}
              x2={days * 20}
              y2={chartHeight - pct * chartHeight}
              stroke="var(--fr-line)"
              strokeWidth={0.5}
            />
          ))}

          {/* Area fill */}
          <path
            d={`M0,${chartHeight} ${dataPoints.map((p) => `L${(p.day - 0.5) * 20},${chartHeight - (p.earned / maxEarned) * chartHeight}`).join(" ")} L${days * 20},${chartHeight} Z`}
            fill="url(#fireGradient)"
          />

          {/* Line */}
          <path
            d={`M0,${chartHeight} ${dataPoints.map((p) => `L${(p.day - 0.5) * 20},${chartHeight - (p.earned / maxEarned) * chartHeight}`).join(" ")}`}
            fill="none"
            stroke="var(--fr-fire)"
            strokeWidth={2}
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="fireGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff5b1f" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#ff5b1f" stopOpacity={0.02} />
            </linearGradient>
          </defs>
        </svg>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
          {[1, 7, 14, 21, 30].map((d) => (
            <span key={d} className="font-[family-name:var(--font-mono-jb)] text-[9px] opacity-55">Day {d}</span>
          ))}
        </div>
      </div>

      <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55 mt-3">
        <em className="font-[family-name:var(--font-serif-inst)] italic">Projections assume constant volume and payout pool. Multiplier tiers: 1.5x at 30d, 2x at 60d, 2.5x at 90d, 3x at 120d. Your actual retirement may vary.</em>
      </p>
    </div>
  );
}

// --- Cost of Selling ---

function CostOfSelling({ status, price }: { status: HolderStatus | undefined; price: number }) {
  if (!status || !status.balance || status.balance === BigInt(0)) return null;

  const pending = Number(formatUnits(status.pendingRewards, 18));
  const daysHeld = Number(status.daysHeld);
  const elapsedDays = Number(status.secondsHeld) / 86400;
  const multiplier = getLoyaltyMultiplier(status);
  const dailyRate = elapsedDays > 0 ? pending / elapsedDays : 0;
  const dailyAtBase = multiplier > 0 ? dailyRate / multiplier : 0;
  const pctLoss = dailyRate > 0 ? ((dailyRate - dailyAtBase) / dailyRate * 100) : 0;

  return (
    <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] border-l-[6px] border-l-red-500 shadow-[8px_8px_0_var(--fr-ink)] p-6">
      <p className="font-[family-name:var(--font-mono-jb)] text-red-500 text-[11px] font-bold tracking-[0.24em] uppercase mb-4 flex items-center gap-2">
        <img src="/icons/sun.svg" alt="" className="w-4 h-4 inline" /> COST OF SELLING NOW
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="font-[family-name:var(--font-mono-jb)] text-red-400 text-[10px] uppercase mb-1">Multiplier Lost</p>
          <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-[var(--fr-fire)] text-xl">{multiplier.toFixed(1)}x &rarr; 1x</p>
          <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">back to baseline</p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-mono-jb)] text-red-400 text-[10px] uppercase mb-1">Daily Payouts Lost</p>
          <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-[var(--fr-fire)] text-xl">-{pctLoss.toFixed(0)}%</p>
          <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">
            {price > 0 ? `${fmtUsd(dailyRate * price)}/day → ${fmtUsd(dailyAtBase * price)}/day` : `${fmtNum(dailyRate)} → ${fmtNum(dailyAtBase)} FIRE/day`}
          </p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-mono-jb)] text-red-400 text-[10px] uppercase mb-1">Time to Recover</p>
          <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-[var(--fr-fire)] text-xl">{daysHeld} days</p>
          <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">to rebuild current tier</p>
        </div>
      </div>
    </div>
  );
}

// --- Burn Status ---

const BURN_TIERS = [
  { name: "Dormant", threshold: "< 100 Burners", pct: "0%", active: false },
  { name: "Ignition", threshold: "100+ Burners (15d)", pct: "10%", active: false },
  { name: "Spark", threshold: "200+ Burners (30d)", pct: "20%", active: false },
  { name: "Blaze", threshold: "500+ Burners (45d)", pct: "30%", active: false },
  { name: "Inferno", threshold: "800+ Burners (60d)", pct: "40%", active: false },
];

const TIER_NAMES = ["Dormant", "Ignition", "Spark", "Blaze", "Inferno"];
const TIER_THRESHOLDS = [0, 100, 200, 500, 800];

function BurnStatus({
  status,
  burnInfo,
  price,
}: {
  status: HolderStatus | undefined;
  burnInfo: readonly [number, bigint, bigint, bigint] | undefined;
  price: number;
}) {
  const tier = burnInfo ? Number(burnInfo[0]) : 0;
  const burnPct = burnInfo ? Number(burnInfo[1]) / 100 : 0;
  const qualifyingWhales = burnInfo ? Number(burnInfo[2]) : 0;
  const totalWhales = burnInfo ? Number(burnInfo[3]) : 0;
  const tierName = TIER_NAMES[tier] || "Dormant";

  // Next tier
  const nextTierIdx = Math.min(tier + 1, TIER_NAMES.length - 1);
  const nextThreshold = TIER_THRESHOLDS[nextTierIdx];
  const progressToNext = nextThreshold > 0 ? Math.min(qualifyingWhales / nextThreshold, 1) : 0;

  // Personal whale/burner status
  const isWhale = status?.isWhale || false;
  const whaleDays = status ? Number(status.whaleDaysHeld) : 0;
  const balance = status ? Number(formatUnits(status.balance, 18)) : 0;
  const burnerDaysNeeded = 15;
  const burnerRemaining = isWhale ? Math.max(burnerDaysNeeded - whaleDays, 0) : 0;

  // Total burned estimate (payout pool tokens - payout pool after burn)
  const totalBurned = status
    ? Number(formatUnits(status.rewardPoolTokens, 18)) - Number(formatUnits(status.rewardPoolAfterBurn, 18))
    : 0;

  return (
    <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-ink)] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200 p-6 sm:p-8">
      <div className="flex items-start justify-between mb-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl flex items-center gap-2 tracking-[0.03em]">
          <img src="/icons/zap-fast.svg" alt="" className="w-5 h-5 inline" /> BURN STATUS
        </h3>
        <span className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold border-2 border-[var(--fr-ink)] px-3 py-1 rounded-full tracking-[0.1em]">
          Tier {tier}: {tierName}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1">Qualified Burners</p>
          <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-2xl">{qualifyingWhales}</p>
          <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">of {nextThreshold} needed</p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1">Current Burn Rate</p>
          <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-[var(--fr-fire)] text-2xl">{burnPct}%</p>
          <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">activates at {nextThreshold}</p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1">Total Burned</p>
          <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-[var(--fr-fire)] text-2xl">{fmtNum(totalBurned)}</p>
          {price > 0 && <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">&asymp; {fmtUsd(totalBurned * price)} removed forever</p>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between mb-1.5">
          <span className="font-[family-name:var(--font-mono-jb)] text-xs">{qualifyingWhales} Burners</span>
          <span className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-fire)] text-xs font-bold">Next: {TIER_NAMES[nextTierIdx]} ({nextThreshold})</span>
        </div>
        <div className="w-full h-3 bg-[rgba(10,10,10,0.1)] rounded-full overflow-hidden border-[1.5px] border-[var(--fr-ink)]">
          <div
            className="h-full bg-[var(--fr-fire)] shadow-[inset_0_0_8px_rgba(255,182,39,0.5)] rounded-full transition-all duration-500"
            style={{ width: `${progressToNext * 100}%` }}
          />
        </div>
      </div>

      {/* Personal burner status */}
      {isWhale && (
        <div className="bg-[var(--fr-fire)]/5 border-2 border-[var(--fr-fire)] p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--fr-fire)] rounded-full flex items-center justify-center">
                <img src="/icons/zap-fast.svg" alt="" className="w-5 h-5 invert" />
              </div>
              <div>
                <p className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-fire)] text-xs font-bold">Qualifying as Burner</p>
                <p className="text-xs opacity-70">
                  Holding {fmtNum(balance)} tokens (min 100K) for {whaleDays}d (need {burnerDaysNeeded}d)
                </p>
              </div>
            </div>
            <p className="font-[family-name:var(--font-display)] text-[var(--fr-fire)] text-xl">
              {burnerRemaining > 0 ? `${burnerRemaining}d` : "QUALIFIED"}
            </p>
          </div>
        </div>
      )}

      {/* Tier table */}
      <div className="border-2 border-[var(--fr-ink)] overflow-hidden">
        {BURN_TIERS.map((t, i) => (
          <div
            key={t.name}
            className={`flex items-center justify-between px-4 py-3 ${
              i === tier
                ? "bg-[var(--fr-fire)]/10"
                : "bg-[var(--fr-paper)]"
            } ${i < BURN_TIERS.length - 1 ? "border-b-2 border-[var(--fr-ink)]" : ""}`}
          >
            <span className={`font-[family-name:var(--font-mono-jb)] text-sm ${i === tier ? "text-[var(--fr-fire)] font-bold" : "opacity-55"}`}>
              {t.name}
            </span>
            <span className="font-[family-name:var(--font-mono-jb)] text-xs opacity-55">{t.threshold}</span>
            <span className={`font-[family-name:var(--font-mono-jb)] text-sm ${i === tier ? "text-[var(--fr-fire)] font-bold" : "opacity-55"}`}>
              {t.pct}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Share Card Modal ---

const CARD_TYPES = [
  { id: "retirement", label: "Retirement Card", desc: "Earnings focused" },
  { id: "proof", label: "Proof of Nothing", desc: "Days held + earned" },
  { id: "status", label: "Holder Status", desc: "Tier badge + holdings" },
  { id: "bag", label: "My FIRE Bag", desc: "Balance + USD value" },
] as const;

function ShareModal({
  address,
  status,
  price,
  onClose,
}: {
  address: `0x${string}`;
  status: HolderStatus;
  price: number;
  onClose: () => void;
}) {
  const [selectedType, setSelectedType] = useState<string>("retirement");
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://retirewithfire.org";
  const cardImageUrl = `${siteUrl}/api/card?address=${address}&type=${selectedType}`;
  const cardPageUrl = `${siteUrl}/card?address=${address}&type=${selectedType}`;

  // Reset loading state on type change
  useEffect(() => {
    setImgLoaded(false);
  }, [selectedType]);

  const balance = Number(formatUnits(status.balance, 18));
  const pending = Number(formatUnits(status.pendingRewards, 18));
  const daysHeld = Number(status.daysHeld);
  const multiplier = getLoyaltyMultiplier(status);
  const balanceUsd = balance * price;
  const pendingUsd = pending * price;

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(0);
  };

  const tweetTexts: Record<string, string> = {
    retirement: `Proof of Doing Nothing\n\n${fmtUsd(pendingUsd)} earned while doing absolutely nothing.\n\n${multiplier.toFixed(1)}x multiplier | ${fmt(pending)} $FIRE earned\n\nDo nothing. Get paid.`,
    proof: `${daysHeld} days of doing nothing.\n\n${fmt(pending)} $FIRE earned (${fmtUsd(pendingUsd)})\n${multiplier.toFixed(1)}x multiplier\n\nDo nothing. Get paid.`,
    status: `My $FIRE Retirement Status\n\n${multiplier.toFixed(1)}x multiplier and growing every second\n${fmt(balance)} FIRE (${fmtUsd(balanceUsd)})\n\nDo nothing. Get paid.`,
    bag: `My $FIRE bag: ${fmt(balance)} FIRE (${fmtUsd(balanceUsd)})\n\n${multiplier.toFixed(1)}x multiplier. Do nothing. Get paid.`,
  };

  const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetTexts[selectedType] || "")}&url=${encodeURIComponent(cardPageUrl)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(cardPageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCard = async () => {
    try {
      const res = await fetch(cardImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fire-${selectedType}-${address.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--fr-ink)]/60 backdrop-blur-sm" />
      <div
        className="relative bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] shadow-[12px_12px_0_var(--fr-ink)] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-2 border-[var(--fr-ink)]">
          <h3 className="font-[family-name:var(--font-display)] text-lg tracking-[0.03em]">SHARE YOUR STATUS</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-[var(--fr-ink)] hover:bg-[var(--fr-fire)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Card type selector */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CARD_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`flex-shrink-0 px-4 py-2 font-[family-name:var(--font-mono-jb)] text-xs transition-all duration-150 border-2 border-[var(--fr-ink)] ${
                  selectedType === t.id
                    ? "bg-[var(--fr-fire)] font-bold shadow-[3px_3px_0_var(--fr-ink)]"
                    : "bg-[var(--fr-paper)] opacity-60 hover:opacity-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card preview */}
        <div className="px-5 py-3">
          <div className="relative border-2 border-[var(--fr-ink)] overflow-hidden bg-[var(--fr-paper)]">
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--fr-paper)]">
                <div className="font-[family-name:var(--font-mono-jb)] text-xs opacity-55">Generating card...</div>
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={selectedType}
              src={cardImageUrl}
              alt={`FIRE ${selectedType} card`}
              className="w-full"
              style={{ aspectRatio: "1200/630" }}
              onLoad={() => setImgLoaded(true)}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-5 pt-2 flex flex-col gap-2.5">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 bg-[var(--fr-ink)] text-[var(--fr-paper)] border-2 border-[var(--fr-ink)] font-[family-name:var(--font-display)] text-sm py-3.5 shadow-[5px_5px_0_var(--fr-fire)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_var(--fr-fire)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-fire)] transition-all duration-150 tracking-[0.06em] no-underline"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            SHARE ON X
          </a>
          <div className="flex gap-2.5">
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--fr-paper)] border-2 border-[var(--fr-ink)] font-[family-name:var(--font-mono-jb)] text-sm py-3 shadow-[4px_4px_0_var(--fr-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--fr-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-ink)] transition-all duration-150"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {copied ? (
                  <path d="M20 6L9 17l-5-5" />
                ) : (
                  <>
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </>
                )}
              </svg>
              {copied ? "Copied" : "Copy Link"}
            </button>
            <button
              onClick={downloadCard}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--fr-paper)] border-2 border-[var(--fr-ink)] font-[family-name:var(--font-mono-jb)] text-sm py-3 shadow-[4px_4px_0_var(--fr-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--fr-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-ink)] transition-all duration-150"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Protocol Overview (no wallet connected) ---

type DexData = {
  priceUsd: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  priceChange24h: number;
};

function useDexData(): DexData {
  const [data, setData] = useState<DexData>({ priceUsd: 0, volume24h: 0, liquidity: 0, marketCap: 0, priceChange24h: 0 });
  useEffect(() => {
    const fetchDex = () =>
      fetch("https://api.dexscreener.com/latest/dex/pairs/base/0x4Fe3941B13AC5942E4FEa0D0a1B10E31A92E7c9A")
        .then((r) => r.json())
        .then((d) => {
          const p = d.pair;
          if (p) {
            setData({
              priceUsd: parseFloat(p.priceUsd || "0"),
              volume24h: p.volume?.h24 || 0,
              liquidity: p.liquidity?.usd || 0,
              marketCap: p.marketCap || 0,
              priceChange24h: p.priceChange?.h24 || 0,
            });
          }
        })
        .catch(() => {});
    fetchDex();
    const id = setInterval(fetchDex, 60_000);
    return () => clearInterval(id);
  }, []);
  return data;
}

function ProtocolOverview() {
  const dex = useDexData();
  const INITIAL_SUPPLY = 1_000_000_000; // 1B initial

  const { data: totalSupply } = useReadContract({
    address: FIRE_CONTRACT,
    abi: FIRE_ABI,
    functionName: "totalSupply",
    chainId: base.id,
    query: { refetchInterval: 60_000 },
  });

  const { data: burnInfo } = useReadContract({
    address: FIRE_CONTRACT,
    abi: FIRE_ABI,
    functionName: "burnStatus",
    chainId: base.id,
    query: { refetchInterval: 60_000 },
  });

  // Use zero address to get protocol-wide payout pool data
  const { data: zeroStatus } = useReadContract({
    address: FIRE_CONTRACT,
    abi: FIRE_ABI,
    functionName: "holderStatus",
    args: ["0x0000000000000000000000000000000000000001" as `0x${string}`],
    chainId: base.id,
    query: { refetchInterval: 60_000 },
  });

  // Read dead address balance for accurate burn amount
  const { data: deadBalance } = useReadContract({
    address: FIRE_CONTRACT,
    abi: FIRE_ABI,
    functionName: "balanceOf",
    args: ["0x000000000000000000000000000000000000dEaD" as `0x${string}`],
    chainId: base.id,
    query: { refetchInterval: 60_000 },
  });

  const supply = totalSupply ? Number(formatUnits(totalSupply, 18)) : 0;
  const totalBurned = deadBalance ? Number(formatUnits(deadBalance, 18)) : INITIAL_SUPPLY - supply;
  const rewardPool = zeroStatus ? Number(formatUnits(zeroStatus.rewardPoolTokens, 18)) : 0;
  const rewardPoolAfterBurn = zeroStatus ? Number(formatUnits(zeroStatus.rewardPoolAfterBurn, 18)) : 0;

  const tier = burnInfo ? Number(burnInfo[0]) : 0;
  const burnPct = burnInfo ? Number(burnInfo[1]) / 100 : 0;
  const qualifyingWhales = burnInfo ? Number(burnInfo[2]) : 0;
  const totalWhales = burnInfo ? Number(burnInfo[3]) : 0;
  const tierName = TIER_NAMES[tier] || "Dormant";
  const nextTierIdx = Math.min(tier + 1, TIER_NAMES.length - 1);
  const nextThreshold = TIER_THRESHOLDS[nextTierIdx];

  // Estimate 30-day payout: payout pool distributed over 30 days
  // This is a rough estimate - actual distribution depends on holder scores
  const estimated30DayPayout = rewardPoolAfterBurn * 0.3; // ~30% of pool over 30 days (rough)

  // Tax collected estimate from 24h volume (4% tax)
  const dailyTaxCollected = dex.volume24h * 0.04;
  const monthlyTaxEstimate = dailyTaxCollected * 30;

  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-ink)] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200 p-6 sm:p-8">
        <p className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-fire)] text-[11px] font-bold tracking-[0.24em] uppercase mb-1">Protocol Overview</p>
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-[0.03em] mb-6">$FIRE AT A GLANCE</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1">Token Price</p>
            <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-[var(--fr-fire)] text-xl">
              {dex.priceUsd > 0 ? `$${dex.priceUsd >= 0.01 ? dex.priceUsd.toFixed(4) : dex.priceUsd.toFixed(8)}` : "--"}
            </p>
            {dex.priceChange24h !== 0 && (
              <p className={`font-[family-name:var(--font-mono-jb)] text-[10px] mt-0.5 ${dex.priceChange24h > 0 ? "text-[#2f7a3a]" : "text-red-500"}`}>
                {dex.priceChange24h > 0 ? "+" : ""}{dex.priceChange24h.toFixed(1)}% (24h)
              </p>
            )}
          </div>
          <div>
            <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1">Market Cap</p>
            <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-xl">{dex.marketCap > 0 ? fmtUsd(dex.marketCap) : "--"}</p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1">24h Volume</p>
            <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-xl">{dex.volume24h > 0 ? fmtUsd(dex.volume24h) : "--"}</p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1">Liquidity</p>
            <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-xl">{dex.liquidity > 0 ? fmtUsd(dex.liquidity) : "--"}</p>
          </div>
        </div>
      </div>

      {/* Payouts & Supply */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Payout Pool */}
        <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-ink)] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200 p-6">
          <p className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-4">Payout Pool</p>
          <div className="space-y-4">
            <div>
              <p className="text-sm opacity-70 mb-1">Available to holders</p>
              <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-[var(--fr-fire)] text-2xl">{fmtNum(rewardPoolAfterBurn)} FIRE</p>
              {dex.priceUsd > 0 && <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">&asymp; {fmtUsd(rewardPoolAfterBurn * dex.priceUsd)}</p>}
            </div>
            <hr className="border-none border-t border-[var(--fr-line)]" />
            <div>
              <p className="text-sm opacity-70 mb-1">Daily tax collected (est.)</p>
              <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-lg">{fmtUsd(dailyTaxCollected)}</p>
              <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">from 4% tax on {fmtUsd(dex.volume24h)} volume</p>
            </div>
            <hr className="border-none border-t border-[var(--fr-line)]" />
            <div>
              <p className="text-sm opacity-70 mb-1">Est. 30-day payouts</p>
              <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-[#2f7a3a] text-lg">{fmtUsd(monthlyTaxEstimate)}</p>
              <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">at current volume</p>
            </div>
          </div>
        </div>

        {/* Supply & Burns */}
        <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-ink)] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200 p-6">
          <p className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-4">Supply &amp; Burns</p>
          <div className="space-y-4">
            <div>
              <p className="text-sm opacity-70 mb-1">Current Supply</p>
              <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-2xl">{fmtNum(supply)}</p>
              <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">of {fmtNum(INITIAL_SUPPLY)} initial</p>
            </div>
            <hr className="border-none border-t border-[var(--fr-line)]" />
            <div>
              <p className="text-sm opacity-70 mb-1">Total Burned</p>
              <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-[var(--fr-fire)] text-lg">{fmtNum(Math.max(totalBurned, 0))} FIRE</p>
              {dex.priceUsd > 0 && totalBurned > 0 && (
                <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">&asymp; {fmtUsd(totalBurned * dex.priceUsd)} removed forever</p>
              )}
            </div>
            <hr className="border-none border-t border-[var(--fr-line)]" />
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm opacity-70">Supply burned</p>
                <p className="font-[family-name:var(--font-display)] text-[var(--fr-fire)] text-lg tracking-[0.02em]">{supply > 0 ? ((totalBurned / INITIAL_SUPPLY) * 100).toFixed(2) : 0}%</p>
              </div>
              <div className="w-full h-2.5 bg-[rgba(10,10,10,0.1)] rounded-full overflow-hidden border-[1.5px] border-[var(--fr-ink)]">
                <div
                  className="h-full bg-[var(--fr-fire)] shadow-[inset_0_0_8px_rgba(255,182,39,0.5)]"
                  style={{ width: `${Math.min((totalBurned / INITIAL_SUPPLY) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Burn Status (protocol-wide, no personal info) */}
      <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-ink)] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200 p-6 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <h3 className="font-[family-name:var(--font-display)] text-xl flex items-center gap-2 tracking-[0.03em]">
            <img src="/icons/zap-fast.svg" alt="" className="w-5 h-5 inline" /> BURN GOVERNOR
          </h3>
          <span className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold border-2 border-[var(--fr-ink)] px-3 py-1 rounded-full tracking-[0.1em]">
            Tier {tier}: {tierName}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1">Qualified Burners</p>
            <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-2xl">{qualifyingWhales}</p>
            <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">of {nextThreshold} needed</p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1">Current Burn Rate</p>
            <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-[var(--fr-fire)] text-2xl">{burnPct}%</p>
            <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">of payouts</p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.2em] uppercase opacity-55 mb-1">Total Whales</p>
            <p className="font-[family-name:var(--font-serif-inst)] font-semibold text-2xl">{totalWhales}</p>
            <p className="font-[family-name:var(--font-mono-jb)] text-[10px] opacity-55">holding 100K+ tokens</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between mb-1.5">
            <span className="font-[family-name:var(--font-mono-jb)] text-xs">{qualifyingWhales} Burners</span>
            <span className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-fire)] text-xs font-bold">Next: {TIER_NAMES[nextTierIdx]} ({nextThreshold})</span>
          </div>
          <div className="w-full h-3 bg-[rgba(10,10,10,0.1)] rounded-full overflow-hidden border-[1.5px] border-[var(--fr-ink)]">
            <div
              className="h-full bg-[var(--fr-fire)] shadow-[inset_0_0_8px_rgba(255,182,39,0.5)] rounded-full transition-all duration-500"
              style={{ width: `${nextThreshold > 0 ? Math.min((qualifyingWhales / nextThreshold) * 100, 100) : 0}%` }}
            />
          </div>
        </div>

        <div className="border-2 border-[var(--fr-ink)] overflow-hidden">
          {BURN_TIERS.map((t, i) => (
            <div
              key={t.name}
              className={`flex items-center justify-between px-4 py-3 ${i === tier ? "bg-[var(--fr-fire)]/10" : "bg-[var(--fr-paper)]"} ${i < BURN_TIERS.length - 1 ? "border-b-2 border-[var(--fr-ink)]" : ""}`}
            >
              <span className={`font-[family-name:var(--font-mono-jb)] text-sm ${i === tier ? "text-[var(--fr-fire)] font-bold" : "opacity-55"}`}>{t.name}</span>
              <span className="font-[family-name:var(--font-mono-jb)] text-xs opacity-55">{t.threshold}</span>
              <span className={`font-[family-name:var(--font-mono-jb)] text-sm ${i === tier ? "text-[var(--fr-fire)] font-bold" : "opacity-55"}`}>{t.pct}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// --- Main Dashboard ---

function Dashboard({ address }: { address: `0x${string}` }) {
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const price = useTokenPrice();
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (chain && chain.id !== base.id) {
      switchChain({ chainId: base.id });
    }
  }, [chain, switchChain]);

  if (chain && chain.id !== base.id) {
    return (
      <div className="text-center py-20">
        <p className="text-base opacity-70 mb-4">Please switch to Base network.</p>
        <button
          onClick={() => switchChain({ chainId: base.id })}
          className="bg-[var(--fr-fire)] text-[var(--fr-ink)] border-2 border-[var(--fr-ink)] font-[family-name:var(--font-display)] text-sm px-8 py-3 rounded-full shadow-[5px_5px_0_var(--fr-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_var(--fr-ink)] transition-all duration-150 tracking-[0.06em]"
        >
          SWITCH TO BASE
        </button>
      </div>
    );
  }

  const { data: status, refetch: refetchStatus } = useReadContract({
    address: FIRE_CONTRACT,
    abi: FIRE_ABI,
    functionName: "holderStatus",
    args: [address],
    chainId: base.id,
    query: { refetchInterval: 30_000 },
  });

  const { data: burnInfo } = useReadContract({
    address: FIRE_CONTRACT,
    abi: FIRE_ABI,
    functionName: "burnStatus",
    chainId: base.id,
    query: { refetchInterval: 60_000 },
  });

  const hasBalance = status?.balance && status.balance > BigInt(0);

  return (
    <div className="space-y-6">
      <MultiplierHero status={status} price={price} />

      {/* Share button - right below multiplier */}
      {hasBalance && (
        <button
          onClick={() => setShowShareModal(true)}
          className="w-full flex items-center justify-center gap-3 bg-[var(--fr-ink)] text-[var(--fr-paper)] border-2 border-[var(--fr-ink)] font-[family-name:var(--font-display)] text-sm py-4 shadow-[5px_5px_0_var(--fr-fire)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_var(--fr-fire)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-fire)] transition-all duration-150 tracking-[0.06em]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          SHARE YOUR RETIREMENT CARD
        </button>
      )}

      <StatsRow status={status} price={price} />
      <ClaimSection status={status} price={price} address={address} />
      <EarningsChart status={status} price={price} />
      <CostOfSelling status={status} price={price} />
      <BurnStatus status={status} burnInfo={burnInfo} price={price} />

      {/* Share modal */}
      {showShareModal && hasBalance && status && (
        <ShareModal
          address={address}
          status={status}
          price={price}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

// --- Read-Only Dashboard (Address Lookup) ---

function ReadOnlyDashboard({ address }: { address: `0x${string}` }) {
  const price = useTokenPrice();

  const { data: status } = useReadContract({
    address: FIRE_CONTRACT,
    abi: FIRE_ABI,
    functionName: "holderStatus",
    args: [address],
    chainId: base.id,
  });

  const { data: burnInfo } = useReadContract({
    address: FIRE_CONTRACT,
    abi: FIRE_ABI,
    functionName: "burnStatus",
    chainId: base.id,
  });

  return (
    <div className="space-y-6">
      <MultiplierHero status={status} price={price} />
      <StatsRow status={status} price={price} />

      {/* Read-only claim display */}
      <div className="bg-[var(--fr-ember)]/10 border-[2.5px] border-[var(--fr-ember)] shadow-[8px_8px_0_var(--fr-ink)] p-6">
        <p className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase text-[var(--fr-fire)]">Claimable Payouts</p>
        <p className="font-[family-name:var(--font-display)] text-[var(--fr-fire)] text-3xl mt-2">
          {fmtTokens(status?.pendingRewards)} FIRE
        </p>
        {price > 0 && status?.pendingRewards && (
          <p className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-fire)] text-xs mt-1 opacity-70">
            &asymp; {fmtUsd(Number(formatUnits(status.pendingRewards, 18)) * price)}
          </p>
        )}
      </div>

      <EarningsChart status={status} price={price} />
      <BurnStatus status={status} burnInfo={burnInfo} price={price} />
    </div>
  );
}

// --- Page ---

export default function DashboardPage() {
  const { login, logout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];
  const address = activeWallet?.address as `0x${string}` | undefined;

  const [view, setView] = useState<"protocol" | "personal" | "lookup">("protocol");
  const [lookupInput, setLookupInput] = useState("");
  const [lookupAddress, setLookupAddress] = useState<`0x${string}` | null>(null);
  const [lookupError, setLookupError] = useState("");

  // Default to personal view when connected with a wallet
  useEffect(() => {
    if (authenticated && address && view === "protocol") {
      setView("personal");
    }
  }, [authenticated, address]);

  const handleLookup = () => {
    setLookupError("");
    const trimmed = lookupInput.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setLookupAddress(trimmed as `0x${string}`);
      setView("lookup");
    } else {
      setLookupError("Enter a valid Ethereum address");
      setLookupAddress(null);
    }
  };

  const showPersonalTab = authenticated && address;

  return (
    <div className="fr-page min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[var(--fr-paper)]/90 backdrop-blur-xl border-b-2 border-[var(--fr-ink)]">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline text-[var(--fr-ink)]">
            <Image src="/fire-mark.svg" alt="" width={32} height={32} className="w-8 h-8" />
            <span className="font-[family-name:var(--font-display)] text-[20px] tracking-[0.06em]">
              <span className="text-[var(--fr-fire)]">$FIRE</span>
              <small className="font-[family-name:var(--font-mono-jb)] text-[9px] tracking-[0.2em] opacity-60 block leading-none mt-0.5">DASHBOARD</small>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {authenticated ? (
              <>
                <span className="font-[family-name:var(--font-mono-jb)] text-xs opacity-55 hidden sm:block">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
                </span>
                <button
                  onClick={logout}
                  className="font-[family-name:var(--font-mono-jb)] text-xs text-[var(--fr-fire)] hover:underline transition-colors"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={login}
                className="bg-[var(--fr-fire)] text-[var(--fr-ink)] border-2 border-[var(--fr-ink)] px-4 py-2 font-[family-name:var(--font-display)] text-xs tracking-[0.08em] rounded-full shadow-[4px_4px_0_var(--fr-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--fr-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-ink)] transition-all duration-150"
              >
                CONNECT WALLET
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 sm:py-12">
        {/* Title row with Claim Payouts */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-[family-name:var(--font-mono-jb)] text-[var(--fr-fire)] text-[11px] font-bold tracking-[0.24em] uppercase mb-3">Retirement Dashboard</p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-tight tracking-[0.01em]">
              {view === "personal" ? (
                <>YOUR <em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)]">RETIREMENT</em> STATUS</>
              ) : view === "lookup" ? (
                <>WALLET <em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)]">LOOKUP</em></>
              ) : (
                <>$FIRE <em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)]">PROTOCOL</em></>
              )}
            </h1>
          </div>
          {showPersonalTab && (
            <Link
              href="/dashboard"
              onClick={(e) => { e.preventDefault(); setView("personal"); }}
              className="bg-[var(--fr-fire)] text-[var(--fr-ink)] border-2 border-[var(--fr-ink)] font-[family-name:var(--font-display)] text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-[4px_4px_0_var(--fr-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--fr-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-ink)] transition-all duration-150 tracking-[0.06em] whitespace-nowrap mt-6 no-underline"
            >
              CLAIM PAYOUTS
            </Link>
          )}
        </div>

        {/* Address Lookup (inline below title) */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="Look up any wallet: 0x..."
              className="flex-1 bg-[var(--fr-paper)] border-2 border-[var(--fr-ink)] px-4 py-2.5 font-[family-name:var(--font-mono-jb)] text-xs text-[var(--fr-ink)] focus:outline-none focus:border-[var(--fr-fire)] focus:shadow-[4px_4px_0_var(--fr-fire)] transition-all"
            />
            <button
              onClick={handleLookup}
              className="bg-[var(--fr-ink)] text-[var(--fr-paper)] border-2 border-[var(--fr-ink)] font-[family-name:var(--font-display)] text-xs px-5 py-2.5 shadow-[4px_4px_0_var(--fr-fire)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--fr-fire)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-fire)] transition-all duration-150 tracking-[0.06em] whitespace-nowrap"
            >
              LOOK UP
            </button>
          </div>
          {lookupError && <p className="font-[family-name:var(--font-mono-jb)] text-red-500 text-[10px] mt-1">{lookupError}</p>}
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 mb-8 border-b-2 border-[var(--fr-ink)]">
          <button
            onClick={() => setView("protocol")}
            className={`font-[family-name:var(--font-mono-jb)] text-xs px-4 py-2.5 border-b-[3px] transition-colors tracking-[0.1em] uppercase ${
              view === "protocol"
                ? "border-[var(--fr-fire)] text-[var(--fr-fire)] font-bold"
                : "border-transparent opacity-55 hover:opacity-100"
            }`}
          >
            Protocol
          </button>
          {showPersonalTab && (
            <button
              onClick={() => setView("personal")}
              className={`font-[family-name:var(--font-mono-jb)] text-xs px-4 py-2.5 border-b-[3px] transition-colors tracking-[0.1em] uppercase ${
                view === "personal"
                  ? "border-[var(--fr-fire)] text-[var(--fr-fire)] font-bold"
                  : "border-transparent opacity-55 hover:opacity-100"
              }`}
            >
              My Dashboard
            </button>
          )}
          {lookupAddress && (
            <button
              onClick={() => setView("lookup")}
              className={`font-[family-name:var(--font-mono-jb)] text-xs px-4 py-2.5 border-b-[3px] transition-colors tracking-[0.1em] ${
                view === "lookup"
                  ? "border-[var(--fr-fire)] text-[var(--fr-fire)] font-bold"
                  : "border-transparent opacity-55 hover:opacity-100"
              }`}
            >
              {lookupAddress.slice(0, 6)}...{lookupAddress.slice(-4)}
            </button>
          )}
        </div>

        {/* Content */}
        {!ready ? (
          <div className="text-center py-20">
            <p className="font-[family-name:var(--font-mono-jb)] text-sm opacity-55">Loading...</p>
          </div>
        ) : view === "personal" && address ? (
          <Dashboard address={address} />
        ) : view === "lookup" && lookupAddress ? (
          <div className="space-y-6">
            <div className="bg-[var(--fr-paper)] border-2 border-[var(--fr-ink)] px-4 py-2">
              <p className="font-[family-name:var(--font-mono-jb)] text-xs break-all opacity-70">{lookupAddress}</p>
            </div>
            <ReadOnlyDashboard address={lookupAddress} />
          </div>
        ) : (
          <ProtocolOverview />
        )}
      </div>
    </div>
  );
}
