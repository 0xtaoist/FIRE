"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./AuctionCard.module.css";

export interface AuctionCardProps {
  mint: string;
  ticker: string;
  endsAt: number; // unix timestamp ms
  participants: number;
  solCommitted: number; // in lamports
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatSol(lamports: number): string {
  return (lamports / 1e9).toFixed(2);
}

export function AuctionCard({
  mint,
  ticker,
  endsAt,
  participants,
  solCommitted,
}: AuctionCardProps) {
  const [remaining, setRemaining] = useState(endsAt - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(endsAt - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <Link href={`/batch/${mint}`} className={styles.card}>
      <div className={styles.header}>
        <span className={styles.ticker}>${ticker}</span>
        <span className={styles.liveBadge}>
          <span className={styles.dot} />
          LIVE
        </span>
      </div>
      <div className={styles.countdown}>{formatCountdown(remaining)}</div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Participants</span>
          <span className={styles.statValue}>{participants}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>SOL Committed</span>
          <span className={styles.statValue}>{formatSol(solCommitted)} SOL</span>
        </div>
      </div>
    </Link>
  );
}
