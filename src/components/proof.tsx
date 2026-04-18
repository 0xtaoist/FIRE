"use client";

import { motion } from "@/lib/motion";
import { PROOF_CARDS } from "@/lib/constants";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

function ProofCard({
  card,
  highlight,
}: {
  card: (typeof PROOF_CARDS)[keyof typeof PROOF_CARDS];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-6 sm:p-8 ${
        highlight
          ? "border-fire bg-fire/5"
          : "border-divider bg-cream-dark/50"
      }`}
    >
      <h4
        className={`font-mono text-xs tracking-[0.15em] uppercase mb-6 ${
          highlight ? "text-fire" : "text-ink-muted"
        }`}
      >
        {card.title}
      </h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-ink-muted text-xs mb-1">Bought</p>
          <p className="font-serif font-bold text-ink text-xl">{card.bought}</p>
        </div>
        <div>
          <p className="font-mono text-ink-muted text-xs mb-1">Held</p>
          <p className="font-serif font-bold text-ink text-xl">{card.held}</p>
        </div>
        <div>
          <p className="font-mono text-ink-muted text-xs mb-1">Multiplier</p>
          <p
            className={`font-serif font-bold text-xl ${
              highlight ? "text-fire" : "text-ink"
            }`}
          >
            {card.multiplier}
          </p>
        </div>
        <div>
          <p className="font-mono text-ink-muted text-xs mb-1">
            Daily reflections
          </p>
          <p
            className={`font-serif font-bold text-xl ${
              highlight ? "text-fire" : "text-ink"
            }`}
          >
            {card.dailyReflections}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Proof() {
  return (
    <section id="proof" className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-6">
        <div className="border-t border-divider pt-12 sm:pt-16">
          <motion.p {...fadeUp} className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-6">
            The Proof
          </motion.p>

          <motion.h2 {...fadeUp} className="font-serif font-black text-ink text-3xl sm:text-4xl leading-tight mb-12">
            Math, briefly.
          </motion.h2>

          {/* Cards */}
          <motion.div
            {...fadeUp}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8"
          >
            <ProofCard card={PROOF_CARDS.patient} highlight />
            <ProofCard card={PROOF_CARDS.impatient} />
          </motion.div>

          {/* Punchline */}
          <motion.div {...fadeUp}>
            <p className="text-center font-serif text-ink text-lg sm:text-xl mb-2">
              Same token. Same pool. Different commitment.
            </p>
            <p className="text-center font-serif font-bold text-fire text-xl sm:text-2xl mb-8">
              Time beats money. Finally.
            </p>
            <p className="text-center text-ink-muted text-sm italic max-w-md mx-auto mb-6">
              Illustrative figures at ~$10M mcap, ~$10M daily volume. The 900:1
              ratio is exact &mdash; dollar amounts are modeled.
            </p>
            <div className="bg-fire/5 border border-fire/20 rounded-lg p-4 text-center">
              <p className="font-mono text-fire text-sm">
                &#9888; Selling resets your multiplier to zero. Every day you held
                is gone. Buy back in and you start at 1x.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
