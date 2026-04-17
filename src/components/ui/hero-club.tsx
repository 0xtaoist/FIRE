"use client";

import React from 'react';
import { motion } from "@/lib/motion";
import { BeamsBackground } from "@/components/ui/beams-background";

// --- Custom SVG Components for Hand-Drawn Accents ---

const ArrowFireLeft = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full text-[#D4722A] stroke-current overflow-visible" fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10,90 C 10,40 40,20 60,50 C 70,65 80,75 95,70" />
    <path d="M80,55 L95,70 L85,85" />
  </svg>
);

const ArrowFireRight = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full text-[#D4722A] stroke-current overflow-visible" fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M90,10 C 80,60 60,80 40,60 C 20,40 40,20 60,30 C 80,40 70,70 50,80" />
    <path d="M65,75 L50,80 L55,65" />
  </svg>
);

const ArrowDark1 = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full text-[#1A1A1A] stroke-current overflow-visible" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20,80 Q 40,20 80,40" />
    <path d="M60,20 L80,40 L50,60" />
  </svg>
);

const CircularBadge = () => (
  <div className="relative w-28 h-28 md:w-36 md:h-36 bg-[#D4722A] rounded-full flex items-center justify-center shadow-xl rotate-12 hover:scale-105 transition-transform cursor-pointer border-[3px] border-white/10">
    <div className="absolute inset-1 animate-[spin_10s_linear_infinite]">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path id="circlePath" d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" fill="none" />
        <text className="text-[11px] font-black tracking-[0.18em] uppercase" fill="white">
          <textPath href="#circlePath" startOffset="0%">
            RETIRE EARLY • DO NOTHING • RETIRE EARLY • DO NOTHING •
          </textPath>
        </text>
      </svg>
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <img src="/icons/zap-fast.svg" alt="FIRE" className="w-8 h-8 invert" />
    </div>
  </div>
);

export const FireClubHero = () => {
  return (
    <BeamsBackground className="bg-[#1A1A1A] flex flex-col font-sans selection:bg-[#D4722A] selection:text-white" intensity="medium">

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-6 md:px-10 md:py-8 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-1">
          <div className="bg-[#FAF7F2] text-[#1A1A1A] font-black tracking-tight text-xs md:text-sm px-3 py-1.5 rounded-2xl rounded-bl-sm relative shadow-sm">
            $FIRE
            <div className="absolute -bottom-1.5 left-0 w-3 h-3 bg-[#FAF7F2]" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
          </div>
          <div className="bg-[#D4722A] text-white font-black text-xs md:text-sm px-3 py-1.5 rounded-full border-[1.5px] border-white/20 shadow-sm">
            CLUB
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-2">
          {['The Doctrine', 'Calculator', 'Proof', 'FAQ'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="px-4 py-1.5 rounded-full border border-white/20 text-[#FAF7F2] text-xs font-semibold hover:bg-white/10 transition-colors">
              {item}
            </a>
          ))}
        </div>

        <a href="#" className="px-6 py-2 rounded-full border border-[#D4722A] text-[#D4722A] text-xs md:text-sm font-semibold hover:bg-[#D4722A] hover:text-white transition-colors">
          Buy $FIRE
        </a>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 relative z-10 pt-8 pb-32 md:pt-12 md:pb-48 px-4 flex flex-col items-center justify-center w-full max-w-[1440px] mx-auto">

        <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center z-10 mt-4 mb-16">

          {/* Text Stack */}
          <div className="w-full flex flex-col items-center relative z-10 space-y-2 md:space-y-4 pointer-events-none">

            {/* DO */}
            <div className="w-full flex justify-start pl-[10%] md:pl-[20%] relative z-10">
              <h1
                className="text-[clamp(4.5rem,12vw,160px)] font-black leading-[0.85] tracking-tighter text-[#D4722A] m-0 p-0 uppercase"
                style={{
                  fontFamily: '"Arial Black", Impact, sans-serif',
                  textShadow: '1px 1px 0 #0D0D0D, 2px 2px 0 #0D0D0D, 3px 3px 0 #0D0D0D, 4px 4px 0 #0D0D0D, 5px 5px 0 #0D0D0D, 6px 6px 0 #0D0D0D, 7px 7px 0 #0D0D0D, 8px 8px 0 #0D0D0D, 9px 9px 0 #0D0D0D, 10px 10px 0 #0D0D0D, 11px 11px 0 #0D0D0D, 12px 12px 0 #0D0D0D'
                }}
              >
                DO
              </h1>
            </div>

            {/* NOTHING */}
            <div className="w-full flex justify-center relative z-10">
              <h1
                className="text-[clamp(5rem,15vw,220px)] font-black leading-[0.85] tracking-tighter text-[#FAF7F2] m-0 p-0 uppercase"
                style={{
                  fontFamily: '"Arial Black", Impact, sans-serif',
                  textShadow: '1px 1px 0 #0D0D0D, 2px 2px 0 #0D0D0D, 3px 3px 0 #0D0D0D, 4px 4px 0 #0D0D0D, 5px 5px 0 #0D0D0D, 6px 6px 0 #0D0D0D, 7px 7px 0 #0D0D0D, 8px 8px 0 #0D0D0D, 9px 9px 0 #0D0D0D, 10px 10px 0 #0D0D0D, 11px 11px 0 #0D0D0D, 12px 12px 0 #0D0D0D'
                }}
              >
                NOTHING
              </h1>
            </div>

            {/* RETIRE */}
            <div className="w-full flex justify-end pr-[10%] md:pr-[20%] relative z-10">
              <h1
                className="text-[clamp(4.5rem,12vw,160px)] font-black leading-[0.85] tracking-tighter text-[#D4722A] m-0 p-0 uppercase"
                style={{
                  fontFamily: '"Arial Black", Impact, sans-serif',
                  textShadow: '1px 1px 0 #0D0D0D, 2px 2px 0 #0D0D0D, 3px 3px 0 #0D0D0D, 4px 4px 0 #0D0D0D, 5px 5px 0 #0D0D0D, 6px 6px 0 #0D0D0D, 7px 7px 0 #0D0D0D, 8px 8px 0 #0D0D0D, 9px 9px 0 #0D0D0D, 10px 10px 0 #0D0D0D, 11px 11px 0 #0D0D0D, 12px 12px 0 #0D0D0D'
                }}
              >
                RETIRE EARLY
              </h1>
            </div>

          </div>

        </div>

        {/* Floating Cards - positioned relative to main, outside text container */}

        {/* Diamond card - bottom left on mobile, far left on desktop */}
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[12%] left-[2%] md:bottom-[25%] md:left-[4%] z-40"
        >
          <div className="w-28 md:w-48 aspect-[3/3.5] bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] p-3 md:p-4 flex flex-col items-center justify-center rotate-[-12deg] shadow-2xl hover:rotate-0 transition-transform duration-500">
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-full overflow-hidden mb-3 shadow-inner border-[3px] border-white/20">
              <img src="/fire-wojak.png" alt="FIRE Wojak" className="w-full h-full object-cover scale-[1.35]" />
            </div>
            <div className="text-center mt-1">
              <p className="font-bold text-xs md:text-base text-[#FAF7F2]">diamond.sol</p>
              <p className="text-[9px] md:text-[11px] text-white/60 mt-1">Held 90 days</p>
              <p className="text-[9px] md:text-[11px] text-[#D4722A] font-bold mt-0.5">retired</p>
            </div>
          </div>
        </motion.div>

        {/* Paperhands card - hidden on mobile, far right on desktop */}
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="hidden md:block absolute top-[20%] right-[2%] md:right-[4%] z-40"
        >
          <div className="w-36 md:w-48 aspect-[3/3.5] bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] p-4 flex flex-col items-center justify-center rotate-[12deg] shadow-2xl hover:rotate-0 transition-transform duration-500">
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-full overflow-hidden mb-3 shadow-inner border-[3px] border-white/20 bg-white">
              <img src="/paperhands-wojak.png" alt="Paperhands Wojak" className="w-full h-full object-cover" />
            </div>
            <div className="text-center mt-1">
              <p className="font-bold text-xs md:text-base text-[#FAF7F2]">paperhands.sol</p>
              <p className="text-[9px] md:text-[11px] text-white/60 mt-1">Held 1 day</p>
              <p className="text-[9px] md:text-[11px] text-white/40 font-bold mt-0.5">wcdonalds</p>
            </div>
          </div>
        </motion.div>

        {/* Circular Badge - bottom right */}
        <div className="absolute bottom-[15%] right-[4%] md:right-[8%] z-40">
          <CircularBadge />
        </div>

      </main>

      {/* Bottom Features: BUY → HOLD → RETIRE */}
      <section className="bg-[#FAF7F2] text-[#1A1A1A] rounded-t-[2.5rem] md:rounded-t-[3.5rem] px-6 py-12 md:px-10 md:py-16 relative z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.3)] mt-auto w-full">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

          {/* Step 1: BUY */}
          <div className="bg-[#F0EBE3] rounded-[2rem] p-6 md:p-8 flex flex-col items-center text-center relative border border-[#E0DBD3]">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-[#D4722A] rounded-full flex items-center justify-center mb-3 shadow-lg">
              <img src="/icons/credit-card-02.svg" alt="Buy" className="w-6 h-6 md:w-7 md:h-7 invert" />
            </div>
            <h3 className="text-lg md:text-2xl uppercase leading-tight mb-2 font-black">
              BUY<br/>$FIRE
            </h3>
            <p className="text-[10px] md:text-xs text-[#4A4A4A] font-bold mb-4">
              3% tax feeds the pension pool. Every buy grows the retirement fund.
            </p>

            <div className="mt-auto">
              <div className="inline-flex items-center bg-[#1A1A1A] rounded-full px-4 py-2 text-white shadow-lg">
                <span className="font-bold text-xs">3%</span>
                <span className="text-[10px] text-white/60 ml-2">tax</span>
              </div>
            </div>

            {/* Arrow to next */}
            <div className="hidden md:block absolute -right-12 bottom-8 w-16 h-16 z-30">
              <ArrowDark1 />
            </div>
          </div>

          {/* Step 2: HOLD */}
          <div className="bg-[#F0EBE3] rounded-[2rem] p-6 md:p-8 flex flex-col items-center text-center relative border border-[#E0DBD3]">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-[#D4722A] rounded-full flex items-center justify-center mb-3 shadow-lg">
              <img src="/icons/hourglass-02.svg" alt="Hold" className="w-6 h-6 md:w-7 md:h-7 invert" />
            </div>
            <h3 className="text-lg md:text-2xl uppercase leading-tight mb-2 font-black">
              HOLD &<br/>EARN
            </h3>
            <p className="text-[10px] md:text-xs text-[#4A4A4A] font-bold mb-4">
              Your multiplier grows quadratically. Day 30 = 900x earning power vs day 1.
            </p>

            <div className="mt-auto">
              <div className="inline-flex items-center bg-[#1A1A1A] rounded-full px-4 py-2 text-white shadow-lg">
                <span className="font-bold text-xs">900x</span>
                <span className="text-[10px] text-white/60 ml-2">at day 30</span>
              </div>
            </div>

            {/* Arrow to next */}
            <div className="hidden md:block absolute -right-12 bottom-8 w-16 h-16 z-30">
              <ArrowDark1 />
            </div>
          </div>

          {/* Step 3: RETIRE */}
          <div className="bg-[#F0EBE3] rounded-[2rem] p-6 md:p-8 flex flex-col items-center text-center relative border border-[#E0DBD3]">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-[#D4722A] rounded-full flex items-center justify-center mb-3 shadow-lg">
              <img src="/icons/sunset.svg" alt="Retire" className="w-6 h-6 md:w-7 md:h-7 invert" />
            </div>
            <h3 className="text-lg md:text-2xl uppercase leading-tight mb-2 font-black">
              RETIRE<br/>EARLY
            </h3>
            <p className="text-[10px] md:text-xs text-[#4A4A4A] font-bold mb-4">
              At day 90, your commitment burns supply. You graduate from retiree to arsonist.
            </p>

            <div className="mt-auto">
              <div className="inline-flex items-center bg-[#D4722A] rounded-full px-4 py-2 text-white shadow-lg">
                <span className="font-bold text-xs">$47.20</span>
                <span className="text-[10px] text-white/60 ml-2">est. monthly</span>
              </div>
            </div>
          </div>

        </div>
      </section>

    </BeamsBackground>
  );
};
