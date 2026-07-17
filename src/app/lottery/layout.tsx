import type { Metadata } from "next";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "$FIRE Lottery — one diamond hand takes the pot",
  description:
    "Every Friday, one eligible holder wins the entire jackpot and picks the stock everyone earns next week. 90-day streak to enter. Odds = streak × bag.",
  openGraph: {
    title: "$FIRE Lottery — one diamond hand takes the pot",
    description:
      "Every Friday, one eligible holder wins the entire jackpot and picks next week's stock. 90-day streak to enter.",
    type: "website",
    images: [{ url: "/brand/og-v3.png", width: 2400, height: 1260 }],
  },
};

export default function LotteryLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
