import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "$FIRE — Get paid in stocks for staying",
  description:
    "Hold $FIRE and dividends accrue in tokenized SPY and NVDA from day one. The longer you hold, the bigger your cut — full tier in 90 days. Every Friday, one diamond hand takes the jackpot. On Robinhood Chain.",
  openGraph: {
    title: "$FIRE — Get paid in stocks for staying",
    description:
      "Dividends in tokenized SPY & NVDA. No minimum. Full tier in 90 days. Jackpot every Friday. We pay the people who stay.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "$FIRE — Get paid in stocks for staying",
    description:
      "Dividends in tokenized SPY & NVDA. No minimum. Full tier in 90 days. Jackpot every Friday.",
  },
};

export default function V3Layout({ children }: { children: React.ReactNode }) {
  return children;
}
