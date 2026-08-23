# FIRE Flame NFT — Evolving Airdrop Plan

**Verdict: yes, and cheaply.** The FIRE token already tracks everything the NFT needs —
`streakDays(holder)`, `tierMultiplier(holder)`, `holderStatus(holder)` are public views on
`0x43eeA882B845a8493152Ebc55cF30aE9281b02d5`, and streaks already reset on big sells.
So the NFT never stores or updates evolution state. Its `tokenURI()` **reads the owner's
live streak at call time** and returns the art for that stage.

- Evolution: automatic as streak days accrue. No upgrade tx, no keeper, no claim.
- Devolution: automatic. Big sell → token contract resets streak → same read returns the
  devolved stage. One mechanic, both directions, zero new infrastructure.
- Verified live 2026-08-23: sample holder reads `streakDays=127, tierMultX100=500`;
  `holderCount=6722` (airdrop upper bound).

## 1. Evolution ladder — mirror the tier ramp exactly

Stages map 1:1 to thresholds holders already know. Same NFT, same traits, upgraded render.

| Stage | Name | Streak | Matches |
|---|---|---|---|
| 1 | Ember | 0–6d | fresh / post-reset |
| 2 | Kindled | 7–29d | |
| 3 | Flame | 30–59d | |
| 4 | Blaze | 60–89d | |
| 5 | Inferno | 90d+ | full tier · jackpot eligible |
| 6 | Eternal | 180d+ | prestige 1 (+0.25x) |
| 7 | Mythic | 365d+ | prestige 2 (cap 5.5x) |

Sell big → streak 0 → back to Ember. The scar is the story; devolved flames are walking
paper-hand receipts, which is the retention mechanic doing marketing for free.

## 2. Traits — fixed identity, upgraded expression

Each token gets immutable base traits from its mint seed (e.g. **form** — 6 flame
silhouettes from the brand glyph family; **ground** — 4 backgrounds; **core** — 5 accent
treatments; **relic** — sparse accessory, ~15% of tokens). Stage never changes *which*
traits you have, only how ascended they render: Ember = dim outline on near-black →
Mythic = fully lit, aura, particles. "Same flame, more alive."

**Rank flair (the Friday layer):** rank is relative, so it can't be a pure on-chain read.
Reuse the Friday ritual: the keeper posts a top-100 merkle root (or bitmap) to the NFT
contract at the Friday rerank. Top-100 wallets render a crown/aura overlay until next
Friday. Board rank becomes visible, weekly, on the art — and losing your crown is public.

## 3. Contract sketch (Hal)

`FlameNFT` — ERC-721 on Robinhood Chain:

- `tokenURI(id)` → reads `fire.streakDays(ownerOf(id))` → returns
  `{METADATA_BASE}/{id}?stage=N` or fully on-chain JSON w/ stage + traits. Traits from
  `keccak(id, seedBlockhash)` stored/derivable at mint.
- **Soulbound v1** (transfers revert, burn allowed). The NFT is a personal streak record;
  transferable flames create a "buy a day-127 streak" market that lies. Revisit later —
  an unlock can be added, soulbound can't be retrofitted.
- One NFT per wallet (`mintedTo` guard).
- `pokeMetadata(uint256[] ids)` — permissionless, emits **ERC-4906** `MetadataUpdate` so
  marketplaces refresh cached art. Optional later: FIRE hook calls poke on streak resets.
- `setRankRoot(bytes32)` — keeper-only, Friday. `hasCrown(id, proof)` view for renderers.
- Airdrop: owner batch-mint `airdrop(address[] to)` — ~68 txs of 100 on a cheap L2. No
  claim gas for holders; the drop just appears (better story: "check your wallet").

## 4. Metadata + art pipeline

- **Serve:** Next API route on the site — `/api/flame/[id]` returns OpenSea-standard JSON
  (name, stage, traits, crown, streak day count as a display trait); image URLs point to
  pre-rendered assets. `dynamic = "force-dynamic"`, reads chain per request (or 60s cache).
- **Art:** trait matrix is 6×4×5 = 120 identities × 7 stages (+crown variant) — generate
  as **layered composites**, not 840 uniques: render each trait layer per stage once
  (~(6+4+5)×7 ≈ 105 layers + crown), composite server-side or pre-bake to R2/public.
  Style: the Terminal Dark brand — flame-glyph geometry, #00C805 on #110E08, flat, no
  gradients. Generate layers with Recraft vector (same pipeline as the brand marks).
- **Later option:** move stage-1..7 SVGs fully on-chain (they're flat vector — small);
  keeps the "reads live, renders live" story pure. Not required for v1.

## 5. Airdrop mechanics

- **Eligibility (open decision):** (a) all 6,722 holders; (b) streak ≥ 7d (filters
  wash/bot wallets, rewards the premise); (c) hold ≥ dust threshold. Recommend **b + c**.
- Snapshot at an announced Friday close (ties to ritual). First-RWA wallets could get the
  "relic" trait guaranteed — links the drop to the hero counter stat.
- Mint stage = current streak at snapshot, automatically (it's a live read) — OG day-90+
  holders unbox an Inferno on day one. That's the screenshot.

## 6. Frontend surfaces (mine)

- Dashboard: flame card next to Streak & Tier — current render, days to next stage,
  "devolves if you break below X FIRE" warning reusing the existing danger line.
- `/flame/[id]` public page + OG image per token (share card: "Day 127. Still burning.").
- v5 badge wall tie-in: the wall becomes live flames at current stages.
- Evolution moments: dashboard confetti-free glow-up animation + share prompt at each
  stage crossing (client detects threshold cross vs last visit).

## 7. Phases

1. **Spec lock (all):** stages, soulbound, eligibility, supply — the open decisions below.
2. **Art (me + Recraft):** trait layers × stages, composite pipeline, 3 sample identities
   end-to-end for sign-off.
3. **Contract (Hal):** FlameNFT + poke + rankRoot; testnet or mainnet-quiet deploy;
   `tokenURI` pointed at staging metadata route.
4. **Metadata + pages (me):** API route, dashboard card, share pages.
5. **Snapshot + airdrop (Hal + me):** eligibility list from holders/first-RWA data, batch
   mint, announce thread with the Inferno unboxings.

## Open decisions

1. Soulbound v1 — recommended yes. Confirm.
2. Eligibility: streak≥7 + dust floor, or everyone? Snapshot date?
3. Stage names/count above (Ember→Mythic) — naming pass welcome.
4. Crown layer in v1, or ship evolution first and add the Friday crown as the week-2 beat?
5. Metadata centralized (site API) v1 — acceptable, or on-chain SVG required from day one?
