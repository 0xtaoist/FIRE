export const SITE = {
  name: "$FIRE",
  tagline: "Do nothing.\nGet paid.",
  subtitle: "A retirement movement for people who were never going to retire",
  description:
    "$FIRE is the only retirement plan that rewards you for doing less. Buy it. Hold it. Watch your bag grow while you watch something else.",
  cta: "Join the retirement",
  subCta: "No staking. No claiming. No effort. Perfect for NEETs.",
  contractAddress: "0x20aBaFF765075904Fd789E3c8Bca8ad0F41C6Ad4",
  links: {
    uniswap: "https://dexscreener.com/base/0x195872D17a64b323e93040881150C5462f3C2f67",
    dashboard: "/dashboard",
    contract: "https://basescan.org/address/0x20aBaFF765075904Fd789E3c8Bca8ad0F41C6Ad4",
    twitter: "https://x.com/fire_earn",
    telegram: "#",
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
      "Your reflection rate scales linearly with hold duration. A holder at day 30 earns 30x what a new buyer earns on the same bag. You don\u2019t need to understand the math. You just need to outlast everyone else.",
  },
  {
    numeral: "III",
    title: "The Burn Begins",
    description:
      "When a large group of whales collectively hold for an extended period of time, the $FIRE burner kicks in. A portion of rewards start to burn lowering supply permanently. This ends when the whale threshold is no longer met. FIRE\u2019s value can only go up.",
  },
] as const;

export const PROOF_CARDS = {
  patient: {
    title: "The Patient Retiree",
    bought: "$5,000",
    held: "30 days",
    multiplier: "30x",
    dailyReflections: "$399.80",
  },
  impatient: {
    title: "The Impatient Whale",
    bought: "$50,000",
    held: "1 day",
    multiplier: "1x",
    dailyReflections: "$133.87",
  },
} as const;

export const FAQ_ITEMS = [
  {
    question: '"Is this like SafeMoon?"',
    answer:
      "SafeMoon paid everyone the same no matter how long they held. We don\u2019t. Your share grows the longer you hold. A $100 bag held 90 days earns the same as a $90,000 bag bought today. That\u2019s never been done before.",
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
