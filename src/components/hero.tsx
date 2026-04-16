"use client";

import { motion } from "framer-motion";
import { SITE } from "@/lib/constants";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16">
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
              Get paid.
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
              className="flex flex-col gap-3"
            >
              <a
                href={SITE.links.uniswap}
                className="inline-flex items-center gap-2 bg-fire hover:bg-fire-dark text-white font-mono text-sm sm:text-base px-8 py-4 rounded transition-colors w-fit group"
              >
                {SITE.cta}
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </a>
              <p className="font-mono text-ink-muted text-xs sm:text-sm">
                No staking. No claiming. No effort.{" "}
                <span className="text-fire">Perfect for NEETs.</span>
              </p>
            </motion.div>
          </div>

          {/* Right: Mascot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="relative w-72 h-72 sm:w-96 sm:h-96">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-divider" />
              {/* Mascot placeholder */}
              <div className="absolute inset-4 rounded-full bg-cream-dark flex items-center justify-center overflow-hidden">
                <div className="text-center">
                  <div className="text-7xl sm:text-8xl mb-2">🔥</div>
                  <p className="font-mono text-ink-muted text-xs">
                    $FIRE mascot
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
