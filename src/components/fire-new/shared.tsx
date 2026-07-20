"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

/* ───────── Data ───────── */

export const PAIR_URL = "/api/fire-price";
export const BUY_URL = "/swap";
export const TELEGRAM_URL = "https://t.me/retirewithfire";
export const X_URL = "https://x.com/retirewithfire";
export const CA = "0x43eeA882B845a8493152Ebc55cF30aE9281b02d5";

export type DexData = {
  priceUsd: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  priceChange24h: number;
};

export function useDexData(): DexData {
  const [data, setData] = useState<DexData>({
    priceUsd: 0,
    volume24h: 0,
    liquidity: 0,
    marketCap: 0,
    priceChange24h: 0,
  });
  useEffect(() => {
    const fetchDex = () =>
      fetch(PAIR_URL)
        .then((r) => r.json())
        .then((d) => {
          if (d && typeof d.priceUsd === "number") {
            setData({
              priceUsd: d.priceUsd,
              volume24h: d.volume24h || 0,
              liquidity: d.liquidity || 0,
              marketCap: d.marketCap || 0,
              priceChange24h: d.priceChange24h || 0,
            });
          }
        })
        .catch(() => {});
    fetchDex();
    const id = setInterval(fetchDex, 60_000);
    return () => clearInterval(id);
  }, []);
  return data;
}

export function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: n >= 1 ? 0 : 2 })}`;
}

export function fmtPrice(n: number): string {
  if (n <= 0) return "—";
  return `$${n >= 0.01 ? n.toFixed(4) : n.toFixed(8)}`;
}

/* ───────── Shared class strings ───────── */

export const MONO = "font-[family-name:var(--font-mono-jb)]";
export const DISPLAY = "font-[family-name:var(--font-display)]";
export const SERIF = "font-[family-name:var(--font-serif-inst)]";

/* Brutalist pills — flat fills, ink borders, hard offset shadows (shadow color
   flips to paper inside .fn-dark via --fn-edge) */
const BTN_BASE = `inline-flex items-center justify-center gap-2 cursor-pointer no-underline rounded-full
  border-2 border-[#0a0a0a] shadow-[5px_5px_0_var(--fn-edge)]
  hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[8px_8px_0_var(--fn-edge)]
  active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0_0_0_var(--fn-edge)]
  transition-all duration-150`;

export const FIRE_BTN = `${BTN_BASE} bg-[#ff5b1f] text-[#0a0a0a]`;
export const GOLD_BTN = `${BTN_BASE} bg-[#e3b62f] text-[#0a0a0a]`;
export const GHOST_BTN = `${BTN_BASE} bg-[var(--fn-panel)] text-[var(--fn-cream)] border-[var(--fn-edge)]`;

/* ───────── Ticker tape — ink band, terminal colors ───────── */

export function TickerTape() {
  const dex = useDexData();
  const up = dex.priceChange24h >= 0;

  const items: { label: string; value?: string; tone?: "green" | "red" | "gold" | "fire" }[] = [
    { label: "$FIRE", value: fmtPrice(dex.priceUsd), tone: up ? "green" : "red" },
    {
      label: "24H",
      value: dex.priceUsd > 0 ? `${up ? "▲" : "▼"} ${Math.abs(dex.priceChange24h).toFixed(1)}%` : "—",
      tone: up ? "green" : "red",
    },
    { label: "MCAP", value: dex.marketCap > 0 ? fmtUsd(dex.marketCap) : "—", tone: "gold" },
    { label: "VOL 24H", value: dex.volume24h > 0 ? fmtUsd(dex.volume24h) : "—", tone: "gold" },
    { label: "LIQ", value: dex.liquidity > 0 ? fmtUsd(dex.liquidity) : "—", tone: "gold" },
    { label: "TAX", value: "4% EVERY TRADE", tone: "fire" },
    { label: "TO HOLDERS", value: "2% OF EVERY TRADE", tone: "green" },
    { label: "LOYALTY", value: "UP TO 3X AT 120D", tone: "gold" },
    { label: "BURN GOVERNOR", value: "UP TO 40% OF PAYOUTS", tone: "fire" },
    { label: "SELL", value: "CLOCK RESETS TO ZERO", tone: "red" },
  ];

  const toneCls = {
    green: "text-[#3ecf81]",
    red: "text-[#ff5b4d]",
    gold: "text-[#e5b94e]",
    fire: "text-[#ff5b1f]",
  } as const;

  const run = items.map((it, i) => (
    <span key={i} className="inline-flex items-center gap-2">
      <span className="text-[#f1ead8]/55">{it.label}</span>
      {it.value && <span className={`font-bold ${toneCls[it.tone || "gold"]}`}>{it.value}</span>}
      <span className="text-[#f1ead8]/30 mx-3">◆</span>
    </span>
  ));

  return (
    <div className={`fn-dark overflow-hidden whitespace-nowrap border-b-2 border-[#0a0a0a] py-2 ${MONO} text-[11px] tracking-[0.12em]`}>
      <div className="inline-flex animate-[fn-marquee_45s_linear_infinite]">
        <span className="inline-flex">{run}</span>
        <span className="inline-flex">{run}</span>
        <span className="inline-flex">{run}</span>
      </div>
    </div>
  );
}

/* ───────── Nav — paper, old-school loud ───────── */

export function NavNew({ active }: { active?: "landing" | "dashboard" | "leaderboard" }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const links = [
    { label: "The Pitch", href: "/landing-new#pitch", key: undefined },
    { label: "The Deal", href: "/landing-new#deal", key: undefined },
    { label: "Dashboard", href: "/dashboard-new", key: "dashboard" },
    { label: "The Board", href: "/leaderboard-new", key: "leaderboard" },
    { label: "FAQ", href: "/landing-new#faq", key: undefined },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-250 ${
        scrolled
          ? "bg-[#f1ead8]/90 backdrop-blur-xl border-b-2 border-[#0a0a0a]"
          : "bg-transparent border-b-2 border-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-3 flex items-center justify-between">
        <Link href="/landing-new" className="flex items-center gap-2.5 no-underline text-[var(--fn-cream)]">
          <Image src="/fire-mark.svg" alt="$FIRE" width={36} height={36} className="w-9 h-9" />
          <span className={`${DISPLAY} text-[22px] tracking-[0.06em] leading-none`}>
            <span className="text-[#ff5b1f]">$FIRE</span>
            <small className={`${MONO} text-[9px] tracking-[0.22em] opacity-60 block leading-none mt-1`}>
              THE WOLF OF DOING NOTHING
            </small>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="no-underline text-[13px] font-semibold text-[var(--fn-cream)] relative group"
            >
              {l.label}
              <span
                className={`absolute left-0 right-0 -bottom-1 h-0.5 bg-[#ff5b1f] origin-left transition-transform duration-250 ${
                  active && l.key === active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                }`}
              />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href={BUY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${FIRE_BTN} ${DISPLAY} text-xs sm:text-sm tracking-[0.08em] px-4 sm:px-5 py-2.5`}
          >
            <Image src="/fire-mark.svg" alt="" width={18} height={18} className="w-[18px] h-[18px]" />
            BUY $FIRE
          </a>
          <button
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 border-2 border-[var(--fn-edge)] rounded-full cursor-pointer bg-[var(--fn-panel)]"
          >
            <span className={`w-5 h-0.5 bg-[var(--fn-cream)] transition-transform ${open ? "rotate-45 translate-y-1" : ""}`} />
            <span className={`w-5 h-0.5 bg-[var(--fn-cream)] transition-transform ${open ? "-rotate-45 -translate-y-1" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t-2 border-[#0a0a0a] bg-[#f1ead8]/95 backdrop-blur-xl px-6 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="no-underline text-[14px] font-semibold text-[var(--fn-cream)]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

/* ───────── Footer — ink band ───────── */

export function FooterNew() {
  return (
    <footer className={`fn-dark border-t-2 border-[#0a0a0a] px-6 py-10 ${MONO} text-xs`}>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex justify-between flex-wrap gap-6 items-start">
          <div className="flex items-center gap-3">
            <Image src="/fire-mark.svg" alt="" width={28} height={28} className="w-7 h-7" />
            <div>
              <p className="tracking-[0.15em]">© 2026 $FIRE — THE WOLF OF DOING NOTHING.</p>
              <p className="text-[10px] mt-1 tracking-[0.1em] opacity-55">DO NOTHING · GET PAID · BASE</p>
            </div>
          </div>
          <div className="flex gap-6 flex-wrap">
            {[
              ["Telegram", TELEGRAM_URL],
              ["X / Twitter", X_URL],
              ["DEXScreener", BUY_URL],
              ["Docs", "/docs"],
              ["Old Site", "/"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-[#f1ead8] no-underline opacity-70 hover:opacity-100 hover:text-[#ff5b1f] transition-all duration-200"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="text-[10px] opacity-50 break-all max-w-[340px]">CA: {CA}</div>
        </div>
        <p className="text-[10px] leading-[1.8] opacity-55 max-w-3xl mt-8 pt-6 border-t border-[rgba(241,234,216,0.18)]">
          $FIRE is an experimental onchain game. It is not a financial product, investment vehicle,
          or security. Payouts are not guaranteed and depend entirely on trading volume. Do not
          purchase with funds you cannot afford to lose.
        </p>
      </div>
    </footer>
  );
}
