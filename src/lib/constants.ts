export const SITE = {
  name: "$FIRE",
  tagline: "Do nothing.\nGet paid.",
  subtitle: "A retirement movement for people who were never going to retire",
  description:
    "$FIRE is the only retirement plan that pays you for doing less. Buy it. Hold it. Watch your bag grow while you watch something else.",
  cta: "Join the retirement",
  subCta: "No staking. No claiming. No effort. Perfect for NEETs.",
  contractAddress: "0xa7E1E8Ab7B7c93F9e3CeB10724843a4b74f5308C",
  links: {
    uniswap: "https://dexscreener.com/base/0x4Fe3941B13AC5942E4FEa0D0a1B10E31A92E7c9A",
    dashboard: "/dashboard",
    contract: "https://basescan.org/address/0xa7E1E8Ab7B7c93F9e3CeB10724843a4b74f5308C",
    twitter: "https://x.com/retirewithfire",
    telegram: "https://t.me/retirewithfire",
  },
} as const;

export const NAV_ITEMS = [
  { label: "history", href: "#history" },
  { label: "doctrine", href: "#doctrine" },
  { label: "proof", href: "#proof" },
  { label: "calculator", href: "#calculator" },
  { label: "faq", href: "#faq" },
] as const;

export const TENETS = [
  {
    numeral: "I",
    title: "Buy and never sell",
    description:
      "A 4% tax on every trade is burnt into the contract. Every holder\u2019s share grows the longer they hold. Selling doesn\u2019t just cost you a tax. It resets your accumulated time to zero. You start over, like anyone else.",
  },
  {
    numeral: "II",
    title: "Let time do the work",
    description:
      "Your payout rate scales with loyalty tiers. Hold 30 days for 1.5x, 120 days for 3x. You don\u2019t need to understand the math. You just need to outlast everyone else.",
  },
  {
    numeral: "III",
    title: "The Burn Begins",
    description:
      "When a large group of whales collectively hold for an extended period of time, the $FIRE burner kicks in. A portion of payouts start to burn lowering supply permanently. This ends when the whale threshold is no longer met. FIRE\u2019s value can only go up.",
  },
] as const;

export const PROOF_CARDS = {
  patient: {
    title: "The Patient Retiree",
    bought: "$5,000",
    held: "120 days",
    multiplier: "3x",
    dailyReflections: "$39.98",
  },
  impatient: {
    title: "The Impatient Whale",
    bought: "$50,000",
    held: "1 day",
    multiplier: "1x",
    dailyReflections: "$13.39",
  },
} as const;

export const FAQ_ITEMS = [
  {
    question: '"Is this like SafeMoon?"',
    answer:
      "SafeMoon paid everyone the same no matter how long they held. We don\u2019t. Your payout multiplier increases at hold-time tiers — 1.5x at 30 days up to 3x at 120 days. Time beats money.",
  },
  {
    question: '"Do I need to stake anything?"',
    answer:
      "No. The token earns for you while it sits in your wallet. No dApp. No claim button. Nothing to press. You hold it and it grows.",
  },
  {
    question: '"What if the price goes down?"',
    answer:
      "Your multiplier doesn\u2019t care about the price. It cares about time. Volatility is noise. Time is the signal.",
  },
  {
    question: '"Who runs this?"',
    answer:
      "The movement runs itself. The contract is immutable. The retirement is permanent.",
  },
] as const;
