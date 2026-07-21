"use client";

/* V3 Scrollworld — ported from the Claude Design handoff (V3 Scrollworld.dc.html).
   One 900vh scroll timeline drives everything: the canvas world flight, all eight
   beat overlays, the phone interaction, the HUD streak. All beats are deterministic
   in scroll position — the frame() port below is the single source of motion.
   The film-based upgrade path (real rendered scenes instead of canvas) lives in
   /scrollworld — see STORYBOARD.md. */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FooterV3,
  useStockQuotes,
  useFireMarket,
  fmtDelta,
  TRADING_LIVE,
  BUY_URL,
  TELEGRAM_URL,
  CA,
} from "@/components/fire-v3/shared";
import { IOSDevice } from "@/components/fire-v3/ios-frame";

const MONOF = "var(--font-plex-mono), monospace";
const SERIFF = "var(--font-serif-inst), serif";

function CACopy() {
  const [copied, setCopied] = useState(false);
  const ca = CA;
  if (!ca) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ca);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — user can still select the text */ }
  };
  return (
    <button
      onClick={copy}
      title="Copy contract address"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        margin: "0 0 16px",
        padding: "7px 12px",
        borderRadius: 999,
        border: "1px solid rgba(245,243,238,0.18)",
        background: "rgba(245,243,238,0.04)",
        color: copied ? "var(--fv-green)" : "rgba(245,243,238,0.72)",
        fontFamily: MONOF,
        fontSize: 11,
        letterSpacing: "0.06em",
        cursor: "pointer",
        transition: "color .18s ease, border-color .18s ease",
      }}
    >
      <span style={{ opacity: 0.55 }}>CA</span>
      <span className="sw-ca-full" style={{ letterSpacing: "0.02em" }}>{ca}</span>
      <span className="sw-ca-short" style={{ letterSpacing: "0.02em" }}>{`${ca.slice(0, 6)}…${ca.slice(-4)}`}</span>
      <span style={{ opacity: 0.8 }}>{copied ? "✓ copied" : "⧉"}</span>
    </button>
  );
}

const kicker: React.CSSProperties = {
  fontFamily: MONOF,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "#00C805",
  margin: "0 0 14px",
};

const beatBase: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "0 24px",
  pointerEvents: "none",
};

function Em({ children, red = false }: { children: React.ReactNode; red?: boolean }) {
  return (
    <em style={{ fontFamily: SERIFF, fontStyle: "italic", fontWeight: 400, color: red ? "#FF5000" : "#00C805" }}>
      {children}
    </em>
  );
}

/* ───────── side callout (phone beat) ───────── */

function Callout({
  id,
  title,
  body,
  side,
  top,
}: {
  id: string;
  title: string;
  body: string;
  side: "left" | "right";
  top: string;
}) {
  const onLeft = side === "left"; // callout sits left OF the phone → text right-aligned
  return (
    <div
      id={id}
      style={{
        position: "absolute",
        ...(onLeft
          ? { right: "calc(100% + 46px)", textAlign: "right" as const }
          : { left: "calc(100% + 46px)", textAlign: "left" as const }),
        top,
        width: 216,
        opacity: 0,
      }}
    >
      <p style={{ fontFamily: MONOF, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#00C805", margin: "0 0 6px" }}>
        {title}
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(245,243,238,0.55)", margin: 0 }}>{body}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: onLeft ? "flex-end" : "flex-start", gap: 0, marginTop: 10 }}>
        {onLeft ? (
          <>
            <span style={{ width: 34, height: 1, background: "rgba(245,243,238,0.22)" }} />
            <span style={{ width: 5, height: 5, borderRadius: 999, background: "#00C805" }} />
          </>
        ) : (
          <>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: "#00C805" }} />
            <span style={{ width: 34, height: 1, background: "rgba(245,243,238,0.22)" }} />
          </>
        )}
      </div>
    </div>
  );
}

/* ───────── phone screen (inside the iOS frame) ───────── */

function PhoneScreen() {
  const quotes = useStockQuotes();
  const spy = quotes.find((q) => q.symbol === "SPY");
  const nvda = quotes.find((q) => q.symbol === "NVDA");

  const priceCell = (live: { priceUsd: number; change24h: number } | undefined, fallbackPrice: string, fallbackDelta: string) => {
    const up = live ? live.change24h >= 0 : true;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: MONOF, fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
          {live ? `$${live.priceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : fallbackPrice}
        </span>
        <span
          style={{
            fontFamily: MONOF,
            fontSize: 10,
            fontWeight: 500,
            padding: "2px 7px",
            borderRadius: 999,
            background: up ? "#00C805" : "#FF5000",
            color: up ? "#0b0a06" : "#fff",
          }}
        >
          {live ? fmtDelta(live.change24h) : fallbackDelta}
        </span>
      </div>
    );
  };

  return (
    <div
      style={{
        background: "#110E08",
        color: "#F5F3EE",
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        height: "100%",
        padding: "70px 20px 44px",
        display: "flex",
        flexDirection: "column",
        textAlign: "left",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Image src="/brand/fire-glyph.svg" alt="" width={22} height={22} style={{ width: 22, height: 22 }} />
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>FIRE</span>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONOF, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#00C805" }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "#00C805" }} />
          Live
        </span>
      </div>

      <div
        id="sw-toast"
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translate(-50%,12px)",
          opacity: 0,
          background: "#221D15",
          border: "1px solid rgba(0,200,5,0.4)",
          color: "#00C805",
          borderRadius: 999,
          padding: "7px 16px",
          fontFamily: MONOF,
          fontSize: 11,
          whiteSpace: "nowrap",
          zIndex: 2,
        }}
      >
        +0.214 NVDA received
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontFamily: MONOF, fontSize: 9, fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(245,243,238,0.55)", margin: 0 }}>
          Dividend account
        </p>
        <span style={{ fontFamily: MONOF, fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(245,243,238,0.35)", border: "1px solid rgba(245,243,238,0.08)", borderRadius: 999, padding: "3px 9px" }}>
          Illustrative
        </span>
      </div>

      <p id="sw-val" style={{ fontFamily: MONOF, fontVariantNumeric: "tabular-nums", fontSize: 38, lineHeight: 1, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
        $0.00
      </p>
      <p style={{ fontFamily: MONOF, fontVariantNumeric: "tabular-nums", fontSize: 12, margin: "8px 0 0", color: "#00C805" }}>
        +$38.42 (+0.92%) today
      </p>

      <svg viewBox="0 0 350 110" preserveAspectRatio="none" aria-hidden="true" style={{ width: "100%", height: 100, display: "block", marginTop: 14 }}>
        <line x1="0" y1="92" x2="350" y2="92" stroke="rgba(245,243,238,0.22)" strokeWidth="1" strokeDasharray="2 6" />
        <path
          id="sw-pchart"
          d="M0,86 L15,82 L30,88 L46,75 L61,68 L76,71 L91,60 L106,64 L122,53 L137,49 L152,55 L167,45 L182,37 L198,41 L213,31 L228,24 L243,28 L258,17 L274,20 L289,11 L304,13 L319,6 L334,9 L350,2"
          fill="none"
          stroke="#00C805"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
        />
      </svg>

      <div style={{ display: "flex", gap: 4, marginTop: 8, fontFamily: MONOF, fontSize: 9, letterSpacing: "0.08em" }}>
        {["LIVE", "1D", "1W", "1M", "ALL"].map((r) => (
          <span
            key={r}
            style={{
              padding: "3px 9px",
              borderRadius: 999,
              ...(r === "1D"
                ? { background: "rgba(0,200,5,0.12)", color: "#00C805", fontWeight: 500 }
                : { color: "rgba(245,243,238,0.35)" }),
            }}
          >
            {r}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 14, borderTop: "1px solid rgba(245,243,238,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(245,243,238,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: MONOF, width: 32, height: 32, borderRadius: 999, border: "1px solid rgba(245,243,238,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 500 }}>
              SPY
            </span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2, margin: 0 }}>SPY</p>
              <p id="sw-spy-sh" style={{ fontFamily: MONOF, fontVariantNumeric: "tabular-nums", fontSize: 10, color: "rgba(245,243,238,0.55)", margin: 0 }}>
                0.000 sh accrued
              </p>
            </div>
          </div>
          {priceCell(spy, "$612.40", "+0.92%")}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: MONOF, width: 32, height: 32, borderRadius: 999, border: "1px solid rgba(245,243,238,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 500 }}>
              NVDA
            </span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2, margin: 0 }}>NVDA</p>
              <p id="sw-nvda-sh" style={{ fontFamily: MONOF, fontVariantNumeric: "tabular-nums", fontSize: 10, color: "rgba(245,243,238,0.55)", margin: 0 }}>
                0.000 sh accrued
              </p>
            </div>
          </div>
          {priceCell(nvda, "$189.15", "+1.44%")}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2, padding: "10px 0", borderTop: "1px solid rgba(245,243,238,0.08)" }}>
        <span style={{ fontFamily: MONOF, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,243,238,0.55)" }}>Streak</span>
        <span id="sw-pday" style={{ fontFamily: MONOF, fontVariantNumeric: "tabular-nums", fontSize: 11, color: "#00C805" }}>
          Day 0 of 90
        </span>
      </div>

      <div
        id="sw-claim"
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          background: "#00C805",
          color: "#0b0a06",
          fontWeight: 600,
          fontSize: 13,
          padding: "13px 0",
          willChange: "transform",
        }}
      >
        Dividend received
      </div>
    </div>
  );
}

/* ───────── the scrub engine (frame() from the design, ported verbatim) ───────── */

function useScrollworld() {
  useEffect(() => {
    const canvas = document.getElementById("sw-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const els: Record<string, HTMLElement | null> = {};
    const el = (id: string) => els[id] ?? (els[id] = document.getElementById(id));

    // next/font registers a hashed family name — resolve it for canvas text
    const monoFam =
      getComputedStyle(document.documentElement).getPropertyValue("--font-plex-mono").trim() ||
      '"IBM Plex Mono", monospace';

    let W = 0;
    let H = 0;
    let dpr = 1;
    const onResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    };
    onResize();
    window.addEventListener("resize", onResize);

    // world constants
    const WORLD = 6400;
    const RESET_X = WORLD * 0.49;
    const CANYON_X = WORLD * 0.79;
    const JACKPOT_X = WORLD * 0.67;
    const MACHINE_X = WORLD * 0.375;

    const ridgeY = (x: number) => {
      let y = -x * 0.055 + 40 * Math.sin(x * 0.011) + 22 * Math.sin(x * 0.023 + 1.7) + 12 * Math.sin(x * 0.005 + 0.6);
      y += 130 * Math.exp(-Math.pow((x - RESET_X) / 90, 2)); // red reset dip
      y += 300 * Math.exp(-Math.pow((x - CANYON_X) / 260, 2)); // drawdown canyon
      return y;
    };

    const frame = () => {
      const sc = el("sw-scroll");
      if (!sc) return;
      const max = sc.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, (window.scrollY - sc.offsetTop) / max));
      const T = (a: number, b: number) => Math.max(0, Math.min(1, (p - a) / (b - a)));
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);

      /* ── beat overlays ── */
      const show = (e: HTMLElement | null, a: number, b: number, fadeIn = true, fadeOut = true) => {
        if (!e) return 0;
        let o = 1;
        if (fadeIn) o = Math.min(o, T(a, a + 0.03));
        if (fadeOut) o = Math.min(o, 1 - T(b - 0.03, b));
        if (p < a - 0.02 || p > b + 0.02) o = 0;
        e.style.opacity = o.toFixed(3);
        e.style.transform = "translateY(" + ((1 - o) * 18).toFixed(1) + "px)";
        e.style.pointerEvents = o > 0.5 ? "" : "none";
        return o;
      };
      show(el("sw-b0"), -0.02, 0.09, false, true);
      show(el("sw-b1"), 0.095, 0.3);
      show(el("sw-b2"), 0.31, 0.44);
      show(el("sw-b3a"), 0.45, 0.525);
      show(el("sw-b3b"), 0.535, 0.61);
      show(el("sw-b4"), 0.62, 0.72);
      show(el("sw-b5"), 0.73, 0.85);
      const o6 = show(el("sw-b6"), 0.875, 1.01, true, false);

      // phone: settle in, interact, lift out — all scrubbed
      const wide = W >= 1000;
      const fit = Math.min(1, (H * (wide ? 0.72 : 0.58)) / 900);
      const fb = el("sw-fitbox");
      const bz = el("sw-bezel");
      if (fb && bz) {
        fb.style.width = (428 * fit).toFixed(1) + "px";
        fb.style.height = (900 * fit).toFixed(1) + "px";
        bz.style.transform = "scale(" + fit.toFixed(4) + ")";
      }
      const en = ease(T(0.1, 0.155));
      const ex = ease(T(0.255, 0.3));
      const phone = el("sw-phone");
      if (phone) {
        phone.style.transform =
          "translateY(" + ((1 - en) * 55 - ex * 75).toFixed(2) + "vh) rotate(" + ((1 - en) * -5).toFixed(2) + "deg) scale(" + (0.92 + 0.08 * en - 0.05 * ex).toFixed(3) + ")";
      }
      const pc = el("sw-pchart");
      if (pc) pc.style.strokeDashoffset = (1 - ease(T(0.15, 0.225))).toFixed(3);
      const spySh = el("sw-spy-sh");
      if (spySh) spySh.textContent = (4.912 * ease(T(0.14, 0.24))).toFixed(3) + " sh accrued";
      const nvdaSh = el("sw-nvda-sh");
      if (nvdaSh) nvdaSh.textContent = (3.208 * ease(T(0.16, 0.26))).toFixed(3) + " sh accrued";
      const claim = el("sw-claim");
      const toastEl = el("sw-toast");
      if (claim && toastEl) {
        const tap = T(0.225, 0.235) * (1 - T(0.245, 0.255));
        claim.style.transform = "scale(" + (1 - tap * 0.05).toFixed(3) + ")";
        claim.style.filter = "brightness(" + (1 - tap * 0.18).toFixed(3) + ")";
        const toast = T(0.235, 0.25) * (1 - T(0.285, 0.3));
        toastEl.style.opacity = toast.toFixed(3);
        toastEl.style.transform = "translate(-50%," + ((1 - toast) * 12).toFixed(1) + "px)";
      }

      // callouts: side annotations on wide screens, sequential caption below the phone on narrow
      const coOut = 1 - T(0.255, 0.29);
      const SIDE_TOP = ["15%", "24%", "56%", "63%"];
      for (let i = 0; i < 4; i++) {
        const co = el("sw-co" + i);
        if (!co) continue;
        const conn = co.lastElementChild as HTMLElement | null;
        co.style.display = "";
        if (wide) {
          if (i % 2 === 0) {
            co.style.right = "calc(100% + 46px)";
            co.style.left = "auto";
            co.style.textAlign = "right";
          } else {
            co.style.left = "calc(100% + 46px)";
            co.style.right = "auto";
            co.style.textAlign = "left";
          }
          co.style.top = SIDE_TOP[i];
          co.style.width = "216px";
          if (conn) conn.style.display = "";
          const t = ease(T(0.135 + i * 0.02, 0.165 + i * 0.02));
          co.style.opacity = (t * coOut).toFixed(3);
          const dir = i % 2 === 0 ? -1 : 1;
          co.style.transform = "translateX(" + (dir * (1 - t) * -14).toFixed(1) + "px)";
        } else {
          co.style.left = "50%";
          co.style.right = "auto";
          co.style.top = "calc(100% + 12px)";
          co.style.width = "min(340px, 86vw)";
          co.style.textAlign = "center";
          if (conn) conn.style.display = "none";
          const a = 0.125 + i * 0.033;
          const t = T(a, a + 0.012) * (1 - T(a + 0.026, a + 0.038));
          co.style.opacity = (t * coOut).toFixed(3);
          co.style.transform = "translate(-50%," + ((1 - t) * 8).toFixed(1) + "px)";
        }
      }
      const b6 = el("sw-b6");
      if (b6) b6.style.pointerEvents = o6 > 0.5 ? "auto" : "none";

      // machine chips stagger
      for (let i = 0; i < 4; i++) {
        const c = el("sw-chip" + i);
        if (!c) continue;
        const t = T(0.34 + i * 0.02, 0.36 + i * 0.02);
        c.style.opacity = (t * Math.min(1, 1 - T(0.41, 0.44))).toFixed(3);
        c.style.transform = "translateY(" + ((1 - t) * 10).toFixed(1) + "px)";
      }

      // session dividend value
      const val = 4283.19 * ease(T(0.105, 0.19)) + 412.55 * T(0.19, 1);
      const valEl = el("sw-val");
      if (valEl) valEl.textContent = val <= 0 ? "$0.00" : "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // HUD streak
      const day = Math.round(Math.min(1, p * 1.08) * 90);
      const dayEl = el("sw-day");
      if (dayEl) dayEl.textContent = "Streak · Day " + day + "/90";
      const bar = el("sw-bar");
      if (bar) bar.style.width = (Math.min(1, p * 1.08) * 100).toFixed(1) + "%";
      const elig = el("sw-elig");
      if (elig) elig.style.display = day >= 90 ? "" : "none";
      const pday = el("sw-pday");
      if (pday) pday.textContent = "Day " + day + " of 90";
      const hud = el("sw-hud");
      if (hud) hud.style.display = W < 720 ? "none" : "";

      // proof counters
      const pr = ease(T(0.735, 0.8));
      const p0 = el("sw-p0");
      const p1 = el("sw-p1");
      const p2 = el("sw-p2");
      if (p0) p0.textContent = String(Math.round(54 * pr));
      if (p1) p1.textContent = String(Math.round(92 * pr));
      if (p2) p2.textContent = String(Math.round(100 * pr));

      /* ── canvas world ── */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const drawP = ease(T(0.0, 0.1)); // intro draw-in
      const camX = p * WORLD;
      let camY = 0;
      for (let i = -3; i <= 3; i++) camY += ridgeY(camX + i * 120);
      camY /= 7;
      const cy = H * 0.62;
      const camScreenX = W * 0.38;
      const scale = 1 + 0.12 * Math.sin(p * Math.PI); // gentle breathing zoom
      const toScreen = (x: number) => ({ sx: (x - camX) * scale + camScreenX, sy: cy + (ridgeY(x) - camY) * scale * (H / 900) });
      const globalA = 1 - T(0.86, 0.94);
      if (globalA <= 0.005) return;
      ctx.globalAlpha = globalA;

      // parallax grid dots
      ctx.fillStyle = "rgba(245,243,238,0.05)";
      const gs = 120;
      const offX = (camX * 0.4) % gs;
      for (let gx = -offX; gx < W; gx += gs) for (let gy = (H % gs) / 2; gy < H; gy += gs) ctx.fillRect(gx, gy, 2, 2);

      // dashed baseline (prev close)
      ctx.strokeStyle = "rgba(245,243,238,0.14)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      const baseY = cy + (ridgeY(0) - camY) * scale * (H / 900) + 40;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.lineTo(W, baseY);
      ctx.stroke();
      ctx.setLineDash([]);

      // the ridge line
      const x0 = camX - camScreenX / scale - 60;
      const x1 = camX + (W - camScreenX) / scale + 60;
      const drawTo = x0 + (x1 - x0) * (p < 0.1 ? drawP : 1);
      const step = 10;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      const segment = (from: number, to: number, color: string, glow: number) => {
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
        ctx.beginPath();
        for (let x = from; x <= to; x += step) {
          const s = toScreen(x);
          if (x === from) ctx.moveTo(s.sx, s.sy);
          else ctx.lineTo(s.sx, s.sy);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      };
      // split into green / red(reset zone) segments
      const redA = RESET_X - 110;
      const redB = RESET_X + 110;
      const lim = Math.min(x1, drawTo);
      if (lim > x0) {
        const a = x0;
        const b = Math.min(lim, redA);
        if (b > a) segment(a, b, "#00C805", 10);
        if (lim > redA) segment(Math.max(a, redA), Math.min(lim, redB), "#FF5000", 10);
        if (lim > redB) segment(Math.max(a, redB), lim, "#00C805", 10);
      }

      // leading tick dot
      if (p < 0.1) {
        const s = toScreen(drawTo);
        ctx.fillStyle = "#00C805";
        ctx.shadowColor = "#00C805";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, 3.5, 0, 7);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.font = "10px " + monoFam;
      // machine: fee particles falling into the pool point
      const mA = T(0.3, 0.33) * (1 - T(0.42, 0.46));
      if (mA > 0) {
        const pool = toScreen(MACHINE_X);
        ctx.globalAlpha = globalA * mA;
        for (let i = 0; i < 34; i++) {
          const h = (Math.sin(i * 127.1) * 43758.5453) % 1;
          const ph = (p * 26 + Math.abs(h)) % 1;
          const px = pool.sx + (Math.abs(Math.sin(i * 311.7)) - 0.5) * 2 * 180;
          const py = ph * (pool.sy - 40);
          ctx.fillStyle = ph > 0.85 ? "#00C805" : "rgba(245,243,238,0.4)";
          ctx.beginPath();
          ctx.arc(px, py, ph > 0.85 ? 2.5 : 1.6, 0, 7);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(0,200,5,0.9)";
        ctx.shadowColor = "#00C805";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(pool.sx, pool.sy, 5, 0, 7);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = globalA;
      }

      // streak posts: DAY markers along ridge
      const stA = T(0.44, 0.47) * (1 - T(0.6, 0.64));
      if (stA > 0) {
        ctx.globalAlpha = globalA * stA;
        const startX = WORLD * 0.46;
        const endX = WORLD * 0.6;
        for (let d = 0; d <= 90; d += 10) {
          const x = startX + (endX - startX) * (d / 90);
          const s = toScreen(x);
          const inRed = x > redA && x < redB;
          ctx.strokeStyle = inRed ? "rgba(255,80,0,0.7)" : "rgba(245,243,238,0.35)";
          ctx.beginPath();
          ctx.moveTo(s.sx, s.sy);
          ctx.lineTo(s.sx, s.sy - 16);
          ctx.stroke();
          if (d % 30 === 0) {
            ctx.fillStyle = inRed ? "#FF5000" : d === 90 ? "#00C805" : "rgba(245,243,238,0.55)";
            ctx.fillText("DAY " + d, s.sx - 16, s.sy - 24);
          }
        }
        ctx.globalAlpha = globalA;
      }

      // jackpot pot glow on the ridge
      const jA = T(0.6, 0.635) * (1 - T(0.71, 0.75));
      if (jA > 0) {
        const s = toScreen(JACKPOT_X);
        ctx.globalAlpha = globalA * jA;
        const pulse = 1 + 0.15 * Math.sin(p * 140);
        ctx.strokeStyle = "#00C805";
        ctx.shadowColor = "#00C805";
        ctx.shadowBlur = 30;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.sx, s.sy - 26, 18 * pulse, 0, 7);
        ctx.stroke();
        ctx.fillStyle = "#00C805";
        ctx.beginPath();
        ctx.arc(s.sx, s.sy - 26, 6, 0, 7);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.globalAlpha = globalA;
      }

      // canyon tents (54 holders camped through the drawdown)
      const cA = T(0.72, 0.75) * (1 - T(0.85, 0.89));
      if (cA > 0) {
        ctx.globalAlpha = globalA * cA;
        for (let i = 0; i < 54; i++) {
          const x = CANYON_X - 210 + (i / 53) * 420;
          const s = toScreen(x);
          const lit = i % 5 === 0;
          ctx.fillStyle = lit ? "#00C805" : "rgba(245,243,238,0.45)";
          ctx.beginPath();
          ctx.arc(s.sx, s.sy - 5 - Math.abs(Math.sin(i * 7.3)) * 6, lit ? 2.2 : 1.4, 0, 7);
          ctx.fill();
        }
        ctx.globalAlpha = globalA;
      }
      ctx.globalAlpha = 1;
    };

    let running = true;
    const loop = () => {
      if (!running) return;
      requestAnimationFrame(loop);
      try {
        frame();
      } catch {}
    };
    requestAnimationFrame(loop);

    return () => {
      running = false;
      window.removeEventListener("resize", onResize);
    };
  }, []);
}

/* ───────── Friday 4:00 PM ET countdown ───────── */

function useFridayCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const target = new Date(et);
      let addDays = (5 - et.getDay() + 7) % 7;
      if (addDays === 0 && et.getHours() >= 16) addDays = 7;
      target.setDate(et.getDate() + addDays);
      target.setHours(16, 0, 0, 0);
      setRemaining(Math.max(target.getTime() - et.getTime(), 0));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return remaining;
}

/* ───────── page ───────── */

export default function V3Scrollworld() {
  useScrollworld();
  const cdMs = useFridayCountdown();
  const fire = useFireMarket();

  const buyLabel = TRADING_LIVE && BUY_URL ? "Buy FIRE" : "Get notified at launch";
  const buyHref = TRADING_LIVE && BUY_URL ? BUY_URL : TELEGRAM_URL;
  const cd = (u: number) => (cdMs === null ? "–" : String(u).padStart(2, "0"));
  const cdUnits = [
    { label: "Days", value: cd(Math.floor((cdMs || 0) / 86400000)) },
    { label: "Hours", value: cd(Math.floor(((cdMs || 0) / 3600000) % 24)) },
    { label: "Min", value: cd(Math.floor(((cdMs || 0) / 60000) % 60)) },
    { label: "Sec", value: cd(Math.floor(((cdMs || 0) / 1000) % 60)) },
  ];

  return (
    <div className="fv-page" style={{ background: "#110E08", color: "#F5F3EE" }}>
      {/* FIXED NAV + STREAK HUD */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 60, background: "rgba(17,14,8,0.72)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(245,243,238,0.08)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#F5F3EE" }}>
            <Image src="/brand/fire-glyph.svg" alt="FIRE" width={26} height={26} style={{ width: 26, height: 26 }} />
            <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em", lineHeight: 1 }}>
              FIRE
              <span style={{ display: "block", fontFamily: MONOF, fontSize: 8, letterSpacing: "0.24em", color: "rgba(245,243,238,0.55)", lineHeight: 1, marginTop: 3, textTransform: "uppercase", fontWeight: 400 }}>
                Dividends, in stocks
              </span>
            </span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
            {fire.priceUsd > 0 && (
              <span className="hidden md:inline-flex" style={{ alignItems: "baseline", gap: 6, fontFamily: MONOF, fontVariantNumeric: "tabular-nums", fontSize: 11 }}>
                <span style={{ color: "rgba(245,243,238,0.55)" }}>FIRE</span>
                <span>${fire.priceUsd < 0.01 ? fire.priceUsd.toFixed(6) : fire.priceUsd.toFixed(4)}</span>
                <span style={{ color: fire.priceChange24h >= 0 ? "#00C805" : "#FF5000" }}>
                  {fire.priceChange24h >= 0 ? "+" : ""}{fire.priceChange24h.toFixed(0)}%
                </span>
              </span>
            )}
            <Link href="/dashboard" className="block no-underline text-[12px] sm:text-[13px] font-medium text-[var(--fv-muted)] hover:text-[var(--fv-text)] transition-colors">
              Dashboard
            </Link>
            <Link href="/jackpot" className="block no-underline text-[12px] sm:text-[13px] font-medium text-[var(--fv-muted)] hover:text-[var(--fv-text)] transition-colors">
              Jackpot
            </Link>
            <div id="sw-hud" className="hidden sm:flex" style={{ alignItems: "center", gap: 10, fontFamily: MONOF, fontVariantNumeric: "tabular-nums", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,243,238,0.55)", minWidth: 0 }}>
              <span id="sw-day" style={{ whiteSpace: "nowrap" }}>Streak · Day 0/90</span>
              <span style={{ width: 96, height: 3, borderRadius: 999, background: "#221D15", overflow: "hidden", display: "inline-block" }}>
                <span id="sw-bar" style={{ display: "block", height: "100%", width: "0%", background: "#00C805", borderRadius: 999 }} />
              </span>
              <span id="sw-elig" style={{ display: "none", whiteSpace: "nowrap", border: "1px solid #00C805", color: "#00C805", borderRadius: 999, padding: "3px 10px", fontSize: 9, letterSpacing: "0.16em" }}>
                Jackpot eligible
              </span>
            </div>
            <a href={buyHref} {...(buyHref.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })} className="fv-btn" style={{ fontSize: 13, padding: "8px 16px", whiteSpace: "nowrap" }}>
              {buyLabel}
            </a>
          </div>
        </div>
      </nav>

      {/* SCROLL WORLD */}
      <div id="sw-scroll" style={{ position: "relative", height: "900vh" }}>
        <div id="sw-stage" className="sw-stage">
          <canvas id="sw-canvas" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />

          {/* BEAT 0 · TITLE */}
          <div id="sw-b0" style={beatBase}>
            <CACopy />
            <p style={{ ...kicker, margin: "0 0 18px" }}>Live on Robinhood Chain</p>
            <h1 style={{ fontSize: "clamp(44px,7vw,92px)", lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, maxWidth: 980, textWrap: "balance" }}>
              Get paid in stocks. But you have to <Em>earn it.</Em>
            </h1>
            <p style={{ fontSize: "clamp(15px,1.4vw,18px)", lineHeight: 1.65, color: "rgba(245,243,238,0.55)", margin: "22px auto 0", maxWidth: 560, textWrap: "pretty" }}>
              FIRE pays you in tokenized stocks for holding. The longer you hold, the bigger your cut. Every Friday, one diamond hand takes the whole jackpot.
            </p>
            <p style={{ fontFamily: MONOF, fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(245,243,238,0.55)", margin: "64px 0 0", animation: "sw-hint 2.4s ease-in-out infinite" }}>
              Scroll to start your streak ↓
            </p>
          </div>

          {/* BEAT 1 · DAY ONE / PHONE */}
          <div id="sw-b1" style={{ ...beatBase, opacity: 0 }}>
            <p style={{ ...kicker, margin: "0 0 10px" }}>Day one</p>
            <h2 style={{ fontSize: "clamp(24px,3vw,40px)", lineHeight: 1.05, letterSpacing: "-0.02em", fontWeight: 600, margin: "0 0 18px", textWrap: "balance" }}>
              You&apos;re <Em>already earning.</Em>
            </h2>
            <div id="sw-phone" style={{ willChange: "transform", transformOrigin: "center center", position: "relative" }}>
              <Callout id="sw-co0" side="left" top="15%" title="Hold → you earn" body="Trading fees buy real stock tokens. They land straight in your wallet — nothing to claim, nothing to do." />
              <Callout id="sw-co2" side="left" top="56%" title="Money can't buy a streak" body="A bigger bag earns more stock, but only time raises your tier. Whales wait like everyone else." />
              <Callout id="sw-co1" side="right" top="24%" title="Time → your multiplier" body="Your cut grows every day you hold and maxes out at 90. Watch the streak row climb." />
              <Callout id="sw-co3" side="right" top="63%" title="Pushed, not claimed" body="Every distribution sends stock straight to every holder's wallet. A 5% slice of each pot feeds Friday's jackpot draw." />
              {/* hardware bezel (fitbox reserves the scaled layout size) */}
              <div id="sw-fitbox" style={{ position: "relative", overflow: "visible" }}>
                <div
                  id="sw-bezel"
                  style={{
                    position: "relative",
                    width: 402,
                    borderRadius: 62,
                    padding: 13,
                    background: "#1C1C1E",
                    boxShadow: "inset 0 0 0 1.5px rgba(245,243,238,0.18), inset 0 0 0 3px rgba(0,0,0,0.9), 0 50px 100px rgba(0,0,0,0.5)",
                    transformOrigin: "top left",
                  }}
                >
                  <span style={{ position: "absolute", left: -2.5, top: 158, width: 3, height: 28, borderRadius: 2, background: "#3A3A3C" }} />
                  <span style={{ position: "absolute", left: -2.5, top: 214, width: 3, height: 52, borderRadius: 2, background: "#3A3A3C" }} />
                  <span style={{ position: "absolute", left: -2.5, top: 278, width: 3, height: 52, borderRadius: 2, background: "#3A3A3C" }} />
                  <span style={{ position: "absolute", right: -2.5, top: 240, width: 3, height: 78, borderRadius: 2, background: "#3A3A3C" }} />
                  <IOSDevice>
                    <PhoneScreen />
                  </IOSDevice>
                </div>
              </div>
            </div>
          </div>

          {/* BEAT 2 · THE MACHINE */}
          <div id="sw-b2" style={{ ...beatBase, opacity: 0 }}>
            <p style={kicker}>The machine</p>
            <h2 style={{ fontSize: "clamp(30px,4.5vw,56px)", lineHeight: 1.05, letterSpacing: "-0.02em", fontWeight: 600, margin: 0, maxWidth: 760, textWrap: "balance" }}>
              Every paper hand <Em>funds yours.</Em>
            </h2>
            <p style={{ fontSize: "clamp(14px,1.3vw,16px)", lineHeight: 1.65, color: "rgba(245,243,238,0.55)", margin: "18px auto 0", maxWidth: 520, textWrap: "pretty" }}>
              Exit fees fill the pool. The pool buys tokenized stock in daily batches, during US market hours.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap", justifyContent: "center" }}>
              {["01 · Trades pay a fee", "02 · Pool buys stock", "03 · You accrue live", "04 · Claim whenever"].map((label, i) => (
                <span
                  key={label}
                  id={"sw-chip" + i}
                  style={{
                    fontFamily: MONOF,
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    border: i === 3 ? "1px solid #00C805" : "1px solid rgba(245,243,238,0.22)",
                    color: i === 3 ? "#00C805" : undefined,
                    borderRadius: 999,
                    padding: "8px 16px",
                    opacity: 0,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* BEAT 3a · RESET */}
          <div id="sw-b3a" style={{ ...beatBase, opacity: 0 }}>
            <p style={{ ...kicker, color: "#FF5000" }}>The rules</p>
            <h2 style={{ fontSize: "clamp(30px,4.5vw,56px)", lineHeight: 1.05, letterSpacing: "-0.02em", fontWeight: 600, margin: 0, textWrap: "balance" }}>
              Sell big, <Em red>start over.</Em>
            </h2>
            <p style={{ fontSize: "clamp(14px,1.3vw,16px)", lineHeight: 1.65, color: "rgba(245,243,238,0.55)", margin: "18px auto 0", maxWidth: 480, textWrap: "pretty" }}>
              Break your position and your streak goes to zero. Your share goes to everyone who stayed.
            </p>
            <p style={{ fontFamily: MONOF, fontVariantNumeric: "tabular-nums", fontSize: 11, letterSpacing: "0.14em", color: "rgba(245,243,238,0.35)", margin: "24px 0 0" }}>
              Day 63 <span style={{ color: "#FF5000" }}>→ Day 0</span>
            </p>
          </div>

          {/* BEAT 3b · 90 DAYS */}
          <div id="sw-b3b" style={{ ...beatBase, opacity: 0 }}>
            <p style={kicker}>The rules</p>
            <h2 style={{ fontSize: "clamp(30px,4.5vw,56px)", lineHeight: 1.05, letterSpacing: "-0.02em", fontWeight: 600, margin: 0, textWrap: "balance" }}>
              90 days. <Em>Full tier.</Em>
            </h2>
            <p style={{ fontSize: "clamp(14px,1.3vw,16px)", lineHeight: 1.65, color: "rgba(245,243,238,0.55)", margin: "18px auto 0", maxWidth: 460, textWrap: "pretty" }}>
              Hold 90 days for the maximum cut and a seat in the Friday draw. Money buys a bigger bag. It can&apos;t buy a longer streak.
            </p>
            <span style={{ fontFamily: MONOF, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", border: "1px solid #00C805", color: "#00C805", borderRadius: 999, padding: "8px 18px", marginTop: 24 }}>
              Jackpot eligible
            </span>
          </div>

          {/* BEAT 4 · JACKPOT */}
          <div id="sw-b4" style={{ ...beatBase, opacity: 0 }}>
            <p style={kicker}>Every Friday</p>
            <h2 style={{ fontSize: "clamp(32px,5vw,64px)", lineHeight: 1.02, letterSpacing: "-0.02em", fontWeight: 600, margin: 0, textWrap: "balance" }}>
              One diamond hand takes <Em>the pot.</Em>
            </h2>
            <p style={{ fontSize: "clamp(14px,1.3vw,16px)", lineHeight: 1.65, color: "rgba(245,243,238,0.55)", margin: "18px auto 0", maxWidth: 520, textWrap: "pretty" }}>
              Options expire on Friday. So does your excuse for selling. One eligible holder wins the whole pot. The streak is the ticket; the bag sets your odds.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "clamp(14px,3vw,32px)", marginTop: 36 }}>
              {cdUnits.map((u) => (
                <div key={u.label}>
                  <p style={{ fontFamily: MONOF, fontVariantNumeric: "tabular-nums", fontSize: "clamp(34px,4.5vw,56px)", fontWeight: 500, lineHeight: 1, color: "#00C805", margin: 0 }}>
                    {u.value}
                  </p>
                  <p style={{ fontFamily: MONOF, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,243,238,0.35)", margin: "10px 0 0" }}>
                    {u.label}
                  </p>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: MONOF, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,243,238,0.35)", margin: "22px 0 0" }}>
              Next draw · Friday 4:00 PM ET
            </p>
          </div>

          {/* BEAT 5 · PROOF */}
          <div id="sw-b5" style={{ ...beatBase, opacity: 0 }}>
            <p style={kicker}>The holder base</p>
            <h2 style={{ fontSize: "clamp(30px,4.5vw,56px)", lineHeight: 1.05, letterSpacing: "-0.02em", fontWeight: 600, margin: 0, textWrap: "balance" }}>
              This holder base has already been <Em>tested.</Em>
            </h2>
            <p style={{ fontSize: "clamp(14px,1.3vw,16px)", lineHeight: 1.65, color: "rgba(245,243,238,0.55)", margin: "18px auto 0", maxWidth: 540, textWrap: "pretty" }}>
              The bigger the bag, the longer they held. They migrated here with their streaks intact. Every project can claim diamond hands. Ours has the on-chain proof.
            </p>
            <div style={{ display: "flex", gap: "clamp(28px,6vw,72px)", marginTop: 40, flexWrap: "wrap", justifyContent: "center" }}>
              {[
                { id: "sw-p0", suffix: "/100", label: "Top-100 wallets held the bottom" },
                { id: "sw-p1", suffix: "%", label: "Drawdown they held through" },
                { id: "sw-p2", suffix: "%", label: "Streaks migrated by snapshot" },
              ].map((s) => (
                <div key={s.id}>
                  <p style={{ fontFamily: MONOF, fontVariantNumeric: "tabular-nums", fontSize: "clamp(40px,5vw,68px)", fontWeight: 500, lineHeight: 1, letterSpacing: "-0.03em", margin: 0 }}>
                    <span id={s.id}>0</span>
                    <span style={{ color: "#00C805" }}>{s.suffix}</span>
                  </p>
                  <p style={{ fontFamily: MONOF, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(245,243,238,0.55)", margin: "12px 0 0", maxWidth: 200 }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: MONOF, fontSize: 9, color: "rgba(245,243,238,0.35)", margin: "32px 0 0", letterSpacing: "0.08em" }}>
              From the v1 snapshot, Jul 2026. Past holder behavior is not a promise of future behavior.
            </p>
          </div>

          {/* BEAT 6 · FINALE */}
          <div id="sw-b6" style={{ ...beatBase, opacity: 0 }}>
            <Image src="/brand/fire-mark-tile.svg" alt="" width={140} height={140} style={{ width: "clamp(88px,12vw,140px)", height: "auto", marginBottom: 28 }} />
            <h2 style={{ fontSize: "clamp(34px,5.5vw,76px)", lineHeight: 1.04, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, textWrap: "balance" }}>
              Stocks pay dividends quarterly. FIRE pays <Em>for holding.</Em>
            </h2>
            <p style={{ fontSize: "clamp(14px,1.3vw,16px)", lineHeight: 1.65, color: "rgba(245,243,238,0.55)", margin: "20px auto 0", maxWidth: 480 }}>
              Dividends in stocks, from day one. Full tier in 90 days. Jackpot on Friday.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32, justifyContent: "center", flexWrap: "wrap" }}>
              <a href={buyHref} {...(buyHref.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })} className="fv-btn" style={{ fontSize: 15, padding: "15px 30px" }}>
                {buyLabel}
              </a>
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="fv-btn-ghost" style={{ fontSize: 15, padding: "15px 30px" }}>
                Join the Telegram
              </a>
            </div>
            <div style={{ display: "flex", gap: 28, marginTop: 28, justifyContent: "center", flexWrap: "wrap" }}>
              {[["Dashboard", "/dashboard"], ["Jackpot", "/jackpot"], ["The Board", "/leaderboard"]].map(([label, href]) => (
                <Link key={href} href={href} className="no-underline" style={{ fontFamily: MONOF, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,243,238,0.55)" }}>
                  {label}
                </Link>
              ))}
            </div>
            <p style={{ fontFamily: MONOF, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,243,238,0.35)", margin: "40px 0 0", maxWidth: 560, lineHeight: 2 }}>
              Not a financial product · Stock tokens track, but are not, shares · Not available in certain jurisdictions incl. US · CA announced at launch
            </p>
          </div>
        </div>
      </div>

      <FooterV3 />
    </div>
  );
}
