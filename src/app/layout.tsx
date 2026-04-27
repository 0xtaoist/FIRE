import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://retirewithfire.org"),
  title: "$FIRE - Do nothing. Get paid.",
  description:
    "$FIRE is the only retirement plan that rewards you for doing less. A retirement movement for people who were never going to retire.",
  openGraph: {
    title: "$FIRE - Do nothing. Get paid.",
    description:
      "A retirement movement for people who were never going to retire.",
    type: "website",
    images: [{ url: "/opengraph-image.png", width: 800, height: 800 }],
  },
  twitter: {
    card: "summary",
    title: "$FIRE - Do nothing. Get paid.",
    description:
      "A retirement movement for people who were never going to retire.",
    images: ["/opengraph-image.png"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
