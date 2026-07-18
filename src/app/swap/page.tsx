"use client";

/* Swap — direct against the FIRE/ETH v4 hook pool.
   Quotes come from the official V4Quoter, swaps go through the Universal
   Router with the exact PoolKey, so routing never depends on Uniswap's
   frontend discovering the hook. Selling routes FIRE through Permit2
   (two one-time approvals), buying is a single transaction. */

import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  useAccount,
  useBalance,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatUnits, maxUint160, maxUint256, parseUnits } from "viem";
import { useEffect, useMemo, useState } from "react";
import { robinhoodChain } from "@/lib/chains";
import { FIRE_CONTRACT, FIRE_ABI } from "@/lib/contract";
import {
  UNIVERSAL_ROUTER, UNIVERSAL_ROUTER_ABI,
  V4_QUOTER, V4_QUOTER_ABI,
  PERMIT2, PERMIT2_ABI, ERC20_ABI,
  POOL_KEY, encodeV4ExactInSingle,
} from "@/lib/uniswap";
import { NavShell, FooterV3, Kicker, MONO, SERIF } from "@/components/fire-v3/shared";

const SLIPPAGE_OPTIONS = [50, 100, 300]; // bps

function fmtAmt(raw: bigint | undefined, dp = 4): string {
  if (raw === undefined) return "—";
  const n = Number(formatUnits(raw, 18));
  if (n > 0 && n < 0.0001) return "<0.0001";
  return n.toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 0 : dp });
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function SwapPage() {
  const { login, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { address: wagmiAddress, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const address = (wagmiAddress || wallets[0]?.address) as `0x${string}` | undefined;

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amountStr, setAmountStr] = useState("");
  const [slippageBps, setSlippageBps] = useState(100);

  const zeroForOne = side === "buy"; // ETH (currency0) in → FIRE out

  const amountIn = useMemo(() => {
    try {
      const v = parseUnits((amountStr || "0") as `${number}`, 18);
      return v > BigInt(0) ? v : BigInt(0);
    } catch {
      return BigInt(0);
    }
  }, [amountStr]);
  const debouncedIn = useDebounced(amountIn, 400);

  /* balances */
  const { data: ethBal } = useBalance({ address, chainId: robinhoodChain.id, query: { refetchInterval: 15_000 } });
  const { data: fireBal, refetch: refetchFire } = useReadContract({
    address: FIRE_CONTRACT, abi: ERC20_ABI, functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    chainId: robinhoodChain.id,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  /* live quote */
  const { data: quote, isFetching: quoting, error: quoteError } = useReadContract({
    address: V4_QUOTER, abi: V4_QUOTER_ABI, functionName: "quoteExactInputSingle",
    args: [{ poolKey: POOL_KEY, zeroForOne, exactAmount: debouncedIn, hookData: "0x" }],
    chainId: robinhoodChain.id,
    query: { enabled: debouncedIn > BigInt(0), refetchInterval: 20_000 },
  });
  const amountOut = quote?.[0];
  const minOut = amountOut !== undefined ? (amountOut * BigInt(10_000 - slippageBps)) / BigInt(10_000) : undefined;

  /* sell fee preview (weighted by tranche age) */
  const { data: sellFeeBps } = useReadContract({
    address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "previewSellFeeBps",
    args: [address ?? "0x0000000000000000000000000000000000000000", debouncedIn],
    chainId: robinhoodChain.id,
    query: { enabled: side === "sell" && !!address && debouncedIn > BigInt(0) },
  });

  /* sell approvals: FIRE → Permit2, then Permit2 → Universal Router */
  const { data: erc20Allowance, refetch: refetchErc20 } = useReadContract({
    address: FIRE_CONTRACT, abi: ERC20_ABI, functionName: "allowance",
    args: [address ?? "0x0000000000000000000000000000000000000000", PERMIT2],
    chainId: robinhoodChain.id,
    query: { enabled: side === "sell" && !!address },
  });
  const { data: p2Allowance, refetch: refetchP2 } = useReadContract({
    address: PERMIT2, abi: PERMIT2_ABI, functionName: "allowance",
    args: [address ?? "0x0000000000000000000000000000000000000000", FIRE_CONTRACT, UNIVERSAL_ROUTER],
    chainId: robinhoodChain.id,
    query: { enabled: side === "sell" && !!address },
  });
  const nowSec = Math.floor(Date.now() / 1000);
  const needsErc20Approve = side === "sell" && amountIn > BigInt(0) && (erc20Allowance ?? BigInt(0)) < amountIn;
  const needsP2Approve =
    side === "sell" && amountIn > BigInt(0) && !needsErc20Approve &&
    ((p2Allowance?.[0] ?? BigInt(0)) < amountIn || (p2Allowance?.[1] ?? 0) <= nowSec);

  /* writes */
  const { writeContract, data: txHash, isPending, error: txError, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => {
    if (confirmed) {
      refetchErc20();
      refetchP2();
      refetchFire();
    }
  }, [confirmed, refetchErc20, refetchP2, refetchFire]);

  const wrongChain = chain && chain.id !== robinhoodChain.id;

  const balanceIn = side === "buy" ? ethBal?.value : (fireBal as bigint | undefined);
  const insufficient = balanceIn !== undefined && amountIn > balanceIn;

  const act = () => {
    reset();
    if (needsErc20Approve) {
      writeContract({
        address: FIRE_CONTRACT, abi: ERC20_ABI, functionName: "approve",
        args: [PERMIT2, maxUint256], chain: robinhoodChain,
      });
      return;
    }
    if (needsP2Approve) {
      writeContract({
        address: PERMIT2, abi: PERMIT2_ABI, functionName: "approve",
        args: [FIRE_CONTRACT, UNIVERSAL_ROUTER, maxUint160, nowSec + 30 * 86400],
        chain: robinhoodChain,
      });
      return;
    }
    if (amountIn === BigInt(0) || minOut === undefined) return;
    const { commands, inputs } = encodeV4ExactInSingle({ zeroForOne, amountIn, minAmountOut: minOut });
    writeContract({
      address: UNIVERSAL_ROUTER, abi: UNIVERSAL_ROUTER_ABI, functionName: "execute",
      args: [commands, inputs, BigInt(nowSec + 600)],
      value: side === "buy" ? amountIn : BigInt(0),
      chain: robinhoodChain,
    });
  };

  const buttonLabel = !authenticated
    ? "Connect wallet"
    : wrongChain
    ? "Switch to Robinhood Chain"
    : isPending
    ? "Confirm in wallet…"
    : confirming
    ? "Swapping…"
    : needsErc20Approve
    ? "Approve FIRE"
    : needsP2Approve
    ? "Approve router"
    : side === "buy"
    ? "Buy FIRE"
    : "Sell FIRE";

  const onButton = () => {
    if (!authenticated) return login();
    if (wrongChain) return switchChain({ chainId: robinhoodChain.id });
    act();
  };

  const disabled =
    authenticated && !wrongChain && (amountIn === BigInt(0) || insufficient || isPending || confirming || (minOut === undefined && !needsErc20Approve && !needsP2Approve));

  return (
    <div className="fv-page min-h-screen">
      <NavShell active="swap" />

      <div className="max-w-[520px] mx-auto px-5 py-14 sm:py-20">
        <Kicker>Direct on the v4 pool · no router roulette</Kicker>
        <h1 className="text-[clamp(32px,5vw,48px)] leading-[1.05] tracking-[-0.02em] font-semibold mb-8">
          Swap <em className={`${SERIF} italic font-normal text-[var(--fv-green)]`}>FIRE.</em>
        </h1>

        <div className="fv-panel p-6">
          {/* side toggle */}
          <div className="flex gap-1.5 mb-6">
            {(["buy", "sell"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setSide(s); reset(); }}
                className={`${MONO} flex-1 text-[11px] tracking-[0.16em] uppercase py-2.5 rounded-full border cursor-pointer transition-colors ${
                  side === s
                    ? "border-[var(--fv-green)] text-[var(--fv-green)] bg-[var(--fv-green-soft)] font-medium"
                    : "border-[var(--fv-line)] text-[var(--fv-muted)] hover:text-[var(--fv-text)] bg-transparent"
                }`}
              >
                {s === "buy" ? "Buy FIRE" : "Sell FIRE"}
              </button>
            ))}
          </div>

          {/* pay */}
          <div className="rounded-2xl border border-[var(--fv-line)] p-4 mb-2">
            <div className="flex justify-between mb-2">
              <span className={`${MONO} text-[10px] tracking-[0.18em] uppercase text-[var(--fv-muted)]`}>You pay</span>
              {address && (
                <button
                  onClick={() => balanceIn !== undefined && setAmountStr(formatUnits(balanceIn, 18))}
                  className={`${MONO} text-[10px] text-[var(--fv-faint)] hover:text-[var(--fv-green)] cursor-pointer bg-transparent border-none`}
                >
                  Bal {fmtAmt(balanceIn)} · MAX
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                inputMode="decimal"
                placeholder="0.0"
                value={amountStr}
                onChange={(e) => /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setAmountStr(e.target.value)}
                className={`${MONO} flex-1 bg-transparent text-[28px] font-medium tracking-[-0.02em] outline-none border-none text-[var(--fv-text)] placeholder:text-[var(--fv-faint)] min-w-0`}
              />
              <span className={`${MONO} text-sm font-medium shrink-0`}>{side === "buy" ? "ETH" : "FIRE"}</span>
            </div>
          </div>

          {/* receive */}
          <div className="rounded-2xl border border-[var(--fv-line)] bg-[var(--fv-surface-2)] p-4">
            <span className={`${MONO} text-[10px] tracking-[0.18em] uppercase text-[var(--fv-muted)] block mb-2`}>
              You receive {quoting && <span className="text-[var(--fv-faint)]">· quoting…</span>}
            </span>
            <div className="flex items-center gap-3">
              <span className={`${MONO} flex-1 text-[28px] font-medium tracking-[-0.02em] ${amountOut ? "text-[var(--fv-green)]" : "text-[var(--fv-faint)]"}`}>
                {debouncedIn > BigInt(0) ? fmtAmt(amountOut) : "0.0"}
              </span>
              <span className={`${MONO} text-sm font-medium shrink-0`}>{side === "buy" ? "FIRE" : "ETH"}</span>
            </div>
          </div>

          {/* details */}
          <div className={`${MONO} text-[11px] space-y-2 mt-4 text-[var(--fv-muted)]`}>
            <div className="flex justify-between">
              <span>Min received ({(slippageBps / 100).toFixed(1)}% slippage)</span>
              <span className="text-[var(--fv-text)]">{fmtAmt(minOut)} {side === "buy" ? "FIRE" : "ETH"}</span>
            </div>
            {side === "sell" && sellFeeBps !== undefined && (
              <div className="flex justify-between">
                <span>Your tranche-weighted sell fee</span>
                <span className="text-[var(--fv-text)]">
                  {(Number(sellFeeBps) / 100).toFixed(2)}%
                  <span className="text-[var(--fv-faint)]"> · 3% at swap, rest rebated</span>
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span>Slippage</span>
              <span className="flex gap-1">
                {SLIPPAGE_OPTIONS.map((bps) => (
                  <button
                    key={bps}
                    onClick={() => setSlippageBps(bps)}
                    className={`${MONO} text-[10px] px-2.5 py-1 rounded-full border cursor-pointer ${
                      slippageBps === bps
                        ? "border-[var(--fv-green)] text-[var(--fv-green)]"
                        : "border-[var(--fv-line)] text-[var(--fv-faint)]"
                    }`}
                  >
                    {(bps / 100).toFixed(1)}%
                  </button>
                ))}
              </span>
            </div>
          </div>

          {/* action */}
          <button
            onClick={onButton}
            disabled={disabled}
            className="fv-btn w-full mt-6 text-[15px] py-4 disabled:opacity-35 disabled:cursor-not-allowed"
          >
            {insufficient ? `Insufficient ${side === "buy" ? "ETH" : "FIRE"}` : buttonLabel}
          </button>

          {side === "sell" && (needsErc20Approve || needsP2Approve) && (
            <p className={`${MONO} text-[10px] text-[var(--fv-faint)] text-center mt-3`}>
              First sell needs {needsErc20Approve ? "two one-time approvals" : "one more approval"} — then it&apos;s one tap.
            </p>
          )}

          {confirmed && txHash && (
            <p className={`${MONO} text-[11px] text-[var(--fv-green)] text-center mt-4`}>
              Swapped.{" "}
              <a
                href={`${robinhoodChain.blockExplorers.default.url}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-[var(--fv-green)]"
              >
                View transaction
              </a>
            </p>
          )}
          {txError && (
            <p className={`${MONO} text-[10px] text-[var(--fv-red)] mt-4 break-words max-h-16 overflow-hidden`}>
              {txError.message.split("\n")[0].slice(0, 160)}
            </p>
          )}
          {quoteError && debouncedIn > BigInt(0) && (
            <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-4`}>
              No quote — the pool may not have liquidity yet. Check back at launch.
            </p>
          )}
        </div>

        <p className={`${MONO} text-[10px] leading-[1.8] text-[var(--fv-faint)] mt-6 tracking-[0.04em]`}>
          Swaps execute against the FIRE/ETH Uniswap v4 pool with the FIRE hook attached — buys pay
          the flat buy fee, sells are charged 3% at swap with the difference vs your tranche rate
          rebated in ETH. Quotes from the official V4Quoter. {!ready && ""}
        </p>
      </div>

      <FooterV3 />
    </div>
  );
}
