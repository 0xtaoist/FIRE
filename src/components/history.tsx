"use client";

import { motion } from "@/lib/motion";

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
          <motion.div {...fadeUp} className="mb-20">
            <h2 className="font-serif font-black text-ink text-3xl sm:text-4xl leading-tight mb-8">
              Once upon a time,
              <br />
              FIRE was earnest.
            </h2>
            <p className="text-ink-light text-lg leading-relaxed">
              In the early 1990s, a bunch of uncs invented &ldquo;FIRE&rdquo; &mdash; Financial
              Independence, Retire Early. They saved 70% of their income, invested in
              index funds, and ate lentils. They were obsessed with calculating their
              &ldquo;FIRE number&rdquo; on spreadsheets with seventeen tabs. They were autistic
              like NEETs for the idea of never working again.
            </p>
          </motion.div>

          {/* The Pivot */}
          <motion.div {...fadeUp}>
            <p className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-6">
              The Pivot
            </p>
            <h3 className="font-serif font-black text-ink text-2xl sm:text-3xl leading-tight mb-6">
              We kept one idea.
              <br />
              We threw the rest away.
            </h3>
            <p className="text-ink-light text-lg leading-relaxed mb-8">
              The uncs were right about one thing: stop working, let your money work.
              Everything else was cope &mdash; fifteen years of spreadsheets and lentils just
              to retire to a slightly bigger apartment. $FIRE keeps the idea and cuts the
              homework. No savings rate. No 17-tab spreadsheet. No lentils. No Thailand.
            </p>
            <p className="font-mono text-ink-muted text-sm leading-relaxed border-l-2 border-fire pl-6">
              They saved 70% of their income for two decades. We just refuse to sell a
              meme coin. Same outcome. Better vibes.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
