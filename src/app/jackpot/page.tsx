"use client";

/* The Jackpot — Friday jackpot page, v3 Terminal Dark.
   Reads the pot straight from the Distributor (jackpotReserve per basket
   asset) so the number on screen is the number on chain. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { formatUnits, zeroAddress } from "viem";
import {
  DISTRIBUTOR_CONTRACT, DISTRIBUTOR_ABI, ERC20_META_ABI,
} from "@/lib/contract";
import { NavShell, FooterV3, BuyButton, Kicker, FadeUp, MONO, SERIF } from "@/components/fire-v3/shared";

function fmtTokens(raw: bigint | undefined, dp = 4, decimals = 18): string {
  if (raw === undefined) return "—";
  return Number(formatUnits(raw, decimals)).toLocaleString("en-US", { maximumFractionDigits: dp });
}
function shortAddr(a: string) { return `${a.slice(0, 6)}...${a.slice(-4)}`; }

/* Friday 4:00 PM ET — same clock as the landing and the keeper draw */
function useFridayCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const target = new Date(et);
      let addDays = (5 - et.getDay() + 7) % 7;
      if (addDays === 0 && et.getHours() >= 16) addDays = 7;
      target.setDate(et.getDate() + addDays);
      target.setHours(16, 0, 0, 0);
      setRemaining(Math.max(target.getTime() - et.getTime(), 0));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return remaining;
}

function usePot() {
  const { data: basket } = useReadContract({
    address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI, functionName: "getBasket",
  });
  const assets = basket?.[0];

  const metaReads = useMemo(
    () =>
      (assets || [])
        .filter((a) => a !== zeroAddress)
        .flatMap((a) => [
          { address: a, abi: ERC20_META_ABI, functionName: "symbol" as const },
          { address: a, abi: ERC20_META_ABI, functionName: "decimals" as const },
        ]),
    [assets]
  );
  const { data: metaData } = useReadContracts({ contracts: metaReads, query: { enabled: metaReads.length > 0 } });

  const reserveReads = useMemo(
    () =>
      (assets || []).map((a) => ({
        address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI,
        functionName: "jackpotReserve" as const, args: [a] as const,
      })),
    [assets]
  );
  const { data: reserves } = useReadContracts({ contracts: reserveReads, query: { enabled: reserveReads.length > 0 } });

  return useMemo(() => {
    const nonEth = (assets || []).filter((a) => a !== zeroAddress);
    const meta: Record<string, { symbol: string; decimals: number }> = {
      [zeroAddress]: { symbol: "ETH", decimals: 18 },
    };
    nonEth.forEach((a, i) => {
      meta[a.toLowerCase()] = {
        symbol: (metaData?.[i * 2]?.result as string) || shortAddr(a),
        decimals: Number(metaData?.[i * 2 + 1]?.result ?? 18),
      };
    });
    return (assets || []).map((a, i) => ({
      asset: a,
      symbol: meta[a === zeroAddress ? zeroAddress : a.toLowerCase()]?.symbol ?? shortAddr(a),
      decimals: meta[a === zeroAddress ? zeroAddress : a.toLowerCase()]?.decimals ?? 18,
      amount: reserves?.[i]?.result as bigint | undefined,
    }));
  }, [assets, metaData, reserves]);
}

export default function JackpotPage() {
  const cdMs = useFridayCountdown();
  const pot = usePot();
  const { data: minStreak } = useReadContract({
    address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI, functionName: "jackpotMinStreakDays",
  });
  const min = Number(minStreak ?? BigInt(90));

  const cd = (u: number) => (cdMs === null ? "–" : String(u).padStart(2, "0"));
  const units = [
    { label: "Days", value: cd(Math.floor((cdMs || 0) / 86400000)) },
    { label: "Hours", value: cd(Math.floor(((cdMs || 0) / 3600000) % 24)) },
    { label: "Min", value: cd(Math.floor(((cdMs || 0) / 60000) % 60)) },
    { label: "Sec", value: cd(Math.floor(((cdMs || 0) / 1000) % 60)) },
  ];

  const funded = pot.filter((p) => p.amount !== undefined && p.amount > BigInt(0));

  return (
    <div className="fv-page min-h-screen">
      <NavShell active="jackpot" />

      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 py-14 sm:py-20">
        {/* header */}
        <FadeUp className="text-center">
          <Kicker>Every Friday · 4:00 PM ET</Kicker>
          <h1 className="text-[clamp(38px,6vw,72px)] leading-[1.02] tracking-[-0.03em] font-semibold [text-wrap:balance]">
            The <em className={`${SERIF} italic font-normal text-[var(--fv-green)]`}>jackpot.</em>
          </h1>
          <p className="text-[16px] leading-[1.65] text-[var(--fv-muted)] mt-5 max-w-[560px] mx-auto [text-wrap:pretty]">
            Options expire on Friday. So does your excuse for selling. One eligible holder wins the
            entire pot — and picks the stock everyone earns next week.
          </p>
        </FadeUp>

        {/* countdown + pot */}
        <div className="grid md:grid-cols-2 gap-5 mt-12 items-stretch">
          <FadeUp delay={80}>
            <div className="fv-panel p-8 text-center h-full flex flex-col justify-center">
              <p className={`${MONO} text-[10px] tracking-[0.22em] uppercase text-[var(--fv-muted)] mb-6`}>Next draw</p>
              <div className="grid grid-cols-4 gap-3">
                {units.map((u) => (
                  <div key={u.label}>
                    <p className={`${MONO} text-[clamp(30px,4vw,46px)] font-medium leading-none text-[var(--fv-green)]`}>{u.value}</p>
                    <p className={`${MONO} text-[9px] tracking-[0.2em] uppercase text-[var(--fv-faint)] mt-2.5`}>{u.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={140}>
            <div className="fv-panel border-[rgba(0,200,5,0.35)] p-8 h-full flex flex-col">
              <p className={`${MONO} text-[10px] tracking-[0.22em] uppercase text-[var(--fv-green)] mb-5`}>The pot · on-chain</p>
              {funded.length > 0 ? (
                <div className="space-y-3">
                  {funded.map((p) => (
                    <div key={p.asset} className="flex items-baseline justify-between border-b border-[var(--fv-line)] last:border-b-0 pb-3 last:pb-0">
                      <span className={`${MONO} text-[28px] font-medium text-[var(--fv-green)] tracking-[-0.02em]`}>
                        {fmtTokens(p.amount, 4, p.decimals)}
                      </span>
                      <span className={`${MONO} text-xs text-[var(--fv-muted)]`}>{p.symbol}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`${MONO} text-sm text-[var(--fv-muted)] leading-relaxed my-auto`}>
                  The pot is filling. Fees accrue all week — dividends left unclaimed for 8+ weeks
                  roll in too. Check back before Friday&apos;s close.
                </p>
              )}
              <p className={`${MONO} text-[9px] tracking-[0.12em] uppercase text-[var(--fv-faint)] mt-5`}>
                Read live from the Distributor contract
              </p>
            </div>
          </FadeUp>
        </div>

        {/* rules */}
        <div className="grid sm:grid-cols-3 gap-5 mt-5">
          {[
            {
              t: `${min} days to enter`,
              b: `Hold a ${min}-day streak and you're in the draw automatically. No ticket, no signup — the streak is the ticket.`,
            },
            {
              t: "Odds = streak × bag",
              b: "Every day held and every FIRE added compounds your weight. Splitting wallets divides both — don't.",
            },
            {
              t: "Winner picks the stock",
              b: "Next week's dividend asset is the winner's call. Their name on the pick, everyone's wallet on the payout.",
            },
          ].map((r, i) => (
            <FadeUp key={r.t} delay={i * 80}>
              <div className="fv-panel p-6 h-full">
                <p className={`${MONO} text-[11px] text-[var(--fv-faint)] tracking-[0.18em] mb-4`}>{String(i + 1).padStart(2, "0")}</p>
                <h3 className="text-[17px] font-semibold mb-2">{r.t}</h3>
                <p className="text-[13px] leading-[1.65] text-[var(--fv-muted)]">{r.b}</p>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* verifiability */}
        <FadeUp delay={100}>
          <div className="fv-panel p-6 sm:p-7 mt-5">
            <p className={`${MONO} text-[10px] tracking-[0.22em] uppercase text-[var(--fv-green)] mb-3`}>Provably fair</p>
            <p className="text-[14px] leading-[1.7] text-[var(--fv-muted)] max-w-[720px]">
              The draw block is committed publicly before the drawing, and the winner is derived
              from that block&apos;s hash — anyone can recompute it. No admin picks, no reroll.
              Unclaimed dividends older than 8 weeks roll into the pot, so somebody&apos;s
              forgetfulness is Friday&apos;s upside.
            </p>
          </div>
        </FadeUp>

        {/* CTAs */}
        <FadeUp delay={140} className="text-center mt-12">
          <div className="flex gap-3 justify-center flex-wrap">
            <BuyButton className="text-[15px] px-7 py-3.5" />
            <Link href="/dashboard" className="fv-btn-ghost text-[15px] px-7 py-3.5">
              Check your entry
            </Link>
          </div>
          <p className={`${MONO} text-[10px] tracking-[0.12em] uppercase text-[var(--fv-faint)] mt-6`}>
            Your streak, weight and eligibility live on the dashboard
          </p>
        </FadeUp>
      </div>

      <FooterV3 />
    </div>
  );
}
