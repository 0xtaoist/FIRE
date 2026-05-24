---
name: seedance-2
description: "Seedance 2.0 video-generation prompting intelligence. Write, optimize, review, and split prompts for ByteDance Seedance 2.0 (quad-modal text+image+video+audio, 1080p, ~15s/clip). Use when crafting AI video prompts, building multi-shot or long-form sequences (e.g. 45s = 3x15s), enforcing character/scene consistency across clips, applying timeline prompting, choosing camera moves and lighting, using numbered @Image1/@Image2/@Video1/@Audio1 references (OpenArt), or splitting a script into a multi-prompt under a per-clip character budget (e.g. 2000 chars/clip). Topics: shot type, camera movement, lighting, color temperature, film-stock aesthetic, native audio, VFX brackets, character drift, prompt formula."
---
# Seedance 2.0 — Video Prompting Intelligence

ByteDance's multimodal video model (early 2026). Quad-modal input in one generation: **text + up to 9 images + 3 videos + 3 audio tracks** (≤12 files total). Output: up to **1080p**, **~15s per generation**, with **native audio** (most rivals are silent).

## Hard constraints (design around these)

| Limit | Value |
|---|---|
| Max duration per generation | ~15s |
| Max resolution | 1080p |
| Reference files | ≤9 image, ≤3 video, ≤3 audio (≤12 total) |
| Longer video | Generate N×15s clips, then stitch |

A 45s video = **3 separate 15s generations** ("multi-prompt"). Consistency across clips is the hard part — solve it deliberately (see §6).

## 1. Core prompt formula

Lead with structure, then detail, in this order:

> **shot count → duration → aspect ratio → shot type → subject → ONE action → environment → camera move → lighting → style**

Example: `Close-up product shot, white ceramic mug on a walnut desk, steam rising slowly, morning kitchen, subtle dolly forward, soft golden window light, realistic cinematic style, 16:9.`

**Aspect ratio depends on the delivery medium** — `16:9` (landscape / YouTube / web hero), `9:16` (Shorts / Reels / TikTok), `1:1` (social feed). Pick per medium and keep it identical across a multi-clip set.

## 2. Highest-leverage levers (most impact per token)

1. **Shot type first** — close-up / wide / POV / orbital / low-angle. Single most impactful token.
2. **Lighting** — heavily underused. `soft golden hour`, `dramatic rim light`, or `color temperature: warm/cool` gives strong direction cheaply.
3. **One visible action per beat** — never stack simultaneous moves.

## 3. Timeline prompting

- **Multi-shot in one clip:** number each shot, give it ONE explicit action.
- **Single continuous shot:** segment with timestamp brackets `(0-3s)`, `(3-6s)`, …
- **Speed changes:** mark them — `RAMPS TO SLOW MOTION`, `SNAPS BACK`.

## 4. The @reference system (OpenArt: numbered handles)

References are cited by **numbered handle** — `@Image1`, `@Image2`, … (also `@Video1`, `@Audio1`). Upload order sets the number. Introduce each handle early and **reuse the exact same handle** everywhere that asset appears.

- `@Image1`, `@Image2` … → **visual anchors**: lock character appearance / style. e.g. `@Image1 = hero character, @Image2 = location/style reference`. Use a distinct handle per distinct character or location.
- `@Video1` … → **movement anchor**: transfers motion trajectory + camera language.
- `@Audio1` … → **rhythm anchor**: drives lip-sync and beat-matching.

Reuse the exact handle (`@Image1`) across all clips so the same asset stays locked — renumbering or re-describing between clips invites drift.

## 5. Camera, lighting & audio vocabulary

- **Camera** (be explicit or it defaults to cutting): `no cuts, no zoom, natural head movement` (POV); `unstabilized handheld, micro-jitters` (raw realism); `slow orbital sweep, settles on subject`; `locked-off tripod`.
- **Lighting / look:** `ARRI ALEXA aesthetic, 35mm film grain, halation on highlights, soft highlight rolloff, shallow depth of field`.
- **Audio (native):** prompt the "ears" — `reverb`, `muffled`, `ambient rainy street sounds`, `low cinematic drone`.
- **VFX:** keep inline with brackets `[VFX: embers drift upward]` so action keeps flowing — don't break into prose paragraphs.

## 6. Cross-segment consistency (critical for N×15s)

When stitching clips into one longer video, drift between clips is the #1 failure. Counter it:

1. **Lock a shared style block.** Define a verbatim style/lighting/lens string once and **paste it identically** into every segment prompt.
2. **Keep the subject noun identical** across all beats and clips (`a weathered fisherman in a yellow slicker`, never paraphrased). Re-describing → character drift.
3. **Chain keyframes:** keep one canonical character handle (e.g. `@Image1`) across all clips; optionally add clip N's last frame as a new handle anchoring clip N+1.
4. **Continue camera/lighting state.** End clip 1 where clip 2 begins (position, time of day, color temperature).
5. **Match aspect ratio + fps intent** in every clip.

## 7. Common mistakes

- Over-complex simultaneous motion ("360° rotate + zoom while subject runs at camera") → inconsistent output.
- Underspecified camera → unwanted angle cuts.
- Paraphrasing the subject between beats → character drift.
- VFX/style in long prose → use inline brackets and a compact style block.
- Forgetting the per-clip 15s cap when scripting long content.

## 8. Character budget — PER CLIP (e.g. ≤2000 chars EACH)

Each clip is an **independent generation with its own budget**, locked on a per-prompt basis. 2000 chars/clip is generous (~300+ words), so don't over-compress — spend the room on precise, image-changing detail. Because generations share no context:

1. **Repeat the shared style block verbatim in every clip.** Nothing carries over between prompts, so the block is re-sent each time (easily fits in 2000/clip) — it isn't "amortized."
2. **Re-state the reference handles** (`@Image1` …) in each clip that uses them.
3. **Spend the budget on high-leverage tokens first** (shot type, camera, lighting, subject noun, one action), then add texture (physics, particle/VFX brackets, audio cues).
4. **Telegraphic grammar** only if a single clip actually nears 2000 — `Low-angle wide. Rain-soaked alley.` over full sentences. Usually unnecessary at this budget.
5. **Verify each clip independently:** ≤2000 chars AND ≤15s.

### Multi-prompt template (45s = 3×15s, each clip its own ≤2000-char prompt)

Set aspect ratio per medium (§1) and keep it identical across the 3.

```
[SHARED STYLE BLOCK]  // paste verbatim into every clip
<aspect ratio>, <film-stock/look>, <color temperature>, <lens/DoF>; @Image1 = <hero>, @Image2 = <style/location>

CLIP 1 (0-15s): [SHARED STYLE BLOCK] <shot type>, @Image1 <SUBJECT NOUN>, <one action>, <environment>, <camera move>, [VFX:...], <audio cue>.
CLIP 2 (15-30s): [SHARED STYLE BLOCK] continues from clip 1, <shot type>, @Image1 <SAME SUBJECT NOUN>, <one action>, <camera move>, <audio cue>.
CLIP 3 (30-45s): [SHARED STYLE BLOCK] continues from clip 2, <shot type>, @Image1 <SAME SUBJECT NOUN>, <one action / resolution beat>, <camera move>, <audio cue>.
```

## Workflow when handed a script

1. Read the script; identify subject(s), arc, and target length.
2. Split the arc into 15s beats (round up clip count).
3. Draft the shared style block first.
4. Write each clip with the formula (§1), reusing the subject noun + style block verbatim.
5. Add @image keyframe chaining for continuity (§6).
6. Compress to the budget (§8); verify total char count and per-clip ≤15s.
