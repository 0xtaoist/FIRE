# $FIRE — Split-screen onboarding UGC

Ten spots, 9:16, ~12s each, Seedance 2.0. Brief: *show how easy it is to get paid
real stocks for holding a memecoin.*

**Split 50/50 by cast:** spots 1–5 are human UGC, spots E1–E5 put Ember in real
situations. The Ember half is the differentiator — nobody else on the chain has a
character, and Ember doing nothing while stocks pile up *is* the product in one image.

---

## THE GOVERNING IDEA — surface vs. engine

The split screen is not "person on top, app on the bottom." It's a **cross-section**:

> **TOP = the surface.** The meme. The movement. Crowd energy, green light on faces,
> how big this is getting. What it looks like from outside.
>
> **BOTTOM = directly underneath.** The RWA engine. Brass, vaults, certificates,
> conveyor belts, clearing houses. The machine that actually buys the stock.

That *is* the FIRE pitch in one frame — it looks like a memecoin, it's a dividend
machine underneath — and it's why the seam should never move or cut. The two panels
are the same moment at two depths.

**Stats live in the caption and the voiceover, never in the frame.** Seedance garbles
on-screen numbers, and a garbled number on a finance video is fatal. Verified figures
as of 8 Aug: **1,140 wallets** paid in the latest SPY drop, **34 distributions** to date,
**5 different stocks** paid (NVDA, TSLA, AMD, AAPL, SPY). Holder count 2,101 is from
26 July and should be refreshed before use.

### Ember reference handles

Uploaded to Higgs and reusable across every clip:

| Handle | Media ID | Source |
|---|---|---|
| `@Image1` | `a1b472e7-ee07-4f0b-8011-fbfaec54241d` | `public/ember/happy.jpg` — front, lit |
| `@Image2` | `994cac3d-646a-49f1-80f0-7053980de986` | turnaround strip cropped from `brand/ember/sheet-turnaround.jpeg` |

Pass them as `medias[].role = "image"`; the Seedance backend coerces to
`image_references` automatically.

Deliberate break from the July 23–24 batch, whose prompts all said "NOT a split
screen, NOT stacked panels." These are the opposite: two stacked panels running
at once, claim on top, proof on the bottom.

---

## The one hard limitation — read before generating

**Seedance cannot render readable interface text.** It garbles UI, numbers and
logos. The July batch worked around this by writing "no readable text" into every
prompt and reducing the phone to *a soft green notification glow*.

That workaround is fine for vibe spots. It is a problem for an **onboarding** spot,
where the whole promise is "look how simple the flow is" — garbled fake UI reads as
a scam, which is the exact objection this content exists to kill.

So there are two builds:

| Build | Bottom panel | When |
|---|---|---|
| **A — Hybrid (recommended)** | Real screen recording, composited under the AI top panel | Anything claiming to *show the product* |
| **B — Full generate** | AI, phone reduced to green glow, no readable text | Vibe/contrast spots where the app isn't the point |

Build A costs half the credits (only the top panel is generated) and is far more
convincing. Shot list for the real footage is at the bottom of this file.

---

## SHARED STYLE BLOCK

Paste **verbatim** into every clip — nothing carries between generations.

```
9:16 vertical, frame split into two equal stacked panels with a hard horizontal seam at the exact midpoint. BOTH PANELS RUN SIMULTANEOUSLY for the whole clip — never cut to full frame, never animate the seam. TOP PANEL: handheld phone camera, unstabilized micro-jitters, slightly compressed amateur quality. BOTTOM PANEL: locked-off, no camera movement. No captions, no readable interface text, no logos, no watermarks. Audio: real untreated voice, natural room tone, no music.
```

---

## SPOT 1 — "Two weeks ago"  ·  contrast  ·  Build B

Cheapest to make, hardest to argue with. No product shown, so nothing to garble.

```
[SHARED STYLE BLOCK]
@Image1 = a man in his early 30s in a plain grey crewneck, short dark hair, tired eyes.
TOP PANEL: @Image1 the man hunched too close to a laptop in a dark room at night, red and green chart light strobing across his face, jaw tight. He refreshes, refreshes again, drags a hand down his face. Cramped, airless, blue-red glow.
BOTTOM PANEL: @Image1 the exact same man, same crewneck, lying flat on a couch in warm afternoon light, eyes shut, completely still. His phone rests face-up on his chest. (0-5s) nothing happens. (5-8s) the phone glows soft green once, rising and falling. (8-12s) he does not open his eyes. One corner of his mouth moves, barely.
Both panels hold the full 12s, no cuts.
Audio: TOP — frantic mouse clicks, a hard exhale, laptop fan whine. BOTTOM — quiet room tone, a distant bird, one soft warm ping. His voice over both, flat and dry: (0-4s) "Two weeks ago I was doing this." (5-9s) "Now I do this." (9-12s) "Same money. Only one of them pays me in stocks."
```

---

## SPOT 2 — "There is no step two"  ·  walkthrough  ·  Build A

The core onboarding spot. Bottom panel = **real screen recording**, see shot list.

```
[SHARED STYLE BLOCK]
@Image1 = a woman in her late 20s, curly hair tied back, oversized hoodie, sitting on the floor against a bed, warm lamp light.
TOP PANEL ONLY — the bottom panel is supplied separately as @Video1 and must play untouched, unmodified and full-width beneath the top panel for the entire clip.
TOP PANEL: @Image1 the woman talks straight into the lens, dry and unbothered, one continuous take, no cuts. (0-4s) She holds up one finger: "Step one. You buy the coin." (4-6s) She holds up two fingers, then immediately drops her hand: "Step two—" (6-9s) Beat. She shrugs, deadpan: "There is no step two. That's the part people don't believe." (9-12s) She glances down at her phone off-frame, then back to the lens, eyebrows up: "Friday it just shows up. Actual stock. In the wallet."
Audio: her real dry voice, quiet bedroom room tone, a radiator tick, no music.
```

---

## SPOT 3 — "So you bought a meme coin"  ·  objection kill  ·  Build A or B

The skeptic does the selling. Strongest hook of the five.

```
[SHARED STYLE BLOCK]
@Image1 = a woman in her early 30s, dark bob, striped tee, arms folded, unimpressed.
@Image2 = a man in his early 30s in a plain white tee, same kitchen.
TOP PANEL: @Image1 the woman stands at a kitchen counter, arms folded, staring flatly off-camera at @Image2. (0-4s) Flat, not a question: "So you bought a meme coin." (4-8s) She keeps staring. Her eyebrow rises one millimetre. (8-10s) Her arms slowly unfold. (10-12s) She looks away, annoyed at herself, and mutters: "…okay that's actually different."
BOTTOM PANEL: a phone lying face-up on the same kitchen counter, locked-off overhead angle, warm evening light. (0-4s) dark screen. (4-8s) one soft green glow blooms, then a second, then a third, stacking. (8-12s) the glow keeps coming, lighting the countertop. No readable text on the screen at any point.
Audio: TOP — her real flat voice, a fridge hum. BOTTOM — three soft warm pings rising in pitch, then more overlapping. His voice off-frame between her lines, delighted: (5-8s) "It bought NVIDIA."
```

---

## SPOT 4 — "Day 1 / Day 90"  ·  the streak  ·  Build B

The split *is* the timeline. Direct video translation of the rank ladder.

```
[SHARED STYLE BLOCK]
@Image1 = a man in his late 20s, buzz cut, plain black tee, on a grey couch in the same living room in both panels.
TOP PANEL, labelled by content not text — DAY 1: @Image1 sits on the couch in flat daylight, phone beside him. (0-4s) he taps the phone once, sets it down, folds his arms. (4-8s) one small green glow, brief, almost nothing. (8-12s) he watches it fade and does nothing.
BOTTOM PANEL — DAY 90: @Image1 the exact same man, same tee, same couch, same framing, but warm evening light. (0-4s) he sits already folded-armed, motionless. (4-8s) his phone erupts — green glow after green glow after green glow, rapid-fire, lighting the whole couch. (8-12s) he slowly turns his head to the lens, completely deadpan, gives one tiny shrug, and turns back. The pings keep going.
Identical camera height and framing in both panels so the two days line up exactly.
Audio: TOP — room tone, one soft warm ping, a clock ticking. BOTTOM — the same clock, the same room, a cascade of overlapping warm pings. His voice over the seam, flat: (0-3s) "Day one." (5-8s) "Day ninety." (9-12s) "I did nothing in between. That's the whole strategy."
```

---

## SPOT 5 — "Eleven hundred wallets"  ·  social proof  ·  Build A

Uses a **real, verifiable number** — most recent SPY distribution paid 1,140 wallets.
Update the figure before shooting if a newer drop has landed.

```
[SHARED STYLE BLOCK]
@Image1 = a man in his mid-20s, headphones around his neck, dim desk-setup RGB glow at night, three monitors behind him.
TOP PANEL ONLY — the bottom panel is supplied separately as @Video1 and must play untouched, unmodified and full-width beneath the top panel for the entire clip.
TOP PANEL: @Image1 leans into the lens, conspiratorial, one continuous take, no cuts. (0-4s) Quiet, like he's letting you in on something: "Last payout went to eleven hundred and forty wallets." (4-8s) He leans back, spreads his hands: "Not one of them did anything to earn it." (8-12s) Deadpan, straight down the barrel: "They held. That's the entire job description."
Audio: his real low confident voice, mechanical keyboard clacks somewhere behind him, room tone, no music.
```

---

## Shot list — real footage for Build A bottom panels

Record on a phone, portrait, then crop to 1080×960 for the lower half.
Nothing here needs a real transaction except the last one.

1. **The buy** — retirewithfire.org → tap Buy → `/swap` → connect → enter an amount → confirm. Keep the wallet sheet in frame; that friction *is* the proof.
2. **Doing nothing** — lock screen, 3 seconds, phone face-down on a table.
3. **The payout** — wallet token list scrolling to show SPY / NVDA / TSLA / AAPL / AMD sitting in the wallet. This is the money shot and it has to be a real wallet.
4. **The dashboard** — `/dashboard`, streak and multiplier visible, scroll slowly once.
5. **Ember check-in** — the daily modal opening, day count rolling up, rank badge.

Stitch to 1080×1920 with the AI half on top:

```
ffmpeg -i top.mp4 -i bottom.mp4 -filter_complex \
  "[0:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[t]; \
   [1:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[b]; \
   [t][b]vstack=inputs=2[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 20 -pix_fmt yuv420p out.mp4
```

---

## Copy rules — do not break these

- **Never imply checking in earns anything.** The check-in streak is cosmetic. Dividends
  come from holding, and only from holding. Spot 4 is about the *hold* streak, not check-ins.
- **No amounts, no yields, no "returns."** "Real stocks show up" is fine. "$X a week" is not.
- **Never name a competitor.** Standing directive. "Every other coin here" is as close as it goes.
- **The jackpot winner does not choose the stock.** Cut any line that implies it.
- "Free stocks" is loose — nobody hands out equity. It's funded by trading fees, so
  *"you get paid in real stocks for holding"* is both accurate and a better line.
