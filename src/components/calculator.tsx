"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

// Model constants
const DAILY_VOLUME = 10_000_000; // $10M daily volume
const TAX_RATE = 0.03; // 3% tax
const DAILY_TAX_POOL = DAILY_VOLUME * TAX_RATE; // $300K/day
const TOTAL_SUPPLY = 1_000_000_000; // 1B tokens
const MARKET_CAP = 100_000_000; // $100M
const PRICE_PER_TOKEN = MARKET_CAP / TOTAL_SUPPLY; // $0.10

export function Calculator() {
  const [investment, setInvestment] = useState(1000);
  const [daysHeld, setDaysHeld] = useState(30);

  const results = useMemo(() => {
    const tokens = investment / PRICE_PER_TOKEN;
    const shareOfSupply = tokens / TOTAL_SUPPLY;

    // Quadratic multiplier: days^2
    const multiplier = daysHeld * daysHeld;

    // Weighted share = share * multiplier
    // Assume average holder has ~15 day multiplier (225x) for normalization
    const avgMultiplier = 225;
    const weightedShare = (shareOfSupply * multiplier) / (shareOfSupply * multiplier + (1 - shareOfSupply) * avgMultiplier);

    const dailyReflections = DAILY_TAX_POOL * weightedShare;
    const monthlyReflections = dailyReflections * 30;
    const yearlyReflections = dailyReflections * 365;

    return {
      tokens: tokens.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      multiplier: `${multiplier.toLocaleString()}x`,
      daily: dailyReflections,
      monthly: monthlyReflections,
      yearly: yearlyReflections,
    };
  }, [investment, daysHeld]);

  const formatUsd = (n: number) =>
    n >= 1
      ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${n.toFixed(4)}`;

  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-3xl mx-auto px-6">
        <div className="border-t border-divider pt-16 sm:pt-24">
          <motion.p {...fadeUp} className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-6">
            FIRE Calculator
          </motion.p>

          <motion.h2 {...fadeUp} className="font-serif font-black text-ink text-3xl sm:text-4xl leading-tight mb-4">
            How much retirement
            <br />
            can you afford?
          </motion.h2>

          <motion.p {...fadeUp} className="text-ink-muted text-base mb-12">
            Modeled at $100M market cap with $10M daily volume. These numbers are
            ridiculous. That&apos;s the point.
          </motion.p>

          <motion.div
            {...fadeUp}
            className="bg-white rounded-lg border border-divider p-6 sm:p-8"
          >
            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
              {/* Investment Amount */}
              <div>
                <label className="font-mono text-ink-muted text-xs tracking-[0.15em] uppercase block mb-3">
                  Investment
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    value={investment}
                    onChange={(e) =>
                      setInvestment(Math.max(0, Number(e.target.value)))
                    }
                    className="w-full bg-cream border border-divider rounded px-4 pl-8 py-3 font-serif font-bold text-xl text-ink focus:outline-none focus:border-fire transition-colors"
                  />
                </div>
                <input
                  type="range"
                  min={100}
                  max={100000}
                  step={100}
                  value={investment}
                  onChange={(e) => setInvestment(Number(e.target.value))}
                  className="w-full mt-3 accent-fire"
                />
                <div className="flex justify-between font-mono text-ink-muted text-xs mt-1">
                  <span>$100</span>
                  <span>$100K</span>
                </div>
              </div>

              {/* Days Held */}
              <div>
                <label className="font-mono text-ink-muted text-xs tracking-[0.15em] uppercase block mb-3">
                  Days Held
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={daysHeld}
                    onChange={(e) =>
                      setDaysHeld(Math.max(1, Math.min(365, Number(e.target.value))))
                    }
                    className="w-full bg-cream border border-divider rounded px-4 py-3 font-serif font-bold text-xl text-ink focus:outline-none focus:border-fire transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted font-mono text-sm">
                    days
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={365}
                  step={1}
                  value={daysHeld}
                  onChange={(e) => setDaysHeld(Number(e.target.value))}
                  className="w-full mt-3 accent-fire"
                />
                <div className="flex justify-between font-mono text-ink-muted text-xs mt-1">
                  <span>1 day</span>
                  <span>365 days</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-divider mb-8" />

            {/* Results */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="font-mono text-ink-muted text-xs mb-1">Tokens</p>
                <p className="font-serif font-bold text-ink text-lg">
                  {results.tokens}
                </p>
              </div>
              <div>
                <p className="font-mono text-ink-muted text-xs mb-1">
                  Multiplier
                </p>
                <p className="font-serif font-bold text-fire text-lg">
                  {results.multiplier}
                </p>
              </div>
              <div>
                <p className="font-mono text-ink-muted text-xs mb-1">
                  Daily reflections
                </p>
                <p className="font-serif font-bold text-fire text-lg">
                  {formatUsd(results.daily)}
                </p>
              </div>
              <div>
                <p className="font-mono text-ink-muted text-xs mb-1">
                  Monthly
                </p>
                <p className="font-serif font-bold text-fire text-lg">
                  {formatUsd(results.monthly)}
                </p>
              </div>
            </div>

            {/* Yearly highlight */}
            <div className="mt-8 bg-ink rounded-lg p-6 text-center">
              <p className="font-mono text-fire text-xs tracking-[0.15em] uppercase mb-2">
                Projected yearly income
              </p>
              <p className="font-serif font-black text-white text-3xl sm:text-4xl">
                {formatUsd(results.yearly)}
              </p>
              <p className="font-mono text-ink-muted text-xs mt-2">
                from doing absolutely nothing
              </p>
            </div>
          </motion.div>

          <motion.p
            {...fadeUp}
            className="text-center text-ink-muted text-xs font-mono mt-6 italic"
          >
            Illustrative model only. Assumes constant volume and market cap. Your
            actual retirement may vary. Probably upward.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
