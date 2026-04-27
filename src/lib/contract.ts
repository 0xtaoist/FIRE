export const FIRE_CONTRACT = "0x20aBaFF765075904Fd789E3c8Bca8ad0F41C6Ad4" as const;

export const FIRE_ABI = [
  {
    name: "holderStatus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "holder", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "balance", type: "uint256" },
          { name: "pendingRewards", type: "uint256" },
          { name: "rewardSharePct", type: "uint256" },
          { name: "secondsHeld", type: "uint256" },
          { name: "daysHeld", type: "uint256" },
          { name: "clockActive", type: "bool" },
          { name: "windowEligible", type: "bool" },
          { name: "maxSellToPreserveClock", type: "uint256" },
          { name: "secondsUntilNextWindow", type: "uint256" },
          { name: "isWhale", type: "bool" },
          { name: "whaleSecondsHeld", type: "uint256" },
          { name: "whaleDaysHeld", type: "uint256" },
          { name: "rewardPoolTokens", type: "uint256" },
          { name: "rewardPoolAfterBurn", type: "uint256" },
          { name: "loyaltyMultiplierScaled", type: "uint256" },
          { name: "daysUntilNextTier", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "pendingReward",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "holder", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "claimRewards",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "burnStatus",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "tier", type: "uint8" },
      { name: "burnPct", type: "uint256" },
      { name: "qualifyingWhales", type: "uint256" },
      { name: "totalWhales", type: "uint256" },
    ],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;
