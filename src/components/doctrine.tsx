"use client";

import { motion } from "@/lib/motion";
import { TENETS } from "@/lib/constants";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

export function Doctrine() {
  return (
    <section id="doctrine" className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-6">
        <div className="border-t border-divider pt-12 sm:pt-16">
          {/* Section Label */}
          <motion.p {...fadeUp} className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-6">
            Doctrine
          </motion.p>

          <motion.h2 {...fadeUp} className="font-serif font-black text-ink text-3xl sm:text-4xl leading-tight mb-16">
            The Three Tenets
            <br />
            of Modern FIRE.
          </motion.h2>

          {/* Tenets */}
          <div className="flex flex-col gap-16">
            {TENETS.map((tenet, i) => (
              <motion.div
                key={tenet.numeral}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="flex gap-6 sm:gap-10"
              >
                {/* Numeral */}
                <div className="flex-shrink-0">
                  <span className="font-serif text-fire text-3xl sm:text-4xl font-bold">
                    {tenet.numeral}
                  </span>
                </div>

                {/* Content */}
                <div>
                  <h3 className="font-serif font-bold text-ink text-xl sm:text-2xl mb-4">
                    {tenet.title}
                  </h3>
                  <p className="text-ink-light text-base sm:text-lg leading-relaxed">
                    {tenet.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
