'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

function FireMark({ className = "w-[22px] h-[22px]" }: { className?: string }) {
  return (
    <Image src="/fire-mark.svg" alt="" width={22} height={22} className={className} />
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 transition-all duration-250 ${scrolled ? 'bg-[var(--fr-paper)]/90 backdrop-blur-xl border-b border-[var(--fr-line)] py-2.5' : 'py-4'}`}>
      <Link href="/new" className="flex items-center gap-2.5 no-underline text-[var(--fr-ink)]">
        <FireMark className="w-9 h-9" />
        <span className="font-[family-name:var(--font-display)] text-[22px] tracking-[0.06em]">
          <span className="text-[var(--fr-fire)]">$FIRE</span>
          <small className="font-[family-name:var(--font-mono-jb)] text-[9px] tracking-[0.2em] opacity-60 block leading-none mt-0.5">CLUB · RETIRE EARLY</small>
        </span>
      </Link>

      <div className="hidden md:flex gap-6">
        {[
          { label: 'Home', href: '/new' },
          { label: 'Dashboard', href: '/new/dashboard' },
          { label: 'Leaderboard', href: '/new/leaderboard' },
        ].map(item => (
          <Link key={item.label} href={item.href} className="text-[var(--fr-ink)] no-underline text-[13px] font-semibold relative group">
            {item.label}
            <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-[var(--fr-fire)] scale-x-0 origin-left transition-transform duration-250 group-hover:scale-x-100" />
          </Link>
        ))}
      </div>

      <button className="bg-[var(--fr-fire)] text-[var(--fr-ink)] border-2 border-[var(--fr-ink)] px-4 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-[0.08em] cursor-pointer rounded-full shadow-[4px_4px_0_var(--fr-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--fr-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-ink)] transition-all duration-150 flex items-center gap-1.5">
        <FireMark className="w-[22px] h-[22px] inline-block align-[-5px]" />
        CONNECT WALLET
      </button>
    </nav>
  );
}

export default function DashboardPage() {
  const holdings = [
    { label: 'Your bag', val: '0 FIRE', sub: 'connect wallet to retire' },
    { label: 'Pending rewards', val: '0 FIRE', sub: 'paid in FIRE, every trade' },
    { label: 'Lifetime claims', val: '$0', sub: 'so far. tragic.' },
    { label: 'Retirement tier', val: 'PEASANT', sub: 'hold 1M FIRE → MONK' },
  ];

  return (
    <div className="fr-page min-h-screen">
      <Nav />

      <section className="relative pt-32 pb-30 px-6 max-w-[1400px] mx-auto">
        <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3.5">004 / YOUR RETIREMENT</div>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]">
          Dashboard for the <em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)] [-webkit-text-stroke:2px_var(--fr-ink)]">permanently off-duty.</em>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4.5 mt-10">
          {holdings.map((h, i) => (
            <div key={i} className="border-[2.5px] border-[var(--fr-ink)] p-6 bg-[var(--fr-paper)] shadow-[6px_6px_0_var(--fr-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[9px_9px_0_var(--fr-fire)] transition-all duration-200">
              <div className="font-[family-name:var(--font-mono-jb)] text-[11px] tracking-[0.18em] uppercase opacity-60 mb-2.5">{h.label}</div>
              <div className="font-[family-name:var(--font-display)] text-[36px] leading-none tracking-[0.02em] mb-2">{h.val}</div>
              <div className="font-[family-name:var(--font-serif-inst)] italic text-sm opacity-70">{h.sub}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3.5 mt-8 flex-wrap">
          <a className="inline-flex items-center gap-2 px-9 py-[22px] rounded-full font-[family-name:var(--font-display)] text-[22px] tracking-[0.06em] cursor-pointer border-2 border-[var(--fr-ink)] bg-[var(--fr-fire)] shadow-[5px_5px_0_var(--fr-ink)] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[8px_8px_0_var(--fr-ink)] transition-all duration-150 no-underline text-[var(--fr-ink)]">
            CONNECT WALLET
          </a>
          <a className="inline-flex items-center gap-2 px-9 py-[22px] rounded-full font-[family-name:var(--font-display)] text-[22px] tracking-[0.06em] cursor-pointer border-2 border-[var(--fr-ink)] bg-[var(--fr-paper)] shadow-[5px_5px_0_var(--fr-ink)] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[8px_8px_0_var(--fr-ink)] hover:bg-[var(--fr-ember)] transition-all duration-150 no-underline text-[var(--fr-ink)]">
            <FireMark />CLAIM RETIREMENT
          </a>
        </div>
      </section>
    </div>
  );
}
