"use client";

import Image from "next/image";
import { useState } from "react";
import {
  NavNew,
  FooterNew,
  TickerTape,
  useDexData,
  fmtUsd,
  fmtPrice,
  MONO,
  DISPLAY,
  SERIF,
  GHOST_BTN,
  FIRE_BTN,
  GOLD_BTN,
  BUY_URL,
  TELEGRAM_URL,
} from "@/components/fire-new/shared";

/* ─────────────────────────────────
   Section eyebrow — "001 / THE PITCH"
   ───────────────────────────────── */
function Eyebrow({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <div className={`${MONO} text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3.5`}>
      {num} / {children}
    </div>
  );
}

/* ─────────────────────────────────
   HERO — giant type, wojaks everywhere
   ───────────────────────────────── */
function Hero() {
  const dex = useDexData();
  const up = dex.priceChange24h >= 0;

  return (
    <header id="top" className="relative min-h-screen px-6 py-15 grid place-items-center overflow-hidden">
      {/* Corner stamps */}
      <div className={`absolute top-[90px] left-8 ${MONO} text-[10px] tracking-[0.2em] uppercase opacity-60 hidden md:block`}>
        EST. 2026
        <em className={`${SERIF} italic text-base block mt-0.5`}>Prospectus v2.0</em>
      </div>
      <div className={`absolute top-[90px] right-8 text-right ${MONO} text-[10px] tracking-[0.2em] uppercase opacity-60 hidden md:block`}>
        CHAIN: BASE
        <em className={`${SERIF} italic text-base block mt-0.5`}>Ticker $FIRE</em>
      </div>

      {/* Background art — the summit pose */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(1200px,95vw)] z-[1] opacity-95 [filter:drop-shadow(0_30px_60px_rgba(10,10,10,0.25))] [clip-path:inset(32%_0_0_0)] -mt-[10vw] pointer-events-none">
        <Image src="/wojak-mountain-arms.png" alt="" width={1200} height={800} className="w-full h-auto block" priority />
      </div>

      {/* Hero content */}
      <div className="relative z-[2] text-center max-w-[1400px] w-full">
        <div className={`inline-flex items-center gap-2.5 ${MONO} text-[9px] md:text-[11px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 md:px-3.5 md:py-2 border-[1.5px] border-[var(--fn-edge)] rounded-full mb-6 bg-[var(--fn-bg)]`}>
          <span className="w-2 h-2 rounded-full bg-[var(--fn-fire)] animate-[fn-pulse-fire_1.6s_infinite]" />
          <span className="hidden sm:inline">THE OFFICIAL MEMECOIN OF DOING NOTHING</span>
          <span className="sm:hidden">MEMECOIN OF DOING NOTHING</span>
        </div>

        <h1 className={`${DISPLAY} text-[clamp(72px,13vw,210px)] leading-[0.85] tracking-[0.005em] relative`}>
          <span className="block relative">THE WOLF</span>
          <span className="hidden md:block h-[clamp(80px,21vw,320px)] pointer-events-none" aria-hidden="true" />
          <span className="block relative text-[var(--fn-fire)] [-webkit-text-stroke:3px_var(--fn-edge)]">OF DOING</span>
          <span className="block">
            <em className={`${SERIF} italic font-normal text-[var(--fn-fire)]`}>nothing.</em>
          </span>
        </h1>

        <p className="text-lg leading-relaxed max-w-[620px] mx-auto mt-7 mb-6 px-6 py-[18px] bg-[var(--fn-bg)] border-2 border-[var(--fn-edge)] shadow-[5px_5px_0_var(--fn-edge)] relative z-[4] [text-wrap:pretty]">
          Your boss thinks you&apos;re listening. You&apos;re not. You&apos;re holding $FIRE —
          Wall Street&apos;s oldest racket, money that works while you don&apos;t.
          Every trade pays the room <strong className="text-[var(--fn-fire)]">4%</strong>.{" "}
          <em className={`${SERIF} italic`}>The room is you.</em>
        </p>

        {/* Live tape chip */}
        <div className={`${MONO} relative z-[4] inline-flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs mb-8 px-4 py-2 bg-[#0a0a0a] text-[#f1ead8] border-2 border-[var(--fn-edge)] shadow-[4px_4px_0_var(--fn-fire)]`}>
          <span className="w-2 h-2 rounded-full bg-[#3ecf81] animate-[fn-pulse_1.8s_infinite]" />
          <span className="font-bold text-[#f6d27a]">{fmtPrice(dex.priceUsd)}</span>
          {dex.priceUsd > 0 && (
            <span className={up ? "text-[#3ecf81]" : "text-[#ff5b4d]"}>
              {up ? "▲" : "▼"} {Math.abs(dex.priceChange24h).toFixed(1)}%
            </span>
          )}
          <span className="opacity-60">MCAP {dex.marketCap > 0 ? fmtUsd(dex.marketCap) : "—"}</span>
          <span className="opacity-60 hidden sm:inline">VOL {dex.volume24h > 0 ? fmtUsd(dex.volume24h) : "—"}</span>
        </div>

        <div className="flex gap-2.5 md:gap-3.5 justify-center flex-wrap relative z-[4]">
          <a href={BUY_URL} target="_blank" rel="noopener noreferrer" className={`${FIRE_BTN} ${DISPLAY} text-base md:text-[22px] tracking-[0.06em] px-5 py-4 md:px-9 md:py-[22px]`}>
            <Image src="/fire-mark.svg" alt="" width={22} height={22} className="w-[22px] h-[22px]" />
            BUY $FIRE
          </a>
          <a href="#deal" className={`${GHOST_BTN} ${DISPLAY} text-base md:text-[22px] tracking-[0.06em] px-5 py-4 md:px-9 md:py-[22px]`}>
            READ THE DEAL
          </a>
        </div>
      </div>

      {/* Side art — the watch */}
      <div className="absolute left-[-3%] bottom-[8%] w-[min(280px,22vw)] z-[3] [filter:drop-shadow(12px_16px_30px_rgba(10,10,10,0.3))] rotate-6 pointer-events-none">
        <Image src="/wojak-watch.png" alt="" width={280} height={280} className="w-full h-auto block" />
      </div>
      {/* Side art — the yacht */}
      <div className="absolute right-[-4%] bottom-[-6%] w-[min(400px,30vw)] z-[3] [filter:drop-shadow(-12px_16px_30px_rgba(10,10,10,0.3))] -rotate-[4deg] pointer-events-none">
        <Image src="/wojak-yacht.png" alt="" width={400} height={400} className="w-full h-auto block" />
      </div>

      {/* Bottom stamps */}
      <div className={`absolute bottom-7 left-8 ${MONO} text-[10px] tracking-[0.2em] uppercase opacity-60 hidden md:block`}>
        SCROLL TO RETIRE
        <em className={`${SERIF} italic text-base block mt-0.5`}>↓</em>
      </div>
      <div className={`absolute bottom-7 right-8 text-right ${MONO} text-[10px] tracking-[0.2em] uppercase opacity-60 hidden md:block`}>
        NEW YORK · LONDON · GENEVA
        <em className={`${SERIF} italic text-base block mt-0.5`}>and your couch</em>
      </div>
    </header>
  );
}

/* ─────────────────────────────────
   MARQUEE — old style, loud
   ───────────────────────────────── */
function Marquee({ items, fire = false }: { items: string[]; fire?: boolean }) {
  const content = items.flatMap((t, i) => [
    <span key={`t${i}`}>{t}</span>,
    <i key={`f${i}`} className="not-italic">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/fire-mark.svg" alt="" className="w-[22px] h-[22px] inline-block" />
    </i>,
  ]);
  return (
    <div className={`overflow-hidden py-3.5 border-y-2 border-[#0a0a0a] ${fire ? "bg-[#ff5b1f] text-[#0a0a0a]" : "bg-[#0a0a0a] text-[#f1ead8]"}`}>
      <div className={`inline-flex gap-10 whitespace-nowrap animate-[fn-marquee_30s_linear_infinite] ${DISPLAY} text-[28px] tracking-[0.06em]`}>
        {content}
        {content}
        {content}
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   002 / THE PITCH
   ───────────────────────────────── */
function Pitch() {
  return (
    <section id="pitch" className="relative py-30 px-6 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-15 items-center">
        <div className="relative aspect-square border-[3px] border-[var(--fn-edge)] bg-[#0a0a0a] overflow-hidden shadow-[12px_12px_0_var(--fn-fire)]">
          <Image src="/wojak-conference.png" alt="The wolf addressing the floor" fill className="object-cover" />
          <div className={`absolute top-5 right-5 bg-[var(--fn-bg)] px-3.5 py-2 ${MONO} text-[11px] font-bold tracking-[0.16em] uppercase border-2 border-[var(--fn-edge)] rotate-6`}>
            EXHIBIT A
          </div>
          <div className={`absolute bottom-5 left-5 bg-[#0a0a0a] text-[#f1ead8] px-3.5 py-2 ${MONO} text-[11px] font-bold tracking-[0.16em] uppercase border-2 border-[#f1ead8] -rotate-2`}>
            &ldquo;I&apos;M NOT LEAVING.&rdquo;
          </div>
        </div>
        <div>
          <Eyebrow num="002">THE PITCH</Eyebrow>
          <h2 className={`${DISPLAY} text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]`}>
            The market never sleeps. <em className={`${SERIF} italic font-normal text-[var(--fn-fire)] [-webkit-text-stroke:2px_var(--fn-edge)]`}>So you can.</em>
          </h2>
          <strong className={`${DISPLAY} font-normal text-[28px] tracking-[0.04em] block my-6`}>The 9-to-5 was the scam.</strong>
          <p className="text-lg leading-relaxed mb-4 [text-wrap:pretty]">
            They told you to grind. To hustle. To LinkedIn. They forgot to mention
            the part where you trade 40 of your best years for a sad cake and a
            gold-ish watch.
          </p>
          <p className="text-lg leading-relaxed mb-4 [text-wrap:pretty]">
            The brokers always knew better — they built machines that skim every
            trade and called it a career. $FIRE is that machine with the suits cut
            out: an immutable contract on Base that taxes the casino and pays
            whoever refuses to leave. <em className={`${SERIF} italic`}>No staking. No claim ritual. No boss.</em>
          </p>
          <div className={`${SERIF} italic text-[26px] leading-[1.3] py-5 border-y-2 border-[var(--fn-edge)] mt-6 [text-wrap:balance]`}>
            &ldquo;The most lucrative seat on Wall Street was always the one nobody
            got paid for: sitting still. <span className="text-[var(--fn-fire)] not-italic font-bold">We pay it.</span>&rdquo;
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────
   003 / THE DEAL — tokenomics
   ───────────────────────────────── */
const LOYALTY_TIERS = [
  { mult: "1x", label: "Day one" },
  { mult: "1.5x", label: "30 days" },
  { mult: "2x", label: "60 days" },
  { mult: "2.5x", label: "90 days" },
  { mult: "3x", label: "120 days" },
];

const BURN_TIERS = [
  { name: "Dormant", req: "—", pct: "0%" },
  { name: "Ignition", req: "100+ whales · 15d", pct: "10%" },
  { name: "Spark", req: "200+ whales · 30d", pct: "20%" },
  { name: "Blaze", req: "500+ whales · 45d", pct: "30%" },
  { name: "Inferno", req: "800+ whales · 60d", pct: "40%" },
];

function Deal() {
  return (
    <section id="deal" className="relative py-30 px-6 max-w-[1400px] mx-auto">
      <div className="text-center mb-15">
        <Eyebrow num="003">THE DEAL</Eyebrow>
        <h2 className={`${DISPLAY} text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]`}>
          Four clauses. <em className={`${SERIF} italic font-normal text-[var(--fn-fire)] [-webkit-text-stroke:2px_var(--fn-edge)]`}>Zero fine print.</em>
        </h2>
        <p className={`${SERIF} italic text-[22px] mt-4 opacity-75`}>
          The entire protocol fits on a cocktail napkin. That was the point.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clause I */}
        <div className="fn-card fn-card-hover p-8">
          <div className="flex items-baseline justify-between mb-4">
            <span className={`${DISPLAY} text-[64px] leading-none text-[var(--fn-fire)] [-webkit-text-stroke:2px_var(--fn-edge)]`}>I</span>
            <span className={`${MONO} text-[10px] tracking-[0.2em] opacity-55 uppercase`}>Clause one</span>
          </div>
          <h3 className={`${DISPLAY} text-[28px] tracking-[0.03em] mb-3 leading-none`}>THE 4% TAKE</h3>
          <p className="text-[15px] leading-relaxed mb-6">
            Every buy and every sell pays the house 4%. The house is you. Half
            locks into liquidity so the floor gets deeper; half lands in the
            payout pool and streams to holders automatically — while you sleep,
            while you fish, while you ignore another calendar invite.
          </p>
          <div className="flex h-12 overflow-hidden border-2 border-[var(--fn-edge)]">
            <div className={`w-1/2 bg-[#0a0a0a] flex items-center justify-center gap-2 ${MONO} text-[11px] tracking-[0.12em] text-[#f1ead8]`}>
              <span className="font-bold text-[#e5b94e]">2%</span> LIQUIDITY
            </div>
            <div className={`w-1/2 bg-[var(--fn-green)] border-l-2 border-[var(--fn-edge)] flex items-center justify-center gap-2 ${MONO} text-[11px] tracking-[0.12em] text-[#f1ead8]`}>
              <span className="font-bold">2%</span> TO HOLDERS
            </div>
          </div>
          <p className={`${MONO} text-[10px] opacity-55 mt-3 tracking-[0.08em]`}>
            NO STAKING · NO CLAIM RITUAL · IT ACCRUES WHILE YOU SLEEP
          </p>
        </div>

        {/* Clause II */}
        <div className="fn-card fn-card-hover p-8">
          <div className="flex items-baseline justify-between mb-4">
            <span className={`${DISPLAY} text-[64px] leading-none text-[var(--fn-fire)] [-webkit-text-stroke:2px_var(--fn-edge)]`}>II</span>
            <span className={`${MONO} text-[10px] tracking-[0.2em] opacity-55 uppercase`}>Clause two</span>
          </div>
          <h3 className={`${DISPLAY} text-[28px] tracking-[0.03em] mb-3 leading-none`}>TIME OUTRANKS MONEY</h3>
          <p className="text-[15px] leading-relaxed mb-6">
            Your payout rate multiplies with hold time. The whale who bought ten
            times your bag and sold on day one earns less than you do on day 120.
            Patience is the only alpha left, and it compounds.
          </p>
          <div className="flex items-end gap-2">
            {LOYALTY_TIERS.map((t, i) => (
              <div key={t.mult} className="flex-1 text-center">
                <div
                  className={`border-2 border-[var(--fn-edge)] ${i === LOYALTY_TIERS.length - 1 ? "bg-[var(--fn-fire)]" : "bg-[#e3b62f]"}`}
                  style={{ height: `${26 + i * 17}px` }}
                />
                <div className={`${DISPLAY} text-sm sm:text-base mt-2 ${i === LOYALTY_TIERS.length - 1 ? "text-[var(--fn-fire)]" : ""}`}>{t.mult}</div>
                <div className={`${MONO} text-[8px] sm:text-[9px] opacity-55 tracking-[0.08em] mt-0.5`}>{t.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Clause III */}
        <div className="fn-card fn-card-hover p-8">
          <div className="flex items-baseline justify-between mb-4">
            <span className={`${DISPLAY} text-[64px] leading-none text-[var(--fn-fire)] [-webkit-text-stroke:2px_var(--fn-edge)]`}>III</span>
            <span className={`${MONO} text-[10px] tracking-[0.2em] opacity-55 uppercase`}>Clause three</span>
          </div>
          <h3 className={`${DISPLAY} text-[28px] tracking-[0.03em] mb-3 leading-none`}>THE BURN GOVERNOR</h3>
          <p className="text-[15px] leading-relaxed mb-6">
            When enough whales (100K+ tokens) hold long enough, the protocol stops
            paying and starts torching — up to 40% of payouts burned forever.
            Collective patience shrinks the supply. Deflation by ritual immolation.
          </p>
          <div className="border-2 border-[var(--fn-edge)] overflow-hidden">
            {BURN_TIERS.map((t, i) => (
              <div
                key={t.name}
                className={`flex items-center justify-between px-4 py-2.5 ${MONO} text-[11px] ${
                  i < BURN_TIERS.length - 1 ? "border-b-2 border-[var(--fn-edge)]" : ""
                } ${i === BURN_TIERS.length - 1 ? "bg-[var(--fn-fire)] text-[#0a0a0a] font-bold" : ""}`}
              >
                <span className={i === BURN_TIERS.length - 1 ? "font-bold" : ""}>{t.name}</span>
                <span className={`text-[10px] ${i === BURN_TIERS.length - 1 ? "" : "opacity-55"}`}>{t.req}</span>
                <span className="font-bold">{t.pct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Clause IV */}
        <div className="fn-card fn-card-hover p-8">
          <div className="flex items-baseline justify-between mb-4">
            <span className={`${DISPLAY} text-[64px] leading-none text-[var(--fn-fire)] [-webkit-text-stroke:2px_var(--fn-edge)]`}>IV</span>
            <span className={`${MONO} text-[10px] tracking-[0.2em] opacity-55 uppercase`}>Clause four</span>
          </div>
          <h3 className={`${DISPLAY} text-[28px] tracking-[0.03em] mb-3 leading-none`}>SELL = START OVER</h3>
          <p className="text-[15px] leading-relaxed mb-6">
            Selling doesn&apos;t just cost the tax. It resets your hold clock to zero —
            multiplier gone, seniority gone, back of the line. Forgetting your seed
            phrase is, ironically, maximum loyalty.
          </p>
          <div className="flex items-center gap-4">
            <div className="relative w-[130px] sm:w-[160px] shrink-0 border-2 border-[var(--fn-edge)] overflow-hidden">
              <Image src="/paperhands-wojak.png" alt="Paper hands" width={320} height={180} className="w-full h-auto block" />
            </div>
            <div>
              <p className={`${MONO} text-[11px] tracking-[0.2em] text-[var(--fn-red)] font-bold uppercase`}>Don&apos;t be this guy.</p>
              <p className={`${SERIF} italic text-[15px] opacity-70 mt-1.5`}>
                Sold at day 29. Re-bought at day 31. Now he&apos;s a day-one nobody
                with a water bottle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────
   004+005 / TRADING FLOOR — dark band
   live tape + napkin math
   ───────────────────────────────── */
function TradingFloor() {
  const dex = useDexData();
  const up = dex.priceChange24h >= 0;
  const dailyTax = dex.volume24h * 0.04;
  const dailyToHolders = dex.volume24h * 0.02;

  const [bag, setBag] = useState(50000);
  const [years, setYears] = useState(3);
  const apr = 0.42;
  const final = bag * Math.pow(1 + apr, years);
  const passive = final - bag;
  const burned = final * 0.02 * 0.2 * years;
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

  const cells = [
    { label: "TOKEN PRICE", value: fmtPrice(dex.priceUsd), sub: dex.priceUsd > 0 ? `${up ? "+" : ""}${dex.priceChange24h.toFixed(1)}% 24H` : undefined, subTone: up ? "text-[#3ecf81]" : "text-[#ff5b4d]" },
    { label: "MARKET CAP", value: dex.marketCap > 0 ? fmtUsd(dex.marketCap) : "—" },
    { label: "24H VOLUME", value: dex.volume24h > 0 ? fmtUsd(dex.volume24h) : "—" },
    { label: "LIQUIDITY", value: dex.liquidity > 0 ? fmtUsd(dex.liquidity) : "—" },
    { label: "TAX COLLECTED / DAY", value: dailyTax > 0 ? fmtUsd(dailyTax) : "—", sub: "4% of volume", subTone: "opacity-55" },
    { label: "TO HOLDERS / DAY", value: dailyToHolders > 0 ? fmtUsd(dailyToHolders) : "—", sub: "2% of volume, pre-burn", subTone: "text-[#3ecf81]" },
  ];

  return (
    <div className="fn-dark border-y-[3px] border-[#0a0a0a] relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,91,31,0.15),transparent_45%)] pointer-events-none" />

      {/* 004 — live tape */}
      <section className="relative py-25 px-6 max-w-[1400px] mx-auto">
        <div className="text-center mb-12">
          <div className={`${MONO} text-[11px] font-bold tracking-[0.24em] uppercase opacity-70 mb-3.5`}>004 / LIVE FROM THE FLOOR</div>
          <h2 className={`${DISPLAY} text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]`}>
            The tape <em className={`${SERIF} italic font-normal text-[var(--fn-fire)] [-webkit-text-stroke:2px_#f1ead8]`}>doesn&apos;t lie.</em>
          </h2>
          <p className={`${MONO} text-[11px] tracking-[0.2em] uppercase opacity-60 mt-5 flex items-center justify-center gap-2.5`}>
            <span className="w-2 h-2 rounded-full bg-[#3ecf81] animate-[fn-pulse_1.8s_infinite]" />
            LIVE · DEXSCREENER · REFRESHED EVERY 60S
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 border-2 border-[#f1ead8]">
          {cells.map((c, i) => (
            <div
              key={c.label}
              className={`p-6 sm:p-8 border-[rgba(241,234,216,0.25)] ${i % 2 === 0 ? "border-r" : ""} lg:border-r ${i < cells.length - 2 ? "border-b" : ""} lg:[&:nth-child(3n)]:border-r-0 ${i < 3 ? "lg:border-b" : "lg:border-b-0"}`}
            >
              <p className={`${MONO} text-[10px] font-bold tracking-[0.22em] uppercase opacity-55 mb-3`}>{c.label}</p>
              <p className={`${DISPLAY} text-[clamp(24px,3.5vw,44px)] leading-none text-[#f6d27a]`}>{c.value}</p>
              {c.sub && <p className={`${MONO} text-[10px] mt-2 ${c.subTone}`}>{c.sub}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* 005 — napkin math */}
      <section id="calc" className="relative py-25 px-6 max-w-[1400px] mx-auto border-t border-[rgba(241,234,216,0.18)]">
        <div className="text-center mb-15">
          <div className={`${MONO} text-[11px] font-bold tracking-[0.24em] uppercase opacity-70 mb-3.5`}>005 / NAPKIN MATH</div>
          <h2 className={`${DISPLAY} text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]`}>
            When do <em className={`${SERIF} italic font-normal text-[var(--fn-fire)] [-webkit-text-stroke:2px_#f1ead8]`}>you</em> walk out?
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-15 items-center">
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <span className={`${MONO} text-xs tracking-[0.16em] uppercase opacity-60`}>Initial bag</span>
                <span className={`${DISPLAY} text-4xl text-[#f6d27a]`}>{fmt(bag)}</span>
              </div>
              <input type="range" min="500" max="1000000" step="500" value={bag} onChange={(e) => setBag(+e.target.value)} className="fn-slider w-full" />
              <div className={`flex justify-between ${MONO} text-[10px] opacity-50 mt-1.5 tracking-[0.1em]`}>
                <span>$500</span>
                <span>$1,000,000</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <span className={`${MONO} text-xs tracking-[0.16em] uppercase opacity-60`}>Years of inactivity</span>
                <span className={`${DISPLAY} text-4xl text-[#f6d27a]`}>{years}y</span>
              </div>
              <input type="range" min="1" max="20" step="1" value={years} onChange={(e) => setYears(+e.target.value)} className="fn-slider w-full" />
              <div className={`flex justify-between ${MONO} text-[10px] opacity-50 mt-1.5 tracking-[0.1em]`}>
                <span>1y</span>
                <span>20y</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <span className={`${MONO} text-xs tracking-[0.16em] uppercase opacity-60`}>Hours of work required</span>
                <span className={`${DISPLAY} text-4xl text-[var(--fn-fire)]`}>0</span>
              </div>
              <input type="range" min="0" max="0" step="1" value={0} disabled className="fn-slider w-full opacity-50" />
              <div className={`flex justify-between ${MONO} text-[10px] opacity-50 mt-1.5 tracking-[0.1em]`}>
                <span>This is the point.</span>
                <span></span>
              </div>
            </div>
          </div>

          <div className="border-2 border-[#f1ead8] p-5 md:p-9 relative bg-[rgba(241,234,216,0.04)]">
            <p className={`${MONO} text-[9px] tracking-[0.3em] uppercase opacity-50 mb-1`}>PROJECTION · NOT A PROMISE</p>
            <div className="flex justify-between items-baseline py-5 border-b border-[rgba(241,234,216,0.18)]">
              <span className={`${MONO} text-[11px] tracking-[0.16em] uppercase opacity-60`}>Projected bag</span>
              <span className={`${DISPLAY} text-[clamp(32px,8vw,56px)] text-[#f6d27a]`}>{fmt(final)}</span>
            </div>
            <div className="flex justify-between items-baseline py-3.5 border-b border-[rgba(241,234,216,0.18)]">
              <span className={`${MONO} text-[11px] tracking-[0.16em] uppercase opacity-60`}>Passive gains</span>
              <span className={`${DISPLAY} text-xl md:text-[28px] text-[#3ecf81]`}>{fmt(passive)}</span>
            </div>
            <div className="flex justify-between items-baseline py-3.5 border-b border-[rgba(241,234,216,0.18)]">
              <span className={`${MONO} text-[11px] tracking-[0.16em] uppercase opacity-60`}>Burned by governor</span>
              <span className={`${DISPLAY} text-xl md:text-[28px] text-[var(--fn-fire)]`}>{fmt(burned)}</span>
            </div>
            <div className="flex justify-between items-baseline py-3.5">
              <span className={`${MONO} text-[11px] tracking-[0.16em] uppercase opacity-60`}>Mental clarity</span>
              <span className={`${DISPLAY} text-xl md:text-[28px]`}>∞</span>
            </div>
            <p className={`${MONO} text-[11px] opacity-50 text-center mt-8`}>
              Assumes 42% APR for illustration. Not financial advice. Possibly spiritual advice.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────────────
   006 / THE LIFE — rotated polaroids
   ───────────────────────────────── */
const LIFE_CARDS = [
  { img: "/wojak-pool.png", title: "MONDAY, 11:04 AM", caption: "Standup meeting? Never heard of her.", rot: "lg:-rotate-2" },
  { img: "/wojak-yacht.png", title: "QUARTERLY REVIEW", caption: "Exceeded expectations by doing nothing.", rot: "lg:rotate-2 lg:translate-y-4" },
  { img: "/wojak-mountain-pc.png", title: "REMOTE WORK, FINAL FORM", caption: "Status: online. Output: zero. Payouts: streaming.", rot: "lg:-rotate-1" },
  { img: "/wojak-rockwell.png", title: "TOWN HALL", caption: "Explaining the burn governor to the village elders.", rot: "lg:rotate-3 lg:translate-y-3" },
];

function TheLife() {
  return (
    <section id="life" className="relative py-30 px-6 max-w-[1400px] mx-auto">
      <div className="text-center mb-15">
        <Eyebrow num="006">THE LIFE</Eyebrow>
        <h2 className={`${DISPLAY} text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]`}>
          Evidence of <em className={`${SERIF} italic font-normal text-[var(--fn-fire)] [-webkit-text-stroke:2px_var(--fn-edge)]`}>a life well held.</em>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {LIFE_CARDS.map((c) => (
          <div
            key={c.title}
            className={`bg-[var(--fn-panel)] border-[2.5px] border-[var(--fn-edge)] shadow-[8px_8px_0_var(--fn-edge)] p-3 pb-5 ${c.rot} hover:rotate-0 hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[11px_11px_0_var(--fn-fire)] transition-all duration-200`}
          >
            <div className="relative overflow-hidden border-2 border-[var(--fn-edge)] mb-4 bg-[#0a0a0a]">
              <Image src={c.img} alt={c.title} width={600} height={600} className="w-full h-auto block" />
            </div>
            <p className={`${MONO} text-[10px] font-bold tracking-[0.22em] uppercase px-2`}>{c.title}</p>
            <p className={`${SERIF} italic text-[15px] opacity-70 px-2 mt-1.5`}>{c.caption}</p>
          </div>
        ))}
      </div>

      {/* Summit closer */}
      <div className="relative mt-16 max-w-[1000px] mx-auto">
        <div className="fn-cert p-2.5">
          <div className="relative overflow-hidden">
            <Image
              src="/wojak-mountain-arms.png"
              alt="Day 120. Maximum multiplier."
              width={1200}
              height={1200}
              className="w-full h-auto block max-h-[560px] object-cover object-[50%_22%]"
            />
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent" />
            <div className="absolute bottom-5 left-6 right-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={`${MONO} text-[10px] sm:text-[11px] font-bold tracking-[0.28em] text-[#f6d27a] uppercase`}>
                  DAY 120 · MAXIMUM MULTIPLIER
                </p>
                <p className={`${SERIF} italic text-base sm:text-xl text-[#f1ead8] mt-1`}>
                  3x payouts, zero obligations, one mountain.
                </p>
              </div>
              <p className={`${MONO} text-[9px] tracking-[0.2em] text-[#f1ead8]/60 uppercase`}>Nothing left to do</p>
            </div>
          </div>
        </div>
        <div className={`absolute -top-4 right-6 bg-[var(--fn-fire)] text-[#0a0a0a] px-3.5 py-2 ${MONO} text-[11px] font-bold tracking-[0.18em] uppercase rotate-3 border-2 border-[var(--fn-edge)]`}>
          EXHIBIT B
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────
   007 / IN NOTHING WE TRUST — the certificate
   ───────────────────────────────── */
function Mission() {
  return (
    <section className="relative py-30 px-6 max-w-[1200px] mx-auto">
      <div className="text-center mb-12">
        <Eyebrow num="007">THE MISSION</Eyebrow>
      </div>

      <div className="fn-cert p-8 sm:p-14 text-center relative">
        {/* certificate header */}
        <p className={`${MONO} text-[10px] sm:text-[11px] font-bold tracking-[0.35em] uppercase opacity-60`}>
          THE UNITED DEGENS OF $FIRE · FINANCIAL INDEPENDENCE, RETIRE EARLY
        </p>

        <div className="flex items-center justify-center gap-4 sm:gap-8 my-8">
          <Image src="/fire-mark.svg" alt="" width={44} height={44} className="w-9 h-9 sm:w-11 sm:h-11" />
          <h2 className={`${SERIF} text-[clamp(36px,6.5vw,84px)] leading-[1.02] [text-wrap:balance]`}>
            In <em className="italic text-[var(--fn-fire)]">nothing</em> we trust.
          </h2>
          <Image src="/fire-mark.svg" alt="" width={44} height={44} className="w-9 h-9 sm:w-11 sm:h-11" />
        </div>

        <p className="text-base sm:text-lg leading-relaxed max-w-[680px] mx-auto [text-wrap:pretty]">
          We took the oldest dream on Wall Street — money that works while you
          don&apos;t — and wired it into an immutable contract on Base. No team
          carving fees. No admin keys. No pause button. The protocol&apos;s only job
          is to pay patience and punish panic, forever.
        </p>

        {/* three tenets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-2 border-[var(--fn-edge)] mt-10">
          {[
            { n: "I", t: "DO NOTHING", d: "Holding is the strategy. Looking at it is the strategy." },
            { n: "II", t: "RETIRE EARLY", d: "The protocol doesn't care about your age. It cares about your refusal to participate." },
            { n: "III", t: "BURN IT DOWN", d: "Whales hold, the governor torches payouts, the supply only shrinks." },
          ].map((t, i) => (
            <div key={t.n} className={`p-6 ${i < 2 ? "sm:border-r-2 border-b-2 sm:border-b-0 border-[var(--fn-edge)]" : ""}`}>
              <div className={`${DISPLAY} text-[40px] leading-none text-[var(--fn-fire)] [-webkit-text-stroke:1.5px_var(--fn-edge)] mb-2`}>{t.n}</div>
              <h3 className={`${DISPLAY} text-lg tracking-[0.04em] mb-1.5`}>{t.t}</h3>
              <p className="text-[13px] leading-relaxed opacity-75">{t.d}</p>
            </div>
          ))}
        </div>

        <div className={`${SERIF} italic text-[22px] sm:text-[28px] leading-[1.3] py-6 border-y-2 border-[var(--fn-edge)] mt-10 [text-wrap:balance]`}>
          &ldquo;Hold and you&apos;re a shareholder. Wait and you&apos;re a whale. Sell and
          you&apos;re a stranger. <em className="text-[var(--fn-fire)]">Every transaction is a small funeral.</em>&rdquo;
        </div>

        {/* the burn, on film */}
        <div className="relative w-[min(520px,80vw)] mx-auto mt-12">
          <video src="/crashout-fire.mp4" autoPlay loop muted playsInline className="w-full block border-2 border-[var(--fn-edge)] shadow-[8px_8px_0_var(--fn-fire)]" />
          <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[var(--fn-fire)] text-[#0a0a0a] px-4 py-1.5 ${MONO} text-[10px] font-bold tracking-[0.25em] uppercase whitespace-nowrap border-2 border-[var(--fn-edge)]`}>
            LIVE FOOTAGE OF THE SUPPLY
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────
   008 / FAQ — old style, fire on open
   ───────────────────────────────── */
const FAQ_ITEMS = [
  {
    q: "Is this financial advice?",
    a: "No. This is the opposite of financial advice. This is retirement advice. Your financial advisor wants you working until 67 — we want you logged off by Friday.",
  },
  {
    q: "What does $FIRE actually do?",
    a: "$FIRE is a deflationary ERC-20 on Base. Every trade is taxed 4% — 2% to liquidity, 2% to the payout pool that streams to holders. Hold time unlocks multiplier tiers (1.5x at 30 days up to 3x at 120), and when enough whales hold long enough, the Burn Governor torches up to 40% of payouts instead of distributing them. The token does the working so you don't have to.",
  },
  {
    q: "Do I need to stake anything?",
    a: "No. The token earns while it sits in your wallet. No dApp ceremony, no claim button you have to babysit, nothing to press. You hold it and it grows.",
  },
  {
    q: "Is this like SafeMoon?",
    a: "SafeMoon paid everyone the same no matter how long they held. We don't. Your multiplier increases at hold-time tiers — time beats money here. The impatient whale earns less than the patient retiree.",
  },
  {
    q: "Can I lose money?",
    a: "Yes, gloriously. But you were already losing 47 hours a week to a job you hate, so really we're just rebalancing the portfolio of your suffering.",
  },
  {
    q: "Is this a cult?",
    a: "We prefer the term 'voluntary retirement collective.' We have a flame, a yacht, four clauses, and a mountain. Make of that what you will.",
  },
];

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="relative py-30 px-6 max-w-[1400px] mx-auto">
      <Eyebrow num="008">FREQUENTLY UNANSWERED</Eyebrow>
      <h2 className={`${DISPLAY} text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]`}>
        The <em className={`${SERIF} italic font-normal text-[var(--fn-fire)] [-webkit-text-stroke:2px_var(--fn-edge)]`}>questions</em> you should be asking your boss.
      </h2>

      <div className="border-t-2 border-[var(--fn-edge)] mt-10">
        {FAQ_ITEMS.map((it, i) => (
          <div
            key={i}
            className={`border-b-2 border-[var(--fn-edge)] cursor-pointer transition-colors duration-200 ${
              open === i ? "bg-[var(--fn-fire)]" : "hover:bg-[rgba(255,91,31,0.06)]"
            }`}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <div className={`grid grid-cols-[40px_1fr_32px] md:grid-cols-[80px_1fr_40px] items-center gap-3 md:gap-6 py-5 md:py-7 ${DISPLAY} text-[clamp(18px,3vw,36px)] tracking-[0.01em]`}>
              <span className={`${MONO} text-[10px] md:text-xs opacity-50`}>{String(i + 1).padStart(2, "0")}</span>
              <span>{it.q}</span>
              <span className="text-[32px] text-right">{open === i ? "–" : "+"}</span>
            </div>
            <div className={`grid transition-[grid-template-rows] duration-350 ease-out ${open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className={`text-[15px] md:text-[17px] leading-relaxed max-w-[800px] ${open === i ? "pb-6 md:pb-8 pl-[52px] md:pl-[104px] pr-4 md:pr-6" : ""}`}>
                  {it.a}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────
   009 / FINAL NOTICE
   ───────────────────────────────── */
function Final() {
  return (
    <section className="fn-dark relative py-[140px] px-6 overflow-hidden border-t-[3px] border-[#0a0a0a]">
      <div className="absolute right-[-5%] bottom-0 w-[min(540px,45vw)] opacity-95 [filter:drop-shadow(-20px_20px_40px_rgba(0,0,0,0.5))] pointer-events-none">
        <Image src="/wojak-yacht.png" alt="" width={540} height={540} className="w-full h-auto block" />
      </div>
      <div className="relative z-[1] max-w-[1400px] mx-auto">
        <div className={`${MONO} text-[11px] font-bold tracking-[0.24em] uppercase opacity-70 text-[#ffb627] mb-3.5`}>009 / FINAL NOTICE</div>
        <h2 className={`${DISPLAY} text-[clamp(80px,14vw,220px)] leading-[0.85] tracking-[0.005em] mb-10`}>
          QUIT.<br />
          BURN.<br />
          <em className={`${SERIF} italic font-normal text-[var(--fn-fire)] [-webkit-text-stroke:2px_#f1ead8]`}>retire.</em>
        </h2>
        <p className="text-xl leading-relaxed mb-10 max-w-[600px] opacity-80">
          The boss is not coming back from that meeting. The boat is leaving.
          The mountains are waiting. There is nothing left to optimize.
        </p>
        <div className="flex gap-2.5 md:gap-3.5 flex-wrap">
          <a href={BUY_URL} target="_blank" rel="noopener noreferrer" className={`${FIRE_BTN} ${DISPLAY} text-base md:text-[22px] tracking-[0.06em] px-5 py-4 md:px-9 md:py-[22px]`}>
            <Image src="/fire-mark.svg" alt="" width={22} height={22} className="w-[22px] h-[22px]" />
            BUY $FIRE NOW
          </a>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={`${GHOST_BTN} ${DISPLAY} text-base md:text-[22px] tracking-[0.06em] px-5 py-4 md:px-9 md:py-[22px]`}>
            GET ON THE BOAT
          </a>
        </div>
        <p className={`${MONO} text-[10px] tracking-[0.2em] uppercase opacity-55 mt-10`}>
          NOT FINANCIAL ADVICE · <em className={`${SERIF} italic normal-case tracking-normal text-[13px] text-[#f6d27a]`}>possibly spiritual advice</em>
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────
   PAGE
   ───────────────────────────────── */
export default function LandingNew() {
  return (
    <div className="fn-page min-h-screen">
      <TickerTape />
      <NavNew active="landing" />
      <Hero />
      <Marquee fire items={["DO NOTHING", "GET PAID", "TIME BEATS MONEY", "QUIT YOUR JOB", "BURN THE SUPPLY", "STARE AT MOUNTAIN"]} />
      <Pitch />
      <Marquee items={["$FIRE", "QUIT.", "BURN.", "RETIRE.", "THE TAPE DOESN'T LIE."]} />
      <Deal />
      <TradingFloor />
      <TheLife />
      <Mission />
      <Faq />
      <Final />
      <FooterNew />
    </div>
  );
}
