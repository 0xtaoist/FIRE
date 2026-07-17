/**
 * FIRE v2 on Robinhood Chain — contract wiring.
 * Three contracts: clean ERC-20 token (streak/tier/tranches), the v4 hook
 * (ETH fees + rebates), and the Distributor (stock-dividend epochs + jackpot).
 * Addresses come from env so deploys don't require code changes.
 */

export const FIRE_CONTRACT = (process.env.NEXT_PUBLIC_FIRE_CONTRACT ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const HOOK_CONTRACT = (process.env.NEXT_PUBLIC_HOOK_CONTRACT ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const DISTRIBUTOR_CONTRACT = (process.env.NEXT_PUBLIC_DISTRIBUTOR_CONTRACT ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

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

// ─── Tier curve (mirrors the contract — display math only) ────

export const TIER = {
  rampDays: 90,
  baseX: 1.0,
  maxBaseX: 5.0,
  prestige1Days: 180,
  prestige2Days: 365,
  prestigeBumpX: 0.25,
  hardCapX: 5.5,
};

export function tierAtDays(days: number, migrated = false): number {
  let base =
    days >= TIER.rampDays
      ? TIER.maxBaseX
      : TIER.baseX + (TIER.maxBaseX - TIER.baseX) * (days / TIER.rampDays);
  if (migrated && base < TIER.maxBaseX) base = TIER.maxBaseX;
  if (days >= TIER.prestige1Days) base += TIER.prestigeBumpX;
  if (days >= TIER.prestige2Days) base += TIER.prestigeBumpX;
  return Math.min(base, TIER.hardCapX);
}

export function sellFeeBpsAtAgeDays(ageDays: number, maxBps = 300, minBps = 100, decayDays = 90): number {
  if (ageDays >= decayDays) return minBps;
  return Math.round(maxBps - ((maxBps - minBps) * ageDays) / decayDays);
}
