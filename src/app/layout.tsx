import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import { Anton, Bricolage_Grotesque, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "./fire.css";
import "./fire-new.css";
import "./fire-v3.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const anton = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono-jb",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif-inst",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://retirewithfire.org"),
  title: "$FIRE — Get paid in stocks for staying",
  description:
    "FIRE pays you in tokenized stocks for holding. The longer you hold, the bigger your cut — full tier in 90 days. Every Friday, one holder takes the jackpot and picks the next stock. On Robinhood Chain.",
  openGraph: {
    title: "$FIRE — Get paid in stocks for staying",
    description:
      "Dividends in tokenized SPY & NVDA. No minimum. Full tier in 90 days. Jackpot every Friday. We pay the people who stay.",
    type: "website",
    images: [{ url: "/brand/og-v3.png", width: 2400, height: 1260 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "$FIRE — Get paid in stocks for staying",
    description:
      "Dividends in tokenized SPY & NVDA. No minimum. Full tier in 90 days. Jackpot every Friday.",
    images: ["/brand/og-v3.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${anton.variable} ${bricolage.variable} ${jetbrains.variable} ${instrumentSerif.variable} ${dmSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
