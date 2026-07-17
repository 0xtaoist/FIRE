"use client";

import { useEffect, useState } from "react";
import {
  TapeV3,
  NavV3,
  FooterV3,
  BuyButton,
  Kicker,
  FadeUp,
  DeltaPill,
  useStockQuotes,
  useInView,
  useCountUp,
  fmtUsd,
  MONO,
  SERIF,
  TELEGRAM_URL,
  CHAIN_NAME,
} from "@/components/fire-v3/shared";

/* ═════════════════════════════════════════════
   HERO — headline + illustrative dividend account
   ═════════════════════════════════════════════ */

/* Fixed accrual curve for the naked chart — deterministic so SSR and
   client render identically. Upward drift with believable chop. */
const CHART_POINTS = [
  4104, 4111, 4098, 4120, 4135, 4128, 4149, 4142, 4163, 4171, 4158, 4180,
  4197, 4188, 4209, 4224, 4216, 4238, 4231, 4252, 4247, 4266, 4259, 4283,
];

function chartPath(points: number[], w: number, h: number): string {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * (h - 8) - 4;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function NakedChart() {
  const w = 480;
  const h = 120;
  const d = chartPath(CHART_POINTS, w, h);
  const prevCloseY = h - ((CHART_POINTS[0] - Math.min(...CHART_POINTS)) / (Math.max(...CHART_POINTS) - Math.min(...CHART_POINTS))) * (h - 8) - 4;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[120px]" preserveAspectRatio="none" aria-hidden="true">
      <line
        x1={0}
        y1={prevCloseY}
        x2={w}
        y2={prevCloseY}
        stroke="var(--fv-line-strong)"
        strokeWidth={1}
        strokeDasharray="2 6"
      />
      <path
        d={d}
        fill="none"
        stroke="var(--fv-green)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1}
        style={{ animation: "fv-draw 800ms ease-out 300ms forwards" }}
      />
    </svg>
  );
}

const RANGES = ["LIVE", "1D", "1W", "1M", "3M", "ALL"];

function DividendAccountCard() {
  const quotes = useStockQuotes();
  const [ref, inView] = useInView<HTMLDivElement>();
  const base = useCountUp(4283.19, inView, 1400);

  /* after the count-up settles, keep accruing a few cents a second —
     the "it pays while you watch" moment */
  const [accrued, setAccrued] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setAccrued((a) => a + 0.0173), 1000);
    return () => clearInterval(id);
  }, [inView]);

  const value = base + (base >= 4283 ? accrued : 0);

  const holdings = [
    { symbol: "SPY", name: "SPDR S&P 500 ETF", shares: "4.912" },
    { symbol: "NVDA", name: "NVIDIA", shares: "3.208" },
  ];

  return (
    <div ref={ref} className="fv-panel p-6 sm:p-8 relative">
      <div className="flex items-center justify-between mb-6">
        <p className={`${MONO} text-[10px] font-medium tracking-[0.22em] uppercase text-[var(--fv-muted)]`}>
          Dividend account
        </p>
        <span className={`${MONO} text-[9px] tracking-[0.16em] uppercase text-[var(--fv-faint)] border border-[var(--fv-line)] rounded-full px-2.5 py-1`}>
          Illustrative
        </span>
      </div>

      <p className={`${MONO} text-[42px] sm:text-[52px] leading-none font-medium tracking-[-0.02em]`}>
        {value <= 0
          ? "$0.00"
          : `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      </p>
      <p className={`${MONO} text-[13px] mt-2.5 text-[var(--fv-green)]`}>
        +$38.42 (+0.92%) today
        <span className="text-[var(--fv-faint)] ml-3">accruing live</span>
      </p>

      <div className="mt-6 -mx-1">
        {inView && <NakedChart />}
        {!inView && <div className="h-[120px]" />}
      </div>

      <div className={`${MONO} flex gap-1 mt-3 text-[10px] tracking-[0.08em]`}>
        {RANGES.map((r) => (
          <span
            key={r}
            className={`px-2.5 py-1 rounded-full ${
              r === "1D"
                ? "bg-[var(--fv-green-soft)] text-[var(--fv-green)] font-medium"
                : "text-[var(--fv-faint)]"
            }`}
          >
            {r}
          </span>
        ))}
      </div>

      <div className="mt-6 border-t border-[var(--fv-line)]">
        <p className={`${MONO} text-[10px] font-medium tracking-[0.22em] uppercase text-[var(--fv-muted)] mt-5 mb-1`}>
          Accrued holdings
        </p>
        {holdings.map((hld) => {
          const q = quotes.find((x) => x.symbol === hld.symbol);
          return (
            <div key={hld.symbol} className="fv-row flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <span className={`${MONO} w-9 h-9 rounded-full border border-[var(--fv-line-strong)] flex items-center justify-center text-[10px] font-medium`}>
                  {hld.symbol.slice(0, 4)}
                </span>
                <div>
                  <p className="text-[14px] font-medium leading-tight">{hld.symbol}</p>
                  <p className={`${MONO} text-[11px] text-[var(--fv-muted)]`}>{hld.shares} sh accrued</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`${MONO} text-[13px]`}>{q ? fmtUsd(q.priceUsd) : "—"}</span>
                {q && <DeltaPill pct={q.change24h} />}
              </div>
            </div>
          );
        })}
      </div>

      <button className="fv-btn w-full mt-6 text-[14px] py-3.5" type="button">
        Claim dividend
      </button>
      <p className={`${MONO} text-[9px] text-[var(--fv-faint)] text-center mt-3 tracking-[0.08em] uppercase`}>
        Stock prices live · {CHAIN_NAME} · account values illustrative
      </p>
    </div>
  );
}

function Hero() {
  return (
    <header className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-20 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
      <FadeUp>
        <Kicker>Live on {CHAIN_NAME}</Kicker>
        <h1 className="text-[clamp(40px,6vw,72px)] leading-[1.02] tracking-[-0.03em] font-semibold [text-wrap:balance]">
          Get paid in stocks{" "}
          <em className={`${SERIF} italic font-normal text-[var(--fv-green)]`}>for staying.</em>
        </h1>
        <p className="text-[17px] leading-[1.65] text-[var(--fv-muted)] mt-6 max-w-[520px] [text-wrap:pretty]">
          Hold $FIRE and dividends accrue in tokenized SPY and NVDA from day one — claim whenever
          you want. The longer you hold, the bigger your cut. And every paper hand who sells early
          is funding yours.
        </p>
        <div className="flex gap-3 mt-8 flex-wrap">
          <BuyButton className="text-[15px] px-7 py-3.5" />
          <a href="#rules" className="fv-btn-ghost text-[15px] px-7 py-3.5">
            Read the rules
          </a>
        </div>
        <div className={`${MONO} flex flex-wrap gap-x-6 gap-y-2 mt-9 text-[11px] tracking-[0.1em] uppercase text-[var(--fv-muted)]`}>
          <span>No minimum to earn</span>
          <span className="text-[var(--fv-faint)]">·</span>
          <span>Accrues from day one</span>
          <span className="text-[var(--fv-faint)]">·</span>
          <span>Full tier in 90 days</span>
        </div>
      </FadeUp>
      <FadeUp delay={120}>
        <DividendAccountCard />
      </FadeUp>
    </header>
  );
}

/* ═════════════════════════════════════════════
   VERSUS — the comparison table
   ═════════════════════════════════════════════ */

const VERSUS_ROWS: [string, string, string][] = [
  ["Minimum to earn", "Whale thresholds — small holders get nothing", "None — every holder earns"],
  ["Loyalty", "Flat pro-rata. A day-one whale outranks you forever.", "Your cut grows with your streak — full tier at 90 days"],
  ["What lands in your wallet", "Dust sprayed across dozens of tickers", "SPY & NVDA, claimed when you want"],
  ["The moment", "An invisible drip nobody talks about", "Friday. One holder takes the whole pot."],
];

function Versus() {
  return (
    <section id="versus" className="border-y border-[var(--fv-line)] bg-[var(--fv-surface)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <FadeUp>
          <Kicker>The difference</Kicker>
          <h2 className="text-[clamp(30px,4.5vw,52px)] leading-[1.05] tracking-[-0.02em] font-semibold max-w-[720px] [text-wrap:balance]">
            Anyone can pay wallets.{" "}
            <em className={`${SERIF} italic font-normal text-[var(--fv-green)]`}>
              We pay the people who stay.
            </em>
          </h2>
        </FadeUp>

        <FadeUp delay={100} className="mt-12">
          <div className="border border-[var(--fv-line)] rounded-2xl overflow-hidden">
            <div className={`${MONO} grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[0.8fr_1fr_1fr] text-[10px] tracking-[0.18em] uppercase bg-[var(--fv-surface-2)]`}>
              <div className="px-4 sm:px-6 py-4 text-[var(--fv-faint)]" />
              <div className="px-4 sm:px-6 py-4 text-[var(--fv-muted)]">The usual dividend token</div>
              <div className="px-4 sm:px-6 py-4 text-[var(--fv-green)] font-medium">$FIRE</div>
            </div>
            {VERSUS_ROWS.map(([label, them, us]) => (
              <div
                key={label}
                className="grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[0.8fr_1fr_1fr] border-t border-[var(--fv-line)]"
              >
                <div className={`${MONO} px-4 sm:px-6 py-5 text-[10px] sm:text-[11px] tracking-[0.14em] uppercase text-[var(--fv-muted)]`}>
                  {label}
                </div>
                <div className="px-4 sm:px-6 py-5 text-[13px] sm:text-[14px] leading-relaxed text-[var(--fv-muted)]">
                  {them}
                </div>
                <div className="px-4 sm:px-6 py-5 text-[13px] sm:text-[14px] leading-relaxed font-medium">
                  {us}
                </div>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════
   THE RULES — exactly three, nothing else
   ═════════════════════════════════════════════ */

function RuleAccrualViz() {
  /* rising steps: your cut grows with your streak */
  const steps = [28, 40, 54, 70, 88];
  return (
    <div className="flex items-end gap-2 h-[96px] mt-auto" aria-hidden="true">
      {steps.map((h, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t-md ${i === steps.length - 1 ? "bg-[var(--fv-green)]" : "bg-[var(--fv-green-soft)]"}`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function RuleResetViz() {
  return (
    <div className="mt-auto" aria-hidden="true">
      <div className="h-2 rounded-full bg-[var(--fv-surface-2)] overflow-hidden">
        <div className="h-full w-[72%] rounded-full bg-[var(--fv-red)]" />
      </div>
      <div className={`${MONO} flex justify-between text-[10px] mt-2 text-[var(--fv-faint)]`}>
        <span>Day 63</span>
        <span className="text-[var(--fv-red)]">→ Day 0</span>
      </div>
    </div>
  );
}

function RuleTierViz() {
  return (
    <div className="mt-auto flex items-center gap-3" aria-hidden="true">
      <span className={`${MONO} text-[36px] font-medium text-[var(--fv-green)] leading-none`}>90d</span>
      <span className={`${MONO} text-[9px] tracking-[0.16em] uppercase border border-[var(--fv-green)] text-[var(--fv-green)] rounded-full px-3 py-1.5`}>
        Jackpot eligible
      </span>
    </div>
  );
}

const RULES = [
  {
    num: "01",
    title: "Hold, and it grows",
    body: "Your dividend accrues from day one and gets bigger the longer you stay. Watch it tick up live.",
    viz: <RuleAccrualViz />,
  },
  {
    num: "02",
    title: "Sell big, start over",
    body: "Dump your bag and your streak resets to zero. Back of the line — and your exit fee pays everyone who stayed.",
    viz: <RuleResetViz />,
  },
  {
    num: "03",
    title: "90 days, full tier",
    body: "Hold 90 days for the maximum cut — and a seat in the Friday jackpot draw.",
    viz: <RuleTierViz />,
  },
];

function Rules() {
  return (
    <section id="rules" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 sm:py-28">
      <FadeUp>
        <Kicker>The rules</Kicker>
        <h2 className="text-[clamp(30px,4.5vw,52px)] leading-[1.05] tracking-[-0.02em] font-semibold [text-wrap:balance]">
          Three rules.{" "}
          <em className={`${SERIF} italic font-normal text-[var(--fv-green)]`}>That&apos;s the whole game.</em>
        </h2>
      </FadeUp>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
        {RULES.map((r, i) => (
          <FadeUp key={r.num} delay={i * 100}>
            <div className="fv-panel p-7 h-full flex flex-col min-h-[280px]">
              <p className={`${MONO} text-[11px] text-[var(--fv-faint)] tracking-[0.18em] mb-5`}>{r.num}</p>
              <h3 className="text-[20px] font-semibold tracking-[-0.01em] mb-2.5">{r.title}</h3>
              <p className="text-[14px] leading-[1.65] text-[var(--fv-muted)] mb-8">{r.body}</p>
              {r.viz}
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════
   THE MACHINE — where the dividend comes from
   ═════════════════════════════════════════════ */

const STEPS = [
  {
    num: "01",
    title: "Every trade pays a fee",
    body: "Fees fill the dividend pool in ETH — and paper hands selling early pay the most into it.",
  },
  {
    num: "02",
    title: "The pool buys stock",
    body: "Converted to tokenized SPY and NVDA in daily batches, during US market hours, with slippage guards.",
  },
  {
    num: "03",
    title: "You accrue continuously",
    body: "Your share ticks up in real time on the dashboard. Day-one buyers have claimable stock within a day.",
  },
  {
    num: "04",
    title: "Claim whenever",
    body: "Claiming sends stock to your wallet and prints your share card. Sit on it 8+ weeks and it rolls into the Friday jackpot.",
  },
];

function Machine() {
  return (
    <section className="border-y border-[var(--fv-line)] bg-[var(--fv-surface)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <FadeUp>
          <Kicker>The machine</Kicker>
          <h2 className="text-[clamp(30px,4.5vw,52px)] leading-[1.05] tracking-[-0.02em] font-semibold [text-wrap:balance]">
            Where the dividend{" "}
            <em className={`${SERIF} italic font-normal text-[var(--fv-green)]`}>comes from.</em>
          </h2>
        </FadeUp>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {STEPS.map((s, i) => (
            <FadeUp key={s.num} delay={i * 80}>
              <div className="border-t-2 border-[var(--fv-green)] pt-5 h-full">
                <p className={`${MONO} text-[11px] text-[var(--fv-faint)] tracking-[0.18em] mb-3`}>{s.num}</p>
                <h3 className="text-[16px] font-semibold mb-2">{s.title}</h3>
                <p className="text-[13px] leading-[1.65] text-[var(--fv-muted)]">{s.body}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════
   JACKPOT — every Friday, one winner
   ═════════════════════════════════════════════ */

/* Countdown to Friday 4:00 PM ET (market close). Draw time is an ops
   parameter — adjust here if the keeper draws at a different hour. */
function useFridayCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const target = new Date(et);
      const day = et.getDay(); // 5 = Friday
      let addDays = (5 - day + 7) % 7;
      if (addDays === 0 && et.getHours() >= 16) addDays = 7;
      target.setDate(et.getDate() + addDays);
      target.setHours(16, 0, 0, 0);
      setRemaining(Math.max(target.getTime() - et.getTime(), 0));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return remaining;
}

function Jackpot() {
  const remaining = useFridayCountdown();

  const units =
    remaining === null
      ? null
      : [
          { label: "Days", value: Math.floor(remaining / 86_400_000) },
          { label: "Hours", value: Math.floor((remaining / 3_600_000) % 24) },
          { label: "Min", value: Math.floor((remaining / 60_000) % 60) },
          { label: "Sec", value: Math.floor((remaining / 1000) % 60) },
        ];

  return (
    <section id="jackpot" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 sm:py-28">
      <FadeUp className="text-center">
        <Kicker>Every Friday</Kicker>
        <h2 className="text-[clamp(34px,5.5vw,64px)] leading-[1.02] tracking-[-0.02em] font-semibold [text-wrap:balance]">
          One diamond hand takes{" "}
          <em className={`${SERIF} italic font-normal text-[var(--fv-green)]`}>the pot.</em>
        </h2>
        <p className="text-[16px] leading-[1.65] text-[var(--fv-muted)] mt-5 max-w-[560px] mx-auto [text-wrap:pretty]">
          Options expire on Friday. So does your excuse for selling. Once a week, one eligible
          holder wins the entire jackpot — and picks the stock everyone earns next week.
        </p>
      </FadeUp>

      <FadeUp delay={120}>
        <div className="fv-panel max-w-[640px] mx-auto mt-12 p-8 sm:p-10 text-center">
          <p className={`${MONO} text-[10px] tracking-[0.22em] uppercase text-[var(--fv-muted)] mb-6`}>
            Next draw · Friday 4:00 PM ET
          </p>
          <div className="grid grid-cols-4 gap-3 sm:gap-5">
            {(units ?? [
              { label: "Days", value: null },
              { label: "Hours", value: null },
              { label: "Min", value: null },
              { label: "Sec", value: null },
            ]).map((u) => (
              <div key={u.label}>
                <p className={`${MONO} text-[36px] sm:text-[48px] font-medium leading-none text-[var(--fv-green)]`}>
                  {u.value === null ? "–" : String(u.value).padStart(2, "0")}
                </p>
                <p className={`${MONO} text-[10px] tracking-[0.2em] uppercase text-[var(--fv-faint)] mt-2.5`}>
                  {u.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </FadeUp>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-10 max-w-[900px] mx-auto">
        {[
          ["Winner takes all", "The whole pot, one wallet. No splits, no consolation tiers."],
          ["Winner picks the stock", "Next week's dividend asset is the winner's call. SPY? NVDA? Their name on it."],
          ["The board reranks", "Friday close re-sorts the leaderboard. Streaks on display, receipts public."],
        ].map(([title, body], i) => (
          <FadeUp key={title} delay={i * 80}>
            <div className="text-center">
              <h3 className="text-[15px] font-semibold mb-1.5">{title}</h3>
              <p className="text-[13px] leading-[1.6] text-[var(--fv-muted)]">{body}</p>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════
   PROOF — the holder base already proved itself
   ═════════════════════════════════════════════ */

function ProofStat({ value, suffix, label, active }: { value: number; suffix: string; label: string; active: boolean }) {
  const n = useCountUp(value, active, 1200);
  return (
    <div className="text-center sm:text-left">
      <p className={`${MONO} text-[clamp(48px,7vw,84px)] font-medium leading-none tracking-[-0.03em]`}>
        {Math.round(n)}
        <span className="text-[var(--fv-green)]">{suffix}</span>
      </p>
      <p className={`${MONO} text-[11px] tracking-[0.16em] uppercase text-[var(--fv-muted)] mt-3 leading-relaxed`}>
        {label}
      </p>
    </div>
  );
}

function Proof() {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <section id="proof" className="border-y border-[var(--fv-line)] bg-[var(--fv-surface)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <FadeUp>
          <Kicker>The holder base</Kicker>
          <h2 className="text-[clamp(30px,4.5vw,52px)] leading-[1.05] tracking-[-0.02em] font-semibold max-w-[680px] [text-wrap:balance]">
            Proven{" "}
            <em className={`${SERIF} italic font-normal text-[var(--fv-green)]`}>before you got here.</em>
          </h2>
          <p className="text-[16px] leading-[1.65] text-[var(--fv-muted)] mt-5 max-w-[600px] [text-wrap:pretty]">
            $FIRE v1 went through a 92% drawdown. Most projects lose their holders long before
            that. Ours stayed — and every wallet migrated to {CHAIN_NAME} with its streak intact,
            snapshot-verified.
          </p>
        </FadeUp>

        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6 mt-14">
          <ProofStat value={54} suffix="/100" label="Top-100 wallets that held through the bottom" active={inView} />
          <ProofStat value={92} suffix="%" label="Drawdown they held through" active={inView} />
          <ProofStat value={100} suffix="%" label="Streaks migrated intact, by snapshot" active={inView} />
        </div>

        <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-10 tracking-[0.08em]`}>
          From the v1 snapshot, Jul 2026. Past holder behavior is not a promise of future behavior.
        </p>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════
   FAQ
   ═════════════════════════════════════════════ */

const FAQ_ITEMS = [
  {
    q: "What do I actually get paid in?",
    a: "Tokenized stocks on Robinhood Chain — SPY and NVDA to start. Your dividend accrues continuously from the day you buy, and you claim it whenever you want. Every Friday, the jackpot winner picks the stock everyone earns the following week.",
  },
  {
    q: "Where does the money come from?",
    a: "Protocol trading fees, collected in ETH and converted to stock in daily batches during US market hours. Sellers — especially early sellers — pay the most in. Every paper hand who exits is funding the dividend of everyone who stays.",
  },
  {
    q: "Is there a minimum? Do I have to stake?",
    a: "No minimum, no staking, no lockup, no whale threshold to clear. Hold any amount of $FIRE in your wallet and you're earning from day one.",
  },
  {
    q: "When can I claim?",
    a: "Anytime. A day-one buyer has claimable stock within a day. Claiming sends the stock to your wallet and prints a share card with your numbers on it. One catch: dividends left unclaimed for 8+ weeks roll into the Friday jackpot.",
  },
  {
    q: "What happens if I sell?",
    a: "Sell a large share of your bag and your streak resets to zero — your cut drops back to the day-one rate and your jackpot eligibility is gone until you rebuild 90 days. Small trims don't break a streak. The exact thresholds live in the docs.",
  },
  {
    q: "What happened to v1?",
    a: "It survived a 92% drawdown with 54 of its top 100 wallets still holding — then migrated here. Every v1 holder was airdropped v2 tokens with their streak carried over by snapshot. Nobody starts from zero except the people who sold.",
  },
];

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="max-w-[860px] mx-auto px-5 sm:px-8 py-20 sm:py-28">
      <FadeUp>
        <Kicker>Questions</Kicker>
        <h2 className="text-[clamp(30px,4.5vw,52px)] leading-[1.05] tracking-[-0.02em] font-semibold">
          Asked and{" "}
          <em className={`${SERIF} italic font-normal text-[var(--fv-green)]`}>answered.</em>
        </h2>
      </FadeUp>

      <div className="mt-10 border-t border-[var(--fv-line)]">
        {FAQ_ITEMS.map((it, i) => (
          <div key={i} className="border-b border-[var(--fv-line)]">
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="w-full flex items-center justify-between gap-6 py-6 text-left cursor-pointer bg-transparent"
            >
              <span className="text-[16px] sm:text-[17px] font-medium">{it.q}</span>
              <span className={`${MONO} text-[18px] text-[var(--fv-muted)] shrink-0`}>
                {open === i ? "–" : "+"}
              </span>
            </button>
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <p className={`text-[14px] leading-[1.7] text-[var(--fv-muted)] max-w-[680px] ${open === i ? "pb-6" : ""}`}>
                  {it.a}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════
   FINAL CTA
   ═════════════════════════════════════════════ */

function Final() {
  return (
    <section className="border-t border-[var(--fv-line)] bg-[var(--fv-surface)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
        <FadeUp>
          <h2 className="text-[clamp(36px,6vw,72px)] leading-[1.02] tracking-[-0.03em] font-semibold [text-wrap:balance]">
            The market pays{" "}
            <em className={`${SERIF} italic font-normal text-[var(--fv-green)]`}>whoever stays.</em>
          </h2>
          <p className="text-[16px] leading-[1.65] text-[var(--fv-muted)] mt-5 max-w-[480px] mx-auto">
            Dividends in stocks, from day one. Full tier in 90 days. Jackpot on Friday.
          </p>
          <div className="flex gap-3 mt-9 justify-center flex-wrap">
            <BuyButton className="text-[15px] px-8 py-4" />
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="fv-btn-ghost text-[15px] px-8 py-4">
              Join the Telegram
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════
   PAGE
   ═════════════════════════════════════════════ */

export default function V3Landing() {
  return (
    <div className="fv-page min-h-screen">
      <TapeV3 />
      <NavV3 />
      <Hero />
      <Versus />
      <Rules />
      <Machine />
      <Jackpot />
      <Proof />
      <Faq />
      <Final />
      <FooterV3 />
    </div>
  );
}
