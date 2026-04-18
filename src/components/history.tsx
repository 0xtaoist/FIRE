"use client";

import { motion } from "@/lib/motion";
import { MagicText } from "@/components/ui/magic-text";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

export function History() {
  return (
    <section id="history" className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-6">
        <div className="border-t border-divider pt-12 sm:pt-16">
          {/* Era Label */}
          <motion.p {...fadeUp} className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-12">
            Est. 1992
          </motion.p>

          {/* Origin Story */}
          <div className="mb-20">
            <motion.h2 {...fadeUp} className="font-serif font-black text-ink text-3xl sm:text-4xl leading-tight mb-8">
              Once upon a time,
              <br />
              FIRE was earnest.
            </motion.h2>
            <MagicText
              className="text-ink-light"
              text='In the early 1990s, a bunch of uncs invented "FIRE" — Financial Independence, Retire Early. They saved 70% of their income, invested in index funds, and ate lentils. They were obsessed with calculating their "FIRE number" on spreadsheets with seventeen tabs. They were autistic like NEETs for the idea of never working again.'
            />
          </div>

          {/* The Pivot */}
          <div>
            <motion.p {...fadeUp} className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-6">
              The Pivot
            </motion.p>
            <motion.h2 {...fadeUp} className="font-serif font-black text-ink text-2xl sm:text-3xl leading-tight mb-6">
              We kept one idea.
              <br />
              We threw the rest away.
            </motion.h2>
            <MagicText
              className="text-ink-light mb-8"
              text="The uncs were right about one thing: stop working, let your money work. Everything else was cope — fifteen years of spreadsheets and lentils just to retire to a slightly bigger apartment. $FIRE keeps the idea and cuts the homework. No savings rate. No 17-tab spreadsheet. No lentils. No Thailand."
            />
            <motion.p {...fadeUp} className="font-mono text-ink-muted text-sm leading-relaxed border-l-2 border-fire pl-6">
              They saved 70% of their income for two decades. We just refuse to sell a
              meme coin. Same outcome. Better vibes.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
