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

  return {
    title: `$FIRE Retirement Card - ${shortAddr}`,
    description: "Do nothing. Get paid. See this holder's $FIRE retirement status.",
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
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif font-black text-ink text-3xl mb-4">Invalid address</h1>
          <Link href="/dashboard" className="text-fire hover:underline font-mono text-sm">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const cardImageUrl = `${siteUrl}/api/card?address=${address}&type=${type || "retirement"}`;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <nav className="mb-10">
          <Link href="/" className="flex items-center gap-2 group w-fit">
            <div className="bg-ink text-cream font-black text-xs px-2.5 py-1 rounded-lg">$FIRE</div>
            <span className="font-mono text-ink-muted text-xs group-hover:text-fire transition-colors">/ retirement card</span>
          </Link>
        </nav>

        <div className="mb-8">
          <p className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-3">Retirement Card</p>
          <h1 className="font-serif font-black text-ink text-3xl sm:text-4xl leading-tight mb-2">
            {address.slice(0, 6)}...{address.slice(-4)}
          </h1>
          <p className="text-ink-light text-sm">This holder&apos;s $FIRE retirement status</p>
        </div>

        {/* Card preview */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardImageUrl}
          alt="FIRE Retirement Card"
          className="w-full rounded-xl shadow-lg border border-divider mb-8"
        />

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="bg-fire hover:bg-fire-dark text-white font-mono text-sm px-6 py-3 rounded transition-colors"
          >
            Get your own card
          </Link>
          <a
            href={`https://dexscreener.com/base/0x4Fe3941B13AC5942E4FEa0D0a1B10E31A92E7c9A`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-ink hover:bg-ink/80 text-white font-mono text-sm px-6 py-3 rounded transition-colors"
          >
            Buy $FIRE
          </a>
        </div>
      </div>
    </div>
  );
}
