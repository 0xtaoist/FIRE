export const SITE = {
  name: "$FIRE",
  tagline: "Do nothing.\nGet paid.",
  subtitle: "A retirement movement for people who were never going to retire",
  description:
    "$FIRE is the only retirement plan that rewards you for doing less. Buy it. Hold it. Watch your bag grow while you watch something else.",
  cta: "Join the retirement",
  subCta: "No staking. No claiming. No effort. Perfect for NEETs.",
  contractAddress: "0x0000000000000000000000000000000000000000",
  links: {
    uniswap: "#",
    dashboard: "#",
    contract: "#",
    twitter: "#",
    telegram: "#",
  },
} as const;

export const NAV_ITEMS = [
  { label: "history", href: "#history" },
  { label: "doctrine", href: "#doctrine" },
  { label: "proof", href: "#proof" },
  { label: "faq", href: "#faq" },
] as const;

export const TENETS = [
  {
    numeral: "I",
    title: "Buy and never sell",
    description:
      "A 3% tax on every trade feeds the pension pool. Every holder\u2019s share grows the longer they hold. Selling doesn\u2019t just cost you a tax \u2014 it resets your accumulated time to zero. You start over, like anyone else.",
  },
  {
    numeral: "II",
    title: "Let time do the work",
    description:
      "Your reflection rate scales quadratically with hold duration. A holder at day 30 earns 900x what a new buyer earns on the same bag. You don\u2019t need to understand the math. You just need to outlast everyone else.",
  },
  {
    numeral: "III",
    title: "At day 90, the burn begins",
    description:
      "When you\u2019ve held for 90 days, your multiplier caps and your commitment starts burning supply. A portion of tax revenue gets permanently destroyed. You graduate from retiree to arsonist.",
  },
] as const;

export const PROOF_CARDS = {
  patient: {
    title: "The Patient Retiree",
    bought: "$500",
    held: "30 days",
    multiplier: "900x",
    dailyReflections: "$47.20",
  },
  impatient: {
    title: "The Impatient Whale",
    bought: "$50,000",
    held: "1 day",
    multiplier: "1x",
    dailyReflections: "$5.24",
  },
} as const;

export const FAQ_ITEMS = [
  {
    question: '"Is this like SafeMoon?"',
    answer:
      "SafeMoon paid everyone equally, regardless of how long they\u2019d held. We don\u2019t. Your share grows quadratically the longer you hold. A $100 bag held 90 days has the same earning power as a $90,000 bag bought today. Never been done.",
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
