/**
 * FIRE v2 on Robinhood Chain — contract wiring.
 * Three contracts: clean ERC-20 token (streak/tier/tranches), the v4 hook
 * (ETH fees + rebates), and the Distributor (stock-dividend epochs + jackpot).
 * Addresses come from env so deploys don't require code changes.
 */

/* Deployed 2026-07-17 on Robinhood Chain (verified on-chain). Env vars
   override for testnets/redeployments. */
export const FIRE_CONTRACT = (process.env.NEXT_PUBLIC_FIRE_CONTRACT ||
  "0x43eeA882B845a8493152Ebc55cF30aE9281b02d5") as `0x${string}`;

export const HOOK_CONTRACT = (process.env.NEXT_PUBLIC_HOOK_CONTRACT ||
  "0xE3Fa8fA0D0A3f59C9B08Ea0Fe36d654A506850cC") as `0x${string}`;

export const DISTRIBUTOR_CONTRACT = (process.env.NEXT_PUBLIC_DISTRIBUTOR_CONTRACT ||
  "0x4AC257e8443f465dB515331c113895bf077f851A") as `0x${string}`;

// ─── FireToken ────────────────────────────────────────────────

export const FIRE_ABI = [
  {
    name: "holderStatus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "h", type: "address" }],
    outputs: [
      {
        name: "s",
        type: "tuple",
        components: [
          { name: "balance", type: "uint256" },
          { name: "streakDays_", type: "uint256" },
          { name: "tierMultX100", type: "uint256" },
          { name: "peak", type: "uint256" },
          { name: "breakBelowBalance", type: "uint256" },
          { name: "tranches_", type: "uint256" },
          { name: "migrated", type: "bool" },
        ],
      },
    ],
  },
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "streakDays", type: "function", stateMutability: "view",
    inputs: [{ name: "h", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "tierMultiplier", type: "function", stateMutability: "view",
    inputs: [{ name: "h", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "dividendScore", type: "function", stateMutability: "view",
    inputs: [{ name: "h", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "jackpotWeight", type: "function", stateMutability: "view",
    inputs: [{ name: "h", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "previewSellFeeBps", type: "function", stateMutability: "view",
    inputs: [{ name: "h", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "weightedBps", type: "uint256" }] },
  { name: "trancheCount", type: "function", stateMutability: "view",
    inputs: [{ name: "h", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "trancheAt", type: "function", stateMutability: "view",
    inputs: [{ name: "h", type: "address" }, { name: "i", type: "uint256" }],
    outputs: [{ name: "start", type: "uint64" }, { name: "amount", type: "uint192" }] },
  { name: "holderCount", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  // holderList is append-ordered, so index === join order. That makes
  // "founding N" a membership test on the first N entries, with no database.
  { name: "holderList", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
  { name: "streakStart", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint64" }] },
  { name: "isMigrated", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "peakBalance", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "launchTime", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  // ─── tier curve parameters, live ───
  // These are settable on-chain. ranks.ts used to hardcode all of them; that is
  // exactly how the jackpot threshold went stale when it moved 90 -> 30, so they
  // are read instead. TIER below stays as the verified fallback.
  { name: "tierRampPeriod", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },   // SECONDS, not days
  { name: "prestige1Days", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "prestige2Days", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "tierBaseMult", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },   // x100
  { name: "tierMaxBase", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },   // x100
  { name: "tierHardCap", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },   // x100
  { name: "prestigeBump", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },   // x100
  { name: "sellFeeMaxBps", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "sellFeeMinBps", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "feeDecayPeriod", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const;

// ─── FireHook ─────────────────────────────────────────────────

export const HOOK_ABI = [
  { name: "rebateOwed", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "claimRebate", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "buyFeeBps", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "sellFeeFlatBps", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "dividendEthAccumulated", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "burnEthAccumulated", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "rebateReserve", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalFireBurned", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const;

// ─── FireDistributor ──────────────────────────────────────────

export const DISTRIBUTOR_ABI = [
  { name: "epochCount", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "epochs", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "root", type: "bytes32" },
      { name: "asset", type: "address" },
      { name: "total", type: "uint128" },
      { name: "claimed", type: "uint128" },
      { name: "postedAt", type: "uint64" },
      { name: "expired", type: "bool" },
    ] },
  { name: "claimable", type: "function", stateMutability: "view",
    inputs: [{ name: "epochId", type: "uint256" }, { name: "holder", type: "address" }],
    outputs: [{ name: "open", type: "bool" }, { name: "claimed_", type: "bool" }] },
  { name: "claim", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "epochId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "proof", type: "bytes32[]" },
    ], outputs: [] },
  { name: "claimMany", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "ids", type: "uint256[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "proofs", type: "bytes32[][]" },
    ], outputs: [] },
  { name: "getBasket", type: "function", stateMutability: "view",
    inputs: [],
    outputs: [{ name: "tokens", type: "address[]" }, { name: "weightsBps", type: "uint16[]" }] },
  { name: "jackpotReserve", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "jackpotMinStreakDays", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "holderLifetime", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "claimWindow", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const;

// ─── ERC-20 metadata (basket stock tokens) ────────────────────

export const ERC20_META_ABI = [
  { name: "symbol", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint8" }] },
] as const;

// ─── Tier curve ───────────────────────────────────────────────
//
// Every value here is a LIVE contract parameter, not a constant. These are the
// verified-correct fallbacks (read from mainnet 2026-08-19: tierRampPeriod
// 7_776_000s = 90d, prestige 180/365, 100/500/550/25 hundredths) and they are
// what renders before an on-chain read resolves, or if one fails.
//
// Do not treat them as truth. `jackpotMinStreakDays` was hardcoded the same way
// and silently went stale when it moved 90 -> 30, telling holders they had
// months to wait when they were already eligible. Prefer readTierConfig().

export type TierConfig = {
  rampDays: number;
  baseX: number;
  maxBaseX: number;
  prestige1Days: number;
  prestige2Days: number;
  prestigeBumpX: number;
  hardCapX: number;
};

export const TIER: TierConfig = {
  rampDays: 90,
  baseX: 1.0,
  maxBaseX: 5.0,
  prestige1Days: 180,
  prestige2Days: 365,
  prestigeBumpX: 0.25,
  hardCapX: 5.5,
};

/** Shape returned by the seven tier getters, in ABI order. */
export function tierConfigFromChain(raw: {
  tierRampPeriod: bigint;
  prestige1Days: bigint;
  prestige2Days: bigint;
  tierBaseMult: bigint;
  tierMaxBase: bigint;
  tierHardCap: bigint;
  prestigeBump: bigint;
}): TierConfig {
  return {
    // tierRampPeriod is SECONDS on-chain; everything else here is days or x100
    rampDays: Number(raw.tierRampPeriod) / 86400,
    prestige1Days: Number(raw.prestige1Days),
    prestige2Days: Number(raw.prestige2Days),
    baseX: Number(raw.tierBaseMult) / 100,
    maxBaseX: Number(raw.tierMaxBase) / 100,
    hardCapX: Number(raw.tierHardCap) / 100,
    prestigeBumpX: Number(raw.prestigeBump) / 100,
  };
}

export function tierAtDays(days: number, migrated = false, tier: TierConfig = TIER): number {
  let base =
    days >= tier.rampDays
      ? tier.maxBaseX
      : tier.baseX + (tier.maxBaseX - tier.baseX) * (days / tier.rampDays);
  if (migrated && base < tier.maxBaseX) base = tier.maxBaseX;
  if (days >= tier.prestige1Days) base += tier.prestigeBumpX;
  if (days >= tier.prestige2Days) base += tier.prestigeBumpX;
  return Math.min(base, tier.hardCapX);
}

export function sellFeeBpsAtAgeDays(ageDays: number, maxBps = 300, minBps = 100, decayDays = 90): number {
  if (ageDays >= decayDays) return minBps;
  return Math.round(maxBps - ((maxBps - minBps) * ageDays) / decayDays);
}
