import type { Metadata } from "next";
import { HomeV5 } from "@/components/fire-v5/home-v5";

/* v5 home — the movement scrollworld. On its own route while it's reviewed;
   promoting it to `/` is a one-line change in src/app/page.tsx. */

export const metadata: Metadata = {
  title: "$FIRE — There is a number that ends work",
  description:
    "Four and a half million people are already working toward it. Hold $FIRE and real tokenised stock arrives in your wallet — the same idea in its smallest form.",
  openGraph: {
    title: "$FIRE — There is a number that ends work",
    description:
      "The FIRE movement, explained. Then the smallest version of it: own the thing that pays you.",
    type: "website",
    images: [{ url: "/brand/og-v3.png", width: 2400, height: 1260 }],
  },
  twitter: { card: "summary_large_image", title: "$FIRE — There is a number that ends work" },
};

export default function Page() {
  return <HomeV5 />;
}
