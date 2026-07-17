"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useSwitchChain,
  useReadContracts,
} from "wagmi";
import { formatUnits, parseUnits, zeroAddress } from "viem";
import Link from "next/link";
import { robinhoodChain } from "@/lib/chains";
import {
  FIRE_CONTRACT, FIRE_ABI,
  HOOK_CONTRACT, HOOK_ABI,
  DISTRIBUTOR_CONTRACT, DISTRIBUTOR_ABI, ERC20_META_ABI,
  TIER, tierAtDays, sellFeeBpsAtAgeDays,
} from "@/lib/contract";
import { Disclaimer } from "@/components/disclaimer";
import { useEffect, useMemo, useState } from "react";

// ─── helpers ──────────────────────────────────────────────────

const mono = "font-[family-name:var(--font-mono-jb)]";
const display = "font-[family-name:var(--font-display)]";

function fmtTokens(raw: bigint | undefined, dp = 0, decimals = 18): string {
  if (raw === undefined) return "—";
  return Number(formatUnits(raw, decimals)).toLocaleString("en-US", { maximumFractionDigits: dp });
}
function fmtEth(raw: bigint | undefined, dp = 4): string {
  if (raw === undefined) return "—";
  return Number(formatUnits(raw, 18)).toLocaleString("en-US", { maximumFractionDigits: dp });
}
function shortAddr(a: string) { return `${a.slice(0, 6)}...${a.slice(-4)}`; }

function Panel({ title, children, accent = false }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`border-2 border-[var(--fr-ink)] bg-[var(--fr-paper)] ${accent ? "shadow-[6px_6px_0_var(--fr-fire)]" : ""}`}>
      <div className="border-b-2 border-[var(--fr-ink)] px-4 py-2">
        <h3 className={`${mono} text-[11px] tracking-[0.18em] uppercase font-bold`}>{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <p className={`${mono} text-[10px] uppercase tracking-[0.14em] opacity-55`}>{label}</p>
      <p className={`${display} text-2xl text-[var(--fr-ink)]`}>{value}</p>
      {sub && <p className={`${mono} text-[10px] opacity-60 mt-0.5`}>{sub}</p>}
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Panel title="Buy fee"><Stat label="of ETH leg" value={buyFee !== undefined ? `${Number(buyFee) / 100}%` : "—"} sub="flat, every buy" /></Panel>
        <Panel title="Sell fee"><Stat label="at swap → rebated" value={sellFlat !== undefined ? `${Number(sellFlat) / 100}% → 1%` : "—"} sub="decays over 90d per tranche" /></Panel>
        <Panel title="Holders"><Stat label="tracked wallets" value={holders !== undefined ? Number(holders).toLocaleString() : "—"} /></Panel>
        <Panel title="FIRE burned"><Stat label="buyback-burn, lifetime" value={fmtTokens(burned as bigint | undefined)} sub="🔥 20% of every fee" /></Panel>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Pending Friday pot" accent>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Dividend ETH (80%)" value={`${fmtEth(divEth as bigint | undefined)} ETH`} sub="swept → stock basket weekly" />
            <Stat label="Burn ETH (20%)" value={`${fmtEth(burnEth as bigint | undefined)} ETH`} sub="→ FIRE buyback-burn" />
          </div>
          <p className={`${mono} text-[10px] opacity-55 mt-3`}>
            Rebate reserve (held for diamond-hand refunds): {fmtEth(reserve as bigint | undefined)} ETH
          </p>
        </Panel>

        <Panel title="The stock index">
          {basketTokens && basketTokens.length > 0 ? (
            <div className="space-y-2">
              {basketTokens.map((a, i) => {
                const m = meta[a === zeroAddress ? zeroAddress : a.toLowerCase()];
                const w = Number(basketWeights?.[i] ?? 0) / 100;
                return (
                  <div key={a} className="flex items-center gap-3">
                    <span className={`${mono} text-xs font-bold w-16`}>{m?.symbol ?? shortAddr(a)}</span>
                    <div className="flex-1 h-3 border border-[var(--fr-ink)] bg-[var(--fr-paper)]">
                      <div className="h-full bg-[var(--fr-fire)]" style={{ width: `${w}%` }} />
                    </div>
                    <span className={`${mono} text-xs w-12 text-right`}>{w.toFixed(1)}%</span>
                  </div>
                );
              })}
              <p className={`${mono} text-[10px] opacity-55 pt-1`}>
                80% of all fees buy this basket every Friday. Set on-chain — verify anytime.
              </p>
            </div>
          ) : (
            <p className={`${mono} text-xs opacity-55`}>Basket not set yet.</p>
          )}
        </Panel>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Friday jackpot">
          <div className="space-y-1">
            {(basketTokens || []).map((a, i) => {
              const m = meta[a === zeroAddress ? zeroAddress : a.toLowerCase()];
              const r = jackpots?.[i]?.result as bigint | undefined;
              if (!r || r === BigInt(0)) return null;
              return (
                <p key={a} className={`${display} text-xl`}>
                  {fmtTokens(r, 4, m?.decimals ?? 18)} <span className={`${mono} text-xs`}>{m?.symbol}</span>
                </p>
              );
            })}
            <p className={`${mono} text-[10px] opacity-60 pt-2`}>
              One winner every Friday · {minStreak !== undefined ? Number(minStreak) : 90}d+ streak to enter ·
              odds = streak × bag · draw block committed publicly, verifiable from the blockhash
            </p>
          </div>
        </Panel>

        <Panel title="Recent dividend epochs">
          {epochIds.length === 0 ? (
            <p className={`${mono} text-xs opacity-55`}>No epochs posted yet — first Friday pending.</p>
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
                  <div key={id} className="flex items-center justify-between border border-[var(--fr-ink)]/30 px-3 py-1.5">
                    <span className={`${mono} text-xs`}>#{id} · {m?.symbol ?? shortAddr(e[1])}</span>
                    <span className={`${mono} text-xs`}>{fmtTokens(e[2], 2, m?.decimals ?? 18)} · {pct}% claimed{e[5] ? " · expired" : ""}</span>
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
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Stat label="Streak" value={<>{days}<span className={`${mono} text-sm`}> days</span></>} sub={status.migrated ? "carried from Base · OG" : "uncapped — pride lives here"} />
        <Stat label="Tier" value={<span className="text-[var(--fr-fire)]">{mult.toFixed(2)}x</span>} sub={status.migrated && days < TIER.rampDays ? "5x migration floor active" : days >= TIER.rampDays ? "max base reached" : `→ 5x at ${TIER.rampDays}d`} />
        <Stat label="Tranches" value={Number(status.tranches_)} sub="30-day buy buckets" />
      </div>

      {/* ramp bar with prestige markers */}
      <div className="relative h-4 border-2 border-[var(--fr-ink)] bg-[var(--fr-paper)] mb-1">
        <div className="h-full bg-[var(--fr-fire)]" style={{ width: `${rampPct}%` }} />
      </div>
      <div className={`${mono} flex justify-between text-[10px] opacity-60 mb-3`}>
        <span>1x</span>
        <span>5x @ 90d</span>
        <span>+0.25x @ 180d</span>
        <span>+0.25x @ 365d · cap 5.5x</span>
      </div>

      <div className={`border-2 px-3 py-2 ${inDanger ? "border-[var(--fr-fire)] bg-[var(--fr-fire)]/10" : "border-[var(--fr-ink)]/25"}`}>
        <p className={`${mono} text-[11px]`}>
          Streak breaks if balance drops below{" "}
          <span className="font-bold">{fmtTokens(status.breakBelowBalance)} FIRE</span>{" "}
          (50% of your peak {fmtTokens(status.peak)}).
          {inDanger && <span className="text-[var(--fr-fire)] font-bold"> You are close to the line.</span>}
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
    <Panel title="Your tranches (LIFO — sells eat newest first)">
      {count === 0 ? (
        <p className={`${mono} text-xs opacity-55`}>No tranches yet — buy some FIRE.</p>
      ) : (
        <div className="space-y-1.5 mb-4">
          {(trancheData || []).map((t, i) => {
            const r = t.result as readonly [bigint, bigint] | undefined;
            if (!r) return null;
            const ageDays = Math.max(0, (now - Number(r[0])) / 86400);
            const feeBps = sellFeeBpsAtAgeDays(ageDays);
            return (
              <div key={i} className="flex items-center justify-between border border-[var(--fr-ink)]/30 px-3 py-1.5">
                <span className={`${mono} text-xs`}>
                  {i === 0 && <span className="text-[var(--fr-fire)] font-bold">next out · </span>}
                  {fmtTokens(r[1])} FIRE
                </span>
                <span className={`${mono} text-xs`}>
                  {ageDays.toFixed(0)}d old · sell fee <span className={feeBps <= 100 ? "text-[var(--fr-fire)] font-bold" : ""}>{(feeBps / 100).toFixed(2)}%</span>
                </span>
              </div>
            );
          })}
          {count > 12 && <p className={`${mono} text-[10px] opacity-50`}>…{count - 12} older tranches</p>}
        </div>
      )}

      {status.balance > BigInt(0) && (
        <div className="border-t-2 border-[var(--fr-ink)]/20 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className={`${mono} text-[11px] uppercase tracking-[0.12em] opacity-70`}>Sell fee preview</p>
            <p className={`${mono} text-xs`}>
              sell {sellPct}% ({fmtTokens(sellAmount)} FIRE) → fee{" "}
              <span className="text-[var(--fr-fire)] font-bold">
                {previewBps !== undefined ? `${(Number(previewBps) / 100).toFixed(2)}%` : "—"}
              </span>{" "}
              of the ETH leg
            </p>
          </div>
          <input
            type="range" min={1} max={100} value={sellPct}
            onChange={(e) => setSellPct(Number(e.target.value))}
            className="w-full accent-[var(--fr-fire)]"
          />
          <p className={`${mono} text-[10px] opacity-55 mt-1`}>
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
        <Stat label="Rebate ETH" value={`${fmtEth(owed as bigint | undefined)} ETH`} sub="auto-paid every Friday — or claim now" />
        <button
          disabled={!owed || owed === BigInt(0) || isPending}
          onClick={() => writeContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "claimRebate" })}
          className={`${mono} text-xs uppercase tracking-[0.12em] font-bold px-5 py-2.5 border-2 border-[var(--fr-ink)] ${
            owed && owed > BigInt(0)
              ? "bg-[var(--fr-fire)] text-[var(--fr-paper)] hover:translate-x-[1px] hover:translate-y-[1px]"
              : "opacity-40 cursor-not-allowed"
          }`}
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
        <p className={`${mono} text-xs opacity-55`}>Checking epochs…</p>
      ) : claims.length === 0 ? (
        <p className={`${mono} text-xs opacity-55`}>
          No dividend allocations yet. Hold through a Friday snapshot — payouts are pro-rata by bag × tier.
        </p>
      ) : (
        <>
          <div className="space-y-1.5 mb-4">
            {claims.map((c) => {
              const m = meta[c.asset === zeroAddress ? zeroAddress : c.asset.toLowerCase()];
              return (
                <div key={c.epochId} className="flex items-center justify-between border border-[var(--fr-ink)]/30 px-3 py-2">
                  <span className={`${mono} text-xs`}>
                    Epoch #{c.epochId} · <span className="font-bold">{fmtTokens(c.amount, 4, m?.decimals ?? c.decimals)} {m?.symbol ?? "…"}</span>
                  </span>
                  {c.alreadyClaimed ? (
                    <span className={`${mono} text-[10px] uppercase opacity-55`}>claimed ✓</span>
                  ) : !c.open ? (
                    <span className={`${mono} text-[10px] uppercase opacity-55`}>window closed</span>
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
                      className={`${mono} text-[10px] uppercase tracking-[0.1em] font-bold px-3 py-1.5 border-2 border-[var(--fr-ink)] bg-[var(--fr-fire)] text-[var(--fr-paper)]`}
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
              className={`${mono} w-full text-xs uppercase tracking-[0.14em] font-bold px-5 py-3 border-2 border-[var(--fr-ink)] bg-[var(--fr-fire)] text-[var(--fr-paper)]`}
            >
              {isPending ? "Claiming…" : `Claim all ${openUnclaimed.length} epochs`}
            </button>
          )}
          <p className={`${mono} text-[10px] opacity-55 mt-2`}>
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
          <p className={`${display} text-xl text-[var(--fr-fire)]`}>You&apos;re in the draw 🎰</p>
          <p className={`${mono} text-[11px] opacity-70 mt-1`}>
            Weight = streak × bag = <span className="font-bold">{fmtTokens(weight as bigint | undefined)}</span>.
            Every day held and every FIRE added compounds your odds. One winner every Friday.
          </p>
        </div>
      ) : (
        <div>
          <p className={`${display} text-xl`}>{min - days} days to entry</p>
          <div className="h-3 border-2 border-[var(--fr-ink)] mt-2 mb-1">
            <div className="h-full bg-[var(--fr-fire)]" style={{ width: `${Math.min(days / min, 1) * 100}%` }} />
          </div>
          <p className={`${mono} text-[10px] opacity-60`}>
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
    return <p className={`${mono} text-sm opacity-55 py-12 text-center`}>Loading holder data…</p>;
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

  return (
    <div className="min-h-screen bg-[var(--fr-paper)] text-[var(--fr-ink)]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className={`${display} text-3xl text-[var(--fr-fire)]`}>FIRE</Link>
            <p className={`${mono} text-[10px] uppercase tracking-[0.2em] opacity-55`}>
              Robinhood Chain · get paid stocks for holding
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <input
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLookup()}
                placeholder="lookup 0x…"
                className={`${mono} text-xs px-3 py-2 border-2 border-[var(--fr-ink)] bg-[var(--fr-paper)] w-44`}
              />
              <button onClick={doLookup} className={`${mono} text-xs px-3 py-2 border-2 border-[var(--fr-ink)] font-bold`}>→</button>
            </div>
            {authenticated ? (
              <button onClick={logout} className={`${mono} text-xs px-4 py-2 border-2 border-[var(--fr-ink)] font-bold uppercase`}>
                {address ? shortAddr(address) : "…"} · out
              </button>
            ) : (
              <button onClick={login} className={`${mono} text-xs px-4 py-2 border-2 border-[var(--fr-ink)] bg-[var(--fr-fire)] text-[var(--fr-paper)] font-bold uppercase`}>
                Connect
              </button>
            )}
          </div>
        </div>

        {/* tabs */}
        <div className="flex items-center gap-1 mb-8 border-b-2 border-[var(--fr-ink)]">
          <button
            onClick={() => setView("protocol")}
            className={`${mono} text-xs px-4 py-2.5 border-b-[3px] transition-colors tracking-[0.1em] uppercase ${
              view === "protocol" ? "border-[var(--fr-fire)] text-[var(--fr-fire)] font-bold" : "border-transparent opacity-55 hover:opacity-100"
            }`}
          >
            Protocol
          </button>
          {authenticated && address && (
            <button
              onClick={() => setView("personal")}
              className={`${mono} text-xs px-4 py-2.5 border-b-[3px] transition-colors tracking-[0.1em] uppercase ${
                view === "personal" ? "border-[var(--fr-fire)] text-[var(--fr-fire)] font-bold" : "border-transparent opacity-55 hover:opacity-100"
              }`}
            >
              My Dashboard
            </button>
          )}
          {lookupAddress && (
            <button
              onClick={() => setView("lookup")}
              className={`${mono} text-xs px-4 py-2.5 border-b-[3px] transition-colors tracking-[0.1em] ${
                view === "lookup" ? "border-[var(--fr-fire)] text-[var(--fr-fire)] font-bold" : "border-transparent opacity-55 hover:opacity-100"
              }`}
            >
              {shortAddr(lookupAddress)}
            </button>
          )}
        </div>

        {/* content */}
        {!ready ? (
          <div className="text-center py-20">
            <p className={`${mono} text-sm opacity-55`}>Loading...</p>
          </div>
        ) : view === "personal" && address ? (
          <Dashboard address={address} />
        ) : view === "lookup" && lookupAddress ? (
          <div className="space-y-6">
            <div className="bg-[var(--fr-paper)] border-2 border-[var(--fr-ink)] px-4 py-2">
              <p className={`${mono} text-xs break-all opacity-70`}>{lookupAddress}</p>
            </div>
            <Dashboard address={lookupAddress} readOnly />
          </div>
        ) : (
          <ProtocolOverview />
        )}

        <div className="mt-12 pt-6 border-t-2 border-[var(--fr-ink)]/10">
          <Disclaimer variant="card" />
        </div>
      </div>
    </div>
  );
}
