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
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-divider pt-12 sm:pt-16">
          {/* Section Label */}
          <motion.p {...fadeUp} className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-6">
            Doctrine
          </motion.p>

          <motion.h2 {...fadeUp} className="font-serif font-black text-ink text-3xl sm:text-4xl leading-tight mb-12">
            The Three Tenets
            <br />
            of Modern FIRE.
          </motion.h2>

          {/* Image + Tenets Layout */}
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="w-full md:w-1/2 flex-shrink-0"
            >
              <img
                className="rounded-2xl w-full shadow-xl"
                src="/fire-conference.png"
                alt="FIRE character presenting at a conference"
              />
            </motion.div>

            {/* Tenets */}
            <div className="w-full md:w-1/2 space-y-10">
              {TENETS.map((tenet, i) => (
                <motion.div
                  key={tenet.numeral}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex items-start gap-5"
                >
                  {/* Numeral circle */}
                  <div className="flex-shrink-0 w-12 h-12 bg-fire/10 rounded-full flex items-center justify-center border border-fire/20">
                    <span className="font-serif text-fire text-lg font-bold">
                      {tenet.numeral}
                    </span>
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="font-serif font-bold text-ink text-lg sm:text-xl mb-2">
                      {tenet.title}
                    </h3>
                    <p className="text-ink-light text-sm sm:text-base leading-relaxed">
                      {tenet.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
