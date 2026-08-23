"use client";

import { useEffect, useMemo, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { formatUnits, zeroAddress } from "viem";
import {
  FIRE_CONTRACT, FIRE_ABI, HOOK_CONTRACT, HOOK_ABI,
  DISTRIBUTOR_CONTRACT, DISTRIBUTOR_ABI, ERC20_META_ABI,
} from "@/lib/contract";
import { MONO, C, Kick, Panel, useCountOnce } from "./primitives";

/* Protocol-level stats for the v4 dashboard.
 *
 * These lived on the Terminal Dark dashboard (preserved at
 * app/dashboard/page.terminal-dark.bak.tsx) and were dropped in the v4 refresh,
 * which is entirely personal — your streak, your badges, your dividends. This
 * puts the shared numbers back, rebuilt in the v4 system rather than ported:
 * Panel/Kick, one big mono figure per card, rows that rule off with C.line, and
 * a plain closing sentence in C.faint.
 *
 * Everything here is public, so it renders with or without a connected wallet.
 */

type DistroSummary = {
  id: string; date: string; asset: string; symbol: string;
  decimals: number; totalDistributed: string; holdersPaid: number;
};
type LifetimeDist = { totalUsd: number; assets: Array<{ symbol: string; amount: number; usd: number | null }> };
type FirstRwa = { firstViaFire: number; total: number };

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function fmtEth(v: bigint | undefined, dp = 4) {
  if (v === undefined) return "—";
  return Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: dp });
}
function fmtTokens(v: bigint | undefined, dp = 2, decimals = 18) {
  if (v === undefined) return "—";
  return Number(formatUnits(v, decimals)).toLocaleString(undefined, { maximumFractionDigits: dp });
}
const usd0 = (n: number) => `$${Math.round(n).toLocaleString()}`;

/** Symbol + decimals for a set of token addresses. ETH is the zero address. */
function useAssetMeta(assets: readonly `0x${string}`[] | undefined) {
  const contracts = useMemo(
    () => (assets || []).filter((a) => a !== zeroAddress).flatMap((a) => [
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
    (assets || []).filter((a) => a !== zeroAddress).forEach((a, i) => {
      meta[a.toLowerCase()] = {
        symbol: (data?.[i * 2]?.result as string) || shortAddr(a),
        decimals: Number(data?.[i * 2 + 1]?.result ?? 18),
      };
    });
    return meta;
  }, [assets, data]);
}

export function ProtocolV4({ lg }: { lg: boolean }) {
  const pad = lg ? 24 : 18;

  const { data: buyFee }    = useReadContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "buyFeeBps" });
  const { data: sellFlat }  = useReadContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "sellFeeFlatBps" });
  const { data: divEth }    = useReadContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "dividendEthAccumulated" });
  const { data: burnEth }   = useReadContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "burnEthAccumulated" });
  const { data: burned }    = useReadContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "totalFireBurned" });
  const { data: reserve }   = useReadContract({ address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "rebateReserve" });
  const { data: holders }   = useReadContract({ address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "holderCount" });
  const { data: basket }    = useReadContract({ address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI, functionName: "getBasket" });
  const { data: minStreak } = useReadContract({ address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI, functionName: "jackpotMinStreakDays" });

  const [distros, setDistros] = useState<DistroSummary[]>([]);
  const [lifetime, setLifetime] = useState<LifetimeDist | null>(null);
  const [firstRwa, setFirstRwa] = useState<FirstRwa | null>(null);
  const [jpStats, setJpStats] = useState<{ eligible: number; totalHolders: number } | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/distributions").then((r) => r.json()).then((d) => setDistros(d.distributions || [])).catch(() => {});
    fetch("/api/lifetime-distributed").then((r) => r.json()).then((d) => { if (d?.totalUsd > 0) setLifetime(d); }).catch(() => {});
    fetch("/api/first-rwa").then((r) => r.json()).then((d) => { if (d?.total > 0) setFirstRwa(d); }).catch(() => {});
    fetch("/api/jackpot-stats").then((r) => r.json()).then((d) => { if (d?.eligible > 0) setJpStats(d); }).catch(() => {});
    fetch("/api/stock-prices").then((r) => r.json()).then((d) => setPrices(d.prices || {})).catch(() => {});
  }, []);

  const basketTokens = basket?.[0] as readonly `0x${string}`[] | undefined;
  const basketWeights = basket?.[1] as readonly bigint[] | undefined;
  const basketMeta = useAssetMeta(basketTokens);

  // Reserves carved under earlier baskets stay on the Distributor, so the pot
  // spans today's basket plus every asset ever distributed.
  const potAssets = useMemo(() => {
    const seen = new Map<string, `0x${string}`>();
    for (const a of (basketTokens || [])) seen.set(a.toLowerCase(), a);
    for (const d of distros) {
      const a = d.asset as `0x${string}`;
      if (a && !seen.has(a.toLowerCase())) seen.set(a.toLowerCase(), a);
    }
    return [...seen.values()];
  }, [basketTokens, distros]);
  const potMeta = useAssetMeta(potAssets);

  const { data: jackpots } = useReadContracts({
    contracts: potAssets.map((a) => ({
      address: DISTRIBUTOR_CONTRACT, abi: DISTRIBUTOR_ABI,
      functionName: "jackpotReserve" as const, args: [a] as const,
    })),
    query: { enabled: potAssets.length > 0 },
  });

  const potUsd = useMemo(() => potAssets.reduce((s, a, i) => {
    const r = jackpots?.[i]?.result as bigint | undefined;
    const px = prices[a.toLowerCase()];
    if (!r || !px) return s;
    const m = potMeta[a === zeroAddress ? zeroAddress : a.toLowerCase()];
    return s + Number(formatUnits(r, m?.decimals ?? 18)) * px;
  }, 0), [potAssets, jackpots, prices, potMeta]);

  const totalUsd = useCountOnce(lifetime?.totalUsd ?? 0);
  const maxAsset = Math.max(1, ...(lifetime?.assets ?? []).map((a) => a.usd ?? 0));

  return (
    <div>
      <div className={MONO} style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: C.faint, marginBottom: lg ? 14 : 12 }}>
        the protocol
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ── paid to everyone ── */}
        <Panel style={{ padding: pad }}>
          <div style={lg ? { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 28 } : undefined}>
            <div style={{ minWidth: 0, flex: lg ? "0 0 300px" : undefined }}>
              <Kick>paid to everyone · all time</Kick>
              <div className={MONO} style={{ fontSize: lg ? 52 : 44, lineHeight: 1, letterSpacing: "-0.02em", marginTop: 14, color: lifetime ? C.green : C.faint }}>
                {lifetime ? usd0(totalUsd) : "—"}
              </div>
              <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint, marginTop: lg ? 10 : 8 }}>
                {distros.length > 0 ? `${distros.length} distributions · only goes up` : "no distributions yet"}
              </div>
              {firstRwa && firstRwa.firstViaFire > 0 && (
                <div style={{ marginTop: 16, padding: 14, background: C.greenSoft, border: `1px solid ${C.greenLine}`, borderRadius: 14 }}>
                  <div className={MONO} style={{ fontSize: lg ? 22 : 20, lineHeight: 1, color: C.green }}>
                    {firstRwa.firstViaFire.toLocaleString()}
                  </div>
                  <div style={{ fontSize: lg ? 13 : 12, lineHeight: 1.45, color: C.muted, marginTop: 7, textWrap: "pretty" }}>
                    wallets whose first tokenised stock arrived through $FIRE — of {firstRwa.total.toLocaleString()} paid,
                    verified on-chain.
                  </div>
                </div>
              )}
            </div>

            {lifetime && lifetime.assets.length > 0 && (
              <div style={{ flex: 1, minWidth: 0, marginTop: lg ? 0 : 20 }}>
                {lifetime.assets.map((a) => (
                  <div key={a.symbol} style={{ display: "flex", alignItems: "center", gap: lg ? 14 : 10, padding: lg ? "11px 0" : "10px 0", borderBottom: `1px solid ${C.line}` }}>
                    <span className={MONO} style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", width: lg ? 52 : 46, flex: "none", color: C.text }}>{a.symbol}</span>
                    <div style={{ flex: 1, minWidth: 0, height: 5, background: C.line, borderRadius: 3 }}>
                      <div style={{ width: `${Math.max(2, ((a.usd ?? 0) / maxAsset) * 100)}%`, height: "100%", background: C.green, borderRadius: 3 }} />
                    </div>
                    <span className={MONO} style={{ fontSize: 11, color: C.faint, width: lg ? 78 : 62, textAlign: "right", flex: "none" }}>
                      {a.amount.toLocaleString(undefined, { maximumFractionDigits: a.amount >= 1 ? 2 : 4 })}
                    </span>
                    <span className={MONO} style={{ fontSize: lg ? 14 : 13, width: lg ? 64 : 56, textAlign: "right", flex: "none", color: a.usd ? C.text : C.faint }}>
                      {a.usd ? usd0(a.usd) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ fontSize: lg ? 13 : 12, lineHeight: 1.5, color: C.faint, marginTop: 14, textWrap: "pretty" }}>
            Every fee buys real tokenised stock and pushes it to holders. Valued at today&apos;s prices — paid on holding, never on checking in.
          </div>
        </Panel>

        {/* ── the four constants ── */}
        <div style={{ display: "grid", gridTemplateColumns: lg ? "repeat(4,1fr)" : "repeat(2,1fr)", gap: 16 }}>
          <Metric lg={lg} k="buy fee" v={buyFee !== undefined ? `${Number(buyFee) / 100}%` : "—"} sub="flat, every buy" />
          <Metric lg={lg} k="sell fee" v={sellFlat !== undefined ? `${Number(sellFlat) / 100}%` : "—"} sub="decays to 1% over 90d" />
          <Metric lg={lg} k="holders" v={holders !== undefined ? Number(holders).toLocaleString() : "—"} sub="tracked wallets" />
          <Metric lg={lg} k="fire burned" v={fmtTokens(burned as bigint | undefined, 0)} sub="20% of every fee" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: lg ? "1fr 1fr" : "1fr", gap: 16, alignItems: "start" }}>
          {/* ── next distribution ── */}
          <Panel style={{ padding: pad }}>
            <Kick>waiting for the next distribution</Kick>
            <div style={{ display: "flex", gap: lg ? 32 : 20, marginTop: 16 }}>
              <div>
                <div className={MONO} style={{ fontSize: lg ? 28 : 24, lineHeight: 1, color: C.green }}>{fmtEth(divEth as bigint | undefined)}</div>
                <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint, marginTop: 8 }}>eth to dividends · 80%</div>
              </div>
              <div>
                <div className={MONO} style={{ fontSize: lg ? 28 : 24, lineHeight: 1, color: C.text }}>{fmtEth(burnEth as bigint | undefined)}</div>
                <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint, marginTop: 8 }}>eth to burn · 20%</div>
              </div>
            </div>
            <div style={{ fontSize: lg ? 13 : 12, lineHeight: 1.5, color: C.faint, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.line}`, textWrap: "pretty" }}>
              Swept into the stock basket on a schedule. {fmtEth(reserve as bigint | undefined)} ETH is held back for diamond-hand rebates.
            </div>
          </Panel>

          {/* ── the index ── */}
          <Panel style={{ padding: pad }}>
            <Kick>the stock index</Kick>
            {basketTokens && basketTokens.length > 0 ? (
              <>
                <div style={{ marginTop: lg ? 14 : 12 }}>
                  {basketTokens.map((a, i) => {
                    const m = basketMeta[a === zeroAddress ? zeroAddress : a.toLowerCase()];
                    const w = Number(basketWeights?.[i] ?? 0) / 100;
                    return (
                      <div key={a} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
                        <span className={MONO} style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", width: 52, flex: "none", color: C.text }}>{m?.symbol ?? shortAddr(a)}</span>
                        <div style={{ flex: 1, minWidth: 0, height: 5, background: C.line, borderRadius: 3 }}>
                          <div style={{ width: `${w}%`, height: "100%", background: C.green, borderRadius: 3 }} />
                        </div>
                        <span className={MONO} style={{ fontSize: 12, width: 48, textAlign: "right", flex: "none", color: C.muted }}>{w.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: lg ? 13 : 12, lineHeight: 1.5, color: C.faint, marginTop: 14, textWrap: "pretty" }}>
                  80% of every fee buys this basket. Set on-chain — verify it anytime.
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>Basket not set yet.</div>
            )}
          </Panel>

          {/* ── friday jackpot ── */}
          <Panel style={{ padding: pad }}>
            <Kick>friday jackpot</Kick>
            <div className={MONO} style={{ fontSize: lg ? 36 : 30, lineHeight: 1, letterSpacing: "-0.02em", marginTop: 14, color: potUsd > 0 ? C.green : C.faint }}>
              {potUsd > 0 ? `$${potUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
            </div>
            <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint, marginTop: 8 }}>
              in the pot right now
            </div>
            <div style={{ marginTop: 14 }}>
              {potAssets.map((a, i) => {
                const r = jackpots?.[i]?.result as bigint | undefined;
                if (!r || r === BigInt(0)) return null;
                const m = potMeta[a === zeroAddress ? zeroAddress : a.toLowerCase()];
                return (
                  <div key={a} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
                    <span className={MONO} style={{ fontSize: 12, letterSpacing: "0.08em", color: C.muted }}>{m?.symbol ?? shortAddr(a)}</span>
                    <span className={MONO} style={{ fontSize: 12, color: C.text }}>{fmtTokens(r, 4, m?.decimals ?? 18)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: lg ? 13 : 12, lineHeight: 1.5, color: C.faint, marginTop: 14, textWrap: "pretty" }}>
              One winner every Friday{jpStats ? `, ${jpStats.eligible.toLocaleString()} wallets eligible` : ""}. A{" "}
              {minStreak !== undefined ? Number(minStreak) : "—"}-day hold streak enters you; odds are streak × bag. The draw
              block is committed publicly and checkable from the blockhash.
            </div>
          </Panel>

          {/* ── recent distributions ── */}
          <Panel style={{ padding: pad }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <Kick>recent distributions</Kick>
              {distros.length > 0 && (
                <span className={MONO} style={{ fontSize: 11, letterSpacing: "0.1em", color: C.faint }}>{distros.length} total</span>
              )}
            </div>
            {distros.length === 0 ? (
              <div style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>
                No distributions yet — dividends are pushed straight to wallets.
              </div>
            ) : (
              <>
                <div style={{ marginTop: lg ? 12 : 10 }}>
                  {distros.slice(0, 6).map((d) => (
                    <div key={d.id} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: lg ? "10px 0" : "9px 0", borderBottom: `1px solid ${C.line}` }}>
                      <span className={MONO} style={{ fontSize: 11, color: C.faint, width: 54, flex: "none" }}>
                        {new Date(d.date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                      </span>
                      <span className={MONO} style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", width: 46, flex: "none", color: C.text }}>{d.symbol}</span>
                      <span className={MONO} style={{ fontSize: 12, color: C.muted, flex: 1, textAlign: "right", minWidth: 0 }}>
                        {fmtTokens(BigInt(d.totalDistributed), 3, d.decimals)}
                      </span>
                      <span className={MONO} style={{ fontSize: 11, color: C.faint, width: lg ? 104 : 88, textAlign: "right", flex: "none", whiteSpace: "nowrap" }}>
                        {d.holdersPaid.toLocaleString()} wallets
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: lg ? 13 : 12, lineHeight: 1.5, color: C.faint, marginTop: 14, textWrap: "pretty" }}>
                  Pushed directly to every holder. There is nothing to claim.
                </div>
              </>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Metric({ lg, k, v, sub }: { lg: boolean; k: string; v: string; sub: string }) {
  return (
    <Panel style={{ padding: lg ? 20 : 16 }}>
      <Kick>{k}</Kick>
      <div className={MONO} style={{ fontSize: lg ? 26 : 22, lineHeight: 1, letterSpacing: "-0.01em", marginTop: 12, color: C.text }}>{v}</div>
      <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint, marginTop: 8 }}>{sub}</div>
    </Panel>
  );
}
