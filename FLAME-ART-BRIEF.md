# FIRE Flame — Art Brief for Luma Labs

## What you're making

An evolving NFT collection for $FIRE on Robinhood Chain. Every holder gets one flame.
It climbs through **seven stages** as they hold (day 0 → day 365) and falls back to
stage one the moment they dump. The art has to carry that mechanic. This is **one flame
photographed at seven points in its life**, not seven different pictures. A holder who
sells watches their Mythic collapse back into an Ember — the continuum must read in both
directions, and the difference between stages must be legible at thumbnail size on a wall
of hundreds.

## The one law: palette

Signal green fire on warm near-black. That's the whole world.

- Fire and all light: **#00C805** (lifts toward **#7CFC9A** at the hottest cores)
- Canvas and shadow: **#110E08**. Every render sits on this. It is also the website
  background, so the art must melt into it edge-to-edge: no vignettes, no horizon glow.
- Highlight and the Crown only: warm white **#F5F3EE**
- Nothing else. No red, no orange, no blue flame, no purple, no gold. A cooled flame is a
  *dim green*, never a red one. If a frame reads as any color besides green-on-black, it's
  wrong.

Render style: premium dark 3D — soft matte clay bodies with molten green light inside,
moody rim light, wet reflection on the ground. Glow is welcome in the art (the site UI is
flat; the collection is where light lives). Tilt-shift miniature intimacy over epic scale.
Absolutely no text, numbers, letters, or logos in any frame.

## Identity: traits are fixed, stages change expression

Each token is one combination of the traits below, assigned at mint, **permanent through
all seven stages**. Evolution never swaps a trait. It renders the same identity more alive. Silhouette recognition is the test: cover the light, and stage 1 and stage 7 of the
same flame must still read as the same individual.

**FORM — the silhouette (6):**
| Name | Direction |
|---|---|
| Candle | single upright teardrop, the brand glyph itself — calm, monolithic |
| Twin | two licks sharing one base, curling toward each other |
| Serpent | one long S-curve lick, whip energy |
| Spire | tall, narrow, architectural — a green obelisk of fire |
| Monarch | wide, low, wings of flame — broadest silhouette |
| Feral | asymmetric, torn edges, sparks escaping — the unruly one |

**GROUND — what it burns on (4):** Obsidian (wet black mirror), Grid (faint green
terminal dots receding into dark), Ash (matte charcoal field, cracked), Vault (dark
polished stone slab).

**CORE — the heart visible inside the body (5):** Solid, Hollow, Molten, Prism (glass
facets), Signal (a slow pulse, like a heartbeat on a monitor).

**RELIC — an artifact fused into the flame (~15% of tokens, rest have none):** Diamond,
Bull Horn, Hourglass, Bell. Small, embedded, never larger than a quarter of the body.

## The cadence: seven stages, five dials

Every stage is defined by the same five dials. Move them exactly this much. The escalation curve is the product.

| Dial | What it controls |
|---|---|
| LIGHT | how much the flame emits vs absorbs |
| BODY | mass and opacity of the flame body |
| MOTION | implied movement — stillness → storm (in stills: particle count, edge tearing) |
| REACH | radius the light throws — how far into the black it claims |
| WITNESS | how much the ground/world responds — reflections, scorch, orbiting embers |

**Stage 1 · EMBER (day 0–6, and where sellers land).** A pilot light. LIGHT 10%: barely
self-illuminating, silhouette in near-dark, core faintly warm. BODY thin, translucent.
MOTION at zero, a held breath. REACH: light dies within its own outline. WITNESS: ground
almost invisible. Emotional read: *not dead — waiting.* This stage must still be
beautiful; it is the punishment stage and holders will screenshot it in shame. Make the
shame gorgeous.

**Stage 2 · KINDLED (day 7).** First real flame. LIGHT 25%. BODY solidifying at the base,
tip still ghosted. First single spark. REACH: a dim pool at the base. WITNESS: first hint
of reflection on the ground. Read: *it caught.*

**Stage 3 · FLAME (day 30).** The healthy burn. LIGHT 45%. BODY full and opaque, core
clearly visible for the first time — this is where the CORE trait becomes readable.
MOTION: steady, confident sway. REACH: ground trait fully legible in its light. Read:
*established.*

**Stage 4 · BLAZE (day 60).** Pressure building. LIGHT 65%. BODY dense, edges sharpening,
brightest values shifting toward #7CFC9A. MOTION: fast — licks tearing at the tip, ember
particles rising. REACH: light claims the lower frame. WITNESS: ground reflects hard;
Relic (if any) begins to glow independently. Read: *about to matter.*

**Stage 5 · INFERNO (day 90 — full tier, jackpot eligible).** The payoff stage and the
collection's default hero image. LIGHT 85%. BODY at maximum mass; core white-hot #F5F3EE
at its very center, the only stage before 6 where white appears. MOTION: roaring but
controlled. Power held, not wasted. REACH: the whole frame is lit from within the flame.
WITNESS: ground fully alive, embers orbiting. Read: *arrived.* The jump from 4 to 5 must
be the biggest single step in the ladder — day 90 is the mechanic's whole promise.

**Stage 6 · ETERNAL (day 180).** Past intensity into permanence. LIGHT holds at 85% but
*stills*: fewer particles, slower forms, glassier surfaces. The flame no longer flickers. It stands. Thin warm-white filaments trace the silhouette edge. WITNESS: the ground begins
to mirror-polish beneath it. Read: *this was never going anywhere.*

**Stage 7 · MYTHIC (day 365).** The world bends. LIGHT 100%, but the move is REACH and
WITNESS, not brightness: the environment orbits it, slow ember constellations circling,
ground reflecting a second inverted flame, faint green aurora at frame edges. BODY almost
liquid glass over molten core. Read: *a landmark, not a fire.* One per wallet will ever
be seen at this stage for a year — make it feel like that.

**Cadence rules:** 1→4 escalate primarily LIGHT and BODY. 5 is the great leap (all five
dials). 6→7 escalate REACH and WITNESS while MOTION *decreases* — seniority reads as
stillness, not spectacle. Never move a dial backward except MOTION after stage 5.

## The Crown (separate deliverable)

A weekly overlay for the top-100 leaderboard wallets, won and lost every Friday. A
floating ring of warm-white #F5F3EE light above the flame tip: thin, geometric, slightly
too perfect for the organic flame under it. Not gold, not jeweled, not a cartoon crown.
It must composite cleanly over any FORM at any STAGE, so deliver it as an isolated layer
with alpha at three heights (short/medium/tall silhouettes).

## Deliverables

- **Square 2048×2048.** Same camera for every render of an identity: centered, slight low
  angle, flame occupying ~55% of frame height, base at the same y-position in every stage
  (evolution must animate cleanly as a crossfade).
- **Layered, not flattened:** per-stage renders of each trait layer (FORM+CORE fused is
  fine; GROUND separate; RELIC separate; Crown separate) with alpha, so we composite the
  ~120-identity matrix server-side. Flat composites only for approval samples.
- **Motion (phase 2, your home turf):** per-stage 3–4s idle loops, plus one 2–3s
  *evolution* transition per stage boundary and one *collapse* clip (any stage → Ember,
  a single gut-punch exhale). These become share cards and the stage-up moment on the
  dashboard.
- Naming: `form-{name}_core-{name}_s{1-7}.png`, `ground-{name}_s{1-7}.png`,
  `relic-{name}_s{1-7}.png`, `crown-{short|med|tall}.png`.

## Pilot before matrix

Do not build the full matrix first. Deliver **three pilot identities across all seven
stages** for sign-off:

1. Candle / Obsidian / Molten / no relic — the canonical one
2. Monarch / Grid / Signal / Diamond — the loud one
3. Feral / Ash / Hollow / no relic — the stress test for silhouette continuity

Approval on these locks the dials; then the matrix is production, not exploration.

## Reference

Brand glyph family and palette: `public/brand/fire-glyph.svg`, `fire-mark-tile.svg` in
the repo; the live site (retirewithfire.org) is the canvas these will sit on. Tone
anchor: brokerage-premium with degen edge — "Friday close energy." The flame is money
that stayed.
