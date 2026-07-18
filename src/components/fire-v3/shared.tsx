"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ───────── Launch config ─────────
   Ops flips TRADING_LIVE and fills CA + PAIR_URL in the launch bundle tx
   window. Until then, buy CTAs route to Telegram and the FIRE row on the
   tape shows a pre-launch label instead of a dead price. */

export const TRADING_LIVE = false; // flip true when LP is live + trading opens
export const CA: string | null = "0x43eeA882B845a8493152Ebc55cF30aE9281b02d5"; // FIRE (deployed 2026-07-17)
export const PAIR_URL: string | null = null; // dexscreener pair api url once LP is live
export const BUY_URL: string | null = "/swap"; // on-site v4 swap — Uniswap FE won't route new hooks

export const TELEGRAM_URL = "https://t.me/retirewithfire";
export const X_URL = "https://x.com/retirewithfire";
export const CHAIN_NAME = "Robinhood Chain";

/* Canonical Robinhood Chain stock tokens (verified against on-chain
   liquidity 2026-07-16 — beware same-symbol fakes with zero liquidity). */
export const STOCK_TOKENS = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF", address: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C" },
  { symbol: "NVDA", name: "NVIDIA", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC" },
] as const;

/* ───────── Type helpers ───────── */

export const MONO = "fv-num";
export const SERIF = "font-[family-name:var(--font-serif-inst)]";

/* ───────── Formatting ───────── */

export function fmtUsd(n: number, dp = 2): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

export function fmtDelta(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

/* ───────── Live stock prices (DexScreener, chain: robinhood) ───────── */

export type StockQuote = {
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
};

export function useStockQuotes(): StockQuote[] {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);

  useEffect(() => {
    const addresses = STOCK_TOKENS.map((t) => t.address).join(",");
    const fetchQuotes = () =>
      fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses}`)
        .then((r) => r.json())
        .then((d) => {
          const pairs: {
            baseToken?: { address?: string };
            liquidity?: { usd?: number };
            priceUsd?: string;
            priceChange?: { h24?: number };
          }[] = d.pairs || [];
          const next: StockQuote[] = [];
          for (const t of STOCK_TOKENS) {
            const own = pairs.filter(
              (p) => p.baseToken?.address?.toLowerCase() === t.address.toLowerCase()
            );
            if (own.length === 0) continue;
            const best = own.reduce((a, b) =>
              (a.liquidity?.usd || 0) >= (b.liquidity?.usd || 0) ? a : b
            );
            next.push({
              symbol: t.symbol,
              name: t.name,
              priceUsd: parseFloat(best.priceUsd || "0"),
              change24h: best.priceChange?.h24 || 0,
            });
          }
          if (next.length) setQuotes(next);
        })
        .catch(() => {});
    fetchQuotes();
    const id = setInterval(fetchQuotes, 60_000);
    return () => clearInterval(id);
  }, []);

  return quotes;
}

/* ───────── FIRE market data (inactive until LP is live) ───────── */

export type FireMarket = {
  priceUsd: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  priceChange24h: number;
};

export function useFireMarket(): FireMarket {
  const [data, setData] = useState<FireMarket>({
    priceUsd: 0,
    volume24h: 0,
    liquidity: 0,
    marketCap: 0,
    priceChange24h: 0,
  });

  useEffect(() => {
    if (!TRADING_LIVE || !PAIR_URL) return;
    const fetchDex = () =>
      fetch(PAIR_URL)
        .then((r) => r.json())
        .then((d) => {
          const p = d.pair;
          if (p) {
            setData({
              priceUsd: parseFloat(p.priceUsd || "0"),
              volume24h: p.volume?.h24 || 0,
              liquidity: p.liquidity?.usd || 0,
              marketCap: p.marketCap || 0,
              priceChange24h: p.priceChange?.h24 || 0,
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

/* ───────── Motion: fade-up once on viewport entry ───────── */

export function useInView<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return [ref, inView];
}

export function FadeUp({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`fv-fade ${inView ? "fv-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* ───────── Motion: count-up once on viewport entry ───────── */

export function useCountUp(target: number, active: boolean, duration = 1200): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf: number;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return value;
}

/* ───────── Kicker — mono uppercase section label ───────── */

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${MONO} text-[11px] font-medium tracking-[0.22em] uppercase text-[var(--fv-green)] mb-4`}>
      {children}
    </p>
  );
}

/* ───────── Delta pill ───────── */

export function DeltaPill({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`${MONO} ${up ? "fv-pill-up" : "fv-pill-down"} text-[11px] font-medium px-2 py-0.5`}>
      {fmtDelta(pct)}
    </span>
  );
}

/* ───────── Buy CTA — resolves against launch config ───────── */

export function BuyButton({ className = "" }: { className?: string }) {
  if (TRADING_LIVE && BUY_URL) {
    const internal = BUY_URL.startsWith("/");
    return (
      <a
        href={BUY_URL}
        {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        className={`fv-btn ${className}`}
      >
        Buy $FIRE
      </a>
    );
  }
  return (
    <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={`fv-btn ${className}`}>
      Get notified at launch
    </a>
  );
}

/* ───────── Ticker tape ───────── */

export function TapeV3() {
  const quotes = useStockQuotes();

  const facts = [
    ["DIVIDENDS", "PAID IN STOCK"],
    ["MINIMUM TO EARN", "NONE"],
    ["ACCRUES", "FROM DAY ONE"],
    ["FULL TIER", "90 DAYS"],
    ["JACKPOT", "EVERY FRIDAY"],
  ];

  const run = (
    <span className="inline-flex items-center">
      {quotes.map((q) => (
        <span key={q.symbol} className="inline-flex items-center gap-2 mr-8">
          <span className="text-[var(--fv-muted)]">{q.symbol}</span>
          <span className="font-medium">{fmtUsd(q.priceUsd)}</span>
          <span className={q.change24h >= 0 ? "text-[var(--fv-green)]" : "text-[var(--fv-red)]"}>
            {fmtDelta(q.change24h)}
          </span>
          <span className="text-[var(--fv-faint)] ml-4">·</span>
        </span>
      ))}
      {facts.map(([label, value]) => (
        <span key={label} className="inline-flex items-center gap-2 mr-8">
          <span className="text-[var(--fv-muted)]">{label}</span>
          <span className="font-medium text-[var(--fv-text)]">{value}</span>
          <span className="text-[var(--fv-faint)] ml-4">·</span>
        </span>
      ))}
    </span>
  );

  return (
    <div className={`${MONO} overflow-hidden whitespace-nowrap border-b border-[var(--fv-line)] py-2 text-[11px] tracking-[0.06em]`}>
      <div className="inline-flex animate-[fv-marquee_50s_linear_infinite]">
        {run}
        {run}
        {run}
      </div>
    </div>
  );
}

/* ───────── Nav ───────── */

const NAV_LINKS = [
  { label: "The difference", href: "/v3#versus" },
  { label: "The rules", href: "/v3#rules" },
  { label: "Jackpot", href: "/v3#jackpot" },
  { label: "Proof", href: "/v3#proof" },
  { label: "FAQ", href: "/v3#faq" },
];

export function NavV3() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[rgba(17,14,8,0.85)] backdrop-blur-xl border-b border-[var(--fv-line)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/v3" className="flex items-center gap-2.5 no-underline text-[var(--fv-text)]">
          <Image src="/fire-mark.svg" alt="$FIRE" width={28} height={28} className="w-7 h-7" />
          <span className="font-semibold text-[17px] tracking-[-0.01em]">
            $FIRE
            <span className={`${MONO} text-[9px] tracking-[0.24em] text-[var(--fv-muted)] block leading-none mt-0.5 uppercase`}>
              Dividends, in stocks
            </span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="no-underline text-[13px] font-medium text-[var(--fv-muted)] hover:text-[var(--fv-text)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <BuyButton className="text-[13px] px-4 py-2" />
          <button
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 border border-[var(--fv-line-strong)] rounded-full cursor-pointer bg-transparent"
          >
            <span className={`w-4 h-px bg-[var(--fv-text)] transition-transform ${open ? "rotate-45 translate-y-[3.5px]" : ""}`} />
            <span className={`w-4 h-px bg-[var(--fv-text)] transition-transform ${open ? "-rotate-45 -translate-y-[3.5px]" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--fv-line)] bg-[rgba(17,14,8,0.97)] px-6 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="no-underline text-[14px] font-medium text-[var(--fv-text)]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

/* ───────── App-shell nav — scrollworld grammar, for interior pages ───────── */

const SHELL_LINKS = [
  { key: "swap", label: "Swap", href: "/swap" },
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "lottery", label: "Lottery", href: "/lottery" },
  { key: "board", label: "The Board", href: "/leaderboard" },
] as const;

export function NavShell({ active }: { active?: "swap" | "dashboard" | "lottery" | "board" }) {
  return (
    <nav className="sticky top-0 z-50 bg-[rgba(17,14,8,0.72)] backdrop-blur-xl border-b border-[var(--fv-line)]">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/v3" className="flex items-center gap-2.5 no-underline text-[var(--fv-text)]">
          <Image src="/brand/fire-glyph.svg" alt="FIRE" width={26} height={26} className="w-[26px] h-[26px]" />
          <span className="font-semibold text-[16px] tracking-[-0.01em] leading-none">
            FIRE
            <span className={`${MONO} block text-[8px] tracking-[0.24em] text-[var(--fv-muted)] leading-none mt-[3px] uppercase font-normal`}>
              Dividends, in stocks
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
          {SHELL_LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className={`no-underline text-[13px] font-medium transition-colors ${
                active === l.key ? "text-[var(--fv-green)]" : "text-[var(--fv-muted)] hover:text-[var(--fv-text)]"
              } ${l.key === "board" ? "hidden sm:block" : ""}`}
            >
              {l.label}
            </Link>
          ))}
          <BuyButton className="text-[13px] px-4 py-2" />
        </div>
      </div>
    </nav>
  );
}

/* ───────── Footer — the long boring disclosure wall ───────── */

export function FooterV3() {
  return (
    <footer className="border-t border-[var(--fv-line)] px-5 sm:px-8 py-12">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex justify-between flex-wrap gap-8 items-start">
          <div className="flex items-center gap-3">
            <Image src="/fire-mark.svg" alt="" width={24} height={24} className="w-6 h-6" />
            <div>
              <p className="text-[13px] font-medium">© 2026 $FIRE</p>
              <p className={`${MONO} text-[10px] mt-1 tracking-[0.14em] uppercase text-[var(--fv-muted)]`}>
                Hold · Claim · Friday · {CHAIN_NAME}
              </p>
            </div>
          </div>
          <div className="flex gap-6 flex-wrap text-[13px]">
            {[
              ["Telegram", TELEGRAM_URL],
              ["X / Twitter", X_URL],
              ["Dashboard", "/dashboard"],
              ["Lottery", "/lottery"],
              ["The Board", "/leaderboard"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-[var(--fv-muted)] no-underline hover:text-[var(--fv-text)] transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
          <div className={`${MONO} text-[10px] text-[var(--fv-faint)] break-all max-w-[340px]`}>
            {CA ? `CA: ${CA}` : "Contract address: announced at launch."}
          </div>
        </div>
        <div className="text-[11px] leading-[1.8] text-[var(--fv-faint)] max-w-3xl mt-10 pt-6 border-t border-[var(--fv-line)] space-y-2">
          <p>
            $FIRE is an experimental onchain game, not a financial product, investment vehicle, or
            security. Dividends are funded entirely by protocol trading fees, are not guaranteed, and
            depend on trading volume. Stock payouts are made in third-party tokenized instruments
            (&ldquo;Stock Tokens&rdquo;) that track — but are not — the underlying shares: they confer no
            equity ownership, voting rights, or issuer dividend entitlement, and may not be available
            to persons in certain jurisdictions, including the United States. The payout asset is a
            protocol parameter and may change. Past holder behavior is not a promise of future
            behavior. Do not purchase with funds you cannot afford to lose.
          </p>
        </div>
      </div>
    </footer>
  );
}
