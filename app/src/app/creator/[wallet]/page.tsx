"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import styles from "./page.module.css";

/* ── Helpers ── */

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function formatSol(lamports: number): string {
  return (lamports / 1e9).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

/* ── Mock data ── */

interface TokenBreakdown {
  mint: string;
  ticker: string;
  dailyVolume: number;
  dailyFees: number;
  totalFees: number;
  holders: number;
  stakeStatus: "Escrowed" | "Returned" | "Forfeited";
}

interface StakeInfo {
  ticker: string;
  status: "Escrowed" | "Returned" | "Forfeited";
  deadline: string;
  amount: number;
}

interface LaunchRecord {
  ticker: string;
  mint: string;
  outcome: "succeeded" | "failed";
  participants: number;
  solRaised: number;
  date: string;
}

function getCreatorData() {
  return {
    totalFees: 28_400_000_000,
    totalWithdrawn: 20_000_000_000,
    pending: 8_400_000_000,
    tokens: [
      {
        mint: "abc123",
        ticker: "$PROVE",
        dailyVolume: 12_500_000_000,
        dailyFees: 100_000_000,
        totalFees: 15_800_000_000,
        holders: 1_247,
        stakeStatus: "Escrowed",
      },
      {
        mint: "def456",
        ticker: "$ALPHA",
        dailyVolume: 6_200_000_000,
        dailyFees: 49_600_000,
        totalFees: 8_200_000_000,
        holders: 834,
        stakeStatus: "Returned",
      },
      {
        mint: "ghi789",
        ticker: "$BETA",
        dailyVolume: 2_100_000_000,
        dailyFees: 16_800_000,
        totalFees: 4_400_000_000,
        holders: 421,
        stakeStatus: "Escrowed",
      },
    ] satisfies TokenBreakdown[],
    stakes: [
      {
        ticker: "$PROVE",
        status: "Escrowed",
        deadline: "2026-05-01",
        amount: 5_000_000_000,
      },
      {
        ticker: "$ALPHA",
        status: "Returned",
        deadline: "2026-03-15",
        amount: 3_000_000_000,
      },
      {
        ticker: "$BETA",
        status: "Escrowed",
        deadline: "2026-06-10",
        amount: 2_000_000_000,
      },
    ] satisfies StakeInfo[],
    launches: [
      {
        ticker: "$PROVE",
        mint: "abc123",
        outcome: "succeeded",
        participants: 342,
        solRaised: 1_250_000_000_000,
        date: "2026-03-01",
      },
      {
        ticker: "$ALPHA",
        mint: "def456",
        outcome: "succeeded",
        participants: 218,
        solRaised: 800_000_000_000,
        date: "2026-02-15",
      },
      {
        ticker: "$GAMMA",
        mint: "jkl012",
        outcome: "failed",
        participants: 45,
        solRaised: 120_000_000_000,
        date: "2026-01-20",
      },
    ] satisfies LaunchRecord[],
  };
}

/* ── Page ── */

export default function CreatorPage() {
  const { wallet } = useParams<{ wallet: string }>();
  const { connected } = useWallet();
  const [withdrawing, setWithdrawing] = useState(false);

  if (!BASE58_RE.test(wallet)) {
    return (
      <div className={styles.walletPrompt}>
        <p>Invalid wallet address.</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className={styles.walletPrompt}>
        <p>Connect your wallet to view the creator dashboard.</p>
        <WalletMultiButton />
      </div>
    );
  }

  const data = getCreatorData();

  const handleWithdraw = async () => {
    setWithdrawing(true);
    // Placeholder for withdraw transaction
    setTimeout(() => setWithdrawing(false), 2000);
  };

  return (
    <div className={styles.page}>
      {/* Earnings Overview */}
      <div className={styles.earningsCard}>
        <h2 className={styles.earningsTitle}>Earnings Overview</h2>
        <div className={styles.earningsStat}>
          <span className={styles.earningsLabel}>Total Earned</span>
          <span className={styles.earningsValue}>
            {formatSol(data.totalFees)} SOL
          </span>
        </div>
        <div className={styles.earningsStat}>
          <span className={styles.earningsLabel}>Withdrawn</span>
          <span className={styles.earningsValueSmall}>
            {formatSol(data.totalWithdrawn)} SOL
          </span>
        </div>
        <div className={styles.earningsStat}>
          <span className={styles.earningsLabel}>Pending</span>
          <span className={styles.earningsValue} style={{ color: "var(--success)" }}>
            {formatSol(data.pending)} SOL
          </span>
        </div>
        <button
          className={styles.withdrawBtn}
          disabled={data.pending <= 0 || withdrawing}
          onClick={handleWithdraw}
        >
          {withdrawing ? "Withdrawing..." : "Withdraw All"}
        </button>
      </div>

      {/* Per-token breakdown */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Token Breakdown</h2>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Token</th>
                <th>Daily Volume</th>
                <th>Daily Fees</th>
                <th>Total Fees</th>
                <th>Holders</th>
                <th>Stake</th>
              </tr>
            </thead>
            <tbody>
              {data.tokens.map((t) => (
                <tr key={t.mint}>
                  <td>
                    <Link href={`/token/${t.mint}`}>{t.ticker}</Link>
                  </td>
                  <td>{formatSol(t.dailyVolume)} SOL</td>
                  <td>{formatSol(t.dailyFees)} SOL</td>
                  <td>{formatSol(t.totalFees)} SOL</td>
                  <td>{t.holders.toLocaleString()}</td>
                  <td>
                    <span
                      className={`${styles.stakeStatus} ${
                        t.stakeStatus === "Escrowed"
                          ? styles.stakeEscrowed
                          : t.stakeStatus === "Returned"
                            ? styles.stakeReturned
                            : styles.stakeForfeited
                      }`}
                    >
                      {t.stakeStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stake Status */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Stake Status</h2>
        <div className={styles.stakeList}>
          {data.stakes.map((s) => (
            <div key={s.ticker} className={styles.stakeCard}>
              <span className={styles.stakeToken}>{s.ticker}</span>
              <span
                className={`${styles.stakeStatus} ${
                  s.status === "Escrowed"
                    ? styles.stakeEscrowed
                    : s.status === "Returned"
                      ? styles.stakeReturned
                      : styles.stakeForfeited
                }`}
              >
                {s.status}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>
                {formatSol(s.amount)} SOL
              </span>
              <span className={styles.stakeCountdown}>
                Deadline: {s.deadline}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Launch History */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Launch History</h2>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Token</th>
                <th>Outcome</th>
                <th>Participants</th>
                <th>SOL Raised</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.launches.map((l) => (
                <tr key={l.mint}>
                  <td>
                    <Link href={`/token/${l.mint}`}>{l.ticker}</Link>
                  </td>
                  <td
                    className={
                      l.outcome === "succeeded"
                        ? styles.outcomeSuccess
                        : styles.outcomeFailed
                    }
                  >
                    {l.outcome}
                  </td>
                  <td>{l.participants.toLocaleString()}</td>
                  <td>{formatSol(l.solRaised)} SOL</td>
                  <td>{l.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
