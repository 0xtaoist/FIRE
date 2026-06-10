"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useSwitchChain,
} from "wagmi";
import { formatUnits } from "viem";
import { base } from "viem/chains";
import Link from "next/link";
import Image from "next/image";
import { FIRE_CONTRACT, FIRE_ABI } from "@/lib/contract";
import {
  TickerTape,
  FooterNew,
  useDexData,
  fmtUsd as fmtUsdShared,
  fmtPrice,
  MONO,
  DISPLAY,
  SERIF,
  GOLD_BTN,
  FIRE_BTN,
  GHOST_BTN,
} from "@/components/fire-new/shared";
import { useEffect, useState } from "react";

/* ───────── Helpers (same math as /dashboard) ───────── */

function fmtTokens(raw: bigint | undefined, dp = 0): string {
  if (!raw) return "0";
  return Number(formatUnits(raw, 18)).toLocaleString("en-US", {
    maximumFractionDigits: dp,
  });
}

function fmtNum(n: number, dp = 0): string {
  if (n > 0 && n < 1) return n.toFixed(Math.max(dp, 4));
  if (n > 0 && n < 100) return n.toLocaleString("en-US", { maximumFractionDigits: Math.max(dp, 2) });
  return n.toLocaleString("en-US", { maximumFractionDigits: dp });
}

const fmtUsd = fmtUsdShared;

function fmtPct(raw: bigint | undefined): string {
  if (!raw) return "0%";
  const pct = Number(raw) / 1e16;
  if (pct < 0.01) return "<0.01%";
  return `${pct.toFixed(2)}%`;
}

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
  isWhale: boolean;
  whaleSecondsHeld: bigint;
  whaleDaysHeld: bigint;
  rewardPoolTokens: bigint;
  rewardPoolAfterBurn: bigint;
  loyaltyMultiplierScaled: bigint;
  daysUntilNextTier: bigint;
};

/* ───────── Shared style snippets ───────── */

const CARD = "fn-card fn-card-hover";
const LABEL = `${MONO} text-[10px] font-bold tracking-[0.22em] uppercase text-[var(--fn-muted)]`;
const LABEL_GOLD = `${MONO} text-[11px] font-bold tracking-[0.26em] uppercase text-[var(--fn-gold)]`;

function GoldBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-2.5 bg-[rgba(10,10,10,0.08)] rounded-full overflow-hidden border-[1.5px] border-[var(--fn-edge)]">
      <div
        className="h-full bg-[#e3b62f] rounded-full transition-all duration-500"
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  );
}

function FireBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-2.5 bg-[rgba(10,10,10,0.08)] rounded-full overflow-hidden border-[1.5px] border-[var(--fn-edge)]">
      <div
        className="h-full bg-[var(--fn-fire)] rounded-full transition-all duration-500"
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  );
}

/* ───────── Price hook ───────── */

function useTokenPrice() {
  const dex = useDexData();
  return dex.priceUsd;
}

/* ───────── Holder stats (worker DB) ───────── */

function useHolderStats(address: string | undefined) {
  const [data, setData] = useState<{
    allTimeTotal: number;
    totalClaimed: number;
    pendingRewards: number;
    daysHeld: number;
    found: boolean;
    last24hClaimed: number;
    apr: number | null;
    aprWindowDays: number;
    aprDailyRate: number | null;
  } | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const fetchStats = () =>
      fetch(`/api/holder-stats?address=${address}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d || d.error) return;
          setData({
            allTimeTotal: parseFloat(d.allTimeTotal || "0"),
            totalClaimed: parseFloat(d.totalClaimed || "0"),
            pendingRewards: parseFloat(d.pendingRewards || "0"),
            daysHeld: d.daysHeld || 0,
            found: d.found || false,
            last24hClaimed: parseFloat(d.last24hClaimed || "0"),
            apr: d.apr ?? null,
            aprWindowDays: d.aprWindowDays || 0,
            aprDailyRate: d.aprDailyRate != null ? parseFloat(d.aprDailyRate) : null,
          });
        })
        .catch(() => {});
    fetchStats();
    const id = setInterval(fetchStats, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [address]);

  return data;
}

/* ───────── Lifetime Earned Hero ───────── */

function fmtBigTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 });
}

function LifetimeEarnedHero({
  address,
  price,
  onShare,
}: {
  address: `0x${string}` | undefined;
  price: number;
  onShare: () => void;
}) {
  const cumulative = useHolderStats(address);

  const ready = cumulative?.found === true;
  const total = ready ? cumulative.allTimeTotal : 0;
  const daysHeld = ready ? cumulative.daysHeld : 0;
  const totalUsd = total * price;

  if (cumulative && !cumulative.found) return null;

  return (
    <div className="relative overflow-hidden fn-dark fn-cert p-6 sm:p-10">
      {/* glow accents */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[var(--fn-fire)] opacity-15 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Image src="/fire-mark.svg" alt="" width={20} height={20} className="w-5 h-5" />
            <p className={LABEL_GOLD}>Lifetime Earnings</p>
          </div>
          <p className={`${MONO} text-[10px] text-[var(--fn-muted)] tracking-[0.1em]`}>across all $FIRE contracts</p>
        </div>

        <div className="flex flex-col items-center text-center py-4 sm:py-8">
          <p className={`${MONO} text-[10px] sm:text-[11px] font-bold tracking-[0.32em] uppercase text-[var(--fn-muted)] mb-3`}>
            Total $FIRE Earned
          </p>
          <p className={`${DISPLAY} fn-gold-text text-[64px] sm:text-[120px] md:text-[150px] leading-none tracking-[-0.03em]`}>
            {ready ? fmtBigTokens(total) : "—"}
          </p>
          {price > 0 && ready && (
            <p className={`${SERIF} text-[var(--fn-fire)] text-2xl sm:text-4xl font-semibold mt-4`}>{fmtUsd(totalUsd)}</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mt-4 sm:mt-6 pt-6 border-t border-[var(--fn-line)]">
          {[
            { label: "Claimed", value: ready ? fmtBigTokens(cumulative.totalClaimed) : "—" },
            { label: "Pending", value: ready ? fmtBigTokens(cumulative.pendingRewards) : "—" },
            { label: "Days Holding", value: ready ? String(daysHeld) : "—", gold: true },
            { label: "Avg / Day", value: ready && daysHeld > 0 ? fmtBigTokens(total / daysHeld) : "—" },
          ].map((s) => (
            <div key={s.label}>
              <p className={`${LABEL} mb-1.5`}>{s.label}</p>
              <p className={`${SERIF} font-semibold text-lg sm:text-2xl ${s.gold ? "text-[var(--fn-gold)]" : "text-[var(--fn-cream)]"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onShare}
          disabled={!ready || total <= 0}
          className={`${GOLD_BTN} ${DISPLAY} w-full mt-6 sm:mt-8 text-sm sm:text-base py-4 tracking-[0.1em] disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          SHARE THIS PROOF
        </button>
      </div>
    </div>
  );
}

/* ───────── Multiplier Hero ───────── */

function MultiplierHero({ status }: { status: HolderStatus | undefined }) {
  if (!status) return null;

  const daysHeld = Number(status.daysHeld);
  const multiplier = getLoyaltyMultiplier(status);
  const nextTier = getNextTier(daysHeld);
  const whaleDays = Number(status.whaleDaysHeld);
  const burnerDaysNeeded = 15;
  const burnerProgress = status.isWhale ? Math.min(whaleDays / burnerDaysNeeded, 1) : 0;
  const burnerRemaining = status.isWhale ? Math.max(burnerDaysNeeded - whaleDays, 0) : 0;

  const prevTierDays = LOYALTY_TIERS.filter((t) => t.days <= daysHeld).pop()?.days ?? 0;
  const tierProgress = nextTier
    ? Math.min((daysHeld - prevTierDays) / (nextTier.days - prevTierDays), 1)
    : 1;

  return (
    <div className={`${CARD} p-6 sm:p-8`}>
      <div className="flex items-start justify-between mb-6">
        <p className={LABEL_GOLD}>Your Position</p>
        {status.isWhale && (
          <span className={`${MONO} text-[var(--fn-fire)] text-[10px] font-bold tracking-[0.15em] uppercase border border-[var(--fn-fire)]/60 bg-[rgba(255,91,31,0.08)] px-3 py-1 rounded-full`}>
            ⟁ Whale Status Active
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 mb-5">
        <div>
          <p className={`${LABEL} mb-1.5`}>Days Held</p>
          <p className={`${DISPLAY} text-6xl sm:text-7xl leading-none`}>{daysHeld}</p>
        </div>
        <div>
          <p className={`${LABEL} mb-1.5`}>Loyalty Multiplier</p>
          <p className={`${DISPLAY} text-[var(--fn-fire)] text-5xl sm:text-6xl leading-none [-webkit-text-stroke:2px_var(--fn-edge)]`}>
            {multiplier.toFixed(1)}x
          </p>
        </div>
      </div>

      <p className={`${MONO} text-xs text-[var(--fn-cream)]/70 mb-5`}>
        {nextTier ? (
          <>
            Next tier: <span className="text-[var(--fn-gold)] font-bold">{nextTier.multiplier}x</span> in{" "}
            <span className="text-[var(--fn-gold)] font-bold">{Number(status.daysUntilNextTier)}</span> days
          </>
        ) : (
          <span className="text-[var(--fn-gold)] font-bold">Max loyalty tier reached — full 3x seniority</span>
        )}
      </p>

      {/* Tier progress */}
      <div className="mb-6">
        <GoldBar pct={tierProgress * 100} />
        <div className="flex justify-between mt-1.5">
          <span className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>{daysHeld} days on the floor</span>
          <span className={`${MONO} text-[var(--fn-gold)] text-[10px] font-bold`}>
            {nextTier ? `${nextTier.multiplier}x at ${nextTier.days}d` : "3x max"}
          </span>
        </div>
      </div>

      {/* Whale / burner progress */}
      <div>
        <FireBar pct={burnerProgress * 100} />
        <div className="flex justify-between mt-1.5">
          <span className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>
            {status.isWhale ? `${whaleDays}d as whale` : "Not whale yet (need 100K+)"}
          </span>
          <span className={`${MONO} text-[var(--fn-fire)] text-[10px] font-bold`}>
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

/* ───────── Stats Row ───────── */

function StatsRow({ status, price }: { status: HolderStatus | undefined; price: number }) {
  if (!status) return null;

  const balance = Number(formatUnits(status.balance, 18));
  const balanceUsd = balance * price;
  const daysHeld = Number(status.daysHeld);
  const subDayHours = Number(status.secondsHeld) / 3600;

  const cells = [
    {
      label: "Your Balance",
      value: `${fmtNum(balance)} FIRE`,
      sub: price > 0 ? `≈ ${fmtUsd(balanceUsd)}` : undefined,
    },
    {
      label: "Hold Time",
      value: daysHeld < 1 ? `${subDayHours.toFixed(1)} hours` : `${daysHeld} days`,
      sub: status.clockActive ? "Clock active" : "Clock inactive",
      gold: true,
    },
    {
      label: "Payout Share",
      value: fmtPct(status.rewardSharePct),
      sub: "of total payout pool",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cells.map((c) => (
        <div key={c.label} className={`${CARD} p-5`}>
          <p className={`${LABEL} mb-2`}>{c.label}</p>
          <p className={`${SERIF} font-semibold text-xl ${c.gold ? "text-[var(--fn-gold)]" : "text-[var(--fn-cream)]"}`}>{c.value}</p>
          {c.sub && <p className={`${MONO} text-[10px] text-[var(--fn-muted)] mt-1`}>{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* ───────── Claim Section ───────── */

function ClaimSection({
  status,
  price,
  address,
}: {
  status: HolderStatus | undefined;
  price: number;
  address: `0x${string}`;
}) {
  const { writeContract, data: txHash, isPending: isClaiming, error: claimError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

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
    <div className="relative overflow-hidden border-[2.5px] border-[var(--fn-fire)] bg-[rgba(255,91,31,0.07)] shadow-[7px_7px_0_var(--fn-edge)] p-6">
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className={`${MONO} text-[11px] font-bold tracking-[0.26em] uppercase text-[var(--fn-fire)]`}>Claimable Payouts</p>
          <p className={`${DISPLAY} text-[var(--fn-fire)] text-3xl sm:text-4xl leading-none mt-3`}>
            {fmtNum(pending)} FIRE
          </p>
          {price > 0 && (
            <p className={`${MONO} text-[var(--fn-ember)] text-xs mt-2`}>≈ {fmtUsd(pendingUsd)}</p>
          )}
        </div>
        <button
          onClick={handleClaim}
          disabled={!hasBalance || isClaiming || isConfirming}
          className={`${FIRE_BTN} ${DISPLAY} text-sm px-8 py-3.5 tracking-[0.08em] whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isClaiming ? "CONFIRM IN WALLET..." : isConfirming ? "CLAIMING..." : "CLAIM PAYOUTS"}
        </button>
      </div>

      {isConfirmed && (
        <p className={`${MONO} text-[var(--fn-green)] text-xs mt-3`}>Payouts claimed. Back to doing nothing.</p>
      )}
      {claimError && (
        <p className={`${MONO} text-[var(--fn-red)] text-xs mt-3 max-w-md break-words`}>
          {claimError.message.includes("Nothing to claim") ? "No payouts to claim yet." : claimError.message.slice(0, 200)}
        </p>
      )}
    </div>
  );
}

/* ───────── Earnings Chart ───────── */

function EarningsChart({
  status,
  price,
  burnInfo,
  address,
}: {
  status: HolderStatus | undefined;
  price: number;
  burnInfo: readonly [number, bigint, bigint, bigint] | undefined;
  address: string | undefined;
}) {
  const dex = useDexData();
  const cumulative = useHolderStats(address);
  const [sliderVolume, setSliderVolume] = useState<number | null>(null);

  useEffect(() => {
    if (sliderVolume === null && dex.volume24h > 0) setSliderVolume(dex.volume24h);
  }, [dex.volume24h, sliderVolume]);

  if (!status || !status.balance || status.balance === BigInt(0)) return null;

  const pending = Number(formatUnits(status.pendingRewards, 18));
  const daysHeld = Number(status.daysHeld);
  const elapsedDays = Number(status.secondsHeld) / 86400;
  const currentMultiplier = getLoyaltyMultiplier(status);

  const last24hRate = cumulative?.last24hClaimed || 0;
  const aprDailyRate = cumulative?.aprDailyRate || 0;
  const cumulativeDailyRate =
    cumulative?.found && daysHeld > 0 && cumulative.allTimeTotal > 0
      ? cumulative.allTimeTotal / daysHeld
      : 0;
  const observedDailyRate = elapsedDays > 0.5 && pending > 0 ? pending / elapsedDays : 0;

  const sharePct = Number(status.rewardSharePct) / 10000;
  const burnPct = burnInfo ? Number(burnInfo[1]) / 100 : 0;
  const dailyRewardTokens = price > 0 && dex.volume24h > 0 ? (dex.volume24h / price) * 0.02 : 0;
  const dailyPoolAfterBurn = dailyRewardTokens * (1 - burnPct / 100);
  const estimatedDailyRate = sharePct * dailyPoolAfterBurn;

  const baselineDailyRate = last24hRate || aprDailyRate || cumulativeDailyRate || observedDailyRate || estimatedDailyRate;
  const rateSource = last24hRate
    ? "last 24h"
    : aprDailyRate
    ? "apr"
    : cumulativeDailyRate
    ? "cumulative"
    : observedDailyRate
    ? "observed"
    : "estimated";

  const effectiveVolume = sliderVolume ?? dex.volume24h;
  const volumeRatio = dex.volume24h > 0 ? effectiveVolume / dex.volume24h : 1;
  const dailyRate = baselineDailyRate * volumeRatio;
  const baseRate = currentMultiplier > 0 ? dailyRate / currentMultiplier : 0;

  const days = 30;
  const dataPoints: { day: number; earned: number; earnedUsd: number }[] = [];
  let projected = 0;

  for (let d = 1; d <= days; d++) {
    const futureDay = daysHeld + d;
    let futureMult = 1;
    for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
      if (futureDay >= LOYALTY_TIERS[i].days) {
        futureMult = LOYALTY_TIERS[i].multiplier;
        break;
      }
    }
    const dayEarnings = baseRate * futureMult;
    projected += dayEarnings;
    dataPoints.push({ day: d, earned: projected, earnedUsd: projected * price });
  }

  const maxEarned = dataPoints[dataPoints.length - 1]?.earned || 1;
  const chartHeight = 160;

  return (
    <div className={`${CARD} p-6`}>
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <p className={`${LABEL_GOLD} mb-2`}>30-Day Earnings Projection</p>
          <p className={`${SERIF} font-semibold fn-gold-text text-3xl`}>
            {fmtNum(dataPoints[days - 1]?.earned || 0)} FIRE
          </p>
          {price > 0 && (
            <p className={`${MONO} text-[10px] text-[var(--fn-muted)] mt-1`}>≈ {fmtUsd(dataPoints[days - 1]?.earnedUsd || 0)}</p>
          )}
        </div>
        <div className="text-right">
          <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>
            {volumeRatio === 1 ? "Current daily rate" : "Projected daily rate"}
          </p>
          <p className={`${MONO} font-bold text-sm text-[var(--fn-cream)]`}>{fmtNum(dailyRate)} FIRE/day</p>
          {price > 0 && <p className={`${MONO} text-[10px] text-[var(--fn-green)]`}>{fmtUsd(dailyRate * price)}/day</p>}
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight + 30 }}>
        <svg viewBox={`0 0 ${days * 20} ${chartHeight + 20}`} className="w-full h-full" preserveAspectRatio="none">
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
            <line
              key={pct}
              x1={0}
              y1={chartHeight - pct * chartHeight}
              x2={days * 20}
              y2={chartHeight - pct * chartHeight}
              stroke="var(--fn-line)"
              strokeWidth={0.5}
            />
          ))}
          <path
            d={`M0,${chartHeight} ${dataPoints.map((p) => `L${(p.day - 0.5) * 20},${chartHeight - (p.earned / maxEarned) * chartHeight}`).join(" ")} L${days * 20},${chartHeight} Z`}
            fill="rgba(227,182,47,0.18)"
          />
          <path
            d={`M0,${chartHeight} ${dataPoints.map((p) => `L${(p.day - 0.5) * 20},${chartHeight - (p.earned / maxEarned) * chartHeight}`).join(" ")}`}
            fill="none"
            stroke="var(--fn-fire)"
            strokeWidth={2.5}
          />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
          {[1, 7, 14, 21, 30].map((d) => (
            <span key={d} className={`${MONO} text-[9px] text-[var(--fn-muted)]`}>Day {d}</span>
          ))}
        </div>
      </div>

      {/* Volume simulator */}
      <div className="mt-5 pt-4 border-t border-[var(--fn-line)]">
        <div className="flex items-baseline justify-between mb-2">
          <p className={LABEL}>Simulate Daily Volume</p>
          <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>
            Current: <span className="text-[var(--fn-gold)]">{fmtUsd(dex.volume24h)}</span>
          </p>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`${DISPLAY} fn-gold-text text-2xl`}>{fmtUsd(effectiveVolume)}</span>
          <span className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>/ day</span>
          {volumeRatio !== 1 && (
            <span className={`${MONO} text-[10px] text-[var(--fn-ember)]`}>({volumeRatio.toFixed(1)}× current)</span>
          )}
        </div>
        <input
          type="range"
          min={0}
          max={10_000_000}
          step={50_000}
          value={effectiveVolume}
          onChange={(e) => setSliderVolume(Number(e.target.value))}
          className="fn-slider w-full"
        />
        <div className={`flex justify-between ${MONO} text-[9px] text-[var(--fn-muted)] mt-1`}>
          <span>$0</span>
          <span>$2.5M</span>
          <span>$5M</span>
          <span>$7.5M</span>
          <span>$10M</span>
        </div>
        {sliderVolume !== null && Math.abs(sliderVolume - dex.volume24h) > 1 && (
          <button
            onClick={() => setSliderVolume(dex.volume24h)}
            className={`${MONO} text-[10px] text-[var(--fn-gold)] mt-2 hover:underline cursor-pointer`}
          >
            Reset to current volume
          </button>
        )}
      </div>

      <p className={`${MONO} text-[10px] text-[var(--fn-muted)] mt-3`}>
        <em className={`${SERIF} italic`}>
          Rate basis: <span className="text-[var(--fn-gold)]">{rateSource}</span>
          {rateSource === "last 24h" && cumulative?.last24hClaimed != null && (
            <> ({fmtNum(cumulative.last24hClaimed)} FIRE claimed in last 24h)</>
          )}
          {rateSource === "apr" && cumulative?.apr != null && (
            <> ({cumulative.apr.toFixed(1)}% APR over {cumulative.aprWindowDays.toFixed(1)}d window)</>
          )}
          {rateSource === "cumulative" && " (all-time claimed + pending / days)"}
          {rateSource === "observed" && " (current pending / days held)"}
          {rateSource === "estimated" && " (volume × 2% reward tax × your share)"}
          . Tiers: 1.5x at 30d, 2x at 60d, 2.5x at 90d, 3x at 120d. Your actual retirement may vary.
        </em>
      </p>
    </div>
  );
}

/* ───────── Cost of Selling ───────── */

function CostOfSelling({ status, price }: { status: HolderStatus | undefined; price: number }) {
  if (!status || !status.balance || status.balance === BigInt(0)) return null;

  const pending = Number(formatUnits(status.pendingRewards, 18));
  const daysHeld = Number(status.daysHeld);
  const elapsedDays = Number(status.secondsHeld) / 86400;
  const multiplier = getLoyaltyMultiplier(status);
  const dailyRate = elapsedDays > 0 ? pending / elapsedDays : 0;
  const dailyAtBase = multiplier > 0 ? dailyRate / multiplier : 0;
  const pctLoss = dailyRate > 0 ? ((dailyRate - dailyAtBase) / dailyRate) * 100 : 0;

  return (
    <div className={`${CARD} border-l-2 border-l-[var(--fn-red)] p-6`}>
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <p className={`${MONO} text-[var(--fn-red)] text-[11px] font-bold tracking-[0.26em] uppercase`}>
          The Cost of Paper Hands
        </p>
        <p className={`${SERIF} italic text-[13px] text-[var(--fn-muted)]`}>Sell now and the contract forgets you exist.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <p className={`${MONO} text-[var(--fn-red)]/80 text-[10px] uppercase tracking-[0.15em] mb-1.5`}>Multiplier Lost</p>
          <p className={`${SERIF} font-semibold text-[var(--fn-fire)] text-xl`}>{multiplier.toFixed(1)}x → 1x</p>
          <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>back to day one</p>
        </div>
        <div>
          <p className={`${MONO} text-[var(--fn-red)]/80 text-[10px] uppercase tracking-[0.15em] mb-1.5`}>Daily Payouts Lost</p>
          <p className={`${SERIF} font-semibold text-[var(--fn-fire)] text-xl`}>-{pctLoss.toFixed(0)}%</p>
          <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>
            {price > 0
              ? `${fmtUsd(dailyRate * price)}/day → ${fmtUsd(dailyAtBase * price)}/day`
              : `${fmtNum(dailyRate)} → ${fmtNum(dailyAtBase)} FIRE/day`}
          </p>
        </div>
        <div>
          <p className={`${MONO} text-[var(--fn-red)]/80 text-[10px] uppercase tracking-[0.15em] mb-1.5`}>Time to Recover</p>
          <p className={`${SERIF} font-semibold text-[var(--fn-fire)] text-xl`}>{daysHeld} days</p>
          <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>to rebuild current tier</p>
        </div>
      </div>
    </div>
  );
}

/* ───────── Burn Status ───────── */

const BURN_TIERS = [
  { name: "Dormant", threshold: "< 100 Burners", pct: "0%" },
  { name: "Ignition", threshold: "100+ Burners (15d)", pct: "10%" },
  { name: "Spark", threshold: "200+ Burners (30d)", pct: "20%" },
  { name: "Blaze", threshold: "500+ Burners (45d)", pct: "30%" },
  { name: "Inferno", threshold: "800+ Burners (60d)", pct: "40%" },
];

const TIER_NAMES = ["Dormant", "Ignition", "Spark", "Blaze", "Inferno"];
const TIER_THRESHOLDS = [0, 100, 200, 500, 800];

function BurnStatus({
  status,
  burnInfo,
  price,
  personal = true,
}: {
  status: HolderStatus | undefined;
  burnInfo: readonly [number, bigint, bigint, bigint] | undefined;
  price: number;
  personal?: boolean;
}) {
  const tier = burnInfo ? Number(burnInfo[0]) : 0;
  const burnPct = burnInfo ? Number(burnInfo[1]) / 100 : 0;
  const qualifyingWhales = burnInfo ? Number(burnInfo[2]) : 0;
  const totalWhales = burnInfo ? Number(burnInfo[3]) : 0;
  const tierName = TIER_NAMES[tier] || "Dormant";

  const nextTierIdx = Math.min(tier + 1, TIER_NAMES.length - 1);
  const nextThreshold = TIER_THRESHOLDS[nextTierIdx];
  const progressToNext = nextThreshold > 0 ? Math.min(qualifyingWhales / nextThreshold, 1) : 0;

  const isWhale = status?.isWhale || false;
  const whaleDays = status ? Number(status.whaleDaysHeld) : 0;
  const balance = status ? Number(formatUnits(status.balance, 18)) : 0;
  const burnerDaysNeeded = 15;
  const burnerRemaining = isWhale ? Math.max(burnerDaysNeeded - whaleDays, 0) : 0;

  const totalBurned = status
    ? Number(formatUnits(status.rewardPoolTokens, 18)) - Number(formatUnits(status.rewardPoolAfterBurn, 18))
    : 0;

  return (
    <div className={`${CARD} p-6 sm:p-8`}>
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <h3 className={`${DISPLAY} text-xl tracking-[0.04em] text-[var(--fn-cream)] flex items-center gap-2.5`}>
          <Image src="/fire-mark.svg" alt="" width={20} height={20} className="w-5 h-5" />
          BURN GOVERNOR
        </h3>
        <span className={`${MONO} text-[10px] font-bold border border-[var(--fn-line-strong)] text-[var(--fn-gold)] px-3 py-1.5 rounded-full tracking-[0.12em]`}>
          TIER {tier}: {tierName.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className={`${LABEL} mb-1.5`}>Qualified Burners</p>
          <p className={`${SERIF} font-semibold text-2xl text-[var(--fn-cream)]`}>{qualifyingWhales}</p>
          <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>of {nextThreshold} needed</p>
        </div>
        <div>
          <p className={`${LABEL} mb-1.5`}>Burn Rate</p>
          <p className={`${SERIF} font-semibold text-[var(--fn-fire)] text-2xl`}>{burnPct}%</p>
          <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>of payouts torched</p>
        </div>
        {personal ? (
          <div>
            <p className={`${LABEL} mb-1.5`}>Total Burned</p>
            <p className={`${SERIF} font-semibold text-[var(--fn-fire)] text-2xl`}>{fmtNum(totalBurned)}</p>
            {price > 0 && <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>≈ {fmtUsd(totalBurned * price)} gone forever</p>}
          </div>
        ) : (
          <div>
            <p className={`${LABEL} mb-1.5`}>Total Whales</p>
            <p className={`${SERIF} font-semibold text-2xl text-[var(--fn-cream)]`}>{totalWhales}</p>
            <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>holding 100K+ tokens</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-1.5">
          <span className={`${MONO} text-xs text-[var(--fn-cream)]/70`}>{qualifyingWhales} Burners</span>
          <span className={`${MONO} text-[var(--fn-fire)] text-xs font-bold`}>
            Next: {TIER_NAMES[nextTierIdx]} ({nextThreshold})
          </span>
        </div>
        <FireBar pct={progressToNext * 100} />
      </div>

      {personal && isWhale && (
        <div className="border border-[var(--fn-fire)]/50 bg-[rgba(255,91,31,0.06)] p-4 mb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={`${MONO} text-[var(--fn-fire)] text-xs font-bold tracking-[0.1em]`}>QUALIFYING AS BURNER</p>
              <p className={`${MONO} text-[11px] text-[var(--fn-muted)] mt-1`}>
                Holding {fmtNum(balance)} tokens (min 100K) for {whaleDays}d (need {burnerDaysNeeded}d)
              </p>
            </div>
            <p className={`${DISPLAY} text-[var(--fn-fire)] text-xl whitespace-nowrap`}>
              {burnerRemaining > 0 ? `${burnerRemaining}D LEFT` : "QUALIFIED"}
            </p>
          </div>
        </div>
      )}

      <div className="border border-[var(--fn-line)] rounded-sm overflow-hidden">
        {BURN_TIERS.map((t, i) => (
          <div
            key={t.name}
            className={`flex items-center justify-between px-4 py-3 ${MONO} ${
              i === tier ? "bg-[rgba(255,91,31,0.08)]" : ""
            } ${i < BURN_TIERS.length - 1 ? "border-b border-[var(--fn-line)]" : ""}`}
          >
            <span className={`text-sm ${i === tier ? "text-[var(--fn-fire)] font-bold" : "text-[var(--fn-muted)]"}`}>{t.name}</span>
            <span className="text-[10px] text-[var(--fn-muted)]">{t.threshold}</span>
            <span className={`text-sm ${i === tier ? "text-[var(--fn-fire)] font-bold" : "text-[var(--fn-muted)]"}`}>{t.pct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Share Modal ───────── */

const CARD_TYPES = [
  { id: "lifetime", label: "Lifetime Earnings" },
  { id: "retirement", label: "Retirement Card" },
  { id: "proof", label: "Proof of Nothing" },
  { id: "status", label: "Holder Status" },
  { id: "bag", label: "My FIRE Bag" },
] as const;

function ShareModal({
  address,
  status,
  price,
  onClose,
  initialType = "retirement",
}: {
  address: `0x${string}`;
  status: HolderStatus;
  price: number;
  onClose: () => void;
  initialType?: string;
}) {
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const lifetime = useHolderStats(address);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://retirewithfire.org";
  const cardImageUrl = `${siteUrl}/api/card?address=${address}&type=${selectedType}`;
  const cardPageUrl = `${siteUrl}/card?address=${address}&type=${selectedType}`;

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

  const lifetimeTotal = lifetime?.allTimeTotal || 0;
  const lifetimeUsd = lifetimeTotal * price;

  const tweetTexts: Record<string, string> = {
    lifetime: `${fmt(lifetimeTotal)} $FIRE earned all-time across every contract (${fmtUsd(lifetimeUsd)}).\n\n${daysHeld} days of doing nothing.\n\nDo nothing. Get paid.`,
    retirement: `Proof of Doing Nothing\n\n${fmtUsd(lifetimeUsd)} earned while doing absolutely nothing.\n\n${multiplier.toFixed(1)}x multiplier | ${fmt(lifetimeTotal)} $FIRE earned\n\nDo nothing. Get paid.`,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative fn-cert bg-[var(--fn-panel)] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--fn-line-strong)]">
          <h3 className={`${DISPLAY} text-lg tracking-[0.04em] fn-gold-text`}>SHARE YOUR STATUS</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center border border-[var(--fn-line-strong)] text-[var(--fn-gold)] hover:bg-[rgba(229,185,78,0.1)] transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 pt-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CARD_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`flex-shrink-0 px-4 py-2 ${MONO} text-xs transition-all duration-150 border cursor-pointer ${
                  selectedType === t.id
                    ? "border-[var(--fn-gold)] text-[var(--fn-gold)] bg-[rgba(229,185,78,0.1)] font-bold"
                    : "border-[var(--fn-line)] text-[var(--fn-muted)] hover:text-[var(--fn-cream)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-3">
          <div className="relative border-2 border-[var(--fn-edge)] overflow-hidden bg-[var(--fn-panel-2)]">
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`${MONO} text-xs text-[var(--fn-muted)]`}>Generating card...</div>
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

        <div className="px-5 pb-5 pt-2 flex flex-col gap-2.5">
          <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className={`${GOLD_BTN} ${DISPLAY} w-full text-sm py-3.5 tracking-[0.08em]`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            SHARE ON X
          </a>
          <div className="flex gap-2.5">
            <button onClick={copyLink} className={`${GHOST_BTN} ${MONO} flex-1 text-sm py-3`}>
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
            <button onClick={downloadCard} className={`${GHOST_BTN} ${MONO} flex-1 text-sm py-3`}>
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

/* ───────── Protocol Overview (no wallet) ───────── */

function ProtocolOverview() {
  const dex = useDexData();
  const INITIAL_SUPPLY = 1_000_000_000;

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

  const { data: zeroStatus } = useReadContract({
    address: FIRE_CONTRACT,
    abi: FIRE_ABI,
    functionName: "holderStatus",
    args: ["0x0000000000000000000000000000000000000001" as `0x${string}`],
    chainId: base.id,
    query: { refetchInterval: 60_000 },
  });

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
  const rewardPoolAfterBurn = zeroStatus ? Number(formatUnits(zeroStatus.rewardPoolAfterBurn, 18)) : 0;

  const dailyTaxCollected = dex.volume24h * 0.04;
  const monthlyTaxEstimate = dailyTaxCollected * 30;
  const up = dex.priceChange24h >= 0;

  return (
    <div className="space-y-6">
      {/* At a glance */}
      <div className={`${CARD} p-6 sm:p-8`}>
        <p className={`${LABEL_GOLD} mb-1`}>Protocol Overview</p>
        <p className={`${DISPLAY} text-2xl tracking-[0.03em] text-[var(--fn-cream)] mb-7`}>$FIRE AT A GLANCE</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className={`${LABEL} mb-1.5`}>Token Price</p>
            <p className={`${SERIF} font-semibold fn-gold-text text-xl`}>{fmtPrice(dex.priceUsd)}</p>
            {dex.priceChange24h !== 0 && (
              <p className={`${MONO} text-[10px] mt-0.5 ${up ? "text-[var(--fn-green)]" : "text-[var(--fn-red)]"}`}>
                {up ? "+" : ""}
                {dex.priceChange24h.toFixed(1)}% (24h)
              </p>
            )}
          </div>
          <div>
            <p className={`${LABEL} mb-1.5`}>Market Cap</p>
            <p className={`${SERIF} font-semibold text-xl text-[var(--fn-cream)]`}>{dex.marketCap > 0 ? fmtUsd(dex.marketCap) : "--"}</p>
          </div>
          <div>
            <p className={`${LABEL} mb-1.5`}>24h Volume</p>
            <p className={`${SERIF} font-semibold text-xl text-[var(--fn-cream)]`}>{dex.volume24h > 0 ? fmtUsd(dex.volume24h) : "--"}</p>
          </div>
          <div>
            <p className={`${LABEL} mb-1.5`}>Liquidity</p>
            <p className={`${SERIF} font-semibold text-xl text-[var(--fn-cream)]`}>{dex.liquidity > 0 ? fmtUsd(dex.liquidity) : "--"}</p>
          </div>
        </div>
      </div>

      {/* Payouts & Supply */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`${CARD} p-6`}>
          <p className={`${LABEL_GOLD} mb-5`}>Payout Pool</p>
          <div className="space-y-4">
            <div>
              <p className={`${MONO} text-xs text-[var(--fn-muted)] mb-1`}>Available to holders</p>
              <p className={`${SERIF} font-semibold fn-gold-text text-2xl`}>{fmtNum(rewardPoolAfterBurn)} FIRE</p>
              {dex.priceUsd > 0 && (
                <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>≈ {fmtUsd(rewardPoolAfterBurn * dex.priceUsd)}</p>
              )}
            </div>
            <hr className="border-none border-t border-[var(--fn-line)]" />
            <div>
              <p className={`${MONO} text-xs text-[var(--fn-muted)] mb-1`}>Daily tax collected (est.)</p>
              <p className={`${SERIF} font-semibold text-lg text-[var(--fn-cream)]`}>{fmtUsd(dailyTaxCollected)}</p>
              <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>from 4% tax on {fmtUsd(dex.volume24h)} volume</p>
            </div>
            <hr className="border-none border-t border-[var(--fn-line)]" />
            <div>
              <p className={`${MONO} text-xs text-[var(--fn-muted)] mb-1`}>Est. 30-day payouts</p>
              <p className={`${SERIF} font-semibold text-[var(--fn-green)] text-lg`}>{fmtUsd(monthlyTaxEstimate)}</p>
              <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>at current volume</p>
            </div>
          </div>
        </div>

        <div className={`${CARD} p-6`}>
          <p className={`${LABEL_GOLD} mb-5`}>Supply &amp; Burns</p>
          <div className="space-y-4">
            <div>
              <p className={`${MONO} text-xs text-[var(--fn-muted)] mb-1`}>Current Supply</p>
              <p className={`${SERIF} font-semibold text-2xl text-[var(--fn-cream)]`}>{fmtNum(supply)}</p>
              <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>of {fmtNum(INITIAL_SUPPLY)} initial</p>
            </div>
            <hr className="border-none border-t border-[var(--fn-line)]" />
            <div>
              <p className={`${MONO} text-xs text-[var(--fn-muted)] mb-1`}>Total Burned</p>
              <p className={`${SERIF} font-semibold text-[var(--fn-fire)] text-lg`}>{fmtNum(Math.max(totalBurned, 0))} FIRE</p>
              {dex.priceUsd > 0 && totalBurned > 0 && (
                <p className={`${MONO} text-[10px] text-[var(--fn-muted)]`}>≈ {fmtUsd(totalBurned * dex.priceUsd)} removed forever</p>
              )}
            </div>
            <hr className="border-none border-t border-[var(--fn-line)]" />
            <div>
              <div className="flex justify-between mb-1.5">
                <p className={`${MONO} text-xs text-[var(--fn-muted)]`}>Supply burned</p>
                <p className={`${DISPLAY} text-[var(--fn-fire)] text-lg tracking-[0.02em]`}>
                  {supply > 0 ? ((totalBurned / INITIAL_SUPPLY) * 100).toFixed(2) : 0}%
                </p>
              </div>
              <FireBar pct={(totalBurned / INITIAL_SUPPLY) * 100} />
            </div>
          </div>
        </div>
      </div>

      <BurnStatus status={undefined} burnInfo={burnInfo} price={dex.priceUsd} personal={false} />
    </div>
  );
}

/* ───────── Connected Dashboard ───────── */

function Dashboard({ address }: { address: `0x${string}` }) {
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const price = useTokenPrice();
  const [shareCardType, setShareCardType] = useState<string | null>(null);

  useEffect(() => {
    if (chain && chain.id !== base.id) {
      switchChain({ chainId: base.id });
    }
  }, [chain, switchChain]);

  const { data: status } = useReadContract({
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

  if (chain && chain.id !== base.id) {
    return (
      <div className="text-center py-20">
        <p className={`${MONO} text-base text-[var(--fn-muted)] mb-5`}>Wrong floor. Please switch to Base.</p>
        <button
          onClick={() => switchChain({ chainId: base.id })}
          className={`${GOLD_BTN} ${DISPLAY} text-sm px-8 py-3 tracking-[0.08em]`}
        >
          SWITCH TO BASE
        </button>
      </div>
    );
  }

  const hasBalance = status?.balance && status.balance > BigInt(0);

  return (
    <div className="space-y-6">
      <LifetimeEarnedHero address={address} price={price} onShare={() => setShareCardType("lifetime")} />
      <MultiplierHero status={status} />

      {hasBalance && (
        <button
          onClick={() => setShareCardType("retirement")}
          className={`${GHOST_BTN} ${DISPLAY} w-full text-sm py-4 tracking-[0.08em]`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          SHARE YOUR RETIREMENT CARD
        </button>
      )}

      <StatsRow status={status} price={price} />
      <ClaimSection status={status} price={price} address={address} />
      <EarningsChart status={status} price={price} burnInfo={burnInfo} address={address} />
      <CostOfSelling status={status} price={price} />
      <BurnStatus status={status} burnInfo={burnInfo} price={price} />

      {shareCardType && hasBalance && status && (
        <ShareModal
          address={address}
          status={status}
          price={price}
          initialType={shareCardType}
          onClose={() => setShareCardType(null)}
        />
      )}
    </div>
  );
}

/* ───────── Read-Only Dashboard ───────── */

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
      <MultiplierHero status={status} />
      <StatsRow status={status} price={price} />

      <div className="border-[2.5px] border-[var(--fn-fire)] bg-[rgba(255,91,31,0.07)] shadow-[7px_7px_0_var(--fn-edge)] p-6">
        <p className={`${MONO} text-[11px] font-bold tracking-[0.26em] uppercase text-[var(--fn-fire)]`}>Claimable Payouts</p>
        <p className={`${DISPLAY} text-[var(--fn-fire)] text-3xl mt-3`}>{fmtTokens(status?.pendingRewards)} FIRE</p>
        {price > 0 && status?.pendingRewards ? (
          <p className={`${MONO} text-[var(--fn-ember)] text-xs mt-2`}>
            ≈ {fmtUsd(Number(formatUnits(status.pendingRewards, 18)) * price)}
          </p>
        ) : null}
      </div>

      <EarningsChart status={status} price={price} burnInfo={burnInfo} address={address} />
      <BurnStatus status={status} burnInfo={burnInfo} price={price} />
    </div>
  );
}

/* ───────── Page ───────── */

export default function DashboardNewPage() {
  const { login, logout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];
  const address = activeWallet?.address as `0x${string}` | undefined;

  const [view, setView] = useState<"protocol" | "personal" | "lookup">("protocol");
  const [lookupInput, setLookupInput] = useState("");
  const [lookupAddress, setLookupAddress] = useState<`0x${string}` | null>(null);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    if (authenticated && address && view === "protocol") {
      setView("personal");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="fn-page min-h-screen">
      <TickerTape />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#f1ead8]/90 backdrop-blur-xl border-b-2 border-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/landing-new" className="flex items-center gap-2.5 no-underline">
            <Image src="/fire-mark.svg" alt="$FIRE" width={32} height={32} className="w-8 h-8" />
            <span className={`${DISPLAY} text-[19px] tracking-[0.06em] leading-none`}>
              <span className="text-[#ff5b1f]">$FIRE</span>
              <small className={`${MONO} text-[8px] tracking-[0.28em] text-[var(--fn-muted)] block leading-none mt-1`}>
                THE TRADING DESK
              </small>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/leaderboard-new"
              className={`${MONO} hidden sm:block text-[11px] tracking-[0.1em] uppercase text-[var(--fn-cream)]/70 no-underline hover:text-[var(--fn-gold)] transition-colors`}
            >
              The Board
            </Link>
            {authenticated ? (
              <>
                <span className={`${MONO} text-xs text-[var(--fn-muted)] hidden sm:block`}>
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
                </span>
                <button
                  onClick={logout}
                  className={`${MONO} text-xs text-[var(--fn-fire)] hover:underline cursor-pointer`}
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={login} className={`${GOLD_BTN} ${DISPLAY} text-xs tracking-[0.1em] px-4 py-2.5`}>
                CONNECT WALLET
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 sm:px-6 py-8 sm:py-12">
        {/* Title */}
        <div className="mb-6">
          <p className={`${MONO} text-[var(--fn-gold)] text-[11px] font-bold tracking-[0.3em] uppercase mb-3 flex items-center gap-3`}>
            <span className="w-8 h-px bg-[var(--fn-line-strong)]" />
            THE TRADING DESK
          </p>
          <h1 className={`${DISPLAY} text-3xl sm:text-5xl leading-tight tracking-[0.01em]`}>
            {view === "personal" ? (
              <>
                YOUR <em className={`${SERIF} italic font-normal text-[var(--fn-fire)]`}>retirement</em> DESK
              </>
            ) : view === "lookup" ? (
              <>
                WALLET <em className={`${SERIF} italic font-normal text-[var(--fn-fire)]`}>lookup</em>
              </>
            ) : (
              <>
                $FIRE <em className={`${SERIF} italic font-normal text-[var(--fn-fire)]`}>protocol</em>
              </>
            )}
          </h1>
        </div>

        {/* Lookup */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="Look up any wallet: 0x..."
              className={`flex-1 bg-[var(--fn-panel)] border border-[var(--fn-line)] px-4 py-3 ${MONO} text-xs text-[var(--fn-cream)] placeholder:text-[var(--fn-muted)] focus:outline-none focus:border-[var(--fn-fire)] focus:shadow-[4px_4px_0_var(--fn-fire)] transition-all rounded-sm`}
            />
            <button onClick={handleLookup} className={`${GHOST_BTN} ${DISPLAY} text-xs px-5 py-3 tracking-[0.08em] whitespace-nowrap`}>
              LOOK UP
            </button>
          </div>
          {lookupError && <p className={`${MONO} text-[var(--fn-red)] text-[10px] mt-1.5`}>{lookupError}</p>}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 border-b border-[var(--fn-line-strong)]">
          <button
            onClick={() => setView("protocol")}
            className={`${MONO} text-xs px-4 py-2.5 border-b-2 -mb-px transition-colors tracking-[0.12em] uppercase cursor-pointer ${
              view === "protocol"
                ? "border-[var(--fn-gold)] text-[var(--fn-gold)] font-bold"
                : "border-transparent text-[var(--fn-muted)] hover:text-[var(--fn-cream)]"
            }`}
          >
            Protocol
          </button>
          {showPersonalTab && (
            <button
              onClick={() => setView("personal")}
              className={`${MONO} text-xs px-4 py-2.5 border-b-2 -mb-px transition-colors tracking-[0.12em] uppercase cursor-pointer ${
                view === "personal"
                  ? "border-[var(--fn-gold)] text-[var(--fn-gold)] font-bold"
                  : "border-transparent text-[var(--fn-muted)] hover:text-[var(--fn-cream)]"
              }`}
            >
              My Desk
            </button>
          )}
          {lookupAddress && (
            <button
              onClick={() => setView("lookup")}
              className={`${MONO} text-xs px-4 py-2.5 border-b-2 -mb-px transition-colors tracking-[0.12em] cursor-pointer ${
                view === "lookup"
                  ? "border-[var(--fn-gold)] text-[var(--fn-gold)] font-bold"
                  : "border-transparent text-[var(--fn-muted)] hover:text-[var(--fn-cream)]"
              }`}
            >
              {lookupAddress.slice(0, 6)}...{lookupAddress.slice(-4)}
            </button>
          )}
        </div>

        {/* Content */}
        {!ready ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-2 border-[var(--fn-gold)] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <p className={`${MONO} text-sm text-[var(--fn-muted)]`}>Opening the desk...</p>
          </div>
        ) : view === "personal" && address ? (
          <Dashboard address={address} />
        ) : view === "lookup" && lookupAddress ? (
          <div className="space-y-6">
            <div className={`fn-card px-4 py-2.5`}>
              <p className={`${MONO} text-xs break-all text-[var(--fn-muted)]`}>{lookupAddress}</p>
            </div>
            <ReadOnlyDashboard address={lookupAddress} />
          </div>
        ) : (
          <ProtocolOverview />
        )}

        <p className={`${MONO} text-[10px] leading-[1.8] text-[var(--fn-muted)] mt-12 pt-6 border-t border-[var(--fn-line)]`}>
          $FIRE is an experimental onchain game. It is not a financial product, investment vehicle, or
          security. Payouts are not guaranteed and depend entirely on trading volume. Do not purchase
          with funds you cannot afford to lose.
        </p>
      </div>

      <FooterNew />
    </div>
  );
}
