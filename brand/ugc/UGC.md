# $FIRE UGC Content — "Found Stocks in My Wallet"

Drafted 2026-07-23. Companion to `../characters/ember/COMMERCIALS.md`. Where the commercials are polished, UGC is deliberately unpolished: vertical 9:16, selfie-cam energy, compressed audio, real reactions. Core format: **split screen — buying FIRE early vs. finding NVIDIA/SPY in your wallet later.** The product is the punchline; nobody explains mechanics.

**Rules of the format**
- Hook lands in the first 1.5 seconds, always as confusion or disbelief, never as a pitch.
- The word "NVIDIA" (or "SPY") does the heavy lifting — a boomer-credible stock appearing in a crypto wallet is the whole joke.
- Never say APY, yield, or tokenomics. Say "there's literally Nvidia in my wallet."
- Every clip that shows an account value carries the site's `Illustrative` chip (compliance).
- Ember appears only as a sticker/emoji overlay in UGC (👻→🔥), never as a rendered character — UGC should feel user-made, and users don't have the 3D asset.
- Production path: Higgsfield UGC presets (talking-head flows) for faces + screen-recordings of the v3 site phone for the app halves; split-screen assembled in edit.

---

## Format A — "Why is there NVIDIA in my wallet??" (flagship)
**Split screen: THEN (top) / NOW (bottom).**
- Top, labeled `3 WEEKS AGO`: grainy screen-recording of buying $20 of FIRE, thumb tap, done, casual.
- Bottom, labeled `TODAY`: selfie cam in a car — "Yo. YO. Why is there NVIDIA in my wallet. I bought a MEMECOIN." (zooms phone to the wallet row)
- Caption: `i did literally nothing 😭` · Concept stills: jobs `120ee74e-6897-4902-bf9e-5ecf5827a385`, `137930e2-29e7-4659-8cd8-7278e9fd410b`.
- **Produced v1 (2026-07-23, 12s 9:16):** selfie half job `12f141a0-dbac-4a99-96b1-bc4ce5d32d7f` ([mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_073612_12f141a0-dbac-4a99-96b1-bc4ce5d32d7f.mp4), Seedance 2.0 with spoken dialogue, identity locked to the concept still) + buy half job `6a4dd0c1-e435-4241-a302-025762a98da1` ([mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_073615_6a4dd0c1-e435-4241-a302-025762a98da1.mp4)); assembled with ffmpeg (vstack, top half frozen after 6s, PIL caption overlay with labels + green bubble, audio from selfie half). Known issue: the AI buy-half has garbled app text outside the FIRE/BUY row — for shipping, replace the top half with a real screen recording of the v3 site phone (always the plan; AI half is the animatic stand-in).

## Format B — "POV: you forgot you bought it"
Single take, screen-recording led. POV scrolls their wallet looking for something else, stumbles on accumulating SPY fractions with timestamps. Deadpan VO: "when did I… oh. OH." Cut to face. Caption: `the faerie remembered even if i didn't 🧚🔥`

## Format C — Duet: "My broke friend owns Nvidia now"
Duet/side-by-side format. Left: friend A's original clip flexing the wallet row. Right: friend B reacting — "bro cannot afford lunch and he's an NVDA shareholder??" Ends with B downloading. Two creators, one edit — cheap collab format.

## Format D — "I get paid to do nothing" (Dave, UGC edition)
Timer overlay counts 8 hours in 15 seconds while the person visibly does nothing (couch, fishing, staring at wall). Each timer milestone = a wallet ping screenshot flash. Caption: `day 47 of earning stocks by being unemployed at the charts`

## Format E — "Explaining the stock faerie to my mom"
FaceTime-style recording: creator explains "so there's a faerie… and if I don't sell… she brings me stocks." Mom's silence. Mom: "…so like a 401k?" Creator: "…kind of?" Overlay: 🔥🧚 sticker. This one carries the Ember lore into UGC without needing the 3D asset.

## Format F — "The Friday one" (jackpot adjacent)
Split screen: left, creator's normal Friday (laundry, bus, shift work); right, the jackpot counter climbing on the site. Last 2s: push notification lands — they freeze. Cut to black before the reaction. Caption: `see you friday 🎰🔥` (cliffhanger drives comments; reaction posts as the follow-up.)

---

## Hooks bank (first-1.5s lines)
- "Why is there NVIDIA in my wallet."
- "I bought a memecoin and it's paying me in the S&P."
- "My wallet has better stock picks than my dad."
- "POV: your shitcoin is the responsible one."
- "I've done nothing for 30 days straight. Financially, that's my best month ever."
- "A faerie gives me stocks. I'm not explaining it again."

## Production notes
- Faces: Higgsfield UGC/talking-head presets or `soul_2` stills → image-to-video; keep 720p, slightly compressed export — polish kills the format.
- App halves: screen-record the real v3 scrollworld phone (`sw-toast` beat) — same asset the commercials use.
- 15s cuts primary (TikTok/Reels/Shorts), 9:16 only.
- Post cadence idea: Format A to launch, B/D as weekday filler, C as collab, F every Friday morning, E when lore lands.
