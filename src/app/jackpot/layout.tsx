import type { Metadata } from "next";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "$FIRE Jackpot — one diamond hand takes the pot",
  description:
    "Every Friday, one eligible holder wins the entire jackpot. 90-day streak to enter. Odds = streak × bag.",
  openGraph: {
    title: "$FIRE Jackpot — one diamond hand takes the pot",
    description:
      "Every Friday, one eligible holder wins the entire jackpot. 90-day streak to enter.",
    type: "website",
    images: [{ url: "/brand/og-v3.png", width: 2400, height: 1260 }],
  },
};

export default function JackpotLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
