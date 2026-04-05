"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import styles from "./page.module.css";

type AuctionState = "Gathering" | "Succeeded" | "Failed";

interface AuctionData {
  mint: string;
  ticker: string;
  name: string;
  description: string;
  state: AuctionState;
  endsAt: number;
  participants: number;
  solCommitted: number; // lamports
  minWallets: number;
  minSol: number; // lamports
}

const API_BASE = process.env.NEXT_PUBLIC_INDEXER_API_URL ?? "http://localhost:4000";
const MIN_COMMITMENT_SOL = 0.1;

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

export default function BatchAuctionPage() {
  const params = useParams<{ mint: string }>();
  const mint = params.mint;
  const { connected } = useWallet();

  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [commitAmount, setCommitAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch auction data
  const fetchAuction = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auctions/${mint}`);
      if (!res.ok) throw new Error("Auction not found");
      const data = await res.json();
      setAuction({
        mint: data.mint,
        ticker: data.ticker,
        name: data.name ?? "",
        description: data.description ?? "",
        state: data.state,
        endsAt: data.ends_at,
        participants: data.participants,
        solCommitted: data.sol_committed,
        minWallets: data.min_wallets ?? 50,
        minSol: data.min_sol ?? 10_000_000_000,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load auction");
    } finally {
      setLoading(false);
    }
  }, [mint]);

  useEffect(() => {
    fetchAuction();
    const interval = setInterval(fetchAuction, 10_000);
    return () => clearInterval(interval);
  }, [fetchAuction]);

  // Countdown ticker
  useEffect(() => {
    if (!auction) return;
    const tick = () => setRemaining(auction.endsAt - Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  const handleCommit = () => {
    const amount = parseFloat(commitAmount);
    if (isNaN(amount) || amount < MIN_COMMITMENT_SOL) {
      alert(`Minimum commitment is ${MIN_COMMITMENT_SOL} SOL`);
      return;
    }
    // TODO: call BatchAuction.commit_sol
    alert(`Would commit ${amount} SOL to auction ${mint}`);
  };

  const handleRefund = () => {
    // TODO: call BatchAuction.refund
    alert(`Would request refund for auction ${mint}`);
  };

  if (loading) {
    return <div className={styles.loading}>Loading auction...</div>;
  }

  if (error || !auction) {
    return (
      <div className={styles.errorState}>
        {error ?? "Auction not found"}
      </div>
    );
  }

  const walletProgress = Math.min(
    (auction.participants / auction.minWallets) * 100,
    100,
  );
  const solProgress = Math.min(
    (auction.solCommitted / auction.minSol) * 100,
    100,
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.ticker}>${auction.ticker}</h1>
        {auction.state === "Gathering" && (
          <span className={`${styles.stateBadge} ${styles.stateGathering}`}>
            <span className={styles.dot} />
            Gathering
          </span>
        )}
        {auction.state === "Succeeded" && (
          <span className={`${styles.stateBadge} ${styles.stateSucceeded}`}>
            Succeeded
          </span>
        )}
        {auction.state === "Failed" && (
          <span className={`${styles.stateBadge} ${styles.stateFailed}`}>
            Failed
          </span>
        )}
      </div>

      {/* Countdown (gathering only) */}
      {auction.state === "Gathering" && (
        <div className={styles.countdown}>{formatCountdown(remaining)}</div>
      )}

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Participants</div>
          <div className={styles.statValue}>{auction.participants}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>SOL Committed</div>
          <div className={styles.statValue}>
            {formatSol(auction.solCommitted)}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>State</div>
          <div className={styles.statValue}>{auction.state}</div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className={styles.progressSection}>
        <div className={styles.progressItem}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>
              Wallets ({auction.participants} / {auction.minWallets})
            </span>
            <span className={styles.progressCount}>
              {Math.round(walletProgress)}%
            </span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={
                walletProgress >= 100
                  ? styles.progressFillSuccess
                  : styles.progressFill
              }
              style={{ width: `${walletProgress}%` }}
            />
          </div>
        </div>

        <div className={styles.progressItem}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>
              SOL ({formatSol(auction.solCommitted)} /{" "}
              {formatSol(auction.minSol)})
            </span>
            <span className={styles.progressCount}>
              {Math.round(solProgress)}%
            </span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={
                solProgress >= 100
                  ? styles.progressFillSuccess
                  : styles.progressFill
              }
              style={{ width: `${solProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Commit Section (Gathering) */}
      {auction.state === "Gathering" && (
        <div className={styles.commitSection}>
          <div className={styles.commitTitle}>Commit SOL</div>
          <div className={styles.commitRow}>
            <input
              type="number"
              className={styles.commitInput}
              placeholder="0.00"
              min={MIN_COMMITMENT_SOL}
              step="0.1"
              value={commitAmount}
              onChange={(e) => setCommitAmount(e.target.value)}
            />
            <button
              className={styles.commitBtn}
              disabled={!connected}
              onClick={handleCommit}
            >
              {connected ? "Commit" : "Connect Wallet"}
            </button>
          </div>
          <p className={styles.minCommit}>
            Minimum commitment:{" "}
            <span className={styles.minCommitValue}>
              {MIN_COMMITMENT_SOL} SOL
            </span>
          </p>
        </div>
      )}

      {/* Succeeded Result */}
      {auction.state === "Succeeded" && (
        <div className={styles.resultSection}>
          <h2 className={styles.resultTitle}>Auction Succeeded</h2>
          <p className={styles.resultText}>
            ${auction.ticker} launched successfully with{" "}
            {auction.participants} participants and{" "}
            {formatSol(auction.solCommitted)} SOL committed. Tokens have been
            distributed to all participants.
          </p>
        </div>
      )}

      {/* Failed Result */}
      {auction.state === "Failed" && (
        <div className={styles.resultSection}>
          <h2 className={styles.resultTitle}>Auction Failed</h2>
          <p className={styles.resultText}>
            This auction did not meet the minimum requirements. You can claim a
            refund for any SOL you committed.
          </p>
          <button
            className={styles.refundBtn}
            disabled={!connected}
            onClick={handleRefund}
          >
            {connected ? "Claim Refund" : "Connect Wallet to Refund"}
          </button>
        </div>
      )}
    </div>
  );
}
