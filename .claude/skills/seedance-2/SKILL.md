---
name: seedance-2
description: "Seedance 2.0 video-generation prompting intelligence. Write, optimize, review, and split prompts for ByteDance Seedance 2.0 (quad-modal text+image+video+audio, 1080p, ~15s/clip). Use when crafting AI video prompts, building multi-shot or long-form sequences (e.g. 45s = 3x15s), enforcing character/scene consistency across clips, applying timeline prompting, choosing camera moves and lighting, using @image/@video/@audio references, or compressing a script into a multi-prompt under a character budget (e.g. 2000 chars). Topics: shot type, camera movement, lighting, color temperature, film-stock aesthetic, native audio, VFX brackets, character drift, prompt formula."
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

## 2. Highest-leverage levers (most impact per token)

1. **Shot type first** — close-up / wide / POV / orbital / low-angle. Single most impactful token.
2. **Lighting** — heavily underused. `soft golden hour`, `dramatic rim light`, or `color temperature: warm/cool` gives strong direction cheaply.
3. **One visible action per beat** — never stack simultaneous moves.

## 3. Timeline prompting

- **Multi-shot in one clip:** number each shot, give it ONE explicit action.
- **Single continuous shot:** segment with timestamp brackets `(0-3s)`, `(3-6s)`, …
- **Speed changes:** mark them — `RAMPS TO SLOW MOTION`, `SNAPS BACK`.

## 4. The @reference hierarchy (multimodal anchors)

- `@image` → **visual anchor**: locks character appearance / style. Place early: `@image is the first keyframe and style reference`. One usually suffices; add more only for distinct characters or locations.
- `@video` → **movement anchor**: transfers motion trajectory + camera language.
- `@audio` → **rhythm anchor**: drives lip-sync and beat-matching.

## 5. Camera, lighting & audio vocabulary

- **Camera** (be explicit or it defaults to cutting): `no cuts, no zoom, natural head movement` (POV); `unstabilized handheld, micro-jitters` (raw realism); `slow orbital sweep, settles on subject`; `locked-off tripod`.
- **Lighting / look:** `ARRI ALEXA aesthetic, 35mm film grain, halation on highlights, soft highlight rolloff, shallow depth of field`.
- **Audio (native):** prompt the "ears" — `reverb`, `muffled`, `ambient rainy street sounds`, `low cinematic drone`.
- **VFX:** keep inline with brackets `[VFX: embers drift upward]` so action keeps flowing — don't break into prose paragraphs.

## 6. Cross-segment consistency (critical for N×15s)

When stitching clips into one longer video, drift between clips is the #1 failure. Counter it:

1. **Lock a shared style block.** Define a verbatim style/lighting/lens string once and **paste it identically** into every segment prompt.
2. **Keep the subject noun identical** across all beats and clips (`a weathered fisherman in a yellow slicker`, never paraphrased). Re-describing → character drift.
3. **Chain keyframes:** use the last frame of clip N as the `@image` anchor for clip N+1 (or one canonical character image across all 3).
4. **Continue camera/lighting state.** End clip 1 where clip 2 begins (position, time of day, color temperature).
5. **Match aspect ratio + fps intent** in every clip.

## 7. Common mistakes

- Over-complex simultaneous motion ("360° rotate + zoom while subject runs at camera") → inconsistent output.
- Underspecified camera → unwanted angle cuts.
- Paraphrasing the subject between beats → character drift.
- VFX/style in long prose → use inline brackets and a compact style block.
- Forgetting the per-clip 15s cap when scripting long content.

## 8. Compressing to a character budget (e.g. ≤2000 chars total)

When a budget covers the whole multi-prompt (all 3 clips):

1. **Factor out the shared style block** so it's written once mentally, but it MUST still appear in each clip prompt that's sent separately — budget for it ×N.
2. **Telegraphic grammar:** drop articles/filler. `Low-angle wide. Rain-soaked alley.` not `This is a low-angle wide shot of a rain-soaked alley.`
3. **One action verb per beat.** Cut adjectives that don't change the image.
4. **Keep the high-leverage tokens** (shot type, lighting, camera, subject noun); cut decorative ones first.
5. **Allocate budget:** roughly even per clip, minus the shared style block, leaving headroom (~10%).

### Multi-prompt template (45s = 3×15s)

```
[SHARED STYLE BLOCK]  // identical in all 3
<aspect ratio>, <film-stock/look>, <color temperature>, <lens/DoF>

CLIP 1 (0-15s): <shot type>, <SUBJECT NOUN>, <one action>, <environment>, <camera move>, [SHARED STYLE BLOCK], [VFX:...], <audio cue>.
CLIP 2 (15-30s): continues from clip 1 end-frame (@image), <shot type>, <SAME SUBJECT NOUN>, <one action>, <camera move>, [SHARED STYLE BLOCK], <audio cue>.
CLIP 3 (30-45s): continues from clip 2 end-frame (@image), <shot type>, <SAME SUBJECT NOUN>, <one action / resolution beat>, <camera move>, [SHARED STYLE BLOCK], <audio cue>.
```

## Workflow when handed a script

1. Read the script; identify subject(s), arc, and target length.
2. Split the arc into 15s beats (round up clip count).
3. Draft the shared style block first.
4. Write each clip with the formula (§1), reusing the subject noun + style block verbatim.
5. Add @image keyframe chaining for continuity (§6).
6. Compress to the budget (§8); verify total char count and per-clip ≤15s.
