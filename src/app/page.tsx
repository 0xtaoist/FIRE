'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

/* ─── FIRE MARK (inline SVG) ─── */
function FireMark({ className = "w-[22px] h-[22px]" }: { className?: string }) {
  return (
    <Image src="/fire-mark.svg" alt="" width={22} height={22} className={className} />
  );
}

/* ─────────────────────────────────
   NAV
   ───────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 transition-all duration-250 ${scrolled ? 'bg-[var(--fr-paper)]/90 backdrop-blur-xl border-b border-[var(--fr-line)] py-2.5' : 'py-4'}`}>
      <a href="#top" className="flex items-center gap-2.5 no-underline text-[var(--fr-ink)]">
        <FireMark className="w-9 h-9" />
        <span className="font-[family-name:var(--font-display)] text-[22px] tracking-[0.06em]">
          <span className="text-[var(--fr-fire)]">$FIRE</span>
          <small className="font-[family-name:var(--font-mono-jb)] text-[9px] tracking-[0.2em] opacity-60 block leading-none mt-0.5">CLUB · RETIRE EARLY</small>
        </span>
      </a>

      <div className="hidden md:flex gap-6">
        {[
          { label: 'Doctrine', href: '#doctrine' },
          { label: 'Tenets', href: '#tenets' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Leaderboard', href: '/leaderboard' },
          { label: 'Calculator', href: '#calc' },
          { label: 'FAQ', href: '#faq' },
        ].map(item => (
          <Link key={item.label} href={item.href} className="text-[var(--fr-ink)] no-underline text-[13px] font-semibold relative group">
            {item.label}
            <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-[var(--fr-fire)] scale-x-0 origin-left transition-transform duration-250 group-hover:scale-x-100" />
          </Link>
        ))}
      </div>

      <Link
        href="/dashboard"
        className="bg-[var(--fr-fire)] text-[var(--fr-ink)] border-2 border-[var(--fr-ink)] px-3 py-2 md:px-4 md:py-2.5 font-[family-name:var(--font-display)] text-xs md:text-sm tracking-[0.08em] cursor-pointer rounded-full shadow-[4px_4px_0_var(--fr-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--fr-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-ink)] transition-all duration-150 flex items-center gap-1.5 no-underline"
      >
        <FireMark className="w-[18px] h-[18px] md:w-[22px] md:h-[22px] inline-block align-[-5px]" />
        <span className="hidden sm:inline">CLAIM RETIREMENT</span>
        <span className="sm:hidden">RETIRE</span>
      </Link>
    </nav>
  );
}

/* ─────────────────────────────────
   HERO
   ───────────────────────────────── */
function Hero() {
  return (
    <header id="top" className="relative min-h-screen px-6 py-15 grid place-items-center overflow-hidden">
      {/* Corner stamps */}
      <div className="absolute top-[90px] left-8 font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.2em] uppercase opacity-60 hidden md:block">
        EST. 2026<em className="font-[family-name:var(--font-serif-inst)] italic not-italic text-base block mt-0.5 opacity-100">Doctrine v1.0</em>
      </div>
      <div className="absolute top-[90px] right-8 text-right font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.2em] uppercase opacity-60 hidden md:block">
        CHAIN: BASE<em className="font-[family-name:var(--font-serif-inst)] italic text-base block mt-0.5 opacity-100">Ticker $FIRE</em>
      </div>

      {/* Background art - mountain arms */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(1200px,95vw)] z-[1] opacity-95 [filter:drop-shadow(0_30px_60px_rgba(10,10,10,0.25))] [clip-path:inset(32%_0_0_0)] -mt-[10vw] pointer-events-none">
        <Image src="/wojak-mountain-arms.png" alt="" width={1200} height={800} className="w-full h-auto block" priority />
      </div>

      {/* Hero content */}
      <div className="relative z-[2] text-center max-w-[1400px] w-full">
        <div className="inline-flex items-center gap-2.5 font-[family-name:var(--font-mono-jb)] text-[9px] md:text-[11px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 md:px-3.5 md:py-2 border-[1.5px] border-[var(--fr-ink)] rounded-full mb-6 bg-[var(--fr-paper)]">
          <span className="w-2 h-2 rounded-full bg-[var(--fr-fire)] shadow-[0_0_0_4px_rgba(255,91,31,0.2)] animate-[pulse_1.6s_infinite]" />
          <span className="hidden sm:inline">THE OFFICIAL MEMECOIN OF DOING NOTHING</span>
          <span className="sm:hidden">MEMECOIN OF DOING NOTHING</span>
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-[clamp(96px,17vw,280px)] leading-[0.85] tracking-[0.005em] relative">
          <span className="block relative">RETIRE</span>
          <span className="hidden md:block h-[clamp(80px,22vw,340px)] pointer-events-none" aria-hidden="true" />
          <span className="block relative text-[var(--fr-fire)] [-webkit-text-stroke:3px_var(--fr-ink)]">WITH</span>
          <span className="block">
            <em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)]">fire.</em>
          </span>
        </h1>

        <p className="text-lg leading-relaxed max-w-[600px] mx-auto mt-7 mb-9 px-6 py-[18px] bg-[var(--fr-paper)] border-2 border-[var(--fr-ink)] shadow-[5px_5px_0_var(--fr-ink)] relative z-[4] [text-wrap:pretty]">
          Your boss thinks you&apos;re listening. You&apos;re not. You&apos;re holding $FIRE,
          the financial doctrine that pays you to do absolutely nothing forever.
        </p>

        <div className="flex gap-2.5 md:gap-3.5 justify-center flex-wrap relative z-[4]">
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-4 md:px-9 md:py-[22px] rounded-full font-[family-name:var(--font-display)] text-base md:text-[22px] tracking-[0.06em] cursor-pointer border-2 border-[var(--fr-ink)] bg-[var(--fr-fire)] shadow-[5px_5px_0_var(--fr-ink)] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[8px_8px_0_var(--fr-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-ink)] transition-all duration-150 no-underline text-[var(--fr-ink)]">
            <FireMark />CLAIM RETIREMENT
          </Link>
          <a href="#doctrine" className="inline-flex items-center gap-2 px-5 py-4 md:px-9 md:py-[22px] rounded-full font-[family-name:var(--font-display)] text-base md:text-[22px] tracking-[0.06em] cursor-pointer border-2 border-[var(--fr-ink)] bg-[var(--fr-paper)] shadow-[5px_5px_0_var(--fr-ink)] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[8px_8px_0_var(--fr-ink)] hover:bg-[var(--fr-ember)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-ink)] transition-all duration-150 no-underline text-[var(--fr-ink)]">
            READ THE DOCTRINE
          </a>
        </div>
      </div>

      {/* Side art */}
      <div className="absolute left-[-3%] bottom-[8%] w-[min(280px,22vw)] z-[3] [filter:drop-shadow(12px_16px_30px_rgba(10,10,10,0.3))] rotate-6 pointer-events-none">
        <Image src="/wojak-watch.png" alt="" width={280} height={400} className="w-full h-auto block" />
      </div>
      {/* Front art */}
      <div className="absolute right-[-4%] bottom-[-8%] w-[min(420px,30vw)] z-[3] [filter:drop-shadow(-12px_16px_30px_rgba(10,10,10,0.3))] -rotate-[4deg] pointer-events-none">
        <Image src="/wojak-mountain-pc.png" alt="" width={420} height={560} className="w-full h-auto block" />
      </div>

      {/* Bottom stamps */}
      <div className="absolute bottom-7 left-8 font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.2em] uppercase opacity-60 hidden md:block">
        SCROLL TO RETIRE<em className="font-[family-name:var(--font-serif-inst)] italic text-base block mt-0.5">↓</em>
      </div>
      <div className="absolute bottom-7 right-8 text-right font-[family-name:var(--font-mono-jb)] text-[10px] tracking-[0.2em] uppercase opacity-60 hidden md:block">
        FIRE / FINANCIAL INDEPENDENCE<em className="font-[family-name:var(--font-serif-inst)] italic text-base block mt-0.5">RETIRE EARLY</em>
      </div>
    </header>
  );
}

/* ─────────────────────────────────
   MARQUEE
   ───────────────────────────────── */
function Marquee({ items, fire = false }: { items: string[]; fire?: boolean }) {
  const content = items.flatMap((t, i) => [
    <span key={`t${i}`}>{t}</span>,
    <i key={`f${i}`} className="not-italic"><img src="/fire-mark.svg" alt="" className="w-[22px] h-[22px] inline-block" /></i>,
  ]);
  return (
    <div className={`overflow-hidden py-3.5 border-y-2 border-[var(--fr-ink)] ${fire ? 'bg-[var(--fr-fire)] text-[var(--fr-ink)]' : 'bg-[var(--fr-ink)] text-[var(--fr-paper)]'}`}>
      <div className="inline-flex gap-10 whitespace-nowrap animate-[marquee-scroll_30s_linear_infinite] font-[family-name:var(--font-display)] text-[28px] tracking-[0.06em]">
        {content}{content}{content}
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   DOCTRINE
   ───────────────────────────────── */
function Doctrine() {
  return (
    <section id="doctrine" className="relative py-30 px-6 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-15 items-center">
        <div className="relative aspect-square border-[3px] border-[var(--fr-ink)] bg-[var(--fr-ink)] overflow-hidden shadow-[12px_12px_0_var(--fr-fire)]">
          <Image src="/wojak-conference.png" alt="" fill className="object-cover" />
          <div className="absolute top-5 right-5 bg-[var(--fr-paper)] px-3.5 py-2 font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.16em] uppercase border-2 border-[var(--fr-ink)] rotate-6">
            EXHIBIT A
          </div>
        </div>
        <div>
          <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3.5">001 / DOCTRINE</div>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]">
            A coin for <em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)] [-webkit-text-stroke:2px_var(--fr-ink)]">quitters.</em>
          </h2>
          <strong className="font-[family-name:var(--font-display)] font-normal text-[28px] tracking-[0.04em] block my-6">The 9-to-5 was a scam.</strong>
          <p className="text-lg leading-relaxed mb-4 [text-wrap:pretty]">
            They told you to grind. To hustle. To LinkedIn. They forgot to mention
            the part where you trade 40 of your best years for a sad cake at retirement.
          </p>
          <p className="text-lg leading-relaxed mb-4 [text-wrap:pretty]">
            $FIRE is the protest. A token engineered around one question:
            <em className="font-[family-name:var(--font-serif-inst)] italic"> what if you just… didn&apos;t?</em> What if you just held the bag,
            stared at a mountain, and let the autostake do the rest?
          </p>
          <div className="font-[family-name:var(--font-serif-inst)] italic text-[26px] leading-[1.3] py-5 border-y-2 border-[var(--fr-ink)] mt-6 [text-wrap:balance]">
            &ldquo;Productivity is a story Big Productivity tells you so you&apos;ll keep producing.&rdquo;
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────
   TENETS
   ───────────────────────────────── */
function Tenets() {
  const tenets = [
    { roman: 'I', title: 'DO NOTHING', body: 'Holding is the strategy. Looking at it is the strategy. Forgetting your seed phrase is, ironically, also the strategy.', img: '/wojak-mountain-pc.png' },
    { roman: 'II', title: 'RETIRE EARLY', body: 'The protocol does not care about your age. The protocol cares about your refusal to participate.', img: '/wojak-pool.png' },
    { roman: 'III', title: 'BURN IT DOWN', body: 'When enough whales hold long enough, the Burn Governor activates — up to 40% of payout tax is torched instead of distributed. Deflation by ritual immolation.', img: '/wojak-yacht.png' },
  ];

  return (
    <section id="tenets" className="relative py-30 px-6 max-w-[1400px] mx-auto">
      <div className="text-center mb-15">
        <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3.5">002 / THE THREE TENETS</div>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]">
          Three rules. <em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)] [-webkit-text-stroke:2px_var(--fr-ink)]">Zero</em> effort.
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tenets.map(t => (
          <div key={t.roman} className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] p-8 relative overflow-hidden shadow-[8px_8px_0_var(--fr-ink)] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200">
            <div className="font-[family-name:var(--font-display)] text-[64px] leading-none text-[var(--fr-fire)] [-webkit-text-stroke:2px_var(--fr-ink)] mb-4">{t.roman}</div>
            <h3 className="font-[family-name:var(--font-display)] text-[28px] tracking-[0.03em] mb-3 leading-none">{t.title}</h3>
            <p className="text-[15px] leading-relaxed">{t.body}</p>
            <div className="mt-5 aspect-[1.4] border-2 border-[var(--fr-ink)] overflow-hidden bg-[var(--fr-ink)]">
              <Image src={t.img} alt="" width={400} height={286} className="w-full h-full object-cover block" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────
   STATS
   ───────────────────────────────── */
function Stats() {
  return (
    <section id="proof" className="relative py-30 px-6 max-w-[1400px] mx-auto">
      <div className="text-center mb-12">
        <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3.5">003 / LIVE FROM THE FIRE</div>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]">
          The receipts. <em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)] [-webkit-text-stroke:2px_var(--fr-ink)]">On-chain.</em>
        </h2>
        <p className="font-[family-name:var(--font-serif-inst)] italic text-[22px] mt-4 opacity-75">
          No promises. No projections. Just the numbers, slowly burning.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payout Pool */}
        <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] p-8 shadow-[8px_8px_0_var(--fr-ink)] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200">
          <div className="font-[family-name:var(--font-mono-jb)] text-xs font-bold tracking-[0.2em] uppercase opacity-60 mb-6">PAYOUT POOL</div>
          <div className="text-sm opacity-70 mb-1.5">Available to holders</div>
          <div className="font-[family-name:var(--font-serif-inst)] text-[clamp(24px,5vw,38px)] font-semibold tracking-[-0.01em] leading-[1.1] mb-1 text-[var(--fr-fire)]">
            67,668,551 <span className="font-[family-name:var(--font-display)] text-[0.7em] tracking-[0.05em]">FIRE</span>
          </div>
          <div className="font-[family-name:var(--font-mono-jb)] text-xs opacity-55">≈ $65.4K</div>
          <hr className="border-none border-t border-[var(--fr-line)] my-5" />
          <div className="text-sm opacity-70 mb-1.5">Daily tax collected (est.)</div>
          <div className="font-[family-name:var(--font-serif-inst)] text-[clamp(24px,5vw,38px)] font-semibold tracking-[-0.01em] leading-[1.1] mb-1">$2.5K</div>
          <div className="font-[family-name:var(--font-mono-jb)] text-xs opacity-55">from 4% tax on $63.3K volume</div>
          <hr className="border-none border-t border-[var(--fr-line)] my-5" />
          <div className="text-sm opacity-70 mb-1.5">Est. 30-day payouts</div>
          <div className="font-[family-name:var(--font-serif-inst)] text-[clamp(24px,5vw,38px)] font-semibold tracking-[-0.01em] leading-[1.1] mb-1 text-[#2f7a3a]">$75.9K</div>
          <div className="font-[family-name:var(--font-mono-jb)] text-xs opacity-55">at current volume</div>
        </div>

        {/* Supply & Burns */}
        <div className="bg-[var(--fr-paper)] border-[2.5px] border-[var(--fr-ink)] p-8 shadow-[8px_8px_0_var(--fr-ink)] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[11px_11px_0_var(--fr-fire)] transition-all duration-200">
          <div className="font-[family-name:var(--font-mono-jb)] text-xs font-bold tracking-[0.2em] uppercase opacity-60 mb-6">SUPPLY & BURNS</div>
          <div className="text-sm opacity-70 mb-1.5">Current Supply</div>
          <div className="font-[family-name:var(--font-serif-inst)] text-[clamp(24px,5vw,38px)] font-semibold tracking-[-0.01em] leading-[1.1] mb-1">1,000,000,000</div>
          <div className="font-[family-name:var(--font-mono-jb)] text-xs opacity-55">of 1,000,000,000 initial</div>
          <hr className="border-none border-t border-[var(--fr-line)] my-5" />
          <div className="text-sm opacity-70 mb-1.5">Total Burned</div>
          <div className="font-[family-name:var(--font-serif-inst)] text-[clamp(24px,5vw,38px)] font-semibold tracking-[-0.01em] leading-[1.1] mb-1 text-[var(--fr-fire)]">
            219,797,385 <span className="font-[family-name:var(--font-display)] text-[0.7em] tracking-[0.05em]">FIRE</span>
          </div>
          <div className="font-[family-name:var(--font-mono-jb)] text-xs opacity-55">≈ $212.4K removed forever</div>
          <hr className="border-none border-t border-[var(--fr-line)] my-5" />
          <div className="flex justify-between items-baseline mt-1.5">
            <span className="text-sm opacity-70">Supply burned</span>
            <span className="font-[family-name:var(--font-display)] text-[22px] text-[var(--fr-fire)] tracking-[0.02em]">21.98%</span>
          </div>
          <div className="h-2.5 bg-[rgba(10,10,10,0.1)] rounded-full mt-2.5 overflow-hidden border-[1.5px] border-[var(--fr-ink)]">
            <div className="h-full bg-[var(--fr-fire)] shadow-[inset_0_0_8px_rgba(255,182,39,0.5)]" style={{ width: '21.98%' }} />
          </div>
        </div>
      </div>

      <div className="flex justify-between flex-wrap gap-3 font-[family-name:var(--font-mono-jb)] text-[11px] tracking-[0.16em] uppercase opacity-55 mt-8">
        <span>Snapshot · refreshed every block</span>
        <span>Not financial advice. <em className="font-[family-name:var(--font-serif-inst)] italic normal-case tracking-normal text-sm">Possibly spiritual advice.</em></span>
      </div>
    </section>
  );
}


/* ─────────────────────────────────
   CALCULATOR
   ───────────────────────────────── */
function CalculatorSection() {
  const [bag, setBag] = useState(50000);
  const [years, setYears] = useState(3);
  const apr = 0.42;

  const final = bag * Math.pow(1 + apr, years);
  const burnGovRate = 0.20; // average burn governor rate across tiers
  const rewardTaxRate = 0.02; // 2% payout tax per trade
  const burned = final * rewardTaxRate * burnGovRate * years;
  const passive = final - bag;
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();

  return (
    <section id="calc" className="bg-[var(--fr-ink)] text-[var(--fr-paper)] py-25 px-6 relative border-y-[3px] border-[var(--fr-ink)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,91,31,0.2),transparent_40%)] pointer-events-none" />
      <div className="max-w-[1400px] mx-auto relative">
        <div className="text-center mb-15">
          <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-70 mb-3.5">004 / RETIREMENT CALCULATOR</div>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em] text-[var(--fr-paper)]">
            When can <em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)] [-webkit-text-stroke:2px_var(--fr-paper)]">you</em> quit?
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-15 items-center">
          {/* Controls */}
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <span className="font-[family-name:var(--font-mono-jb)] text-xs tracking-[0.16em] uppercase opacity-60">Initial bag</span>
                <span className="font-[family-name:var(--font-display)] text-4xl text-[var(--fr-fire)]">{fmt(bag)}</span>
              </div>
              <input type="range" min="500" max="1000000" step="500" value={bag} onChange={e => setBag(+e.target.value)} className="fr-slider w-full" />
              <div className="flex justify-between font-[family-name:var(--font-mono-jb)] text-[10px] opacity-50 mt-1.5 tracking-[0.1em]"><span>$500</span><span>$1,000,000</span></div>
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <span className="font-[family-name:var(--font-mono-jb)] text-xs tracking-[0.16em] uppercase opacity-60">Years of inactivity</span>
                <span className="font-[family-name:var(--font-display)] text-4xl text-[var(--fr-fire)]">{years}y</span>
              </div>
              <input type="range" min="1" max="20" step="1" value={years} onChange={e => setYears(+e.target.value)} className="fr-slider w-full" />
              <div className="flex justify-between font-[family-name:var(--font-mono-jb)] text-[10px] opacity-50 mt-1.5 tracking-[0.1em]"><span>1y</span><span>20y</span></div>
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <span className="font-[family-name:var(--font-mono-jb)] text-xs tracking-[0.16em] uppercase opacity-60">Hours of work required</span>
                <span className="font-[family-name:var(--font-display)] text-4xl text-[var(--fr-fire)]">0</span>
              </div>
              <input type="range" min="0" max="0" step="1" value={0} disabled className="fr-slider w-full opacity-50" />
              <div className="flex justify-between font-[family-name:var(--font-mono-jb)] text-[10px] opacity-50 mt-1.5 tracking-[0.1em]"><span>This is the point.</span><span></span></div>
            </div>
          </div>

          {/* Output */}
          <div className="border-2 border-[var(--fr-paper)] p-5 md:p-9 relative bg-[rgba(241,234,216,0.04)]">
            <div className="flex justify-between items-baseline py-5 border-b border-[rgba(241,234,216,0.18)]">
              <span className="font-[family-name:var(--font-mono-jb)] text-[11px] tracking-[0.16em] uppercase opacity-60">Projected bag</span>
              <span className="font-[family-name:var(--font-display)] text-[clamp(32px,8vw,56px)] text-[var(--fr-fire)]">{fmt(final)}</span>
            </div>
            <div className="flex justify-between items-baseline py-3.5 border-b border-[rgba(241,234,216,0.18)]">
              <span className="font-[family-name:var(--font-mono-jb)] text-[11px] tracking-[0.16em] uppercase opacity-60">Passive gains</span>
              <span className="font-[family-name:var(--font-display)] text-xl md:text-[28px]">{fmt(passive)}</span>
            </div>
            <div className="flex justify-between items-baseline py-3.5 border-b border-[rgba(241,234,216,0.18)]">
              <span className="font-[family-name:var(--font-mono-jb)] text-[11px] tracking-[0.16em] uppercase opacity-60">Burned by governor</span>
              <span className="font-[family-name:var(--font-display)] text-xl md:text-[28px]">{fmt(burned)}</span>
            </div>
            <div className="flex justify-between items-baseline py-3.5">
              <span className="font-[family-name:var(--font-mono-jb)] text-[11px] tracking-[0.16em] uppercase opacity-60">Mental clarity</span>
              <span className="font-[family-name:var(--font-display)] text-xl md:text-[28px]">∞</span>
            </div>
            <p className="font-[family-name:var(--font-mono-jb)] text-[11px] opacity-50 text-center mt-8">Not financial advice. Possibly spiritual advice.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────
   BURN
   ───────────────────────────────── */
function Burn() {
  return (
    <section className="relative py-30 px-6 text-center overflow-hidden">
      <div className="relative z-[1] max-w-[900px] mx-auto">
        <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3.5">005 / TOTAL SUPPLY BURNED</div>
        <div className="font-[family-name:var(--font-display)] text-[clamp(120px,22vw,320px)] leading-[0.85] text-[var(--fr-fire)] [-webkit-text-stroke:3px_var(--fr-ink)] tracking-[0.005em]">
          21.98<span className="text-[0.5em] opacity-70">%</span>
        </div>
        <div className="font-[family-name:var(--font-mono-jb)] text-xs tracking-[0.2em] uppercase my-5">AND COUNTING — TIERED BURN GOVERNOR · UP TO 40% OF PAYOUTS</div>
        <div className="font-[family-name:var(--font-serif-inst)] italic text-[32px] leading-[1.3] py-6 border-y-2 border-[var(--fr-ink)] [text-wrap:balance]">
          &ldquo;Every transaction is a small funeral. <em>Beautiful, really.</em>&rdquo;
        </div>
        <div className="relative w-[min(560px,70vw)] mx-auto mt-10 opacity-95 [filter:drop-shadow(0_20px_40px_rgba(10,10,10,0.25))]">
          <video
            src="/crashout-fire.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full block border-2 border-[var(--fr-ink)] shadow-[8px_8px_0_var(--fr-fire)]"
          />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────
   FAQ
   ───────────────────────────────── */
function FaqSection() {
  const items = [
    { q: "Is this financial advice?", a: "No. This is the opposite of financial advice. This is retirement advice. Do not confuse the two — your financial advisor wants you to keep working until you're 67. We want you to log off today." },
    { q: "What does $FIRE actually do?", a: "$FIRE is a deflationary ERC-20 on Base. Every trade is taxed 4% — 2% to LP, 2% to the payout pool. The Burn Governor torches up to 40% of those payouts when enough whales hold long enough. Your hold time unlocks multiplier tiers (up to 3x) so the longer you do nothing, the more you earn. The token does the working so you don't have to." },
    { q: "Will it go up?", a: "It might go up. It might go down. It might do absolutely nothing for six months while you finally take up watercolors. All three are valid outcomes within the doctrine." },
    { q: "Can I lose money?", a: "Yes, gloriously. But you were already losing 47 hours a week to a job you hate, so really we're just rebalancing the portfolio of your suffering." },
    { q: "Is this a cult?", a: "We prefer the term 'voluntary retirement collective.' We have a flame, a watch, and three tenets. Make of that what you will." },
    { q: "When can I retire?", a: "The moment you finish reading this sentence. Whether your bank account agrees is between you and your bank account." },
  ];
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="relative py-30 px-6 max-w-[1400px] mx-auto">
      <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3.5">006 / FREQUENTLY UNANSWERED</div>
      <h2 className="font-[family-name:var(--font-display)] text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]">
        The <em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)] [-webkit-text-stroke:2px_var(--fr-ink)]">questions</em> you should be asking your boss.
      </h2>

      <div className="border-t-2 border-[var(--fr-ink)] mt-10">
        {items.map((it, i) => (
          <div
            key={i}
            className={`border-b-2 border-[var(--fr-ink)] cursor-pointer transition-colors duration-200 ${open === i ? 'bg-[var(--fr-fire)]' : 'hover:bg-[rgba(255,91,31,0.06)]'}`}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <div className="grid grid-cols-[40px_1fr_32px] md:grid-cols-[80px_1fr_40px] items-center gap-3 md:gap-6 py-5 md:py-7 font-[family-name:var(--font-display)] text-[clamp(18px,3vw,36px)] tracking-[0.01em]">
              <span className="font-[family-name:var(--font-mono-jb)] text-[10px] md:text-xs opacity-50">{String(i + 1).padStart(2, '0')}</span>
              <span>{it.q}</span>
              <span className="text-[32px] text-right">{open === i ? '–' : '+'}</span>
            </div>
            <div className={`grid transition-[grid-template-rows] duration-350 ease-out ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <div className={`text-[15px] md:text-[17px] leading-relaxed max-w-[800px] ${open === i ? 'pb-6 md:pb-8 pl-[52px] md:pl-[104px] pr-4 md:pr-6' : ''}`}>
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
   FINAL CTA
   ───────────────────────────────── */
function Final() {
  return (
    <section id="final" className="relative py-[140px] px-6 overflow-hidden bg-[var(--fr-ink)] text-[var(--fr-paper)]">
      <div className="absolute right-[-5%] bottom-0 w-[min(540px,45vw)] opacity-95 [filter:drop-shadow(-20px_20px_40px_rgba(0,0,0,0.5))] pointer-events-none">
        <Image src="/wojak-yacht.png" alt="" width={540} height={720} className="w-full block" />
      </div>
      <div className="relative z-[1] max-w-[1000px]">
        <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-70 text-[var(--fr-ember)] mb-3.5">007 / FINAL NOTICE</div>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(80px,14vw,220px)] leading-[0.85] tracking-[0.005em] mb-10">
          QUIT.<br />
          BURN.<br />
          <em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)] [-webkit-text-stroke:2px_var(--fr-paper)]">retire.</em>
        </h1>
        <p className="text-xl leading-relaxed mb-10 max-w-[600px] opacity-80">
          The boss is not coming back from that meeting. Your laptop is asleep.
          The mountains are waiting. There is nothing left to optimize.
        </p>
        <div className="flex gap-2.5 md:gap-3.5 flex-wrap">
          <a href="https://dexscreener.com/base/0x195872D17a64b323e93040881150C5462f3C2f67" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-4 md:px-9 md:py-[22px] rounded-full font-[family-name:var(--font-display)] text-base md:text-[22px] tracking-[0.06em] cursor-pointer border-2 border-[var(--fr-ink)] bg-[var(--fr-fire)] shadow-[6px_6px_0_var(--fr-paper)] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[9px_9px_0_var(--fr-paper)] transition-all duration-150 no-underline text-[var(--fr-ink)]">
            <FireMark />BUY $FIRE NOW
          </a>
          <a href="https://t.me/retirewithfire" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-4 md:px-9 md:py-[22px] rounded-full font-[family-name:var(--font-display)] text-base md:text-[22px] tracking-[0.06em] cursor-pointer border-2 border-[var(--fr-paper)] bg-transparent text-[var(--fr-paper)] shadow-[5px_5px_0_var(--fr-paper)] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[8px_8px_0_var(--fr-paper)] transition-all duration-150 no-underline">
            JOIN TELEGRAM
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────
   FOOTER
   ───────────────────────────────── */
function FooterSection() {
  return (
    <footer className="bg-[var(--fr-ink)] text-[var(--fr-paper)] px-6 py-10 border-t border-[rgba(241,234,216,0.18)] font-[family-name:var(--font-mono-jb)] text-xs">
      <div className="max-w-[1400px] mx-auto flex justify-between flex-wrap gap-4 items-center">
        <div>© 2026 $FIRE DOCTRINE — RETIRE EARLY, DO NOTHING.</div>
        <div className="flex gap-6 flex-wrap">
          {[
            ['Telegram', 'https://t.me/retirewithfire'],
            ['X / Twitter', 'https://x.com/fire_earn'],
            ['DEXScreener', 'https://dexscreener.com/base/0x195872D17a64b323e93040881150C5462f3C2f67'],
            ['Docs', '/docs'],
          ].map(([label, href]) => (
            <a key={label} href={href} className="text-[var(--fr-paper)] no-underline opacity-70 hover:opacity-100 hover:text-[var(--fr-fire)] transition-all duration-200">{label}</a>
          ))}
        </div>
        <div className="text-[10px] opacity-40 break-all">CA: 0x20aBaFF765075904Fd789E3c8Bca8ad0F41C6Ad4</div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────
   PAGE
   ───────────────────────────────── */
export default function NewLanding() {
  const ticker = ["DO NOTHING", "RETIRE EARLY", "BURN IT DOWN", "QUIT YOUR JOB", "STARE AT MOUNTAIN", "AUTOSTAKE FOREVER", "PRODUCTIVITY IS A SCAM"];

  return (
    <div className="fr-page">
      <Nav />
      <Hero />
      <Marquee items={ticker} fire />
      <Doctrine />
      <Marquee items={["$FIRE", "QUIT.", "BURN.", "RETIRE.", "DO NOTHING."]} />
      <Tenets />
      <Stats />
      <CalculatorSection />
      <Burn />
      <FaqSection />
      <Final />
      <FooterSection />
    </div>
  );
}
