"use client";
import { useEffect, useState } from "react";

/* Branded analytics components — the FIRE Dune dashboard's metrics rendered in
   the site's own brand. Data pulled live from /api/analytics (derived from the
   on-chain distribution records, same source Dune reads). Lives in fire-v4
   alongside dashboard-v4 / distributed-assets, imported by app/analytics/page. */

export const DUNE_URL = "https://dune.com/retirewithfire/fire-dashboard";
const MONO = "font-[family-name:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)]";
const GREEN = "#00c805";
const EXPLORER = "https://robinhoodchain.blockscout.com/token/";

export type Asset = { symbol: string; address: string; amount: number; usd: number | null };
export type Daily = { day: string; usd: number; cumulative: number; holders: number };
export type AnalyticsData = {
  totalUsd: number; totalDrops: number; maxHolders: number; daysLive: number;
  firstDate: string | null; lastDate: string | null; assetCount: number;
  assets: Asset[]; daily: Daily[]; updatedAt: string;
};

const fmtUsd = (n: number | null) => n == null ? "—" : `$${Math.round(n).toLocaleString()}`;
const fmtNum = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="fv-panel" style={{ padding: 20 }}>
      <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fv-muted)" }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 8, lineHeight: 1 }}>{value}</div>
      {sub && <div className={MONO} style={{ fontSize: 11, color: "var(--fv-faint)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export function AreaChart({ daily }: { daily: Daily[] }) {
  if (daily.length < 2) return null;
  const W = 900, H = 260, pad = { t: 16, r: 16, b: 28, l: 52 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(...daily.map(d => d.cumulative)) || 1;
  const x = (i: number) => pad.l + (i / (daily.length - 1)) * iw;
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const line = daily.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.cumulative).toFixed(1)}`).join(" ");
  const area = `${line} L${x(daily.length - 1).toFixed(1)},${(pad.t + ih).toFixed(1)} L${x(0).toFixed(1)},${(pad.t + ih).toFixed(1)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ v: max * f, yy: y(max * f) }));
  const labelEvery = Math.ceil(daily.length / 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="fvAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GREEN} stopOpacity="0.35" />
          <stop offset="100%" stopColor={GREEN} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={t.yy} x2={W - pad.r} y2={t.yy} stroke="rgba(245,243,238,0.08)" strokeWidth="1" />
          <text x={pad.l - 8} y={t.yy + 3} textAnchor="end" fontSize="10" fill="rgba(245,243,238,0.35)" fontFamily="ui-monospace,monospace">${Math.round(t.v).toLocaleString()}</text>
        </g>
      ))}
      <path d={area} fill="url(#fvAreaFill)" />
      <path d={line} fill="none" stroke={GREEN} strokeWidth="2" strokeLinejoin="round" />
      {daily.map((d, i) => i % labelEvery === 0 || i === daily.length - 1 ? (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="rgba(245,243,238,0.35)" fontFamily="ui-monospace,monospace">{d.day.slice(5)}</text>
      ) : null)}
    </svg>
  );
}

export function AssetBars({ assets }: { assets: Asset[] }) {
  const max = Math.max(...assets.map(a => a.usd ?? 0)) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {assets.map(a => (
        <div key={a.address}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <a href={`${EXPLORER}${a.address}`} target="_blank" rel="noopener noreferrer" className={MONO}
              style={{ fontSize: 13, color: "var(--fv-text)", textDecoration: "none" }}>{a.symbol} ↗</a>
            <span className={MONO} style={{ fontSize: 12, color: "var(--fv-muted)" }}>{fmtNum(a.amount)} {a.symbol}{a.usd != null ? ` · ${fmtUsd(a.usd)}` : ""}</span>
          </div>
          <div style={{ height: 8, background: "rgba(245,243,238,0.05)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${Math.max(2, ((a.usd ?? 0) / max) * 100)}%`, height: "100%", background: GREEN, borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// the full analytics body — page just renders <Analytics/> inside the nav shell
export function Analytics() {
  const [d, setD] = useState<AnalyticsData | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch("/api/analytics").then(r => r.json()).then(setD).catch(() => setErr(true));
  }, []);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto" }} className="px-5 sm:px-8">
      <section className="pt-14 sm:pt-20 pb-8">
        <div className={`${MONO} text-[11px] tracking-[0.22em] uppercase`} style={{ color: GREEN }}>On-chain analytics</div>
        <h1 className="mt-4 text-[32px] sm:text-[46px] font-semibold leading-[1.05] tracking-tight">
          Everything paid, <span style={{ color: GREEN }}>proven on-chain.</span>
        </h1>
        <p className="mt-5 text-[15px] sm:text-[16px] leading-relaxed max-w-[600px]" style={{ color: "var(--fv-muted)" }}>
          Live protocol metrics — dividends distributed, holders paid, and the stock basket over time.
          Every number is derived from on-chain distribution records. For the full interactive breakdown,{" "}
          <a href={DUNE_URL} target="_blank" rel="noopener noreferrer" style={{ color: GREEN }}>view the Dune dashboard ↗</a>.
        </p>
      </section>

      {err && <div className="fv-panel" style={{ padding: 20, color: "var(--fv-muted)" }}>Couldn&apos;t load analytics right now. Try the <a href={DUNE_URL} style={{ color: GREEN }}>Dune dashboard ↗</a>.</div>}
      {!d && !err && <div className={MONO} style={{ padding: 40, textAlign: "center", color: "var(--fv-faint)" }}>loading on-chain data…</div>}

      {d && (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pb-10">
            <Stat label="Distributed" value={fmtUsd(d.totalUsd)} sub="at today's prices" />
            <Stat label="Holders paid" value={d.maxHolders.toLocaleString()} sub="most in one drop" />
            <Stat label="Distributions" value={d.totalDrops.toLocaleString()} sub={`${d.assetCount} assets`} />
            <Stat label="Days live" value={d.daysLive.toLocaleString()} sub={d.firstDate ? `since ${d.firstDate}` : ""} />
          </section>

          <section className="pb-10">
            <div className={`${MONO} text-[10px] tracking-[0.18em] uppercase mb-3`} style={{ color: "var(--fv-muted)" }}>Cumulative distributed · USD</div>
            <div className="fv-panel" style={{ padding: "16px 12px 8px" }}><AreaChart daily={d.daily} /></div>
          </section>

          <section className="pb-10">
            <div className={`${MONO} text-[10px] tracking-[0.18em] uppercase mb-3`} style={{ color: "var(--fv-muted)" }}>Distributed by stock · all-time</div>
            <div className="fv-panel" style={{ padding: 20 }}><AssetBars assets={d.assets} /></div>
          </section>

          <p className={`${MONO} text-[11px] pb-16`} style={{ color: "var(--fv-faint)" }}>
            Token amounts are exact and on-chain. USD is at today&apos;s prices. Data updates every few minutes ·
            full history on the <a href={DUNE_URL} target="_blank" rel="noopener noreferrer" style={{ color: GREEN }}>Dune dashboard ↗</a>
          </p>
        </>
      )}
    </main>
  );
}
