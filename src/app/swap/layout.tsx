import type { Metadata } from "next";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Swap $FIRE — direct on the v4 pool",
  description:
    "Buy and sell FIRE straight against the Uniswap v4 hook pool on Robinhood Chain. No router roulette — the exact pool, every time.",
  openGraph: {
    title: "Swap $FIRE — direct on the v4 pool",
    description:
      "Buy and sell FIRE straight against the Uniswap v4 hook pool on Robinhood Chain.",
    type: "website",
    images: [{ url: "/brand/og-v3.png", width: 2400, height: 1260 }],
  },
};

export default function SwapLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
