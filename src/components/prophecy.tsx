"use client";

import { motion } from "@/lib/motion";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

export function Prophecy() {
  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-3xl mx-auto px-6">
        <div className="border-t border-divider pt-16 sm:pt-24">
          <motion.p {...fadeUp} className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-6">
            The Prophecy
          </motion.p>

          <motion.h2 {...fadeUp} className="font-serif font-black text-ink text-3xl sm:text-4xl leading-tight mb-8">
            What burns cannot return.
          </motion.h2>

          <motion.p {...fadeUp} className="text-ink-light text-lg leading-relaxed mb-12">
            At day 90, the most committed holders start burning supply. Every burn
            is permanent. The more of us who hold, the faster supply shrinks. The
            only financial mechanism where your refusal to act makes the asset more
            valuable.
          </motion.p>

          {/* Burn Counter */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="bg-ink rounded-lg p-8 sm:p-12 text-center"
          >
            <p className="font-serif font-black text-white text-5xl sm:text-6xl mb-4">
              0.00%
            </p>
            <p className="font-mono text-fire text-sm tracking-wide">
              of supply burned &mdash; so far
            </p>
          </motion.div>

          <motion.p
            {...fadeUp}
            className="text-center font-mono text-ink-muted text-sm mt-8 italic"
          >
            &ldquo;There will never be this many $FIRE tokens again.&rdquo;
          </motion.p>
        </div>
      </div>
    </section>
  );
}
