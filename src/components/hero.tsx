"use client";

import { motion } from "@/lib/motion";
import { SITE } from "@/lib/constants";
import { ArrowRight, Copy, Check } from "lucide-react";
import { useState } from "react";

function FireVisual() {
  return (
    <div className="relative w-72 h-72 sm:w-96 sm:h-96">
      {/* Glow */}
      <div className="absolute inset-0 rounded-full bg-fire/10 blur-3xl animate-pulse" />

      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border border-fire/20" />
      <div className="absolute inset-2 rounded-full border border-fire/10" />

      {/* Fire container */}
      <div className="absolute inset-6 rounded-full bg-gradient-to-b from-cream-dark to-cream flex items-center justify-center overflow-hidden">
        {/* Animated fire */}
        <div className="relative">
          <span className="text-[120px] sm:text-[160px] leading-none filter drop-shadow-[0_0_40px_rgba(212,114,42,0.5)]">
            🔥
          </span>
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Orbiting stats */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0"
      >
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-cream border border-divider rounded-full px-3 py-1">
          <span className="font-mono text-[10px] text-fire font-bold">4% TAX</span>
        </div>
      </motion.div>

      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0"
      >
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-cream border border-divider rounded-full px-3 py-1">
          <span className="font-mono text-[10px] text-ink-muted font-bold">HOLD = EARN</span>
        </div>
      </motion.div>
    </div>
  );
}

export function Hero() {
  const [copied, setCopied] = useState(false);

  const copyCA = () => {
    navigator.clipboard.writeText(SITE.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-16">
      <div className="max-w-6xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div className="flex flex-col gap-8">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-mono text-fire text-xs sm:text-sm tracking-[0.2em] uppercase leading-relaxed max-w-md"
            >
              {SITE.subtitle}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="font-serif font-black text-ink text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight"
            >
              Do nothing.
              <br />
              <span className="text-fire">Get paid.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-ink-light text-lg sm:text-xl leading-relaxed max-w-lg"
            >
              {SITE.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={SITE.links.uniswap}
                  className="inline-flex items-center justify-center gap-2 bg-fire hover:bg-fire-dark text-white font-mono text-sm sm:text-base px-8 py-4 rounded transition-all hover:scale-[1.02] active:scale-[0.98] w-fit group shadow-lg shadow-fire/20"
                >
                  {SITE.cta}
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </a>
                <a
                  href={SITE.links.telegram}
                  className="inline-flex items-center justify-center gap-2 bg-cream-dark hover:bg-divider text-ink font-mono text-sm sm:text-base px-8 py-4 rounded transition-all w-fit border border-divider"
                >
                  Join Telegram
                </a>
              </div>

              <p className="font-mono text-ink-muted text-xs sm:text-sm">
                No staking. No claiming. No effort.{" "}
                <span className="text-fire">Perfect for NEETs.</span>
              </p>

              {/* Contract address */}
              {SITE.contractAddress !== "0x0000000000000000000000000000000000000000" && (
                <button
                  onClick={copyCA}
                  className="inline-flex items-center gap-2 font-mono text-xs text-ink-muted hover:text-ink transition-colors w-fit"
                >
                  <span className="truncate max-w-[200px] sm:max-w-none">
                    CA: {SITE.contractAddress}
                  </span>
                  {copied ? <Check size={12} className="text-fire" /> : <Copy size={12} />}
                </button>
              )}
            </motion.div>
          </div>

          {/* Right: Fire Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center lg:justify-end"
          >
            <FireVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
