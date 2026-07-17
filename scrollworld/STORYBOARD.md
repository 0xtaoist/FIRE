# $FIRE Scrollworld — Higgsfield storyboard

Hand this to Claude Code with the `scroll-world` plugin installed
(`/plugin marketplace add oso95/scroll-world`, `/plugin install scroll-world@scroll-world`).
Requires: Higgsfield CLI authenticated with credits, ffmpeg/ffprobe, Python3+Pillow.
The engine + mount template are in this folder (`scrub-engine.js`, `index-template.html`).

## Intake

- SUBJECT: $FIRE — a dividend token on Robinhood Chain that pays holders in tokenized
  stocks (SPY/NVDA); the longer you hold, the bigger your cut; Friday jackpot.
- BRAND_NAME: $FIRE
- PALETTE: near-black `#110E08` (background), robin green `#00C805` (accent),
  warm white `#F5F3EE`, warm surface `#1A1610`, umber `#221D15`. Red `#FF5000`
  appears ONLY in scene 3 (the reset moment). No gradients, no other saturated color.
- TONE: brokerage-statement premium with degen edge — "Friday close energy"
- STYLE: **Neon night** variant — "Isometric miniature at night, warm interior glow and
  green terminal-signage light, moody rim light, wet reflective ground." Keep the no-text
  tail verbatim. Identical preamble across all 6 stills.
- MOBILE: yes (native 9:16 chain — hero must be flawless at 390px)
- VIDEO_TIER: standard (seedance_2_0)
- STILLS_SOURCE: higgsfield

## Style preamble (verbatim in every still)

```
Isometric miniature at night, warm interior glow and green terminal-signage light, moody
rim light, wet reflective ground, floating as a small rounded island on a plain solid
#110E08 background with a soft contact shadow beneath it. Soft matte clay 3D render,
rounded toy-model shapes, tilt-shift miniature look. Cohesive color palette of near-black
#110E08, signal green #00C805, warm white #F5F3EE, warm umber #1A1610. Highly detailed,
centered composition, absolutely no text, no letters, no numbers, no logos.
```

## SECTIONS[] (camera order)

1. `hold` — **The trading floor at night.** A tiny glass brokerage office glowing green;
   one figure calmly seated at a terminal while a green line-chart ridge rises out of the
   roof and trails off the island like a mountain range. Eyebrow: LIVE ON ROBINHOOD CHAIN.
   Title: "Get paid in stocks for staying." Body: Dividends accrue from day one — claim
   whenever. Tags: No minimum · From day one.
   Dive focal point: the seated holder's glowing terminal.
2. `accrue` — **The dividend machine.** A miniature mint/factory: coins fall into a
   funnel on one side, tiny stock certificates ride a conveyor out the other; storage
   vault with SPY/NVDA-ish crates (no letters). Eyebrow: THE MACHINE. Title: "Every paper
   hand funds yours." Body: Exit fees convert to tokenized stock in daily batches.
   Mid-leg move: low lateral track alongside the conveyor.
3. `streak` — **The 90-day road.** A winding elevated road with 90 tiny milestone posts
   climbing a ridge; one broken side-exit ramp falls away into red hazard light (the only
   red in the world) where a figure slid back to the start. Eyebrow: THE RULES.
   Title: "Sell big, start over." Body: Streak resets to zero — the exit fee pays
   everyone who stayed. Mid-leg move: rise-and-swoop over the road.
4. `jackpot` — **Friday close.** A miniature exchange tower with a giant analog clock
   face at 4:00, a glowing green vault-pot at its base, spotlights, one figure holding
   the pot aloft. Eyebrow: EVERY FRIDAY. Title: "One diamond hand takes the pot."
   Body: Winner takes all — and picks next week's stock. Mid-leg move: crane-up reveal.
5. `proof` — **The drawdown canyon.** The chart-ridge plunges into a deep canyon and
   climbs out the far side; 54 tiny lit tents camped along the canyon floor holding
   through the storm. Eyebrow: THE HOLDER BASE. Title: "Proven before you got here."
   Body: 54 of the top 100 held through a 92% drawdown. Tags: as of v1 snapshot.
6. `fire` — **Hero finale.** Drop the island framing: a single oversized abstract flame
   glyph (smooth teardrop with a crescent negative-space cut — see `assets/brand/mark-clean-b.svg`)
   floating in soft #110E08 space, rim-lit green, a few small orbiting coin/certificate
   props. Eyebrow: $FIRE. Title: "The market pays whoever stays." CTA: Buy $FIRE.

## Notes

- Connectors per prompts.md: pull up out of scene i, glide across the connected
  night-world, descend to scene i+1. Last connector dissolves the world toward the
  giant flame glyph.
- The in-code scrub page (`../V3 Scrollworld.dc.html`) uses the same 6 beats in the same
  order — generated clips replace the code-rendered canvas scene-for-scene via
  `index-template.html` + `scrub-engine.js` config.
- Keep the identical preamble byte-for-byte; check each leg's last frame reads as a calm
  forward glide before rendering the next.
