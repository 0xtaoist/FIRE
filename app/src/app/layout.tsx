import type { Metadata } from "next";
import { Providers } from "./providers";
import { Nav } from "./nav";
import "./globals.css";

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
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        />
      </head>
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
