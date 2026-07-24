# $FIRE UGC Content — "Found Stocks in My Wallet"

Drafted 2026-07-23. Companion to `../characters/ember/COMMERCIALS.md`. Where the commercials are polished, UGC is deliberately unpolished: vertical 9:16, selfie-cam energy, compressed audio, real reactions. Core format: **split screen — buying FIRE early vs. finding NVIDIA/SPY in your wallet later.** The product is the punchline; nobody explains mechanics.

**Rules of the format**
- Hook lands in the first 1.5 seconds, always as confusion or disbelief, never as a pitch.
- The word "NVIDIA" (or "SPY") does the heavy lifting — a boomer-credible stock appearing in a crypto wallet is the whole joke.
- Never say APY, yield, or tokenomics. Say "there's literally Nvidia in my wallet."
- Every clip that shows an account value carries the site's `Illustrative` chip (compliance).
- Ember appears only as a sticker/emoji overlay in UGC (🔥), never as a rendered character — UGC should feel user-made, and users don't have the 3D asset. Never call it a faerie — it's just FIRE.
- Production path: Higgsfield UGC presets (talking-head flows) for faces + screen-recordings of the v3 site phone for the app halves; split-screen assembled in edit.

---

## Format A — "Why is there NVIDIA in my wallet??" (flagship)
**Split screen: THEN (top) / NOW (bottom).**
- Top, labeled `3 WEEKS AGO`: grainy screen-recording of buying $20 of FIRE, thumb tap, done, casual.
- Bottom, labeled `TODAY`: selfie cam in a car — "Yo. YO. Why is there NVIDIA in my wallet. I bought a MEMECOIN." (zooms phone to the wallet row)
- Caption: `i did literally nothing 😭` · Concept stills: jobs `120ee74e-6897-4902-bf9e-5ecf5827a385`, `137930e2-29e7-4659-8cd8-7278e9fd410b`.
- **Produced v1 (2026-07-23, 12s 9:16):** selfie half job `12f141a0-dbac-4a99-96b1-bc4ce5d32d7f` ([mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_073612_12f141a0-dbac-4a99-96b1-bc4ce5d32d7f.mp4), Seedance 2.0 with spoken dialogue, identity locked to the concept still) + buy half job `6a4dd0c1-e435-4241-a302-025762a98da1` ([mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_073615_6a4dd0c1-e435-4241-a302-025762a98da1.mp4)); assembled with ffmpeg (vstack, top half frozen after 6s, PIL caption overlay with labels + green bubble, audio from selfie half). v1's AI buy-half had garbled app text; **v2 (final direction)** replaces it with a fully synthetic Rabby-wallet-format swap screen rendered in PIL (dark navy, account row + address pill, RH Chain pill, From ETH 0.50 → To FIRE 1,250,000, blue Confirm Swap → pressed → green Swapped ✓ + '+1,250,000 FIRE received' toast) — three PNG states animated in ffmpeg, 100% real text, zero AI UI. State sources: `rabby1/2/3.png` (regenerable from the script in session log). Wallet deliberately unbranded — Rabby layout, no Rabby name/logo. **v3 (2026-07-23):** selfie half re-recorded for pronunciation — creator said "mem", corrected to MEEM via explicit phonetic note in the dialogue prompt (job `af1227bb-3e03-47e0-bc7d-6da853bede3c`, [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_182828_af1227bb-3e03-47e0-bc7d-6da853bede3c.mp4)); reassembled with the v2 wallet top. **v4:** fixed halved-video bug — the v3 selfie render came back as a stacked two-panel video (Seedance mirrored the split-screen reference composition), so the center crop sliced across panels; fix crops the top panel only (crop=1028:960:26:0 → scale 1080x1008). Lesson for cluster renders: when using the split-screen concept still as identity reference, tell the model 'single full-frame shot, NOT a split screen' or reference a face-only crop instead. **v5 (final):** line changed to "All I did was buy FIRE" (kills the meme-pronunciation problem entirely — v4 said 'meem cun'); rendered from a clean single-frame reference of the v1 selfie with explicit NOT-split-screen instruction, job `aef3813b-7267-41fb-8249-5c91ac84a56a` ([mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_190945_aef3813b-7267-41fb-8249-5c91ac84a56a.mp4)). Saying the ticker in the punchline is also just better marketing. Rule: avoid the word 'meme' in ALL spoken VO going forward.

## Format B — "POV: you forgot you bought it"
Single take, screen-recording led. POV scrolls their wallet looking for something else, stumbles on accumulating SPY fractions with timestamps. Deadpan VO: "when did I… oh. OH." Cut to face. Caption: `FIRE remembered even if i didn't 🔥` (v2 caption; v1 said "the faerie remembered" — superseded per terminology rule)

## Format C — Duet: "My broke friend owns Nvidia now"
Duet/side-by-side format. Left: friend A's original clip flexing the wallet row. Right: friend B reacting — "bro cannot afford lunch and he's an NVDA shareholder??" Ends with B downloading. Two creators, one edit — cheap collab format.

## Format D — "I get paid to do nothing" (Dave, UGC edition)
Timer overlay counts 8 hours in 15 seconds while the person visibly does nothing (couch, fishing, staring at wall). Each timer milestone = a wallet ping screenshot flash. Caption: `day 47 of earning stocks by being unemployed at the charts`

## Format E — "Explaining FIRE to my mom"
FaceTime-style recording: creator explains "so there's this little fire… and if I don't sell… it brings me stocks." Mom's silence. Mom: "…so like a 401k?" Creator: "…kind of?" Overlay: 🔥 sticker. Carries the Ember lore into UGC without needing the 3D asset.

## Format F — "The Friday one" (jackpot adjacent)
Split screen: left, creator's normal Friday (laundry, bus, shift work); right, the jackpot counter climbing on the site. Last 2s: push notification lands — they freeze. Cut to black before the reaction. Caption: `see you friday 🎰🔥` (cliffhanger drives comments; reaction posts as the follow-up.)

---

## Production log — Formats B–F v1 (2026-07-23)

All faces Seedance 2.0 (native spoken audio where scripted); all UI/counters/captions synthetic PIL + ffmpeg, zero AI text. Assembled 9:16 1080p.

- **B (14s):** wallet scroll (synthetic token list w/ NVDA+SPY dividend rows, `wallet-scroll` asset) → couch reaction. Face job `7907a5a1-ec83-4fc3-a76d-d4135b07f9be` ([mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_080315_7907a5a1-ec83-4fc3-a76d-d4135b07f9be.mp4))
- **C duet (8s):** hyped flex left `aeb56b98-0478-456a-8382-e1bf7910bae3` ([mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_080356_aeb56b98-0478-456a-8382-e1bf7910bae3.mp4)) + laughing reaction right `6d17c4e8-364e-4ef7-a7da-7422c126f64b` ([mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_080404_6d17c4e8-364e-4ef7-a7da-7422c126f64b.mp4)), audio staggered.
- **D (12s):** motionless couch guy `0d21f0ad-24b0-4dda-8942-e10d39696d14` ([mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_080327_0d21f0ad-24b0-4dda-8942-e10d39696d14.mp4)) + 6-state timer/ping overlays.
- **E (12s) v2:** kitchen explainer re-recorded without the word faerie ("So there's this little fire… it brings me stocks") job `ac3bb66f-da29-403e-8092-af813bea62c0`; v1 (said faerie, superseded) `275a60d0-ea7c-4f7e-a9d8-3fadee56b270` ([mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_080418_275a60d0-ea7c-4f7e-a9d8-3fadee56b270.mp4)) + silent mom webcam PiP `3d6a82ac-aa2b-4e85-b5bf-74be3497864e` ([mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_080942_3d6a82ac-aa2b-4e85-b5bf-74be3497864e.mp4)) + FaceTime chrome.
- **F (11s):** laundromat left `84134237-688d-46c5-9b3f-3cd49fbc557e` ([mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_080959_84134237-688d-46c5-9b3f-3cd49fbc557e.mp4)) + jackpot counter half-panels climbing $81,204→$83,105, eligibility push notification at 8s, cut to black.

Reusable synthetic assets in `wallet-ui/` and session scratch: wallet-scroll, jackpot panels, FaceTime chrome, timer states, caption cards.

## Hooks bank (first-1.5s lines)
- "Why is there NVIDIA in my wallet."
- "I bought a memecoin and it's paying me in the S&P."
- "My wallet has better stock picks than my dad."
- "POV: your shitcoin is the responsible one."
- "I've done nothing for 30 days straight. Financially, that's my best month ever."
- "There's a little fire in my wallet and it buys me stocks. I'm not explaining it again."

## Production notes
- Faces: Higgsfield UGC/talking-head presets or `soul_2` stills → image-to-video; keep 720p, slightly compressed export — polish kills the format.
- App halves: screen-record the real v3 scrollworld phone (`sw-toast` beat) — same asset the commercials use.
- 15s cuts primary (TikTok/Reels/Shorts), 9:16 only.
- Post cadence idea: Format A to launch, B/D as weekday filler, C as collab, F every Friday morning, E when lore lands.


---

## Wave 2 roadmap (research-driven, planned 2026-07-23)

Derived from `RESEARCH.md` initial sweep. Ordered by expected impact.

### W2-1. The Cluster Launch — "NVIDIA in my wallet" template pack (Polymarket play)
Format A is not one video; it's a TEMPLATE. Produce 6–8 variants with different creators/settings (car, dorm, gym locker room, kitchen, night shift break room, parked bike) — identical hook line, identical caption, same wallet-UI top half from `wallet-ui/`. Post across accounts within a 48h window so the algorithm reads it as a trend, not an ad. Deliverable: hook template one-pager + variant renders.

### W2-2. The Daily Serial — "Day N of doing nothing" (day-counter meta)
Format D becomes an actual series: same guy, same couch, timer overlay grows daily. Milestones write themselves: Day 30 tier-up ping, Day 60 red dip he doesn't react to, Day 90 the phone won't stop pinging. Batch-render 5 episodes at a time; post daily at the same hour.

### W2-3. Ember Emotional Micro-Shorts (Pudgy play — brand, not conversion)
5–8s square loops, ZERO mechanics talk, pure feeling; GIF-able and sticker-able: Ember watching rain on the window; glow syncing to a slow heartbeat; hugging the phone like a teddy; Friday wiggle of anticipation; dip flinch → recover → tiny determined face. Distribution: Telegram stickers, GIPHY upload (Pudgy's 100B-view channel), X replies.

### W2-4. The Infinite Zoom (Coinbase F1 play — one hero craft asset)
Single continuous zoom into the flame glyph: inside are hidden candlesticks, tiny Pete mid-panic, the jackpot counter, the RH Chain pill, Ember asleep on a vault — ends on the wallet toast. Comments do the marketing ("did anyone catch the paper hands at 0:04?"). One expensive asset, launch week only.

### W2-5. "How I bought it" (meme-coin how-to loop)
10s screen-record from the `wallet-ui/` kit: swap flow, confirm, toast — deadpan VO, no hype. The proven memecoin conversion loop, but compliance-clean.

### W2-6. Lifestyle Dividends — "checking my dividends from ___" (Binance play)
3-shot formula: place (summit / beach / bus / break room), 2s phone glance, toast ping, back to life. Process-not-portfolio; the phone is incidental, the life is the content.

### W2-7. "The only honest one on fintok" (compliance-as-content)
Creator reads our Illustrative chip out loud, mocks yield-promising finfluencers ("sir this is a projection"). Rides the 75%-of-fintok-is-misleading news cycle; positions FIRE as the clean one.

Production notes: W2-1/2/5 reuse existing kits (cheap, start now); W2-3 uses the Ember prompt bible; W2-4 is the one big-ticket render. Pronunciation rule for all VO: "meme" = MEEM (rhymes with team) — spell it "MEME coin" with the pronunciation note in every dialogue prompt.


---

## Wave 2 shot list (brainstormed 2026-07-23 off top-performing research patterns)

Each maps to a proven winner from RESEARCH.md. All spoken VO avoids the word "meme" (TTS mangles it); the ticker line "All I did was buy FIRE" is the standard punchline.

1. **Cluster pack ×6** (Polymarket clusters): the v5 script re-shot in 6 settings — gym locker room, dorm desk, kitchen counter, night-shift break room, dog walk, drive-thru line. Identical beat: double-take → "Why is there NVIDIA in my wallet? All I did was buy FIRE." → "I did literally nothing." Ship from official accounts (WSJ guardrails), 48h window.
2. **"Day N" pilot week ×5** (day-counter serial): same couch/hoodie. D1 buys $20 + sets phone down; D7 first crumb ping; D30 tier-up smirk; D60 red day — does nothing *harder*; D90 phone won't stop pinging. Post daily, same hour.
3. **Ember feels ×6** (Pudgy play, 1:1 5-8s loops, no words): rain on the window; glow syncing to a heartbeat; hugging the phone like a teddy; Friday anticipation wiggle; dip flinch→recover→tiny determined face; falling asleep mid-chart. GIPHY + Telegram stickers.
4. **Confessional story-time** (talking-head = #1 finance format): "My financial advisor asked what I've been doing differently… I said: nothing. Literally nothing." 20s deadpan.
5. **Terminal-Dark infographic reel** (25–40 explainer lane + compliance): "$20 of FIRE. 90 days. Here's exactly what landed." Odometer counters, naked line chart, mono type, Illustrative chip front and center.
6. **"Portfolio red, dividends green"** (meme-stock mania timing — post THIS week): screens bleeding red everywhere, guy calmly sips coffee, one green dividend ping. 
7. **Native-context embeds** (Polymarket's real trick): rest-day gym content ("rest day = pay day"), game-day couch content ("while you watched, your wallet worked") — dividends inside content people already watch.
8. **Duet-bait solo** ("my broke friend" inverted): post the flex clip alone with caption "duet this if your wallet doesn't pay you."
9. **Infinite-zoom teaser** (Coinbase craft play): 15s zoom into the flame — hidden Pete, jackpot counter, candlesticks — ends on the toast. Comment-bait: "what did you find at 0:07?"
10. **"Reading the fine print"** (compliance-as-content): creator puts on reading glasses, dramatically reads the Illustrative chip out loud. "The only honest one on this app."


## Production log — Wave 2 batch 1 (2026-07-23)

User greenlit W2 items: Day-N serial, Ember feels, confessional, native embeds, duet-bait, infinite zoom. (Cluster pack and infographic/red-day declined.) All Seedance 2.0 std 1080p; VO avoids the word "meme" per pronunciation rule.

**Day-N serial (couch guy identity locked to `67899d79` ref frame from Format D):**
- Ep DAY 1 `c5f335dc-3273-4424-8aa2-4bf31ea290a8` · [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_193127_c5f335dc-3273-4424-8aa2-4bf31ea290a8.mp4)
- Ep DAY 7 `e656e4bf-c157-4a30-9443-e30761ef17f9` · [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_193131_e656e4bf-c157-4a30-9443-e30761ef17f9.mp4)
- Ep DAY 30 `b18f51a4-6e45-4983-a762-6eadce10f6a8` · [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_193135_b18f51a4-6e45-4983-a762-6eadce10f6a8.mp4)
- Ep DAY 60 (red day, label in loss-red) `54639020-9ec9-4e26-9c0f-3b2a20c55611` · [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_193139_54639020-9ec9-4e26-9c0f-3b2a20c55611.mp4)
- Ep DAY 90 `991d511f-3224-478a-b7f0-c035283bcb04` · [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_193158_991d511f-3224-478a-b7f0-c035283bcb04.mp4)
- Assembled with PIL DAY-N label overlays (green; DAY 60 red).

**Ember feels ×6 (1:1, 6s, wordless, canon render identity):** rain `52381b9a`, heartbeat `7875ec05`, phone hug `778f29c1`, Friday wiggle `9c003516`, dip flinch-recover `b92c85c3`, asleep `677d2188`.

**Confessional** ("My financial advisor called…") `5cf40bbe-658e-42f4-8f42-fe2e59b1dcab` · [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_192532_5cf40bbe-658e-42f4-8f42-fe2e59b1dcab.mp4)

**Native embeds:** gym rest-day ("Rest day. Pay day.") `d1665fb0` · [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_193202_d1665fb0-e57f-4014-9425-21d58b551e4d.mp4); game-day couch `560285c7` · [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_193207_560285c7-5b36-466d-99ea-b0ebf9aabf0b.mp4)

**Duet-bait:** existing flex clip + "duet this if your wallet doesn't pay you" caption card (no new generation).

**Infinite zoom:** two renders flagged nsfw by the platform filter (false positives — wording like "pushes into / mid-panic figurine" suspected); third attempt rephrased as "macro product film, lens magnification increases" — SUCCEEDED: job `73d0a4bf-f398-40d8-8bb3-8c1dec7e1c1d` · [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_194923_73d0a4bf-f398-40d8-8bb3-8c1dec7e1c1d.mp4). **v2 (2026-07-24, current):** logo corrected per user — v1 used the old candlestick-flame draft; v2 uses the ACTUAL site logo (`public/brand/fire-glyph.svg`, rendered to PNG via headless Chromium, media `8b33a093-db44-456a-92a8-7d05597bb682`): job `3aac6538-e661-47fc-a0ff-ce1486136ffc` · [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260724_032125_3aac6538-e661-47fc-a0ff-ce1486136ffc.mp4). Rule: ALL future logo-based generations reference the fire-glyph render, not brand/drafts. Lesson: avoid "push into", "dives", "panic" in VFX prompts.
