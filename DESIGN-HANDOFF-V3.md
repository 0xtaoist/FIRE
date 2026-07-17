# $FIRE v3 — Design Handoff (Robinhood Chain pivot)

**For: Claude Design. Goal: take the working first pass at `/v3` and make it exceptional.**
Launch window: ~Jul 17–18, 2026 (weekend rush). The first pass is functional and copy-final;
your job is visual excellence, not rearchitecture.

## 0. Run it

```bash
npm run dev          # then open http://localhost:3000/v3
npx next build       # must stay green before every handback
```

Next.js 16.2.4 + React 19 + Tailwind 4. **Read `AGENTS.md` first** — this Next version has
breaking changes; consult `node_modules/next/dist/docs/` before using unfamiliar APIs.
Work on the `v3-pivot` branch. Everything v3 lives in: `src/app/v3/`, `src/app/fire-v3.css`,
`src/components/fire-v3/`, `brand/drafts/`. Do not touch legacy routes or their CSS
(`fire.css`, `fire-new.css`, `globals.css`).

**Definition of done for the design pass:** `/v3` looks like the best-designed financial
product on Robinhood Chain at 390px and 1440px; build green; all §6 constraints hold; hero
card screenshot-worthy; chosen brand glyph wired into nav + favicon; OG image replaced.

---

## 1. What this site is

$FIRE pivoted to Robinhood Chain (chain id 4663). New premise, one line:

> "Get paid in stocks for holding — the longer you hold, the bigger your cut. We pay
> diamond hands, not just wallets. And every Friday, one of them takes the jackpot."

Mechanics the surface must communicate (and ONLY these — everything else is invisible plumbing):
1. Hold → your dividend accrues bigger (paid in tokenized SPY/NVDA, from day one, claim anytime)
2. Sell big → streak resets
3. 90 days → max tier + jackpot eligible

Supporting facts: no minimum to earn; paper hands' exit fees fund the dividend; Friday jackpot —
one winner takes the pot AND picks next week's stock; unclaimed dividends (8+ weeks) roll into
the pot; v1 proof — 54 of top 100 wallets held through a 92% drawdown, all streaks migrated
intact by snapshot.

## 2. Approved design direction (user-approved 2026-07-16 — do not relitigate)

**"Terminal Dark"** — business professional, stock portfolio, Robinhood-esque.
The user explicitly rejected continuing the brutalist wojak style for this pivot.

- Theme: warm near-black, Robinhood-app portfolio UI grammar
- Accent: **Robin green `#00C805` does BOTH brand and P&L-up duty** (user chose this over
  ember orange). Red `#FF5000` strictly for losses. No other saturated color. **No gradients.**
- Type: **DM Sans** (Capsule Sans stand-in) for UI/headlines · **Instrument Serif italic** for
  1–3 inflection words inside headlines (Robinhood ships this exact font) · **IBM Plex Mono**
  with `tabular-nums` for EVERY number, ticker, price, kicker. All three already loaded in
  `src/app/layout.tsx` as `--font-dm-sans`, `--font-serif-inst`, `--font-plex-mono`.
- Tokens live in `src/app/fire-v3.css`, scoped to `.fv-page`:
  bg `#110E08` · surface `#1A1610` · surface-2 `#221D15` · line `rgba(245,243,238,.08)` ·
  text `#F5F3EE` · muted 55% · green `#00C805` · red `#FF5000`. Pill buttons (radius-full,
  green fill, near-black text), panels radius 20px.

**Signature patterns to lean into (from a 5-agent research pass on Robinhood, Mercury, Stripe,
Frec, Betterment, M1, Public, Ondo, Superstate — all verified from live CSS):**
- Odometer/ticking numbers (Robinhood's "Ticker" — digits roll vertically on change)
- The naked line chart: 2px trend-colored line, zero axes/gridlines, dashed prev-close line,
  draw-in ≤800ms, scrub crosshair
- Range tabs `LIVE 1D 1W 1M 3M ALL`, selected pill tinted by trend color
- Holdings rows: ticker + shares left, price + filled green/red delta pill right, hairline rules
- Mono uppercase kickers above every section headline (cheapest institutional signal)
- Timestamped stats: "as of Jul 16, 2026" on every claim — precise beats round
  ("54/100" beats "most"; "+0.92%" beats "moon")
- The long boring disclosure footer (already written — keep its substance)

**Motion rules (from the research, strict):** scroll-enter = opacity + translateY(24px),
fires once; numbers count up once on viewport entry; chart draws once; NOTHING loops except
the ticker tape marquee; no parallax, no scroll-jacking; hover lift ≤2px; exactly one "wow"
(the hero account card). Restraint IS the premium signal.

## 3. Competitive context (why this direction wins)

**INTERNAL REFERENCE ONLY — competitors are NEVER named anywhere on the site.** (User
directive 2026-07-16: no drawing comparisons. The "Versus" section contrasts $FIRE against
"the usual dividend token", unnamed.)

- **INDEX** (theindex.finance, ~$25M) — the #1 competitor. Light warm-greige editorial,
  Instrument Sans, slash-numbered labels, 8/10 execution. **Do not drift toward light/greige —
  that's their territory.** Their attackable facts (verified from their own docs, keep our
  comparisons to these): 10,000 INDEX minimum to earn anything; flat pro-rata with zero loyalty
  mechanic; 15-minute micro-drips of dust across 30+ tickers; volume-dependent.
- **ARROW** (~$13M) — dark Framer template with literal leftover ChatGPT filler patched by
  regex in view-source. The chain's #2 DeFi project. The professionalism bar is on the floor.
- **The lane:** "Nobody on this chain looks like money." Every project is either degen-loud or
  gallery-minimal. A brokerage-statement aesthetic is unclaimed. We are claiming it.

## 4. What exists (the first pass)

```
src/app/v3/page.tsx              landing (all sections, copy-final)
src/app/v3/layout.tsx            metadata
src/app/fire-v3.css              design tokens, scoped .fv-page
src/components/fire-v3/shared.tsx config, hooks, Nav/Tape/Footer/atoms
```

Sections in order: TapeV3 (live SPY/NVDA marquee) → Nav → Hero (headline + illustrative
"Dividend account" card) → Versus (unnamed "usual dividend token" comparison) → Rules (3 cards) → Machine
(4 steps) → Jackpot (Friday 4PM ET countdown) → Proof (54/100 · 92% · 100% count-ups) →
FAQ (accordion) → Final CTA → Footer.

`npx next build` passes; page prerenders static; smoke-tested. Next 16.2.4 + React 19 +
Tailwind 4 (arbitrary values inline, matching repo style).

## 5. Data wiring (what's real vs illustrative vs placeholder)

- **LIVE:** SPY + NVDA prices/24h-deltas via DexScreener `latest/dex/tokens/{addr,addr}`,
  60s refresh, highest-liquidity pair wins. Canonical addresses (verified on-chain — there ARE
  same-symbol fakes with zero liquidity):
  SPY `0x117cc2133c37B721F49dE2A7a74833232B3B4C0C`,
  NVDA `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC`. Config: `STOCK_TOKENS` in shared.tsx.
- **ILLUSTRATIVE (labeled on-screen):** hero account value ($4,283.19 + slow accrual tick),
  chart curve, share counts. Keep the "Illustrative" tag — it's a trust pattern, not a bug.
- **PLACEHOLDER until launch:** `TRADING_LIVE=false`, `CA=null`, `BUY_URL=null`,
  `PAIR_URL=null` in shared.tsx. Buy CTAs auto-fallback to Telegram ("Get notified at launch").
  CA line in footer says "announced at launch". **Ops flips these in one place at LP time —
  never hardcode a CA or pair URL elsewhere.** The contract is NOT deployed yet; contract/backend
  work is out of scope entirely.
- Countdown targets Friday 4:00 PM ET (commented as an ops parameter in page.tsx).

## 6. Hard constraints (do not break)

1. Exactly **3 rules** on the surface. No tranches/prestige/LIFO/caps language anywhere.
2. Positioning line prominent, competitors unnamed: "Anyone can pay wallets. We pay the
   people who stay." Never name INDEX, ARROW, or any other project on the site.
3. Green/red are semantic (P&L) — green doubles as brand, red never decorates.
4. No gradients. No new saturated colors. No confetti (Robinhood regulatory baggage — researched).
5. Factual claims stay checkable + timestamped (INDEX comparison rows are sourced from their
   published FAQ; the 54/100 + 92% + streak-migration stats keep their "as of v1 snapshot" note).
6. Keep the disclosure footer's substance (stock tokens ≠ shares; payout asset is a protocol
   parameter; not available in certain jurisdictions incl. US).
7. Scope everything to `.fv-page` / `fire-v3.css`. Legacy pages (`/`, `/landing-new`,
   `/dashboard-new`, `/leaderboard-new`) and their CSS are untouched.
8. Copy voice: professional with a knife. Sober fintech grammar delivering degen-native lines
   ("Options expire on Friday. So does your excuse for selling."). No memecoin yelling, no
   corporate mush.

## 7. Better-pass targets (ranked)

1. **Hero account card = the money shot.** Upgrade the count-up to a true per-digit odometer
   roll; add scrub interaction to the naked chart (crosshair + value readout that drives the
   header number, Robinhood-style); consider a subtle "market hours" state. This card is what
   gets screenshotted.
2. **Mobile pass.** First pass is responsive but untuned — hero card must be flawless at 390px;
   tape/nav/countdown need real device QA.
3. **Versus table drama.** It's the strategic weapon. Consider highlighting the $FIRE column
   as a raised panel; make "10,000 INDEX minimum" vs "None" impossible to miss.
4. **Jackpot section theater.** Friday-close energy (options-expiry). The countdown is live;
   give it presence without breaking motion restraint.
5. **OG/share image** for the new premise (current og image is old-brand).
6. **Dashboard + leaderboard in this system** (routes exist only in old skin). Dashboard is
   launch-gate-3: live accrual ticking, claim flow, claim → share card. Leaderboard: streak
   column, "jackpot eligible" pills at 90d, Friday rerank framing. Reuse `fire-v3` tokens/atoms.
   Wire to existing APIs (`/api/leaderboard`, `/api/holder-stats`) where shapes fit; new-contract
   wiring is backend's job — build against the UI shapes with labeled demo data.
7. **Brand marks: drafts exist in `brand/drafts/` (real SVGs, Recraft vector).**
   **USER-PICKED DIRECTION (2026-07-16): the abstract flame glyph** — smooth teardrop/flame
   form with a sweeping crescent negative-space cut (originally `app-icon-b.svg`), refined in
   `mark-clean-a/b.svg`, locked up with clean semibold type in `lockup-a/b.svg` (lockup-b is
   the leading candidate). User wants "a cleaner look" — polish this family; the candlestick-I
   wordmark (`wordmark-c.svg`) and `ticker-a.svg` "$FIRE ▲" remain as secondary/social options
   only. Finalize one glyph, cut nav-size + favicon + OG versions, replace `fire-mark.svg`
   usages in v3 surfaces only. Note: the SVGs carry `preserveAspectRatio="none"` viewBoxes —
   normalize when cutting production assets.

## 8. Reference (from the research pass, for taste calibration)

Robinhood app dark portfolio view + Legend panels (grammar) · Mercury dark data panels +
weight-450 body trick (tone) · Frec hero live-counters + trust-chip strip (credibility) ·
M1 Paid/Pending/Upcoming income pipeline (dashboard accrual states) · Superstate asset tables
(6-decimal precision energy) · Betterment timestamped-footnote discipline (claims).
