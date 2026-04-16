"use client";

import { motion } from "framer-motion";
import { SITE } from "@/lib/constants";
import { ArrowRight, ArrowUpRight } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6 },
};

export function Footer() {
  return (
    <footer className="py-24 sm:py-32">
      <div className="max-w-3xl mx-auto px-6">
        <div className="border-t border-divider pt-16 sm:pt-24">
          {/* CTA */}
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="font-serif font-black text-ink text-3xl sm:text-4xl leading-tight mb-4">
              The retirement is open.
            </h2>
            <p className="text-ink-light text-lg mb-8">
              Your clock starts when you buy. Every minute you wait, the earliest
              holders get further ahead.
            </p>
            <a
              href={SITE.links.uniswap}
              className="inline-flex items-center gap-2 bg-fire hover:bg-fire-dark text-white font-mono text-sm px-8 py-4 rounded transition-colors group"
            >
              Enlist
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
          </motion.div>

          {/* Links */}
          <motion.div
            {...fadeUp}
            className="flex flex-wrap justify-center gap-6 mb-12"
          >
            {[
              { label: "Buy on Uniswap", href: SITE.links.uniswap },
              { label: "Dashboard", href: SITE.links.dashboard },
              { label: "Contract", href: SITE.links.contract },
              { label: "Twitter", href: SITE.links.twitter },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-ink-muted hover:text-fire text-sm transition-colors"
              >
                {link.label}
                <ArrowUpRight size={14} />
              </a>
            ))}
          </motion.div>

          {/* Contract Address */}
          <motion.div {...fadeUp} className="text-center mb-8">
            <p className="font-mono text-ink-muted text-xs mb-1">CA:</p>
            <p className="font-mono text-ink text-xs sm:text-sm break-all">
              {SITE.contractAddress}
            </p>
          </motion.div>

          {/* Tagline */}
          <motion.p
            {...fadeUp}
            className="text-center font-mono text-ink-muted text-xs"
          >
            The only financial plan that works better the less you do.
          </motion.p>
        </div>
      </div>
    </footer>
  );
}
