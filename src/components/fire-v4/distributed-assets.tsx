"use client";
import { useEffect, useState } from "react";

/* DistributedAssets — every tokenized stock/RWA that has actually been paid to
   holders to date, with links to the Robinhood Chain explorer so anyone can
   verify the contracts. Pulled live from /api/lifetime-distributed (which is
   derived from the distribution records), so it stays correct as the basket
   changes. Falls back to the known list if the API is unavailable. */

const EXPLORER = "https://robinhoodchain.blockscout.com/token/";

// Known tokens — used as an SSR/fallback list and for stable ordering.
const KNOWN: { symbol: string; name: string; address: string }[] = [
  { symbol: "GME",  name: "GameStop",           address: "0x1b0E319c6A659F002271B69dB8A7df2F911c153E" },
  { symbol: "NVDA", name: "NVIDIA",             address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC" },
  { symbol: "TSLA", name: "Tesla",              address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d" },
  { symbol: "AAPL", name: "Apple",              address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9" },
  { symbol: "SPY",  name: "S&P 500 ETF",        address: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C" },
  { symbol: "AMD",  name: "AMD",                address: "0x86923f96303D656E4aa86D9d42D1e57ad2023fdC" },
  { symbol: "GLD",  name: "Gold",               address: "0xC9a981FEE1F9DEc688bb123ccDeCc63D0deBFC4e" },
];

type Asset = { symbol: string; address: string; amount?: number; usd?: number | null; name?: string };

const MONO = "font-[family-name:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)]";
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function DistributedAssets({
  title = "Stocks paid to holders",
  subtitle = "Every tokenized asset distributed to date. Tap a contract to verify it on the explorer.",
  compact = false,
}: { title?: string; subtitle?: string; compact?: boolean }) {
  const [assets, setAssets] = useState<Asset[]>(KNOWN);
  const [live, setLive] = useState(false);

  useEffect(() => {
    fetch("/api/lifetime-distributed")
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d?.assets) || !d.assets.length) return;
        // merge names from KNOWN, keep only assets that have actually been distributed,
        // and drop native ETH fallback rows
        const rows: Asset[] = d.assets
          .filter((a: Asset) => a.address && a.address !== "0x0000000000000000000000000000000000000000")
          .map((a: Asset) => ({ ...a, name: KNOWN.find((k) => k.address.toLowerCase() === a.address.toLowerCase())?.name }));
        setAssets(rows); setLive(true);
      })
      .catch(() => {});
  }, []);

  const [copied, setCopied] = useState<string | null>(null);
  const copy = (addr: string) => {
    navigator.clipboard?.writeText(addr).then(() => { setCopied(addr); setTimeout(() => setCopied(null), 1200); }).catch(() => {});
  };

  return (
    <div className="fv-panel" style={{ padding: compact ? 20 : 24 }}>
      <div className={`${MONO} text-[10px] tracking-[0.18em] uppercase`} style={{ color: "var(--fv-muted)" }}>
        {live ? "distributed to date · on-chain" : "distributed assets"}
      </div>
      <div style={{ fontSize: compact ? 18 : 20, fontWeight: 600, marginTop: 6, marginBottom: 4, letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--fv-muted)", marginBottom: 16 }}>{subtitle}</div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {assets.map((a) => (
          <div key={a.address}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 0", borderTop: "1px solid var(--fv-line)" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className={MONO} style={{ fontSize: 14, fontWeight: 600, color: "var(--fv-text)" }}>{a.symbol}</span>
                {a.name && <span style={{ fontSize: 12.5, color: "var(--fv-muted)" }}>{a.name}</span>}
              </div>
              {a.amount !== undefined && (
                <div className={MONO} style={{ fontSize: 11, color: "var(--fv-faint)", marginTop: 2 }}>
                  {a.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {a.symbol} paid out
                  {a.usd ? ` · ~$${Math.round(a.usd).toLocaleString()}` : ""}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
              <button onClick={() => copy(a.address)} title="Copy contract address" className={MONO}
                style={{ fontSize: 11, padding: "5px 9px", borderRadius: 8, border: "1px solid var(--fv-line)", background: "transparent", color: "var(--fv-muted)", cursor: "pointer" }}>
                {copied === a.address ? "copied" : short(a.address)}
              </button>
              <a href={`${EXPLORER}${a.address}`} target="_blank" rel="noopener noreferrer" className={MONO}
                style={{ fontSize: 11, padding: "5px 10px", borderRadius: 8, border: "1px solid var(--fv-line-strong)", color: "var(--fv-green)", textDecoration: "none", whiteSpace: "nowrap" }}>
                explorer ↗
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className={MONO} style={{ fontSize: 10.5, lineHeight: 1.5, color: "var(--fv-faint)", marginTop: 14 }}>
        Always verify a contract address here or on the explorer before trading a token — look-alikes exist.
      </div>
    </div>
  );
}
