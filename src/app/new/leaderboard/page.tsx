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

      <Link href="/new/dashboard" className="bg-[var(--fr-fire)] text-[var(--fr-ink)] border-2 border-[var(--fr-ink)] px-4 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-[0.08em] cursor-pointer rounded-full shadow-[4px_4px_0_var(--fr-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--fr-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fr-ink)] transition-all duration-150 flex items-center gap-1.5 no-underline">
        <FireMark className="w-[22px] h-[22px] inline-block align-[-5px]" />
        CLAIM RETIREMENT
      </Link>
    </nav>
  );
}

export default function LeaderboardPage() {
  const rows = [
    { rank: 1, addr: '7xKw…r4Tn', tier: 'DIAMOND', bag: '42,069,420 FIRE', days: 45, claimed: '$48,221' },
    { rank: 2, addr: 'Bz3p…q9Mv', tier: 'DIAMOND', bag: '21,000,000 FIRE', days: 38, claimed: '$24,118' },
    { rank: 3, addr: 'Fk2j…aL8x', tier: 'DIAMOND', bag: '18,500,000 FIRE', days: 32, claimed: '$21,007' },
    { rank: 4, addr: 'Rp9m…dN3c', tier: 'IRON', bag: '7,300,000 FIRE', days: 21, claimed: '$8,402' },
    { rank: 5, addr: 'Ge5h…y1Wb', tier: 'IRON', bag: '4,100,000 FIRE', days: 16, claimed: '$4,718' },
    { rank: 6, addr: 'Sa4d…o2Vk', tier: 'STEADY', bag: '3,200,000 FIRE', days: 9, claimed: '$3,684' },
    { rank: 7, addr: 'Mn8t…s5Qz', tier: 'FRESH', bag: '880,000 FIRE', days: 3, claimed: '$1,012' },
  ];

  const tierColors: Record<string, string> = {
    diamond: 'bg-[var(--fr-fire)]',
    iron: 'bg-[var(--fr-ink)] text-[var(--fr-paper)]',
    steady: 'bg-[var(--fr-ember)]',
    fresh: 'bg-transparent opacity-60',
  };

  return (
    <div className="fr-page min-h-screen">
      <Nav />

      <section className="relative pt-32 pb-30 px-6 max-w-[1400px] mx-auto">
        <div className="font-[family-name:var(--font-mono-jb)] text-[11px] font-bold tracking-[0.24em] uppercase opacity-55 mb-3.5">005 / LEADERBOARD</div>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(48px,7vw,110px)] leading-[0.92] tracking-[0.005em]">
          The <em className="font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fr-fire)] [-webkit-text-stroke:2px_var(--fr-ink)]">retirees.</em>
        </h2>
        <p className="font-[family-name:var(--font-serif-inst)] italic text-[22px] mt-0 mb-8 opacity-75 text-left">
          Top wallets by retirement intensity. Updated every block.
        </p>

        <div className="border-[2.5px] border-[var(--fr-ink)] bg-[var(--fr-paper)] shadow-[8px_8px_0_var(--fr-ink)] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[80px_1fr_130px_1.4fr_130px] items-center gap-5 px-6 py-4 bg-[var(--fr-ink)] text-[var(--fr-paper)] font-[family-name:var(--font-mono-jb)] text-[11px] tracking-[0.18em] max-md:grid-cols-[50px_1fr_90px] max-md:gap-2.5 max-md:px-3">
            <div>RANK</div><div>WALLET</div><div>TIER</div>
            <div className="max-md:hidden">BAG</div><div className="max-md:hidden">CLAIMED</div>
          </div>
          {/* Rows */}
          {rows.map(r => (
            <div key={r.rank} className="grid grid-cols-[80px_1fr_130px_1.4fr_130px] items-center gap-5 px-6 py-4 border-b border-[var(--fr-line)] last:border-b-0 hover:bg-[rgba(255,91,31,0.08)] transition-colors duration-200 max-md:grid-cols-[50px_1fr_90px] max-md:gap-2.5 max-md:px-3 max-md:py-3">
              <div className="font-[family-name:var(--font-display)] text-2xl text-[var(--fr-fire)] [-webkit-text-stroke:1px_var(--fr-ink)]">#{r.rank}</div>
              <div className="font-[family-name:var(--font-mono-jb)] text-sm">{r.addr}</div>
              <div>
                <span className={`font-[family-name:var(--font-mono-jb)] text-[10px] font-bold tracking-[0.16em] px-2.5 py-1 border-[1.5px] border-[var(--fr-ink)] inline-block ${tierColors[r.tier.toLowerCase()] || ''}`}>
                  {r.tier}
                </span>
              </div>
              <div className="font-[family-name:var(--font-display)] text-lg tracking-[0.02em] max-md:hidden">{r.bag}</div>
              <div className="font-[family-name:var(--font-serif-inst)] text-xl text-[#2f7a3a] font-semibold max-md:hidden">{r.claimed}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
