import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FIRE_CONTRACT, FIRE_ABI } from "@/lib/contract";
import { rhClient } from "@/lib/rpc";
import { getPool } from "@/lib/db";
import { StreakStage } from "./stage";

export const dynamic = "force-dynamic";

/* Next 16: params is a Promise on pages, layouts and route handlers alike. */
type Props = { params: Promise<{ address: string }> };

const isAddress = (a: string) => /^0x[a-fA-F0-9]{40}$/.test(a);

type HolderStatus = {
  balance: bigint;
  streakDays_: bigint;
  tierMultX100: bigint;
  peak: bigint;
  breakBelowBalance: bigint;
  tranches_: bigint;
  migrated: boolean;
};

async function getHolder(address: string) {
  try {
    const s = (await rhClient.readContract({
      address: FIRE_CONTRACT,
      abi: FIRE_ABI,
      functionName: "holderStatus",
      args: [address as `0x${string}`],
    })) as HolderStatus;
    return { days: Number(s.streakDays_), mult: Number(s.tierMultX100) / 100 };
  } catch {
    // A dead RPC shouldn't 500 a page someone just posted a link to.
    return { days: 0, mult: 1 };
  }
}

async function getVisitStreak(address: string): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;
  try {
    const { rows } = await pool.query<{ day: string }>(
      `SELECT to_char(day, 'YYYY-MM-DD') AS day FROM checkins
        WHERE address = $1 ORDER BY day DESC LIMIT 400`,
      [address]
    );
    const days = rows.map((r) => r.day);
    if (days.length === 0) return 0;
    const n = (iso: string) => Math.round(Date.parse(iso + "T00:00:00Z") / 86_400_000);
    if (Math.floor(Date.now() / 86_400_000) - n(days[0]) > 1) return 0;
    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      if (n(days[i - 1]) - n(days[i]) === 1) streak++;
      else break;
    }
    return streak;
  } catch {
    return 0;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  if (!isAddress(address)) return { title: "$FIRE" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://retirewithfire.org";
  const card = `${siteUrl}/api/card?address=${address}&type=streak`;
  const { days } = await getHolder(address);
  const title = `Day ${days} holding $FIRE`;
  const description =
    "Hold $FIRE, get paid in real stocks. The longer you hold, the bigger your cut.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: card, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description, images: [card] },
  };
}

export default async function StreakPage({ params }: Props) {
  const { address } = await params;
  if (!isAddress(address)) notFound();

  const [{ days, mult }, visitStreak] = await Promise.all([
    getHolder(address),
    getVisitStreak(address.toLowerCase()),
  ]);

  // Resolved here, not from window.location on the client: a server/client
  // branch for this hydrated mismatched and left the reveal animation dead. It
  // also means a shared link always points at the canonical domain.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://retirewithfire.org";

  return (
    <StreakStage
      address={address}
      days={days}
      mult={mult}
      visitStreak={visitStreak}
      shareUrl={`${siteUrl}/streak/${address}?d=${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`}
    />
  );
}
