"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* Shared pieces of the v4 dashboard, ported from the Claude Design prototype.
   Values here are lifted from the prototype verbatim — ring radius 48 with an
   8px stroke, 30-dot grid, `grayscale(1) brightness(0.35)` for locked art —
   so the built page matches the mock rather than approximating it. */

export const MONO = "fv-num";
export const C = {
  text: "#f5f3ee",
  muted: "rgba(245,243,238,0.55)",
  faint: "rgba(245,243,238,0.35)",
  line: "rgba(245,243,238,0.08)",
  lineStrong: "rgba(245,243,238,0.22)",
  green: "#00c805",
  greenSoft: "rgba(0,200,5,0.12)",
  greenLine: "rgba(0,200,5,0.5)",
  surface: "#1a1610",
  surface2: "#221d15",
} as const;

export function Kick({ children, tone = C.muted }: { children: React.ReactNode; tone?: string }) {
  return (
    <div className={MONO} style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: tone }}>
      {children}
    </div>
  );
}

export function Panel({ children, bare = false, style }: { children: React.ReactNode; bare?: boolean; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        padding: 18,
        background: bare ? "transparent" : C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Counts up once, then tracks the value. Numbers "count up once on viewport
 *  entry" per the v3 motion rules — never on every re-render. */
export function useCountOnce(target: number, ms = 900): number {
  const [v, setV] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (!target) return;
    let raf = 0;
    // Every setState here happens inside a rAF callback, never synchronously in
    // the effect body — a sync call cascades renders and React 19 flags it.
    if (done.current) {
      raf = requestAnimationFrame(() => setV(target)); // already ran: just track
      return () => cancelAnimationFrame(raf);
    }
    done.current = true;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / ms, 1);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/* ── Badge medallion ───────────────────────────────────────── */

export function Medallion({
  slug, label, size = 64, earned, current = false, onClick,
}: {
  slug: string; label: string; size?: number; earned: boolean; current?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={earned ? label : `${label}, locked`}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        cursor: "pointer", userSelect: "none", background: "none", border: "none", padding: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/badges/${slug}.png`}
        alt=""
        width={size}
        height={size}
        style={{
          display: "block", width: size, height: size, borderRadius: "50%",
          // Locked art is DERIVED, never a second asset — the pair can't drift.
          filter: earned ? undefined : "grayscale(1) brightness(0.35)",
        }}
      />
      <span
        className={MONO}
        style={{
          fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase",
          textAlign: "center", lineHeight: 1.3,
          color: current ? C.green : earned ? C.text : C.muted,
        }}
      >
        {label.toLowerCase()}
      </span>
    </button>
  );
}

/* ── Progress ring ─────────────────────────────────────────── */

const R = 48;
const CIRC = 2 * Math.PI * R; // 301.59

export function Ring({ pct, size = 116, centre, sub }: { pct: number; size?: number; centre: React.ReactNode; sub: string }) {
  const dash = `${((CIRC * Math.max(0, Math.min(100, pct))) / 100).toFixed(2)} ${CIRC.toFixed(1)}`;
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg viewBox="0 0 116 116" style={{ width: size, height: size, transform: "rotate(-90deg)" }}>
        <circle cx="58" cy="58" r={R} fill="none" stroke={C.line} strokeWidth="8" />
        <circle cx="58" cy="58" r={R} fill="none" stroke={C.green} strokeWidth="8" strokeLinecap="round" strokeDasharray={dash} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <span className={MONO} style={{ fontSize: size > 120 ? 31 : 28, lineHeight: 1, color: C.text }}>{centre}</span>
        <span className={MONO} style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: C.faint }}>{sub}</span>
      </div>
    </div>
  );
}

/* ── 30-day check-in grid ──────────────────────────────────── */

export type DotState = "future" | "done" | "missed" | "frozen" | "today" | "today-done";

export function DotGrid({ dots, dotSize = 10 }: { dots: DotState[]; dotSize?: number }) {
  const style = (s: DotState): React.CSSProperties => {
    const base: React.CSSProperties = { width: dotSize, height: dotSize, borderRadius: "50%" };
    switch (s) {
      case "future":     return { ...base, background: "rgba(245,243,238,0.06)" };
      case "missed":     return { ...base, border: `1px solid ${C.lineStrong}` };
      case "frozen":     return { ...base, border: `1px solid ${C.green}`, background: C.greenSoft };
      case "today":      return { ...base, border: `1.5px solid ${C.green}`, animation: "fvPulse 2.4s ease-in-out infinite" };
      case "today-done": return { ...base, background: C.green, boxShadow: `0 0 0 3px ${C.greenSoft}` };
      default:           return { ...base, background: C.green };
    }
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(10, ${dotSize}px)`, justifyContent: "space-between", gap: "11px 0" }}>
      {dots.map((d, i) => <span key={i} style={style(d)} />)}
    </div>
  );
}

/* ── Scrubbable area chart ─────────────────────────────────── */

const CW = 350, CH = 118;

export function ScrubChart({
  values, labels, height = 132, fmt,
}: {
  values: number[];
  labels: string[];
  height?: number;
  fmt: (v: number) => string;
}) {
  const [i, setI] = useState<number | null>(null);

  const { line, area, x, y } = useMemo(() => {
    const s = values.length ? values : [0, 0];
    const lo = Math.min(...s), hi = Math.max(...s);
    const span = hi - lo || 1;
    const fx = (k: number) => +((k / Math.max(1, s.length - 1)) * CW).toFixed(2);
    const fy = (v: number) => +(CH - 4 - ((v - lo) / span) * (CH - 12)).toFixed(2);
    const pts = s.map((v, k) => `${fx(k)},${fy(v)}`);
    return {
      line: `M${pts.join(" L")}`,
      area: `M0,${CH} L${pts.join(" L")} L${CW},${CH} Z`,
      x: fx, y: fy,
    };
  }, [values]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width) return;
    const f = (e.clientX - r.left) / r.width;
    const k = Math.round(Math.max(0, Math.min(1, f)) * (values.length - 1));
    if (k !== i) setI(k);
  };

  const on = i !== null && i < values.length;

  return (
    <div
      style={{ position: "relative", marginTop: 16, touchAction: "none" }}
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={() => setI(null)}
      onPointerUp={() => setI(null)}
    >
      <svg viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" style={{ display: "block", width: "100%", height, overflow: "visible" }}>
        <path d={area} fill={C.greenSoft} />
        <path d={line} fill="none" stroke={C.green} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {on && (
          <g>
            <line x1={x(i!)} y1={0} x2={x(i!)} y2={CH} stroke={C.lineStrong} strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <circle cx={x(i!)} cy={y(values[i!])} r="4" fill={C.green} stroke="#110e08" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>
      {on && (
        <div style={{ position: "absolute", top: -8, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <span className={MONO} style={{ fontSize: 12, color: C.text, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, padding: "4px 8px" }}>
            {fmt(values[i!])} · {labels[i!]}
          </span>
        </div>
      )}
    </div>
  );
}

/** Tiny cumulative line for an asset row. Own scale — never shared. */
export function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <div style={{ flex: 1, height: 1, background: C.line, minWidth: 0 }} />;
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = hi - lo || 1;
  const d = values
    .map((v, k) => `${((k / (values.length - 1)) * 96).toFixed(1)},${(26 - ((v - lo) / span) * 23).toFixed(1)}`)
    .join(" L");
  return (
    <svg viewBox="0 0 96 26" preserveAspectRatio="none" style={{ display: "block", flex: 1, height: 26, minWidth: 0 }}>
      <path d={`M${d}`} fill="none" stroke={C.green} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
