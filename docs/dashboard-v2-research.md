# Dashboard v2 — research

Brief: the dashboard is plain. Before redesigning, establish what the best mobile
chart and loyalty experiences actually do, and what FIRE specifically is missing.

---

## 1. The diagnosis

Every panel on the current dashboard renders a **point-in-time scalar**. Paid to
holders, buy fee, sell fee, holders, FIRE burned, accumulated ETH, the stock index
— all single numbers. The only non-text elements are two progress bars.

There is not one time series on the whole page.

That is the problem in a sentence, because **every core FIRE mechanic is inherently
temporal**:

| Mechanic | What it actually is | How it's currently drawn |
|---|---|---|
| Hold streak | a duration, by definition | a number |
| Tier multiplier | a 90-day ramp curve | a bare bar |
| Rank ladder | a progression with named states | a badge |
| Dividends | a payment history | a lifetime total |
| Tranches | a decay schedule | a list |
| Distributions | recurring events | a list |
| Jackpot | a weekly cycle | a number |

A product whose entire thesis is *"the longer you hold, the more you get"* is
displaying no time anywhere. It reads as a well-organised spec sheet — an admin
panel, not a consumer app.

Worth noting the raw material is strong: **5,768 tracked wallets, $24,257 all-time
paid, 7 assets distributed** (NVDA, SPY, GME, TSLA, AMD, AAPL, ETH). There is a
year of story in that data and none of it is on screen.

---

## 2. What the best loyalty apps do

Five mechanics, in rough order of impact.

### a. A visible, always-present counter (loss aversion)

Duolingo's streak lives on the home screen with a fire icon — "one of the first
things you see when you open the app." Users with **7+ day streaks retain at 2.4x**
the rate of users who never establish one; it plausibly drives more retention than
any other single feature.

The mechanism is loss aversion: the longer the streak, the higher the felt cost of
breaking it. The cost of quitting a 500-day streak outweighs the effort of a
5-minute lesson.

**FIRE already has the strongest possible version of this** — an on-chain streak
that pays real money — and it is buried in a panel below the fold, rendered as
plain text.

### b. Grace, but calibrated

Streak freezes. The tested finding is specific: **two freezes beat one; three were
about the same as two**; too much forgiveness erodes the habit.

FIRE's *hold* streak can't have freezes — it's a contract rule. But the cosmetic
*check-in* streak can, and that's exactly the right place for it.

### c. Progress toward a **named** next thing, with its benefit stated

The pattern that keeps recurring: tier progress needs a **unit, a deadline, and a
benefit**, and you should reveal the nearest attainable benefit *before* the full
catalogue.

FIRE currently says *"73 days until TEMPERED."* It never says what TEMPERED gets
you. The ladder is decoration until each rung names its payoff.

### d. Milestones are **events**, not states

Animation, badge, shareable graphic at the moment of crossing. FIRE has the share
card and now has Ember, but no moment fires when a rank is actually crossed.

### e. Shared/social streaks beat solo ones

A friend streak increments only when both parties show up. Mutual accountability is
more durable than individual loss aversion — "the social cost of breaking a shared
streak involves a specific relationship rather than just a personal number."

FIRE has an unexploited version of this already built: the **monthly cohort survival
curve**. "491 started in August, 460 still unbroken" is a shared-fate story. It
lives on `/leaderboard` and is completely absent from the dashboard.

---

## 3. What the best mobile finance charts do

- **Robinhood grammar** — a naked line with no axes and no gridlines; scrub with a
  finger and the *hero number itself* changes to the scrubbed value; range tabs
  (1D / 1W / 1M / 3M / 1Y / ALL); colour encodes direction, not brand. FIRE's v3
  system already says it wants this. The dashboard never delivered it.
- **Whoop / Oura** — one hero score, then a "why" breakdown beneath it. Every row
  carries an inline sparkline so the list itself is a chart.
- **Apple Fitness rings** — closed-loop progress; one glance reads three states at
  once. Rings beat bars when the target is fixed and the story is "how close."
- **Copilot / Monarch** — category rows with inline sparklines and a single
  headline; charts are small and everywhere rather than big and rare.

---

## 4. The method (in-house dataviz rules that bind this work)

Pulled from the `dataviz` skill; these are non-negotiable and a few bite hard here.

1. **Pick the form from the data's job** — magnitude / identity / polarity /
   headline / change-over-time. Sometimes the right answer is *not a chart*
   (jackpot countdown is a stat tile, not a plot).
2. **One axis, ever.** No dual-axis. Two measures of different scale → two charts
   or index them to a common base. Relevant: "dividends earned" and "FIRE price"
   must not share a plot.
3. **Colour follows the entity, never its rank.** Filtering to 3 assets must not
   repaint the survivors.
4. **Status colours are reserved.** Good/warning/critical never double as "series 4."
5. **Dark mode is selected, not flipped** — its own steps from the same ramps,
   validated against the dark surface.
6. **Run `scripts/validate_palette.js`** — never eyeball CVD safety.
7. **Hover/scrub layer by default** on any line or area.

### ⚠ The hard constraint this surfaces

FIRE's palette is **Robin green `#00C805` + loss red `#FF5000` on near-black, and
nothing else** — deliberately, per the v3 design direction.

Green and red are already doing **semantic status duty** (gain/loss, safe/danger).
Under rule 4 they cannot be reused as categorical series colours. So the current
palette **cannot draw a 6-asset dividend breakdown** — there is no legal way to
distinguish NVDA from SPY from GME.

This is the single biggest blocker to the redesign and it needs deciding before any
chart gets built. Three options:

| Option | Trade-off |
|---|---|
| Add a validated categorical ramp (4–6 hues) | Breaks "no other saturated colour"; most expressive |
| One green sequential ramp, assets by lightness step | Stays on-brand; weak for 6 series, fails CVD at that count |
| Never chart assets together — small multiples, one per asset | Fully on-brand, no palette change; costs vertical space |

Recommendation: **small multiples** for asset breakdowns, plus a narrow categorical
ramp only if a stacked view proves necessary. Validate whatever is chosen.

---

## 5. The chart map — data job → form

| Data | Job | Form |
|---|---|---|
| All-time paid to holders | headline | hero number **+ cumulative area beneath it** |
| Your dividends over time | change over time | small multiples, one sparkline per asset |
| Your hold streak | progress to a named state | **ring**, not a bar — fixed target, "how close" |
| Tier multiplier | your position on a curve | line 0→90d with a "you are here" marker |
| Rank ladder | ordinal progression | stepped rail, each rung labelled with its benefit |
| Monthly cohort survival | change over time | step chart *(already built on `/leaderboard` — move/mirror it)* |
| Distribution history | events over time | bar per distribution, one asset per facet |
| Tranches | schedule | thin horizontal bars showing fee decay |
| Jackpot | countdown + odds | **not a chart** — stat tile + countdown |
| Check-in streak | habit | 30-day dot grid calendar |

---

## 6. Build constraints

- **No chart library is installed.** Deps are framer-motion + anime.js only.
  Precedent exists: the survival curve on `/leaderboard` is hand-rolled SVG in the
  brand palette (stepped path + area fill + `viewBox` responsive). That approach
  worked and should be extended rather than replaced with a library.
- **Mobile-first is mandatory** — the WalletConnect/Rabby work implies most holders
  arrive on a phone. Scrub interactions must work with a thumb; hit targets larger
  than the marks.
- **The check-in data already exists** (`checkins` table) and nothing renders it.
- Every chart needs a loading and an empty state; a wallet on day 0 has no history
  and must not see a broken plot.

---

## 7. Recommended shape

Top to bottom, mobile:

1. **Streak hero** — big number, Ember, rank badge. Duolingo position: first thing
   you see, above everything.
2. **Next milestone** — named, with its benefit spelled out, and a ring showing
   distance.
3. **Paid to you** — hero number + cumulative area. The receipts.
4. **Asset rows** — one sparkline each, small multiples.
5. **Cohort survival** — "460 of 491 who started in August are still here." Shared
   fate.
6. **The mechanics** — fees, tranches, jackpot. Reference material, moved down.

The current page is roughly this order inverted: protocol mechanics first, personal
story last.

---

## Sources

- [How Duolingo's streak mechanic actually works — Apptitude](https://apptitude.io/blog/how-duolingos-streak-mechanic-actually-works/)
- [Duolingo gamification case study — Trophy](https://trophy.so/blog/duolingo-gamification-case-study)
- [The psychology behind Duolingo's streak feature](https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature)
- [Duolingo gamification explained — StriveCloud](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo)
- [Mobile app loyalty rewards design examples — ScreensDesign](https://screensdesign.com/articles/mobile-app-loyalty-rewards-design-examples/)
- [Fintech loyalty programs guide — Enable3](https://enable3.io/blog/fintech-loyalty-programs-complete-guide)
- [Fintech design patterns that build trust — Eleken](https://www.eleken.co/blog-posts/modern-fintech-design-guide)
- Internal: `dataviz` skill (form heuristic, colour formula, palette validator, anti-patterns)
