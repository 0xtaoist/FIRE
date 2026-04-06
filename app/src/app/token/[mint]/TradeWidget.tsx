"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { useSwap } from "../../../hooks/useSwap";

const SLIPPAGE_OPTIONS = [0.5, 1, 2] as const;

interface TradeWidgetProps {
  ticker: string;
  mint: string;
  currentPrice: number;
}

export function TradeWidget({ ticker, mint, currentPrice }: TradeWidgetProps) {
  const { connected } = useWallet();
  const { swap, loading: swapLoading, error: swapError, signature: swapSig } = useSwap();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState<number>(1);

  const rawAmount = parseFloat(amount) || 0;
  const priceInSol = currentPrice / 1e9;

  const estimatedTokens =
    side === "buy" && priceInSol > 0 ? (rawAmount * 0.99) / priceInSol : 0;
  const estimatedSol = side === "sell" ? rawAmount * priceInSol * 0.99 : 0;
  const fee = rawAmount * 0.01;
  const creatorFee = rawAmount * 0.008;
  const protocolFee = rawAmount * 0.002;

  return (
    <div className="glass-card p-5">
      {/* Tabs */}
      <div className="flex rounded-lg overflow-hidden bg-background-secondary mb-5">
        <button
          className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
            side === "buy"
              ? "bg-success text-white"
              : "text-foreground-muted hover:text-foreground"
          }`}
          onClick={() => setSide("buy")}
        >
          Buy
        </button>
        <button
          className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
            side === "sell"
              ? "bg-danger text-white"
              : "text-foreground-muted hover:text-foreground"
          }`}
          onClick={() => setSide("sell")}
        >
          Sell
        </button>
      </div>

      {/* Amount */}
      <div className="mb-4">
        <label className="block text-[10px] uppercase tracking-wider text-foreground-muted font-mono mb-2">
          {side === "buy" ? "Amount (SOL)" : `Amount (${ticker})`}
        </label>
        <input
          className="input font-mono"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* Estimated output */}
      {rawAmount > 0 && (
        <div className="text-sm text-foreground-muted mb-4 p-3 rounded-lg bg-background-secondary font-mono">
          {side === "buy"
            ? `Est. output: ${estimatedTokens.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${ticker}`
            : `Est. output: ${estimatedSol.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`}
        </div>
      )}

      {/* Slippage */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-mono">
          Slippage
        </span>
        <div className="flex gap-1">
          {SLIPPAGE_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all duration-200 ${
                slippage === opt
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-foreground-muted hover:text-foreground hover:bg-white/5 border border-transparent"
              }`}
              onClick={() => setSlippage(opt)}
            >
              {opt}%
            </button>
          ))}
        </div>
      </div>

      {/* Fee info */}
      <div className="text-xs text-foreground-muted/70 mb-5 leading-relaxed">
        1% fee: 0.8% to creator, 0.2% protocol
        {rawAmount > 0 && (
          <>
            <br />
            <span className="font-mono">
              Fee: {fee.toFixed(4)} SOL (creator: {creatorFee.toFixed(4)},
              protocol: {protocolFee.toFixed(4)})
            </span>
          </>
        )}
      </div>

      {/* Swap feedback */}
      {swapError && (
        <p className="text-xs text-danger mb-3">{swapError}</p>
      )}
      {swapSig && (
        <p className="text-xs text-success mb-3 font-mono">
          Swap confirmed: {swapSig.slice(0, 16)}...
        </p>
      )}

      {/* Action */}
      {connected ? (
        <button
          className={`w-full py-3 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
            side === "buy"
              ? "bg-success text-white hover:brightness-110"
              : "bg-danger text-white hover:brightness-110"
          }`}
          disabled={rawAmount <= 0 || swapLoading}
          onClick={async () => {
            const poolMint = new PublicKey(mint);
            const slippageBps = slippage * 100;
            await swap(poolMint, rawAmount, side === "buy", slippageBps);
          }}
        >
          {swapLoading
            ? "Sending..."
            : `${side === "buy" ? "Buy" : "Sell"} ${ticker}`}
        </button>
      ) : (
        <div className="text-center">
          <p className="text-sm text-foreground-muted mb-3">
            Connect wallet to trade
          </p>
          <WalletMultiButton
            style={{
              borderRadius: 8,
              width: "100%",
              justifyContent: "center",
            }}
          />
        </div>
      )}
    </div>
  );
}
