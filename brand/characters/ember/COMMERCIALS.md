# Ember Commercials — 30-Second Cuts

Brainstorm locked 2026-07-23. Premise for all spots: **Ember is the stock faerie** — she delivers shares to $FIRE holders the way the tooth fairy delivers coins. Lore root: the vision of making every American an owner (Vlad's thesis; never named on-screen). Product truth: $FIRE = a hedged bet into stocks + a bet on Robinhood-chain performance.

**Shared production spine**
- The product shot in every spot is the website's iOS phone (`src/app/v3/page.tsx` scrollworld phone, 402×874 frame in `src/components/fire-v3/ios-frame.tsx`): FIRE dividend account, live SPY/NVDA rows, the `+0.214 NVDA received` toast, the claim flow. Ad and site share one visual language.
- Ember animates via image-to-video from `hero.webp` per the EMBER.md prompt bible; the **glow system** carries emotion (dims on dips, flares at day 90).
- All on-screen numbers/type are composited real IBM Plex Mono (never AI-rendered); carry the site's "Illustrative" chip on account values for compliance.
- Endcard family (mono type on `#110E08`): `OWN FIRE.` → `Earn stocks without doing anything.` → `Let Ember change your life.`
- 30s ≈ 3–4 Higgsfield clips (≤10s each) + UI screen-capture + composited endcards.

---

## A. "While You Sleep" — hero spot
Tooth-faerie structure. Night across America: a nurse, a mechanic, a student asleep (cast energy from `../archive/friday-winners.webp`). Ember drifts window to window like a firefly and taps each nightstand phone — the site's toast pings `+0.214 NVDA received` in the dark. Last house: she settles on the pillow's edge and dims to a cozy night-light ember.
- VO: "The stock faerie doesn't grant wishes. She delivers shares."
- Close: phone UI claim → endcard family.
- Beats: 0–6 night establishing / 6–20 three deliveries (escalating toast amounts) / 20–26 pillow dim / 26–30 UI + endcard.

## B. "The Ownership Fairy Tale" — vision spot
Bedtime storybook opens: "Once upon a time, only some people owned things." Gray city of renters on the page. Ember flies OUT of the book, sprinkles candlestick-sparkles over the city; windows light green one by one as toasts ping across a thousand phones.
- VO: "Someone dreamed every American could be an owner. So we built the faerie who delivers it."
- The Vlad thesis, unnamed on-screen (brand rule + legal simplicity).
- Beats: 0–8 book / 8–22 flight + city lighting up / 22–30 phone UI + endcard.

## C. "Do Nothing" — deadpan comedy
Dave lies in a hammock for 30 straight seconds. Around him Ember WORKS: hauls tiny SPY sacks, stamps dividend slips, pushes fractions into his phone; timestamped mono counters tick up.
- VO: "This is Dave. Dave is earning stocks. Dave is doing… nothing." (beat) "Keep it up, Dave."
- Endcard: "Earn stocks without doing anything."
- Serializable: Dave fishing, Dave in a waiting room, Dave watching paint dry.

## D. "The Hedge" — product explainer
Ember floats between two glass panes — left SPY/NVDA tickers, right Robinhood-chain crypto candles — and braids one green thread from each side into her own flame. Phone UI shows both living in one account.
- VO: "One token. A hedged bet into stocks — and a bet on the fastest-growing chain in finance."
- Close: "Own the hedge. Own FIRE."
- This is the spot that carries the dual-exposure thesis; keep it to ONE metaphor (the braid).

## E. "90 Days" — emotional anthem
One holder, match-cut on a mono day counter. Day 1: first tiny toast. Day 30: first full SPY fraction. Day 60: red dip — Ember on his shoulder dims BUT STAYS. Day 90: she flares to full brightness — max tier, Friday jackpot draw.
- Nearly silent until the close: "Let Ember change your life."
- The glow system IS the narrative arc here.

## F. "Phone on the Table" — cheap social cut (make this first)
One static shot: a phone on a diner table running the actual site UI while blurred life happens around it. Toasts keep arriving. Nobody touches the phone. Final second: Ember's reflection appears tiny in the screen glass and winks.
- Production: screen-record the v3 scrollworld phone + one Ember composite clip. Near-zero cost, proves the ad language, doubles as the site's own OG/social video.
- 15s and 30s cuts from the same take.

---

## Production log — 2026-07-23 first render pass (Seedance 2.0, std, 1080p, native audio)

All clips: shared style block verbatim, `@Image1` = Ember canon render (`9911111c-2b45-46c9-998e-61a0e6fe026d`) via image_references, one action per beat, no AI-rendered UI text (real UI composited in edit).

| Clip | Job | MP4 |
|---|---|---|
| A1 — suburb firefly flight (10s) | `67c8698a-92bb-4f8c-9a77-cdfffd16f066` | [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_064950_67c8698a-92bb-4f8c-9a77-cdfffd16f066.mp4) |
| A2 — nightstand delivery, nurse (10s) | `9df156f2-6814-4e03-9195-01a860464f1a` | [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_064954_9df156f2-6814-4e03-9195-01a860464f1a.mp4) |
| A3 — pillow night-light dim (10s) | `9d554a30-8ab8-4ba8-a039-e5f57caeadc2` | [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_064927_9d554a30-8ab8-4ba8-a039-e5f57caeadc2.mp4) |
| F1 — diner table, screen-glass wink (8s) | `db6eb992-12bf-4f1a-90e5-11a64fc58ddb` | [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3F0bg3gqnKNYI7531IfsTzvahFf/hf_20260723_064958_db6eb992-12bf-4f1a-90e5-11a64fc58ddb.mp4) |

**Stitched v1 (2026-07-23):** A1→A2→A3→endcard assembled with ffmpeg (fade-out on A3, endcard fade in/out, audio tail fade) — 33.8s rough cut, 1080p24. Endcard is real type (Liberation Mono stand-in for IBM Plex Mono; PIL-rendered over `#110E08` with the brand flame glyph). Remaining for shippable: record VO ("The stock faerie doesn't grant wishes. She delivers shares."), trim ~4s across clips to hit 30.0s, swap endcard font to actual IBM Plex Mono, composite the real toast UI onto A2's phone screen. Spot F still needs the v3 phone screen-recording composite. Higgsfield quirk: dark night prompts trigger an "IN THE DARK" preset recommendation — decline with `declined_preset_id` to generate literally.

## Order of production
1. **F** (screen-cap + 1 Ember clip) — proof of language, ship to socials.
2. **A** (hero, 3–4 clips) — the launch spot.
3. **C** (comedy, serial) — dip-day content engine.
4. **D** → **E** → **B** as budget/interest allows.

## Compliance / brand guardrails
- Never name Vlad, Robinhood-the-app, or competitors on-screen; "the chain" carries the association.
- "Earn stocks without doing anything" always pairs with the Illustrative chip on any numeric account value.
- Red only for the day-60 dip beat; no gradients; nothing loops except ticker tape (site motion rules apply to ads).
