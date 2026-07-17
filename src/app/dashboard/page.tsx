"use client";

/* FIRE V4 dashboard — Terminal Dark recreate.
   All contract wiring is preserved from the V4 rewiring commit (FIRE token
   streak/tier/tranches, hook fees + rebates, Distributor epochs + merkle
   claims + jackpot). Presentation follows the v3 scrollworld system:
   warm near-black, robin green, DM Sans + Plex Mono tabular numerals. */

import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useSwitchChain,
  useReadContracts,
} from "wagmi";
import { formatUnits, zeroAddress } from "viem";
import Link from "next/link";
import Image from "next/image";
import { robinhoodChain } from "@/lib/chains";
import {
  FIRE_CONTRACT, FIRE_ABI,
  HOOK_CONTRACT, HOOK_ABI,
  DISTRIBUTOR_CONTRACT, DISTRIBUTOR_ABI, ERC20_META_ABI,
  TIER, sellFeeBpsAtAgeDays,
} from "@/lib/contract";
import { FooterV3, MONO } from "@/components/fire-v3/shared";
import { useEffect, useMemo, useState } from "react";

// ─── helpers ──────────────────────────────────────────────────

function fmtTokens(raw: bigint | undefined, dp = 0, decimals = 18): string {
  if (raw === undefined) return "—";
  return Number(formatUnits(raw, decimals)).toLocaleString("en-US", { maximumFractionDigits: dp });
}
function fmtEth(raw: bigint | undefined, dp = 4): string {
  if (raw === undefined) return "—";
  return Number(formatUnits(raw, 18)).toLocaleString("en-US", { maximumFractionDigits: dp });
}
function shortAddr(a: string) { return `${a.slice(0, 6)}...${a.slice(-4)}`; }

const KICKER = `${MONO} text-[10px] font-medium tracking-[0.22em] uppercase text-[var(--fv-green)]`;
const LABEL = `${MONO} text-[10px] tracking-[0.16em] uppercase text-[var(--fv-muted)]`;
const ROW = "flex items-center justify-between border border-[var(--fv-line)] rounded-xl px-3.5 py-2.5";

function Panel({ title, children, accent = false }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`fv-panel p-5 sm:p-6 ${accent ? "border-[rgba(0,200,5,0.35)]" : ""}`}>
      <p className={`${KICKER} mb-4`}>{title}</p>
      {children}
    </div>
  );
}

function Stat({ label, value, sub, green = false }: { label: string; value: React.ReactNode; sub?: React.ReactNode; green?: boolean }) {
  return (
    <div>
      <p className={`${LABEL} mb-1.5`}>{label}</p>
      <p className={`${MONO} text-[22px] leading-none font-medium ${green ? "text-[var(--fv-green)]" : ""}`}>{value}</p>
      {sub && <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-1.5`}>{sub}</p>}
    </div>
  );
}

function Bar({ pct, danger = false }: { pct: number; danger?: boolean }) {
  return (
    <div className="h-1.5 rounded-full bg-[var(--fv-surface-2)] overflow-hidden">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: danger ? "var(--fv-red)" : "var(--fv-green)" }}
      />
    </div>
  );
}

// ─── stock symbol lookup ──────────────────────────────────────

function useAssetMeta(assets: readonly `0x${string}`[] | undefined) {
  const contracts = useMemo(
    () =>
      (assets || [])
        .filter((a) => a !== zeroAddress)
        .flatMap((a) => [
          { address: a, abi: ERC20_META_ABI, functionName: "symbol" as const },
          { address: a, abi: ERC20_META_ABI, functionName: "decimals" as const },
        ]),
    [assets]
  );
  const { data } = useReadContracts({ contracts, query: { enabled: contracts.length > 0 } });
  return useMemo(() => {
    const meta: Record<string, { symbol: string; decimals: number }> = {
      [zeroAddress]: { symbol: "ETH", decimals: 18 },
    };
    const nonEth = (assets || []).filter((a) => a !== zeroAddress);
    nonEth.forEach((a, i) => {
      meta[a.toLowerCase()] = {
        symbol: (data?.[i * 2]?.result as string) || shortAddr(a),
        decimals: Number(data?.[i * 2 + 1]?.result ?? 18),
      };
    });
    meta[zeroAddress] = { symbol: "ETH", decimals: 18 };
    return meta;
  }, [assets, data]);
}

// ─── PROTOCOL OVERVIEW ────────────────────────────────────────

function ProtocolOverview() {
  const { data: buyFee }   = useReadContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "buyFeeBps" });
  const { data: sellFlat } = useReadContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "sellFeeFlatBps" });
  const { data: divEth }   = useReadContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "dividendEthAccumulated" });
  const { data: burnEth }  = useReadContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "burnEthAccumulated" });
  const { data: burned }   = useReadContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "totalFireBurned" });
  const { data: reserve }  = useReadContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "rebateReserve" });
  const { data: holders }  = useReadContract({ address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "holderCount" });
  const { data: basket }   = useReadContract({ address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI, functionName: "getBasket" });
  const { data: minStreak } = useReadContract({ address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI, functionName: "jackpotMinStreakDays" });
  const { data: epochCount } = useReadContract({ address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI, functionName: "epochCount" });

  const basketTokens = basket?.[0];
  const basketWeights = basket?.[1];
  const meta = useAssetMeta(basketTokens);

  const jackpotReads = useMemo(
    () =>
      (basketTokens || []).map((a) => ({
        address: DISTRIBUTOR_CONTRACT,
        abi: DISTRIBUTOR_ABI,
        functionName: "jackpotReserve" as const,
        args: [a] as const,
      })),
    [basketTokens]
  );
  const { data: jackpots } = useReadContracts({ contracts: jackpotReads, query: { enabled: jackpotReads.length > 0 } });

  // last few epochs
  const ec = Number(epochCount ?? BigInt(0));
  const epochIds = useMemo(() => Array.from({ length: Math.min(ec, 4) }, (_, i) => ec - 1 - i), [ec]);
  const { data: epochData } = useReadContracts({
    contracts: epochIds.map((id) => ({
      address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI,
      functionName: "epochs" as const, args: [BigInt(id)] as const,
    })),
    query: { enabled: epochIds.length > 0 },
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Panel title="Buy fee"><Stat label="of ETH leg" value={buyFee !== undefined ? `${Number(buyFee) / 100}%` : "—"} sub="flat, every buy" /></Panel>
        <Panel title="Sell fee"><Stat label="at swap → rebated" value={sellFlat !== undefined ? `${Number(sellFlat) / 100}% → 1%` : "—"} sub="decays over 90d per tranche" /></Panel>
        <Panel title="Holders"><Stat label="tracked wallets" value={holders !== undefined ? Number(holders).toLocaleString() : "—"} /></Panel>
        <Panel title="FIRE burned"><Stat label="buyback-burn, lifetime" value={fmtTokens(burned as bigint | undefined)} sub="20% of every fee" /></Panel>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Pending Friday pot" accent>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Dividend ETH (80%)" value={`${fmtEth(divEth as bigint | undefined)} ETH`} sub="swept → stock basket weekly" green />
            <Stat label="Burn ETH (20%)" value={`${fmtEth(burnEth as bigint | undefined)} ETH`} sub="→ FIRE buyback-burn" />
          </div>
          <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-4`}>
            Rebate reserve (held for diamond-hand refunds): {fmtEth(reserve as bigint | undefined)} ETH
          </p>
        </Panel>

        <Panel title="The stock index">
          {basketTokens && basketTokens.length > 0 ? (
            <div className="space-y-2.5">
              {basketTokens.map((a, i) => {
                const m = meta[a === zeroAddress ? zeroAddress : a.toLowerCase()];
                const w = Number(basketWeights?.[i] ?? 0) / 100;
                return (
                  <div key={a} className="flex items-center gap-3">
                    <span className={`${MONO} text-xs font-medium w-16`}>{m?.symbol ?? shortAddr(a)}</span>
                    <div className="flex-1"><Bar pct={w} /></div>
                    <span className={`${MONO} text-xs w-12 text-right text-[var(--fv-muted)]`}>{w.toFixed(1)}%</span>
                  </div>
                );
              })}
              <p className={`${MONO} text-[10px] text-[var(--fv-faint)] pt-1.5`}>
                80% of all fees buy this basket every Friday. Set on-chain — verify anytime.
              </p>
            </div>
          ) : (
            <p className={`${MONO} text-xs text-[var(--fv-muted)]`}>Basket not set yet.</p>
          )}
        </Panel>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Friday jackpot">
          <div className="space-y-1.5">
            {(basketTokens || []).map((a, i) => {
              const m = meta[a === zeroAddress ? zeroAddress : a.toLowerCase()];
              const r = jackpots?.[i]?.result as bigint | undefined;
              if (!r || r === BigInt(0)) return null;
              return (
                <p key={a} className={`${MONO} text-xl font-medium text-[var(--fv-green)]`}>
                  {fmtTokens(r, 4, m?.decimals ?? 18)} <span className="text-xs text-[var(--fv-muted)]">{m?.symbol}</span>
                </p>
              );
            })}
            <p className={`${MONO} text-[10px] text-[var(--fv-faint)] pt-2 leading-relaxed`}>
              One winner every Friday · {minStreak !== undefined ? Number(minStreak) : 90}d+ streak to enter ·
              odds = streak × bag · draw block committed publicly, verifiable from the blockhash
            </p>
          </div>
        </Panel>

        <Panel title="Recent dividend epochs">
          {epochIds.length === 0 ? (
            <p className={`${MONO} text-xs text-[var(--fv-muted)]`}>No epochs posted yet — first Friday pending.</p>
          ) : (
            <div className="space-y-2">
              {epochIds.map((id, i) => {
                const e = epochData?.[i]?.result as
                  | readonly [string, `0x${string}`, bigint, bigint, bigint, boolean]
                  | undefined;
                if (!e) return null;
                const m = meta[e[1] === zeroAddress ? zeroAddress : e[1].toLowerCase()];
                const pct = e[2] > BigInt(0) ? Number((e[3] * BigInt(100)) / e[2]) : 0;
                return (
                  <div key={id} className={ROW}>
                    <span className={`${MONO} text-xs`}>#{id} · {m?.symbol ?? shortAddr(e[1])}</span>
                    <span className={`${MONO} text-xs text-[var(--fv-muted)]`}>{fmtTokens(e[2], 2, m?.decimals ?? 18)} · {pct}% claimed{e[5] ? " · expired" : ""}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ─── STREAK / TIER ────────────────────────────────────────────

function StreakTierCard({ status }: {
  status: {
    balance: bigint; streakDays_: bigint; tierMultX100: bigint;
    peak: bigint; breakBelowBalance: bigint; tranches_: bigint; migrated: boolean;
  };
}) {
  const days = Number(status.streakDays_);
  const mult = Number(status.tierMultX100) / 100;
  const rampPct = Math.min(days / TIER.rampDays, 1) * 100;
  const inDanger =
    status.peak > BigInt(0) &&
    status.balance < (status.breakBelowBalance * BigInt(120)) / BigInt(100); // within 20% of the break line

  return (
    <Panel title="Streak & tier" accent>
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4 mb-5">
        <div>
          <p className={`${LABEL} mb-1.5`}>Streak</p>
          <p className={`${MONO} text-[44px] leading-none font-medium tracking-[-0.02em]`}>
            {days}<span className="text-sm text-[var(--fv-muted)]"> days</span>
          </p>
          <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-1.5`}>
            {status.migrated ? "carried from Base · OG" : "uncapped — pride lives here"}
          </p>
        </div>
        <div>
          <p className={`${LABEL} mb-1.5`}>Tier</p>
          <p className={`${MONO} text-[44px] leading-none font-medium text-[var(--fv-green)] tracking-[-0.02em]`}>
            {mult.toFixed(2)}x
          </p>
          <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-1.5`}>
            {status.migrated && days < TIER.rampDays ? "5x migration floor active" : days >= TIER.rampDays ? "max base reached" : `→ 5x at ${TIER.rampDays}d`}
          </p>
        </div>
        <div>
          <p className={`${LABEL} mb-1.5`}>Tranches</p>
          <p className={`${MONO} text-[44px] leading-none font-medium tracking-[-0.02em]`}>{Number(status.tranches_)}</p>
          <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-1.5`}>30-day buy buckets</p>
        </div>
        {days >= TIER.rampDays && (
          <span className={`${MONO} text-[9px] tracking-[0.16em] uppercase border border-[var(--fv-green)] text-[var(--fv-green)] rounded-full px-3 py-1.5 mb-1`}>
            Jackpot eligible
          </span>
        )}
      </div>

      {/* ramp bar with prestige markers */}
      <Bar pct={rampPct} />
      <div className={`${MONO} flex justify-between text-[9px] text-[var(--fv-faint)] tracking-[0.08em] mt-2 mb-4 uppercase`}>
        <span>1x</span>
        <span>5x @ 90d</span>
        <span>+0.25x @ 180d</span>
        <span>+0.25x @ 365d · cap 5.5x</span>
      </div>

      <div className={`rounded-xl border px-3.5 py-2.5 ${inDanger ? "border-[var(--fv-red)] bg-[var(--fv-red-soft)]" : "border-[var(--fv-line)]"}`}>
        <p className={`${MONO} text-[11px] leading-relaxed ${inDanger ? "" : "text-[var(--fv-muted)]"}`}>
          Streak breaks if balance drops below{" "}
          <span className="font-medium text-[var(--fv-text)]">{fmtTokens(status.breakBelowBalance)} FIRE</span>{" "}
          (50% of your peak {fmtTokens(status.peak)}).
          {inDanger && <span className="text-[var(--fv-red)] font-medium"> You are close to the line.</span>}
        </p>
      </div>
    </Panel>
  );
}

// ─── TRANCHES + SELL FEE ──────────────────────────────────────

function TranchesCard({ address, status }: {
  address: `0x${string}`;
  status: { balance: bigint; tranches_: bigint };
}) {
  const count = Number(status.tranches_);
  const { data: trancheData } = useReadContracts({
    contracts: Array.from({ length: Math.min(count, 12) }, (_, i) => ({
      address: FIRE_CONTRACT, abi: FIRE_ABI,
      functionName: "trancheAt" as const,
      args: [address, BigInt(count - 1 - i)] as const, // newest first (LIFO order)
    })),
    query: { enabled: count > 0 },
  });

  const [sellPct, setSellPct] = useState(25);
  const sellAmount = (status.balance * BigInt(sellPct)) / BigInt(100);
  const { data: previewBps } = useReadContract({
    address: FIRE_CONTRACT, abi: FIRE_ABI,
    functionName: "previewSellFeeBps",
    args: [address, sellAmount],
    query: { enabled: sellAmount > BigInt(0) },
  });

  const now = Math.floor(Date.now() / 1000);

  return (
    <Panel title="Your tranches · LIFO — sells eat newest first">
      {count === 0 ? (
        <p className={`${MONO} text-xs text-[var(--fv-muted)]`}>No tranches yet — buy some FIRE.</p>
      ) : (
        <div className="space-y-2 mb-5">
          {(trancheData || []).map((t, i) => {
            const r = t.result as readonly [bigint, bigint] | undefined;
            if (!r) return null;
            const ageDays = Math.max(0, (now - Number(r[0])) / 86400);
            const feeBps = sellFeeBpsAtAgeDays(ageDays);
            return (
              <div key={i} className={ROW}>
                <span className={`${MONO} text-xs`}>
                  {i === 0 && <span className="text-[var(--fv-green)] font-medium">next out · </span>}
                  {fmtTokens(r[1])} FIRE
                </span>
                <span className={`${MONO} text-xs text-[var(--fv-muted)]`}>
                  {ageDays.toFixed(0)}d old · sell fee{" "}
                  <span className={feeBps <= 100 ? "text-[var(--fv-green)] font-medium" : "text-[var(--fv-text)]"}>{(feeBps / 100).toFixed(2)}%</span>
                </span>
              </div>
            );
          })}
          {count > 12 && <p className={`${MONO} text-[10px] text-[var(--fv-faint)]`}>…{count - 12} older tranches</p>}
        </div>
      )}

      {status.balance > BigInt(0) && (
        <div className="border-t border-[var(--fv-line)] pt-4">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <p className={LABEL}>Sell fee preview</p>
            <p className={`${MONO} text-xs text-[var(--fv-muted)]`}>
              sell {sellPct}% ({fmtTokens(sellAmount)} FIRE) → fee{" "}
              <span className="text-[var(--fv-green)] font-medium">
                {previewBps !== undefined ? `${(Number(previewBps) / 100).toFixed(2)}%` : "—"}
              </span>{" "}
              of the ETH leg
            </p>
          </div>
          <input
            type="range" min={1} max={100} value={sellPct}
            onChange={(e) => setSellPct(Number(e.target.value))}
            className="w-full accent-[#00C805]"
          />
          <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-2`}>
            Charged flat 3% at swap — the difference vs your tranche rate comes back as an ETH rebate below.
          </p>
        </div>
      )}
    </Panel>
  );
}

// ─── REBATE ───────────────────────────────────────────────────

function RebateCard({ address }: { address: `0x${string}` }) {
  const { data: owed, refetch } = useReadContract({
    address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "rebateOwed", args: [address],
  });
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => { if (isSuccess) refetch(); }, [isSuccess, refetch]);

  return (
    <Panel title="Diamond-hand rebate">
      <div className="flex items-center justify-between gap-4">
        <Stat label="Rebate ETH" value={`${fmtEth(owed as bigint | undefined)} ETH`} sub="auto-paid every Friday — or claim now" green={!!owed && owed > BigInt(0)} />
        <button
          disabled={!owed || owed === BigInt(0) || isPending}
          onClick={() => writeContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "claimRebate" })}
          className="fv-btn text-[13px] px-5 py-2.5 whitespace-nowrap disabled:opacity-35 disabled:cursor-not-allowed"
        >
          {isPending ? "Claiming…" : "Claim rebate"}
        </button>
      </div>
    </Panel>
  );
}

// ─── DIVIDEND EPOCHS + CLAIMS ─────────────────────────────────

type EpochClaim = {
  epochId: number; asset: `0x${string}`; decimals: number;
  amount: bigint; proof: `0x${string}`[];
  open: boolean; alreadyClaimed: boolean; symbol: string;
};

function DividendsCard({ address }: { address: `0x${string}` }) {
  const { data: epochCount } = useReadContract({
    address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI, functionName: "epochCount",
  });
  const ec = Number(epochCount ?? BigInt(0));
  const ids = useMemo(() => Array.from({ length: Math.min(ec, 16) }, (_, i) => ec - 1 - i), [ec]);

  const { data: claimStates, refetch: refetchStates } = useReadContracts({
    contracts: ids.map((id) => ({
      address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI,
      functionName: "claimable" as const, args: [BigInt(id), address] as const,
    })),
    query: { enabled: ids.length > 0 },
  });

  const [claims, setClaims] = useState<EpochClaim[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ids.length === 0 || !claimStates) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const out: EpochClaim[] = [];
      for (let i = 0; i < ids.length; i++) {
        const st = claimStates[i]?.result as readonly [boolean, boolean] | undefined;
        if (!st) continue;
        try {
          const res = await fetch(`/api/claims/${ids[i]}?address=${address.toLowerCase()}`);
          if (!res.ok) continue;
          const d = await res.json();
          if (!d.found || d.amount === "0") continue;
          out.push({
            epochId: ids[i],
            asset: d.asset as `0x${string}`,
            decimals: d.decimals ?? 18,
            amount: BigInt(d.amount),
            proof: d.proof as `0x${string}`[],
            open: st[0],
            alreadyClaimed: st[1],
            symbol: "",
          });
        } catch { /* skip epoch */ }
      }
      if (!cancelled) { setClaims(out); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [ids, claimStates, address]);

  const assetList = useMemo(() => [...new Set(claims.map((c) => c.asset))] as `0x${string}`[], [claims]);
  const meta = useAssetMeta(assetList);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => { if (isSuccess) refetchStates(); }, [isSuccess, refetchStates]);

  const openUnclaimed = claims.filter((c) => c.open && !c.alreadyClaimed);

  return (
    <Panel title="Stock dividends" accent>
      {loading && claims.length === 0 ? (
        <p className={`${MONO} text-xs text-[var(--fv-muted)]`}>Checking epochs…</p>
      ) : claims.length === 0 ? (
        <p className={`${MONO} text-xs text-[var(--fv-muted)]`}>
          No dividend allocations yet. Hold through a Friday snapshot — payouts are pro-rata by bag × tier.
        </p>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {claims.map((c) => {
              const m = meta[c.asset === zeroAddress ? zeroAddress : c.asset.toLowerCase()];
              return (
                <div key={c.epochId} className={ROW}>
                  <span className={`${MONO} text-xs flex items-center gap-2.5`}>
                    <span className={`${MONO} w-8 h-8 rounded-full border border-[var(--fv-line-strong)] flex items-center justify-center text-[8px] font-medium shrink-0`}>
                      {(m?.symbol ?? "…").slice(0, 4)}
                    </span>
                    <span>
                      Epoch #{c.epochId} ·{" "}
                      <span className="font-medium text-[var(--fv-text)]">{fmtTokens(c.amount, 4, m?.decimals ?? c.decimals)} {m?.symbol ?? "…"}</span>
                    </span>
                  </span>
                  {c.alreadyClaimed ? (
                    <span className={`${MONO} text-[10px] uppercase tracking-[0.1em] text-[var(--fv-green)]`}>claimed ✓</span>
                  ) : !c.open ? (
                    <span className={`${MONO} text-[10px] uppercase tracking-[0.1em] text-[var(--fv-faint)]`}>window closed</span>
                  ) : (
                    <button
                      disabled={isPending}
                      onClick={() =>
                        writeContract({
                          address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI,
                          functionName: "claim",
                          args: [BigInt(c.epochId), c.amount, c.proof],
                        })
                      }
                      className="fv-btn text-[11px] px-4 py-1.5 disabled:opacity-35"
                    >
                      Claim
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {openUnclaimed.length > 1 && (
            <button
              disabled={isPending}
              onClick={() =>
                writeContract({
                  address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI,
                  functionName: "claimMany",
                  args: [
                    openUnclaimed.map((c) => BigInt(c.epochId)),
                    openUnclaimed.map((c) => c.amount),
                    openUnclaimed.map((c) => c.proof),
                  ],
                })
              }
              className="fv-btn w-full text-[13px] py-3 disabled:opacity-35"
            >
              {isPending ? "Claiming…" : `Claim all ${openUnclaimed.length} epochs`}
            </button>
          )}
          <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-3`}>
            Unclaimed dividends roll into the Friday jackpot after 8 weeks. Don&apos;t sleep on it.
          </p>
        </>
      )}
    </Panel>
  );
}

// ─── JACKPOT ELIGIBILITY ──────────────────────────────────────

function JackpotCard({ address }: { address: `0x${string}` }) {
  const { data: weight } = useReadContract({
    address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "jackpotWeight", args: [address],
  });
  const { data: sd } = useReadContract({
    address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "streakDays", args: [address],
  });
  const { data: minStreak } = useReadContract({
    address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI, functionName: "jackpotMinStreakDays",
  });

  const min = Number(minStreak ?? BigInt(90));
  const days = Number(sd ?? BigInt(0));
  const eligible = days >= min;

  return (
    <Panel title="Friday jackpot entry">
      {eligible ? (
        <div>
          <p className={`${MONO} text-xl font-medium text-[var(--fv-green)]`}>You&apos;re in the draw</p>
          <p className={`${MONO} text-[11px] text-[var(--fv-muted)] mt-2 leading-relaxed`}>
            Weight = streak × bag = <span className="font-medium text-[var(--fv-text)]">{fmtTokens(weight as bigint | undefined)}</span>.
            Every day held and every FIRE added compounds your odds. One winner every Friday.
          </p>
        </div>
      ) : (
        <div>
          <p className={`${MONO} text-xl font-medium`}>{min - days} days to entry</p>
          <div className="mt-3 mb-2"><Bar pct={Math.min(days / min, 1) * 100} /></div>
          <p className={`${MONO} text-[10px] text-[var(--fv-faint)] leading-relaxed`}>
            {min}d+ streak unlocks the weekly jackpot. Odds = streak × bag — splitting wallets divides both.
          </p>
        </div>
      )}
    </Panel>
  );
}

// ─── PERSONAL DASHBOARD ───────────────────────────────────────

function Dashboard({ address, readOnly = false }: { address: `0x${string}`; readOnly?: boolean }) {
  const { data: status } = useReadContract({
    address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "holderStatus", args: [address],
  });

  if (!status) {
    return <p className={`${MONO} text-sm text-[var(--fv-muted)] py-12 text-center`}>Loading holder data…</p>;
  }

  return (
    <div className="space-y-4">
      <StreakTierCard status={status} />
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <TranchesCard address={address} status={status} />
        <div className="space-y-4">
          {!readOnly && <RebateCard address={address} />}
          <JackpotCard address={address} />
        </div>
      </div>
      {!readOnly ? <DividendsCard address={address} /> : null}
    </div>
  );
}

// ─── PAGE SHELL ───────────────────────────────────────────────

export default function DashboardPage() {
  const { login, logout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { address: wagmiAddress } = useAccount();
  const { switchChain } = useSwitchChain();

  const address = (wagmiAddress || wallets[0]?.address) as `0x${string}` | undefined;

  const [view, setView] = useState<"protocol" | "personal" | "lookup">("protocol");
  const [lookupInput, setLookupInput] = useState("");
  const [lookupAddress, setLookupAddress] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    if (authenticated && address) setView("personal");
  }, [authenticated, address]);

  useEffect(() => {
    if (authenticated) switchChain?.({ chainId: robinhoodChain.id });
  }, [authenticated, switchChain]);

  const doLookup = () => {
    if (/^0x[a-fA-F0-9]{40}$/.test(lookupInput)) {
      setLookupAddress(lookupInput as `0x${string}`);
      setView("lookup");
    }
  };

  const tab = (key: "protocol" | "personal" | "lookup", label: string) => (
    <button
      onClick={() => setView(key)}
      className={`${MONO} text-[11px] px-4 py-2.5 border-b-2 -mb-px transition-colors tracking-[0.14em] uppercase cursor-pointer ${
        view === key
          ? "border-[var(--fv-green)] text-[var(--fv-green)] font-medium"
          : "border-transparent text-[var(--fv-muted)] hover:text-[var(--fv-text)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fv-page min-h-screen">
      {/* nav — scrollworld grammar */}
      <nav className="sticky top-0 z-50 bg-[rgba(17,14,8,0.72)] backdrop-blur-xl border-b border-[var(--fv-line)]">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/v3" className="flex items-center gap-2.5 no-underline text-[var(--fv-text)]">
            <Image src="/brand/fire-glyph.svg" alt="FIRE" width={26} height={26} className="w-[26px] h-[26px]" />
            <span className="font-semibold text-[16px] tracking-[-0.01em] leading-none">
              FIRE
              <span className={`${MONO} block text-[8px] tracking-[0.24em] text-[var(--fv-muted)] leading-none mt-[3px] uppercase font-normal`}>
                Dividends, in stocks
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <input
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLookup()}
                placeholder="lookup 0x…"
                className={`${MONO} text-xs px-3.5 py-2 rounded-full border border-[var(--fv-line-strong)] bg-transparent text-[var(--fv-text)] placeholder:text-[var(--fv-faint)] w-44 focus:outline-none focus:border-[var(--fv-green)]`}
              />
              <button onClick={doLookup} className="fv-btn-ghost text-xs px-3.5 py-2">→</button>
            </div>
            {authenticated ? (
              <button onClick={logout} className={`fv-btn-ghost ${MONO} text-[11px] px-4 py-2 uppercase tracking-[0.08em]`}>
                {address ? shortAddr(address) : "…"} · out
              </button>
            ) : (
              <button onClick={login} className="fv-btn text-[13px] px-5 py-2">
                Connect
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 py-8 sm:py-10">
        {/* title */}
        <div className="mb-7">
          <p className={`${KICKER} mb-3`}>Robinhood Chain · get paid stocks for holding</p>
          <h1 className="text-[clamp(26px,4vw,40px)] leading-[1.05] tracking-[-0.02em] font-semibold">
            {view === "personal" ? (
              <>Your dividend <em className={`font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fv-green)]`}>account.</em></>
            ) : view === "lookup" ? (
              <>Wallet <em className={`font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fv-green)]`}>lookup.</em></>
            ) : (
              <>The <em className={`font-[family-name:var(--font-serif-inst)] italic font-normal text-[var(--fv-green)]`}>machine.</em></>
            )}
          </h1>
        </div>

        {/* tabs */}
        <div className="flex items-center gap-1 mb-7 border-b border-[var(--fv-line)]">
          {tab("protocol", "Protocol")}
          {authenticated && address && tab("personal", "My account")}
          {lookupAddress && tab("lookup", shortAddr(lookupAddress))}
        </div>

        {/* content */}
        {!ready ? (
          <div className="text-center py-20">
            <p className={`${MONO} text-sm text-[var(--fv-muted)]`}>Loading…</p>
          </div>
        ) : view === "personal" && address ? (
          <Dashboard address={address} />
        ) : view === "lookup" && lookupAddress ? (
          <div className="space-y-4">
            <div className="fv-panel px-4 py-2.5">
              <p className={`${MONO} text-xs break-all text-[var(--fv-muted)]`}>{lookupAddress}</p>
            </div>
            <Dashboard address={lookupAddress} readOnly />
          </div>
        ) : (
          <ProtocolOverview />
        )}
      </div>

      <FooterV3 />
    </div>
  );
}
