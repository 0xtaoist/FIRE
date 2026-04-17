"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "@/lib/motion";
import { FAQ_ITEMS } from "@/lib/constants";
import { Plus, Minus } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

function FaqItem({
  item,
  isOpen,
  onToggle,
}: {
  item: (typeof FAQ_ITEMS)[number];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-divider">
      <button
        onClick={onToggle}
        className="w-full py-6 flex items-start justify-between gap-4 text-left group"
      >
        <span className="font-serif font-bold text-ink text-lg sm:text-xl group-hover:text-fire transition-colors">
          {item.question}
        </span>
        <span className="flex-shrink-0 mt-1 text-ink-muted group-hover:text-fire transition-colors">
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-ink-light text-base leading-relaxed pb-6">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-6">
        <div className="border-t border-divider pt-12 sm:pt-16">
          <motion.p {...fadeUp} className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-12">
            FAQ
          </motion.p>

          <motion.div {...fadeUp}>
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem
                key={i}
                item={item}
                isOpen={openIndex === i}
                onToggle={() =>
                  setOpenIndex(openIndex === i ? null : i)
                }
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
