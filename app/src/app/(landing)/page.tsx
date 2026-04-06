"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/* ── Stats for glassmorphic card ── */

const STATS = [
  { value: "1%", label: "total fee" },
  { value: "0.8%", label: "to creators" },
  { value: "5 min", label: "fair start" },
];

/* ── Live indicator dots ── */

function PulseDots() {
  return (
    <div className="flex gap-1">
      <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" />
      <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
      <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
    </div>
  );
}

/* ── UnicornStudio Sisyphus background ── */

function SisyphusBackground() {
  useEffect(() => {
    const embedScript = document.createElement("script");
    embedScript.type = "text/javascript";
    embedScript.textContent = `
      !function(){
        if(!window.UnicornStudio){
          window.UnicornStudio={isInitialized:!1};
          var i=document.createElement("script");
          i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.33/dist/unicornStudio.umd.js";
          i.onload=function(){
            window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)
          };
          (document.head || document.body).appendChild(i)
        }
      }();
    `;
    document.head.appendChild(embedScript);

    const style = document.createElement("style");
    style.textContent = `
      [data-us-project] {
        position: relative !important;
        overflow: hidden !important;
      }
      [data-us-project] canvas {
        clip-path: inset(0 0 10% 0) !important;
      }
      [data-us-project] * {
        pointer-events: none !important;
      }
      [data-us-project] a[href*="unicorn"],
      [data-us-project] button[title*="unicorn"],
      [data-us-project] div[title*="Made with"],
      [data-us-project] .unicorn-brand,
      [data-us-project] [class*="brand"],
      [data-us-project] [class*="credit"],
      [data-us-project] [class*="watermark"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
      }
    `;
    document.head.appendChild(style);

    const hideBranding = () => {
      const selectors = [
        "[data-us-project]",
        '[data-us-project="OMzqyUv6M3kSnv0JeAtC"]',
        ".unicorn-studio-container",
      ];
      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((container) => {
          container.querySelectorAll("*").forEach((el) => {
            const text = (el.textContent || "").toLowerCase();
            const title = (el.getAttribute("title") || "").toLowerCase();
            const href = (el.getAttribute("href") || "").toLowerCase();
            if (
              text.includes("made with") ||
              text.includes("unicorn") ||
              title.includes("unicorn") ||
              href.includes("unicorn.studio")
            ) {
              (el as HTMLElement).style.display = "none";
              try { el.remove(); } catch {}
            }
          });
        });
      });
    };

    hideBranding();
    const interval = setInterval(hideBranding, 50);
    setTimeout(hideBranding, 1000);
    setTimeout(hideBranding, 3000);
    setTimeout(hideBranding, 8000);

    return () => {
      clearInterval(interval);
      try {
        document.head.removeChild(embedScript);
        document.head.removeChild(style);
      } catch {}
    };
  }, []);

  return (
    <>
      {/* Desktop: UnicornStudio animated Sisyphus canvas */}
      <div className="absolute inset-0 w-full h-full hidden lg:block">
        <div
          data-us-project="OMzqyUv6M3kSnv0JeAtC"
          style={{ width: "100%", height: "100%", minHeight: "100vh" }}
        />
      </div>

      {/* Mobile: static stars fallback */}
      <div
        className="absolute inset-0 w-full h-full lg:hidden opacity-30"
        style={{
          backgroundImage: [
            "radial-gradient(1px 1px at 20% 30%, white, transparent)",
            "radial-gradient(1px 1px at 60% 70%, white, transparent)",
            "radial-gradient(1px 1px at 50% 50%, white, transparent)",
            "radial-gradient(1px 1px at 80% 10%, white, transparent)",
            "radial-gradient(1px 1px at 90% 60%, white, transparent)",
            "radial-gradient(1px 1px at 33% 80%, white, transparent)",
            "radial-gradient(1px 1px at 15% 60%, white, transparent)",
            "radial-gradient(1px 1px at 70% 40%, white, transparent)",
          ].join(", "),
          backgroundSize:
            "200% 200%, 180% 180%, 250% 250%, 220% 220%, 190% 190%, 240% 240%, 210% 210%, 230% 230%",
        }}
      />
    </>
  );
}

export default function LandingPage() {
  return (
    <main className="relative h-[100dvh] -mt-16 overflow-hidden bg-black">
      {/* ── Animated Sisyphus background ── */}
      <SisyphusBackground />

      {/* ── Corner frame accents ── */}
      <div className="absolute top-0 left-0 w-8 h-8 lg:w-10 lg:h-10 border-t border-l border-white/20 z-20" />
      <div className="absolute top-0 right-0 w-8 h-8 lg:w-10 lg:h-10 border-t border-r border-white/20 z-20" />
      <div className="absolute bottom-0 left-0 w-8 h-8 lg:w-10 lg:h-10 border-b border-l border-white/20 z-20" />
      <div className="absolute bottom-0 right-0 w-8 h-8 lg:w-10 lg:h-10 border-b border-r border-white/20 z-20" />

      {/* ── Main content ── */}
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex-1 flex items-center justify-end pt-16 lg:pt-0">
          <div className="w-full lg:w-1/2 px-6 lg:px-16 lg:pr-[10%]">
            <div className="max-w-lg relative lg:ml-auto">
              {/* Decorative line */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex items-center gap-2 mb-4"
              >
                <div className="w-8 h-px bg-white" />
                <span className="text-white text-[10px] font-mono tracking-wider">◇</span>
                <div className="flex-1 h-px bg-white/20" />
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[0.95] mb-5 lg:mb-6"
              >
                <span className="text-white">coins that</span>
                <br />
                <span className="bg-gradient-to-r from-white via-white to-purple-300 bg-clip-text text-transparent">
                  stick.
                </span>
              </motion.h1>

              {/* Decorative dots */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ duration: 0.6, delay: 0.45 }}
                className="hidden lg:flex gap-1 mb-4"
              >
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-0.5 h-0.5 bg-white rounded-full" />
                ))}
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="max-w-md text-sm sm:text-base text-gray-300 leading-relaxed font-mono opacity-80 mb-6"
              >
                fair-launch tokens with batch auctions.
                <br />
                creators earn by building. not by rugging.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.65 }}
                className="flex flex-col sm:flex-row gap-3 mb-6"
              >
                <Link
                  href="/launch"
                  className="group relative inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-transparent border border-white text-white text-sm font-mono font-semibold transition-all duration-200 hover:bg-white hover:text-black"
                >
                  <span className="hidden lg:block absolute -top-1 -left-1 w-2 h-2 border-t border-l border-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="hidden lg:block absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  launch a token
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/discover"
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-white/30 text-white text-sm font-mono font-semibold transition-all duration-200 hover:bg-white hover:text-black"
                >
                  discover tokens
                </Link>
              </motion.div>

              {/* Glassmorphic stats card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.85 }}
                className="relative overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 max-w-sm mb-5"
              >
                <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                <div className="relative z-10">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {STATS.map((s) => (
                      <div key={s.label} className="flex flex-col items-center">
                        <span className="text-lg sm:text-xl font-bold text-white font-mono">
                          {s.value}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono mt-0.5">
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* How it works + bottom notation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.05 }}
                className="flex items-center gap-2 opacity-40"
              >
                <span className="text-white text-[9px] font-mono">◇</span>
                <div className="flex-1 h-px bg-white" />
                <Link
                  href="/how-it-works"
                  className="text-white text-[9px] font-mono hover:opacity-100 transition-opacity"
                >
                  HOW.IT.WORKS →
                </Link>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="border-t border-white/20 bg-black/40 backdrop-blur-sm"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-4 text-[8px] lg:text-[9px] font-mono text-white/50">
              <span>PROVE.PROTOCOL</span>
              <div className="hidden sm:flex gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-white/30"
                    style={{ height: `${Math.floor(4 + Math.sin(i * 1.2) * 4 + 4)}px` }}
                  />
                ))}
              </div>
              <span>SOLANA</span>
            </div>
            <div className="flex items-center gap-3 text-[8px] lg:text-[9px] font-mono text-white/50">
              <span className="hidden sm:inline">◇ BATCH.AUCTION</span>
              <PulseDots />
              <span>LIVE</span>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
