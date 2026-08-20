# $FIRE v4 — Dashboard Refresh: Design Handoff

Streak, login and badges. Research behind this: `docs/dashboard-v2-research.md`.

## 0. Run it

```bash
cd ~/Downloads/FIRE && npm run dev     # needs NEXT_PUBLIC_PRIVY_APP_ID + DATABASE_URL
```

`/dashboard` — connected view is the target. `/leaderboard` has the one good chart
we already ship (hand-rolled SVG survival curve) — that's the technical precedent.

## 1. The brief

The dashboard is plain. Make it a consumer-grade loyalty surface with the streak
and a badge system at its centre.

## 2. Inherited direction — do not relitigate

**Everything in `DESIGN-HANDOFF-V3.md` §2 still stands.** Terminal Dark, Robin green
`#00C805` doing brand + P&L-up duty, red `#FF5000` for losses only, no other saturated
colour, no gradients, DM Sans + Instrument Serif italic + IBM Plex Mono tabular-nums,
tokens in `src/app/fire-v3.css`, motion restraint (nothing loops, one "wow" per page).

Ember is the mascot and is now canon: green flame creature, art in `brand/ember/`,
web states in `public/ember/` (`idle`, `sleeping`, `wake`, `happy`, `worried`, `rain`).

## 3. The diagnosis (why this refresh exists)

**There is not one time series on the current dashboard.** Every panel is a
point-in-time scalar — paid, fees, holders, burned, accumulated. The only non-text
elements are two progress bars.

That is fatal for a product whose thesis is *"the longer you hold, the more you get."*
Streak, tier ramp, dividends, tranches and distributions are all inherently temporal
and every one is drawn as a single number. It reads as an admin panel.

Unused material: **5,768 wallets, $24,257 paid, 7 assets distributed.**

Order is also inverted — protocol fees first, personal story last. Flip it.

## 4. THE CORE IDEA — two axes of identity

This is the structural decision the whole refresh hangs on. **Rank and badges are
different things and must never be merged.**

| | **RANK** | **BADGES** |
|---|---|---|
| How many | exactly one, always | accumulate forever |
| Earned by | current hold streak | one-time achievements |
| Can be lost | **yes** — breaks with your streak | **never** |
| Feeling | precarious. loss aversion. | permanent. collection. |
| Source | `src/lib/ranks.ts` | new |

Why both: a streak alone is brittle — break it and there's nothing left, so people
ragequit. Badges are the sunk investment that survives a break and brings them back.
Duolingo runs exactly this pair (precarious streak + permanent achievements).

**RANK** is already defined and shipped: SPARK 0 → IRON 30 → STEEL 60 → FORGED 90 →
TEMPERED 180 → DIAMOND 365. A forge metaphor: raw spark, worked metal, finished gem.
Each rung must state **its benefit**, not just its name — currently we say "73 days
until TEMPERED" and never say what TEMPERED gets you. That's decoration until fixed.

**BADGES** — proposed set. `✓` = computable from data we already have.

| Badge | Trigger | Data |
|---|---|---|
| **Spark / Iron / Steel / Forged / Tempered / Diamond** | *reached* that rank, kept forever | ✓ `streakDays` high-water |
| **Week One / Thirty / Century / Year One** | 7 / 30 / 100 / 365 day check-in streak | ✓ `checkins` |
| **First Drop** | first dividend received | ✓ `lifetime_dividends` |
| **Ten Drops** | 10 distributions received | ✓ distributions |
| **Full Basket** | paid in all 6 assets | ✓ `lifetime_dividends` keys |
| **Unbroken** | never had a `StreakBroken` event | ✓ `/api/streak-history` |
| **OG** | migrated from Base | ✓ `migrated` flag |
| **Founding 100 / 1000** | among first N wallets by `hold_start_unix` | ✓ needs a rank query |
| **In The Draw** | crossed jackpot min streak | ✓ contract |
| **Jackpot** | won a Friday draw | ✓ `jackpot_history.json` |
| **Held Through Red** | held across a >20% drawdown week | ⚠ needs price history — **phase 2** |

Rules: badges are **binary and permanent**, never expire, never downgrade. Locked
badges show as dim silhouettes with the unlock condition visible — the locked state
is the motivator and must be designed as carefully as the earned one.

## 5. Screen architecture (mobile-first, top to bottom)

1. **Streak hero** — Ember + day count + rank badge. Duolingo position: the first
   thing you see, above everything. Big.
2. **Next milestone** — named rank, its **benefit**, and a ring showing distance.
3. **Check-in strip** — today's state + 30-day dot grid.
4. **Badge case** — earned + locked. The collection.
5. **Paid to you** — hero number + cumulative area chart. The receipts.
6. **Asset rows** — one sparkline each (small multiples).
7. **Cohort survival** — "460 of 491 who started in August are still here."
8. **The mechanics** — fees, tranches, rebate, jackpot. Reference, moved down.

## 6. Component specs

**Streak hero.** Ember at the state matching the streak (`happy` high, `idle` mid,
`worried` when within 20% of the break line — that danger rule already exists in
`StreakTierCard`). Day count in Plex Mono, odometer roll on change, ~64px. Rank badge
beside it. Never a bar here — this is the identity object.

**Milestone ring.** Closed-loop progress beats a bar when the target is fixed and the
question is "how close" (Apple Fitness grammar). Centre holds days remaining. Label
names the rank **and its benefit**.

**Check-in strip.** 30-day dot grid — filled = checked in, hollow = missed, today
pulses if unclaimed. Plus **2 streak freezes** (tested finding: two beat one, three ≈
two, over-forgiveness kills the habit). Freezes apply to the *cosmetic check-in
streak only* — the on-chain hold streak can never have them.

**Badge case.** Grid of medallions, earned in full colour, locked as dim silhouettes.
Tap → sheet with the story, date earned, and how many holders have it (rarity is a
motivator). Newly earned badge fires a milestone moment (see §7).

**Charts.** Per `dataviz`: pick form from the data's job; **one axis, never dual**;
colour follows entity never rank; hover/scrub by default; dark mode is *selected*,
validated against the dark surface, not an auto-flip.

## 7. ⚠ The palette blocker — decide before building charts

Green and red are already doing **semantic** duty (gain/loss, safe/danger). Status
colours can never double as categorical series. **So the current palette cannot draw
a 6-asset dividend breakdown** — there is no legal way to separate NVDA from SPY from
GME.

**Decision: use small multiples.** One sparkline per asset, each in green, stacked as
rows. Fully on-brand, no palette change, costs vertical space. Do NOT add a rainbow.
If a stacked view later proves necessary, add a narrow categorical ramp and run
`scripts/validate_palette.js` before shipping it — never eyeball CVD safety.

## 8. Higgs asset brief

Use Higgs (Seedance / image models) for anything drawn. Ember reference handles are
already uploaded and should be reused so the character stays on-model:

- `@Image1` = `a1b472e7-ee07-4f0b-8011-fbfaec54241d` (front, lit)
- `@Image2` = `994cac3d-646a-49f1-80f0-7053980de986` (turnaround)

### Badge art direction — DECIDED: Ember in every badge

Every badge is **Ember performing the act the badge is for**, inside a circular
medallion. Not abstract forge iconography — Ember is the constant, the *action* is
the variable. This makes the set instantly ownable (nobody else has this character)
and readable without text.

Constants across all 18: circular medallion, consistent rim, Ember on-model from
`@Image1`/`@Image2`, warm near-black ground, green/mint palette only, same lighting
and camera distance so the set reads as a sheet. Must survive at 64px — one clear
silhouette, one prop, nothing fiddly.

**Locked state is derived, not generated** — CSS `grayscale(1) brightness(0.35)`
over the earned art. Halves the generation and guarantees the pair always matches.

**RANK — 6.** Ember plus the forge stage; the metaphor lives in the prop, never in
recolouring Ember (a grey Ember is not Ember).

| Badge | Ember is… |
|---|---|
| SPARK | newly lit, tiny, one ember mote rising above |
| IRON | holding a rough iron ingot in both small arms |
| STEEL | beside a polished steel beam throwing a green reflection |
| FORGED | on an anvil mid-strike, sparks flying off |
| TEMPERED | rising out of a quench trough, steam curling |
| DIAMOND | cradling a faceted diamond that refracts the glow |

**ACHIEVEMENT — 12.**

| Badge | Ember is… |
|---|---|
| WEEK ONE | beside 7 small filled dots |
| THIRTY | beside a full month grid |
| CENTURY | leaning on a carved milestone stone |
| YEAR ONE | inside a complete ring of 12 marks |
| FIRST DROP | catching a single falling coin in cupped arms |
| TEN DROPS | under a shower of coins, arms up |
| FULL BASKET | holding a basket with six distinct tokens |
| UNBROKEN | holding one intact chain link |
| OG | with a weathered explorer's map |
| FOUNDING 100 | planting a small flag in bare ground |
| IN THE DRAW | holding a single ticket |
| JACKPOT | erupting with light, arms up, confetti |

**Also generate:** Ember `triumphant` and `smug` — both are on the expression sheet
(`brand/ember/sheet-expressions.jpeg`) but have never been rendered as clips, and
they're exactly the rank-up and badge-unlock moments. Plus day-0 / no-dividends
empty states (`sleeping` works).

Keep all of it inside the palette — green/mint/near-black. No rainbow badges.

## 9. Data wiring

**`GET /api/badges?address=` is BUILT** (2026-08-19) and returns all 19 badges with
earned state, human progress on locked ones (`"32 / 60 days"`), plus the live tier
config and jackpot threshold so the dashboard needn't re-read them. **No new table** —
17 of 19 fall out of data that already existed. ~2s cold, fast after.

Verified against live wallets: a day-123 holder earns 13/19; a day-32 holder earns
7/19; a wallet that took a dividend then dumped keeps First Drop and loses everything
streak-based (the permanence property, working).

**Other existing sources:** `holderStatus` · `/api/holder-stats` ·
`/api/streak-history` · `/api/distributions` · `/api/checkin` (+ `checkins` table —
**still rendering nowhere**) · `/api/monthly-leaderboard` · `jackpot_history.json`.

**Still needs building:** per-asset dividend time series (only lifetime totals exist,
so §5's sparklines have no data behind them yet) · drawdown history for Held Through Red.

### Two corrections to earlier drafts

- **`epochCount` is 0.** The Distributor has never posted a merkle epoch — dividends
  are pushed directly by the keeper — so there are no `Claimed` events. Payout badges
  read the `distributions/*.json` records instead.
- **Founding N needs no database.** `holderList` is append-ordered, so an address's
  index *is* its join order; it's a membership test on the first N entries.
- **`REPAIR_WINDOW = 14 days` exists on the token** but is tied to `v1SnapshotTime`
  ("Base snapshot — repair floor") and is owner-only via `StreakAdminSet`. It is a
  one-time migration tool, **not** a user-facing streak freeze. §6 stands.

### The badge count is 19, not 18

Founding split into **Founding 100** and **Founding 1000** — same art, different rim
treatment, and it gives early holders two rungs instead of one.

### Tier constants are now read live

`ranks.ts` used to hardcode the ramp period and both prestige days. They're live
contract parameters, and this is the exact setup that made `jackpotMinStreakDays` go
stale when it moved 90 → 30. `ranksFor(tierConfig)` now builds the ladder from a
config read on-chain, with the verified values as fallback. Read from mainnet
2026-08-19 and matching: ramp 7,776,000s = 90d, prestige 180/365, 1.00x → 5.00x →
5.50x, bump 0.25x.

## 10. Hard constraints

- **Never imply checking in earns money.** The check-in streak is cosmetic; dividends
  come from holding only. Both streaks appear on this page — they must be visually
  and verbally distinct.
- Jackpot threshold is a **contract parameter** read live (`jackpotMinStreakDays`,
  moved 90 → 30 already). Never hardcode it to a rank.
- No chart library. Extend the hand-rolled SVG approach from `/leaderboard`.
- Every chart needs loading + empty states. A day-0 wallet must not see a broken plot.
- Mobile-first: scrub must work with a thumb, hit targets larger than the marks.
- Competitors are never named anywhere on the site.

## 11. Out of scope (phase 2)

Held Through Red · badge trading/showcasing · social/friend streaks · push
notifications · badge rarity leaderboard.
