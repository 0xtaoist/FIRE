import type { Metadata } from "next";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ address?: string; type?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { address, type } = await searchParams;
  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://retirewithfire.org";
  const cardUrl = address
    ? `${siteUrl}/api/card?address=${address}&type=${type || "retirement"}`
    : `${siteUrl}/opengraph-image.png`;

  const isDividends = type === "dividends";
  return {
    title: isDividends ? `$FIRE Stock Dividends - ${shortAddr}` : `$FIRE Retirement Card - ${shortAddr}`,
    description: isDividends
      ? "Paid in real stocks for holding a memecoin. Do nothing. Get paid."
      : "Do nothing. Get paid. See this holder's $FIRE retirement status.",
    openGraph: {
      title: `$FIRE Retirement Card - ${shortAddr}`,
      description: "Do nothing. Get paid. Check your retirement status at retirewithfire.org",
      images: [{ url: cardUrl, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `$FIRE Retirement Card - ${shortAddr}`,
      description: "Do nothing. Get paid.",
      images: [cardUrl],
    },
  };
}

export default async function CardPage({ searchParams }: Props) {
  const { address, type } = await searchParams;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://retirewithfire.org";

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return (
      <div className="fv-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] mb-4">Invalid address</h1>
          <Link href="/dashboard" className="text-[var(--fv-green)] hover:underline font-mono text-sm no-underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const cardImageUrl = `${siteUrl}/api/card?address=${address}&type=${type || "retirement"}`;

  return (
    <div className="fv-page min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <nav className="mb-10">
          <Link href="/v3" className="flex items-center gap-2 group w-fit no-underline">
            <div className="bg-[var(--fv-green)] text-[#0b0a06] font-bold text-xs px-2.5 py-1 rounded-md">$FIRE</div>
            <span className="font-mono text-[var(--fv-muted)] text-xs group-hover:text-[var(--fv-green)] transition-colors">/ retirement card</span>
          </Link>
        </nav>

        <div className="mb-8">
          <p className="font-mono text-[var(--fv-green)] text-xs tracking-[0.2em] uppercase mb-3">Retirement Card</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] leading-tight mb-2">
            {address.slice(0, 6)}...{address.slice(-4)}
          </h1>
          <p className="text-[var(--fv-muted)] text-sm">This holder&apos;s $FIRE retirement status</p>
        </div>

        {/* Card preview */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardImageUrl}
          alt="FIRE Retirement Card"
          className="w-full rounded-xl border border-[var(--fv-line-strong)] mb-8"
        />

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className="fv-btn font-mono text-sm px-6 py-3 no-underline">
            Get your own card
          </Link>
          <Link href="/swap" className="fv-btn-ghost font-mono text-sm px-6 py-3 no-underline">
            Buy $FIRE
          </Link>
        </div>
      </div>
    </div>
  );
}
