import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import { Nav } from "./nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PROVE — Solana Token Launchpad",
  description:
    "Fair-launch tokens with batch auctions, prove scores, and community quests.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Providers>
          <Nav />
          <main style={{ padding: "0 16px", maxWidth: 1200, margin: "0 auto" }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
