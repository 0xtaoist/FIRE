"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import styles from "./page.module.css";

const SLIPPAGE_OPTIONS = [0.5, 1, 2] as const;

interface TradeWidgetProps {
  ticker: string;
  currentPrice: number; // lamports per token
}

export function TradeWidget({ ticker, currentPrice }: TradeWidgetProps) {
  const { connected } = useWallet();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState<number>(1);

  const solAmount = parseFloat(amount) || 0;
  const priceInSol = currentPrice / 1e9;
  const estimatedTokens =
    side === "buy" && priceInSol > 0
      ? solAmount / priceInSol
      : 0;
  const estimatedSol =
    side === "sell" ? solAmount * priceInSol : 0;

  const fee = solAmount * 0.01;
  const creatorFee = solAmount * 0.008;
  const protocolFee = solAmount * 0.002;

  return (
    <div className={styles.tradeWidget}>
      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${side === "buy" ? styles.tabActive : ""}`}
          onClick={() => setSide("buy")}
        >
          Buy
        </button>
        <button
          className={`${styles.tab} ${styles.tabSell} ${side === "sell" ? styles.tabActive : ""}`}
          onClick={() => setSide("sell")}
        >
          Sell
        </button>
      </div>

      {/* Amount input */}
      <div className={styles.inputGroup}>
        <span className={styles.inputLabel}>
          {side === "buy" ? "Amount (SOL)" : `Amount (${ticker})`}
        </span>
        <input
          className={styles.inputField}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* Estimate */}
      {solAmount > 0 && (
        <div className={styles.estimate}>
          {side === "buy"
            ? `~ ${estimatedTokens.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${ticker}`
            : `~ ${estimatedSol.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`}
        </div>
      )}

      {/* Slippage */}
      <div className={styles.slippageRow}>
        <span className={styles.slippageLabel}>Slippage</span>
        {SLIPPAGE_OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`${styles.slippageBtn} ${slippage === opt ? styles.slippageBtnActive : ""}`}
            onClick={() => setSlippage(opt)}
          >
            {opt}%
          </button>
        ))}
      </div>

      {/* Fee breakdown */}
      {solAmount > 0 && (
        <div className={styles.feeBreakdown}>
          <span>1% fee: {fee.toFixed(4)} SOL</span>
          <span>
            &nbsp;&nbsp;0.8% creator: {creatorFee.toFixed(4)} SOL
          </span>
          <span>
            &nbsp;&nbsp;0.2% protocol: {protocolFee.toFixed(4)} SOL
          </span>
        </div>
      )}

      {/* Action */}
      {connected ? (
        <button
          className={`${styles.tradeBtn} ${side === "buy" ? styles.tradeBtnBuy : styles.tradeBtnSell}`}
          disabled={solAmount <= 0}
        >
          {side === "buy" ? "Buy" : "Sell"} {ticker}
        </button>
      ) : (
        <WalletMultiButton
          style={{ width: "100%", justifyContent: "center" }}
        />
      )}
    </div>
  );
}
