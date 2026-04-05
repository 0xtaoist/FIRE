import { AuctionCard } from "@/components/AuctionCard";
import type { AuctionCardProps } from "@/components/AuctionCard";
import { TokenCard } from "@/components/TokenCard";
import type { TokenCardProps } from "@/components/TokenCard";
import styles from "./page.module.css";

const API_BASE = process.env.INDEXER_API_URL ?? "http://localhost:4000";

interface AuctionResponse {
  mint: string;
  ticker: string;
  ends_at: number;
  participants: number;
  sol_committed: number;
}

interface TokenResponse {
  mint: string;
  ticker: string;
  name: string;
  holder_count: number;
  volume_24h: number;
  avg_hold_time: string;
  price_change_pct: number;
  badges: Array<"verified" | "diamond_hands" | "survivor">;
  feed_score: number;
}

async function getActiveAuctions(): Promise<AuctionCardProps[]> {
  try {
    const res = await fetch(`${API_BASE}/api/auctions/active`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) return [];
    const data: AuctionResponse[] = await res.json();
    return data.map((a) => ({
      mint: a.mint,
      ticker: a.ticker,
      endsAt: a.ends_at,
      participants: a.participants,
      solCommitted: a.sol_committed,
    }));
  } catch {
    return [];
  }
}

async function getFeed(): Promise<TokenCardProps[]> {
  try {
    const res = await fetch(`${API_BASE}/api/feed`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data: TokenResponse[] = await res.json();
    return data.map((t) => ({
      mint: t.mint,
      ticker: t.ticker,
      name: t.name,
      holderCount: t.holder_count,
      volume24h: t.volume_24h,
      avgHoldTime: t.avg_hold_time,
      priceChangePct: t.price_change_pct,
      badges: t.badges,
      feedScore: t.feed_score,
    }));
  } catch {
    return [];
  }
}

export default async function FeedPage() {
  const [auctions, tokens] = await Promise.all([
    getActiveAuctions(),
    getFeed(),
  ]);

  return (
    <div className={styles.page}>
      {/* Active Batch Auctions */}
      <section>
        <h2 className={styles.sectionTitleAccent}>Active Batch Auctions</h2>
        <div className={styles.auctionGrid}>
          {auctions.length === 0 ? (
            <p className={styles.empty}>No active auctions right now.</p>
          ) : (
            auctions.map((a) => <AuctionCard key={a.mint} {...a} />)
          )}
        </div>
      </section>

      {/* Token Feed */}
      <section>
        <h2 className={styles.sectionTitle}>Token Feed</h2>
        <div className={styles.tokenGrid}>
          {tokens.length === 0 ? (
            <p className={styles.empty}>No tokens to display yet.</p>
          ) : (
            tokens.map((t) => <TokenCard key={t.mint} {...t} />)
          )}
        </div>
      </section>
    </div>
  );
}
