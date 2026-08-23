"use client";

import { useEffect, useRef, useState } from "react";
import { mountScrollWorld } from "./scrub";

/* v5 home — the movement scrollworld.
   Ported from the Claude Design prototype (FIRE Home v5.dc.html). The DOM keeps
   the prototype's `data-r` / `data-*` hooks so the scrub engine in ./scrub.ts is
   a near-verbatim transfer rather than a reinterpretation — the timing curves in
   there were tuned against this exact markup.

   Changes from the prototype, all deliberate:
   - assets are webp/mp4 under /v5 (16MB of source PNGs -> 928KB)
   - the tide clip has had its audio track stripped, so none of the prototype's
     muting dance is needed
   - beat 2 copy rewritten: the original never said what the number was FOR
   - the healthcare caveat moved from beat 2 to beat 6, where it lands right
     before our own pitch instead of interrupting the explanation
   - beat 6 and 7 figures come from live endpoints
   - CTAs point at real routes */

const MONO = "'IBM Plex Mono',monospace";
const SANS = "'DM Sans',system-ui,sans-serif";
const SERIF = "'Instrument Serif',serif";
const GREEN = "#00C805";
const INK = "#F5F3EE";

const serif: React.CSSProperties = {
  fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, letterSpacing: "-.005em",
};
const h1: React.CSSProperties = {
  margin: "0 0 20px", fontFamily: SANS, fontWeight: 500,
  fontSize: "clamp(26px,3.3vw,42px)", lineHeight: 1.07, letterSpacing: "-.028em",
  color: INK, textWrap: "balance",
};
const body: React.CSSProperties = {
  margin: 0, fontSize: "clamp(15px,1.06vw,17px)", lineHeight: 1.6,
  color: "rgba(245,243,238,.58)", maxWidth: "42ch", textWrap: "pretty",
};
const kickWrap: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 11, marginBottom: 20,
  fontFamily: MONO, fontSize: 11.5, letterSpacing: ".2em",
  textTransform: "uppercase", color: GREEN,
};
const emberStill: React.CSSProperties = {
  display: "none", width: 96, height: "auto", margin: "0 0 22px",
  filter: "saturate(1.15) drop-shadow(0 0 14px rgba(0,200,5,.4))",
};

function Kick({ children, tone = GREEN }: { children: React.ReactNode; tone?: string }) {
  return (
    <div style={{ ...kickWrap, color: tone }}>
      <span style={{ display: "block", width: 20, height: 1, background: tone === GREEN ? "rgba(0,200,5,.55)" : "#7E7669" }} />
      {children}
    </div>
  );
}

const SUBS: [string, number, number, number][] = [
  ["r/financialindependence", 2_400_000, 100, 0.95],
  ["r/Fire", 956_000, 39.8, 0.82],
  ["r/fatFIRE", 492_000, 20.5, 0.7],
  ["r/leanfire", 375_000, 15.6, 0.6],
  ["r/ChubbyFIRE", 149_000, 6.2, 0.5],
  ["r/coastFIRE", 143_000, 6, 0.44],
];

const DIALECT: [string, string, number][] = [
  ["Lean", "small number, small life, out early", 30],
  ["Coast", "invested enough young that it grows to the number on its own", 55],
  ["Barista", "part-time work for the health cover, portfolio does the rest", 45],
  ["Chubby", "comfortable, not extravagant", 78],
  ["Fat", "the number is large and so is the life", 100],
];

// 24 assembly fragments that converge into the number in beat 2.
const PARTS: [number, number, number, string][] = [
  [4, 12, 18, "#3A342C"], [11, 68, 14, "#3A342C"], [17, 26, 22, "rgba(0,200,5,.4)"],
  [23, 88, 16, "#3A342C"], [29, 6, 20, "#3A342C"], [35, 78, 13, "rgba(0,200,5,.3)"],
  [41, 18, 17, "#3A342C"], [47, 92, 21, "#3A342C"], [53, 9, 15, "#3A342C"],
  [59, 74, 19, "rgba(0,200,5,.35)"], [65, 22, 14, "#3A342C"], [71, 84, 18, "#3A342C"],
  [77, 14, 22, "#3A342C"], [83, 70, 16, "rgba(0,200,5,.3)"], [89, 30, 20, "#3A342C"],
  [95, 80, 14, "#3A342C"], [8, 44, 17, "#3A342C"], [20, 52, 12, "#3A342C"],
  [38, 40, 15, "#3A342C"], [56, 56, 13, "#3A342C"], [74, 46, 16, "#3A342C"],
  [92, 54, 12, "#3A342C"], [14, 96, 19, "#3A342C"], [86, 2, 19, "#3A342C"],
];

const DIGITS = ["$", "1", ",", "2", "0", "0", ",", "0", "0", "0"];
const FACES = ["sleeping", "worried", "shocked", "curious", "determined", "stepping", "happy", "smug", "triumphant"];
// Order matches BADGES in src/lib/badges.ts. The lit/dim pattern is one plausible
// partial collection — diamond, full basket, founding 100 and jackpot unearned.
const BADGE_KEYS = ["spark", "iron", "steel", "forged", "tempered", "diamond",
                    "week-one", "thirty", "century", "year-one", "first-drop", "ten-drops",
                    "full-basket", "unbroken", "og", "founding-100", "in-the-draw", "jackpot"];
const BADGE_LABELS = ["Spark", "Iron", "Steel", "Forged", "Tempered", "Diamond",
                      "Week One", "Thirty", "Century", "Year One", "First Drop", "Ten Drops",
                      "Full Basket", "Unbroken", "OG", "Founding 100", "In The Draw", "Jackpot"];
const BADGES_ON = [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0];

type Live = { alive: number; total: number; pct: number; drops: number; assets: number; wallets: number };
const FALLBACK: Live = { alive: 580, total: 620, pct: 94, drops: 68, assets: 7, wallets: 6144 };

export function HomeV5() {
  const root = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<Live>(FALLBACK);

  // Live figures first, then the engine — the scrub reads count-up targets off
  // the DOM, so it must not start before the real numbers are in it.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let off = false;
    Promise.allSettled([
      fetch("/api/monthly-leaderboard").then((r) => r.json()),
      fetch("/api/protocol-stats").then((r) => r.json()),
    ]).then(([c, s]) => {
      if (off) return;
      const next = { ...FALLBACK };
      if (c.status === "fulfilled" && c.value?.startedInMonth) {
        next.alive = c.value.stillUnbroken;
        next.total = c.value.startedInMonth;
        next.pct = c.value.survivalRate;
      }
      if (s.status === "fulfilled" && s.value?.wallets) {
        next.drops = s.value.distributions;
        next.assets = s.value.assets;
        next.wallets = s.value.wallets;
      }
      setLive(next);
      setReady(true);
    });
    return () => { off = true; };
  }, []);

  useEffect(() => {
    if (!ready || !root.current) return;
    return mountScrollWorld(root.current, { cohortPct: live.pct, cohortAlive: live.alive });
  }, [ready, live.pct, live.alive]);

  return (
    <div
      ref={root}
      data-r="root"
      data-v5=""
      style={{ position: "relative", background: "#110E08", color: INK, fontFamily: SANS }}
    >
      <div data-r="page" style={{ position: "relative", overflowX: "clip" }}>
        <div data-r="timeline" style={{ position: "relative", height: "900vh" }}>
          <div data-r="stage" style={{ position: "sticky", top: 0, height: "100vh" }}>
            <div data-r="worldclip" style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#110E08" }}>

              <div data-r="arc" style={{ position: "absolute", left: "50%", top: "82%", width: "92%", height: "46%", transform: "translate(-50%,-50%)", background: GREEN, filter: "blur(190px)", opacity: 0, pointerEvents: "none", zIndex: 0 }} />

              {/* ── 1 · THE LOOP ── */}
              <div data-beat="1" style={{ position: "absolute", inset: 0 }}>
                <div data-r="w1" style={{ position: "absolute", inset: 0 }}>
                  <div style={{ position: "absolute", left: "50%", top: "58%", width: "66vw", height: "34vh", transform: "translate(-50%,-50%)", background: "#2A2013", filter: "blur(110px)", opacity: .32, borderRadius: "50%" }} />
                  <div data-r="w1scrim" style={{ position: "absolute", left: 0, top: 0, width: "60%", height: "40%", background: "#110E08", filter: "blur(88px)", opacity: .94, zIndex: 2 }} />
                  <div data-r="w1i" style={{ position: "absolute", left: "50%", top: "54%", transform: "translate(-50%,-50%)", width: "min(1500px,104vw)", zIndex: 1, WebkitMaskImage: "radial-gradient(ellipse 76% 72% at 50% 50%,#000 58%,transparent 100%)", maskImage: "radial-gradient(ellipse 76% 72% at 50% 50%,#000 58%,transparent 100%)" }}>
                    <video data-r="w1v" src="/v5/tide.mp4" poster="/v5/world-tide.webp" muted playsInline preload="auto" aria-label="A grey commuter tide, endless and tail-lit, moving as you scroll" style={{ display: "block", width: "100%", height: "auto" }} />
                  </div>
                </div>
                <div data-r="t1wrap" style={{ position: "absolute", zIndex: 30, left: 24, right: 24, top: "50%", transform: "translateY(-50%)" }}>
                  <div data-r="t1" style={{ maxWidth: 560 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img data-ember-still src="/v5/ember-worried.webp" alt="Ember, waking" style={emberStill} />
                    <Kick tone="#A89E93">6:40 AM · Monday</Kick>
                    <h1 style={{ ...h1, fontSize: "clamp(30px,4.7vw,58px)", lineHeight: 1.04 }}>
                      <span style={serif}>Forty years.</span> That was the deal.
                    </h1>
                    <p style={{ ...body, color: "rgba(245,243,238,.68)", fontSize: "clamp(15px,1.12vw,17.5px)", maxWidth: "44ch" }}>
                      Work until 65, save what&apos;s left of the paycheck, and retire to a small
                      apartment somewhere warm. For most people that formula stopped working.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── 2 · THE MATH ── */}
              <div data-beat="2" style={{ position: "absolute", inset: 0 }}>
                <div data-r="w2" style={{ position: "absolute", inset: 0, opacity: 0 }}>
                  <div data-r="b2wrap" style={{ position: "absolute", zIndex: 30, left: 24, right: 24, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: "clamp(20px,3.2vh,44px)" }}>
                    <div data-r="w2i" style={{ position: "relative", transformOrigin: "50% 50%" }}>
                      <div data-r="parts" style={{ position: "absolute", left: "-8%", right: "-8%", top: -90, bottom: -90, pointerEvents: "none" }}>
                        {PARTS.map(([l, t, h, c], i) => (
                          <div key={i} data-part style={{ position: "absolute", left: `${l}%`, top: `${t}%`, width: 2, height: h, background: c }} />
                        ))}
                      </div>

                      <div style={{ position: "relative", padding: "34px 0 30px" }}>
                        <div data-draw="x" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1, background: "rgba(0,200,5,.32)", transformOrigin: "left center", transform: "scaleX(0)" }} />
                        <div data-draw="x" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, background: "rgba(0,200,5,.32)", transformOrigin: "left center", transform: "scaleX(0)" }} />
                        <div data-draw="y" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 1, background: "rgba(245,243,238,.13)", transformOrigin: "center top", transform: "scaleY(0)" }} />
                        <div data-draw="y" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 1, background: "rgba(245,243,238,.13)", transformOrigin: "center top", transform: "scaleY(0)" }} />

                        <div data-r="ticks" style={{ position: "absolute", left: 0, right: 0, top: 1, display: "flex", justifyContent: "space-between" }}>
                          {Array.from({ length: 10 }, (_, i) => (
                            <div key={i} style={{ width: 1, height: i % 3 === 0 ? 9 : 5, background: i % 3 === 0 ? "rgba(0,200,5,.45)" : "rgba(245,243,238,.16)" }} />
                          ))}
                        </div>

                        <div data-r="num" style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", fontFamily: MONO, fontWeight: 500, fontSize: "clamp(44px,9.4vw,138px)", lineHeight: .94, letterSpacing: "-.04em", fontVariantNumeric: "tabular-nums", color: INK }}>
                          {DIGITS.map((d, i) => (
                            <span key={i} data-g style={{
                              display: "inline-block", opacity: 0,
                              ...(d === "$" ? { fontSize: ".42em", color: "#8A8076", padding: ".16em .1em 0 0", letterSpacing: 0 } : {}),
                              ...(d === "," ? { color: "#9A9086" } : {}),
                            }}>{d}</span>
                          ))}
                        </div>
                      </div>

                      <div data-r="anno" style={{ opacity: 0, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "10px 22px", marginTop: 16, fontFamily: MONO, fontSize: "clamp(10px,.85vw,12px)", letterSpacing: ".16em", textTransform: "uppercase" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9, color: "#8A8076" }}>
                          <span style={{ display: "block", width: 5, height: 5, background: GREEN }} />
                          Your number · 25 × $48,000 spent a year
                        </div>
                        <div style={{ color: "#9A9086" }}>Worked example · not a projection</div>
                      </div>
                    </div>

                    <div data-r="t2" style={{ maxWidth: 560, opacity: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img data-ember-still src="/v5/ember-shocked.webp" alt="Ember, shocked by the number" style={emberStill} />
                      <Kick>The number</Kick>
                      <h1 style={{ ...h1, fontSize: "clamp(28px,4.4vw,54px)", lineHeight: 1.05 }}>
                        There is a number that <span style={serif}>ends work.</span>
                      </h1>
                      <p style={{ ...body, marginBottom: 22, maxWidth: "48ch", fontSize: "clamp(15px,1.12vw,17.5px)" }}>
                        Save twenty-five times what you spend in a year and you can live off it for
                        good, drawing down about 4% a year. That is the entire formula. Spend
                        $48,000 a year? Your number is $1.2 million.
                      </p>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 11, maxWidth: "44ch" }}>
                        <span style={{ display: "block", flex: "none", width: 5, height: 5, marginTop: 6, background: GREEN }} />
                        <span style={{ fontFamily: MONO, fontSize: "clamp(11px,.88vw,12.5px)", lineHeight: 1.62, letterSpacing: ".02em", color: "#8A8076" }}>
                          The movement argues it closer to 3.9% now, because leaving at 40 means
                          funding sixty years, not thirty.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 3 · THE MOVEMENT ── */}
              <div data-beat="3" style={{ position: "absolute", inset: 0 }}>
                <div data-r="w3" style={{ position: "absolute", inset: 0, opacity: 0 }}>
                  <div data-r="w3p" style={{ position: "absolute", left: "52%", right: "clamp(56px,5vw,96px)", top: "50%", transform: "translateY(-50%)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(11px,1.9vh,18px)" }}>
                      {SUBS.map(([name, n, pct, alpha]) => (
                        <div key={name} data-row3 style={{ opacity: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, marginBottom: 7, fontFamily: MONO, fontSize: "clamp(10.5px,.92vw,13px)", letterSpacing: ".02em" }}>
                            <span style={{ color: "#8A8076" }}>{name}</span>
                            <span data-count3 data-to={n} style={{ color: INK, fontVariantNumeric: "tabular-nums", letterSpacing: 0 }}>0</span>
                          </div>
                          <div style={{ height: 5, background: "rgba(245,243,238,.07)" }}>
                            <div data-bar3 data-pct={pct} style={{ width: 0, height: "100%", background: `rgba(0,200,5,${alpha})` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div data-r="w3total" style={{ opacity: 0, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, marginTop: "clamp(16px,2.6vh,26px)", paddingTop: "clamp(12px,1.8vh,18px)", borderTop: "1px solid rgba(245,243,238,.1)", fontFamily: MONO }}>
                      <span style={{ fontSize: "clamp(10px,.85vw,11.5px)", letterSpacing: ".18em", textTransform: "uppercase", color: "#9A9086" }}>Combined</span>
                      <span data-r="w3tn" style={{ fontSize: "clamp(15px,1.5vw,20px)", color: GREEN, fontVariantNumeric: "tabular-nums" }}>0</span>
                    </div>
                    <div style={{ marginTop: 11, fontFamily: MONO, fontSize: "clamp(9.5px,.76vw,10.5px)", letterSpacing: ".14em", textTransform: "uppercase", color: "#8A8076" }}>Subscriber counts · August 2026</div>
                  </div>
                </div>
                <div data-r="t3wrap" style={{ position: "absolute", left: "clamp(230px,20vw,300px)", right: "clamp(56px,5vw,96px)", top: "50%", transform: "translateY(-50%)", zIndex: 30 }}>
                  <div data-r="t3" style={{ maxWidth: 400, opacity: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img data-ember-still src="/v5/ember-curious.webp" alt="Ember, curious" style={emberStill} />
                    <Kick>The movement</Kick>
                    <h1 style={{ ...h1, fontSize: "clamp(27px,3.5vw,44px)", lineHeight: 1.06 }}>
                      <span style={serif}>Four and a half million</span> people are already doing this.
                    </h1>
                    <p style={body}>
                      They worked the formula out decades ago and have been arguing about the last
                      decimal ever since. You are late to something that has been running for years.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── 4 · TWO DOORS ── */}
              <div data-beat="4" style={{ position: "absolute", inset: 0 }}>
                <div data-r="w4" style={{ position: "absolute", inset: 0, opacity: 0 }}>
                  <div data-r="w4i" style={{ position: "absolute", left: "50%", top: "52%", transform: "translate(-50%,-50%)", width: "min(880px,62vw)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/v5/world-doors.webp" alt="Two doorways in a dark wall: the left opens onto flat nothing, the right onto a warm room and morning light" style={{ display: "block", width: "100%", height: "auto" }} />
                    <div data-r="b4mid" style={{ position: "absolute", left: "50.1%", top: "73.1%", width: 0, height: 0 }} />
                    <div data-r="b4right" style={{ position: "absolute", left: "67.7%", top: "73.1%", width: 0, height: 0 }} />
                  </div>
                </div>
                <div data-r="t4" style={{ position: "absolute", inset: 0, zIndex: 30, opacity: 0 }}>
                  <div style={{ position: "absolute", left: "clamp(20px,5vw,68px)", right: "clamp(20px,5vw,68px)", top: "clamp(46px,7.5vh,86px)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img data-ember-still src="/v5/ember-determined.webp" alt="Ember, determined, between the doors" style={{ ...emberStill, margin: "0 auto 22px" }} />
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "clamp(18px,3vh,32px)", fontFamily: MONO, fontSize: 11.5, letterSpacing: ".24em", textTransform: "uppercase", color: GREEN }}>Same exit</div>
                    <div data-r="t4titlebox" style={{ margin: "0 auto" }}>
                      <div data-r="t4titles" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "clamp(14px,4vw,64px)" }}>
                        <div style={{ maxWidth: "16ch", fontFamily: SANS, fontWeight: 500, fontSize: "clamp(21px,2.5vw,38px)", lineHeight: 1.12, letterSpacing: "-.025em", color: "#8A8076", textWrap: "balance" }}>
                          One door leaves with <span style={{ ...serif, color: "#B8B1A6" }}>nothing.</span>
                        </div>
                        <div data-r="t4b" style={{ maxWidth: "16ch", textAlign: "right", fontFamily: SANS, fontWeight: 500, fontSize: "clamp(21px,2.5vw,38px)", lineHeight: 1.12, letterSpacing: "-.025em", color: INK, textWrap: "balance" }}>
                          One leaves with <span style={{ ...serif, color: GREEN }}>everything.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ position: "absolute", left: "50%", bottom: "clamp(40px,6.5vh,80px)", transform: "translateX(-50%)", width: "min(680px,88vw)", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "clamp(14px,1.05vw,17px)", lineHeight: 1.64, color: "rgba(245,243,238,.6)", textWrap: "pretty" }}>
                      One quits the job. The other quits needing one. Same verdict on the 9-to-5,
                      opposite mechanism.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── 5 · THE DIALECT ── */}
              <div data-beat="5" style={{ position: "absolute", inset: 0 }}>
                <div data-r="w5" style={{ position: "absolute", inset: 0, opacity: 0 }}>
                  <div data-r="w5p" style={{ position: "absolute", left: "52%", right: "clamp(56px,5vw,96px)", top: "50%", transform: "translateY(-50%)" }}>
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(13px,2.2vh,22px)" }}>
                        {DIALECT.map(([name, desc, len]) => (
                          <div key={name} data-p5 style={{ opacity: 0 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                              <span style={{ fontFamily: MONO, fontSize: "clamp(12px,1.05vw,14px)", letterSpacing: ".06em", textTransform: "uppercase", color: INK, flex: "none" }}>{name}</span>
                              <span style={{ fontSize: "clamp(12px,.94vw,13.5px)", lineHeight: 1.45, color: "rgba(245,243,238,.56)", textWrap: "pretty" }}>{desc}</span>
                            </div>
                            <div style={{ position: "relative", height: 3, background: "rgba(245,243,238,.07)" }}>
                              <div data-p5bar data-len={len} style={{ position: "absolute", left: 0, top: 0, height: "100%", width: 0, background: GREEN }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div data-r="w5dest" style={{ position: "absolute", right: -1, top: -10, bottom: -10, width: 1, background: "rgba(0,200,5,.4)", opacity: 0 }} />
                    </div>
                    <div data-r="w5destlabel" style={{ opacity: 0, marginTop: 13, textAlign: "right", fontFamily: MONO, fontSize: "clamp(9.5px,.76vw,10.5px)", letterSpacing: ".18em", textTransform: "uppercase", color: "#9A9086" }}>Same door</div>
                  </div>
                </div>
                <div data-r="t5wrap" style={{ position: "absolute", left: "clamp(230px,20vw,300px)", right: "clamp(56px,5vw,96px)", top: "50%", transform: "translateY(-50%)", zIndex: 30 }}>
                  <div data-r="t5" style={{ maxWidth: 400, opacity: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img data-ember-still src="/v5/ember-curious.webp" alt="Ember, reading the signposts" style={emberStill} />
                    <Kick>Learn the words</Kick>
                    <h1 style={h1}><span style={serif}>Lean. Coast. Barista.</span> Chubby. Fat.</h1>
                    <p style={body}>Five ways out, same door. One of them already fits your life better than the rest.</p>
                  </div>
                </div>
              </div>

              {/* ── 6 · THE ENGINE ── */}
              <div data-beat="6" style={{ position: "absolute", inset: 0 }}>
                <div data-r="w6" style={{ position: "absolute", inset: 0, opacity: 0 }}>
                  <div data-r="w6scrim" style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "40%", background: "#110E08", filter: "blur(84px)", opacity: .9, zIndex: 2 }} />
                  <div data-r="w6i" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(1020px,70vw)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img data-r="w6img" src="/v5/world-engine.webp" alt="A machine: coins in one side, engraved certificates rising out of the other" style={{ display: "block", width: "100%", height: "auto" }} />
                  </div>
                </div>
                <div data-r="t6wrap" style={{ position: "absolute", left: "clamp(230px,20vw,300px)", right: "clamp(56px,5vw,96px)", top: "50%", transform: "translateY(-50%)", zIndex: 30 }}>
                  <div data-r="t6" style={{ maxWidth: 430, opacity: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img data-ember-still src="/v5/ember-happy.webp" alt="Ember, watching the machine run" style={emberStill} />
                    <Kick>Where $FIRE comes in</Kick>
                    <h1 style={h1}>You don&apos;t have to reach the number to be <span style={serif}>paid like an owner.</span></h1>
                    <p style={body}>
                      Hold $FIRE and real tokenised stock arrives in your wallet. Exit fees from
                      people who leave fund the people who stay. The longer you hold, the bigger
                      your cut.
                    </p>
                    <div data-r="l6row" style={{ display: "flex", gap: "clamp(20px,3vw,44px)", marginTop: "clamp(20px,3vh,30px)" }}>
                      {[[live.drops, "distributions"], [live.assets, "assets"], [live.wallets.toLocaleString("en-US"), "wallets"]].map(([v, l]) => (
                        <div key={String(l)} data-l6 style={{ opacity: 0 }}>
                          <div style={{ fontFamily: MONO, fontSize: "clamp(20px,2.1vw,30px)", lineHeight: 1, letterSpacing: "-.02em", color: GREEN, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                          <div style={{ marginTop: 7, fontFamily: MONO, fontSize: "clamp(9.5px,.76vw,10.5px)", letterSpacing: ".18em", textTransform: "uppercase", color: "#9A9086" }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <div data-r="t6foot" style={{ opacity: 0, display: "flex", alignItems: "flex-start", gap: 11, maxWidth: "46ch", marginTop: "clamp(18px,2.6vh,26px)" }}>
                      <span style={{ display: "block", flex: "none", width: 5, height: 5, marginTop: 6, background: GREEN }} />
                      <span style={{ fontFamily: MONO, fontSize: "clamp(11px,.86vw,12.5px)", lineHeight: 1.62, letterSpacing: ".02em", color: "#8A8076" }}>
                        Healthcare is the hard part in 2026 — subsidies expired and premiums roughly
                        doubled. This is not a retirement plan and it is not the number. It is the
                        same idea in its smallest form: owning the thing that pays you.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 7 · THE CONGREGATION ── */}
              <div data-beat="7" style={{ position: "absolute", inset: 0 }}>
                <div data-r="w7" style={{ position: "absolute", inset: 0, opacity: 0 }}>
                  <div data-r="w7p" style={{ position: "absolute", left: "52%", right: "clamp(56px,5vw,96px)", top: "50%", transform: "translateY(-50%)" }}>
                    <div data-r="b7grid" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "clamp(8px,1.1vw,14px)" }}>
                      {BADGES_ON.map((on, i) => (
                        <div key={i} data-b7 data-on={on} title={BADGE_LABELS[i]} style={{ opacity: 0, aspectRatio: "1", borderRadius: "50%", border: `1px solid ${on ? "rgba(0,200,5,.55)" : "rgba(245,243,238,.12)"}`, background: on ? "rgba(0,200,5,.10)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/v5/badges/${BADGE_KEYS[i]}.webp`} alt={on ? `${BADGE_LABELS[i]} badge, earned` : `${BADGE_LABELS[i]} badge, not yet earned`} decoding="async" fetchPriority="low"
                               style={{ width: "86%", height: "86%", objectFit: "contain", filter: on ? "saturate(1.05)" : "grayscale(1) brightness(.5)", opacity: on ? 1 : .3 }} />
                        </div>
                      ))}
                    </div>
                    <div data-r="b7cap" style={{ opacity: 0, marginTop: 14, fontFamily: MONO, fontSize: "clamp(9.5px,.76vw,10.5px)", letterSpacing: ".18em", textTransform: "uppercase", color: "#9A9086" }}>18 badges · earned forever</div>
                    <div data-r="b7chart" style={{ opacity: 0, marginTop: "clamp(22px,3.4vh,34px)", paddingTop: "clamp(16px,2.4vh,24px)", borderTop: "1px solid rgba(245,243,238,.1)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 11, fontFamily: MONO, fontSize: "clamp(9.5px,.76vw,10.5px)", letterSpacing: ".18em", textTransform: "uppercase", color: "#9A9086" }}>
                        <span>Cohort survival · this month</span><span data-r="b7pct" style={{ color: GREEN, letterSpacing: ".04em" }}>0%</span>
                      </div>
                      <svg viewBox="0 0 300 62" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "clamp(52px,8vh,76px)", overflow: "visible" }}>
                        <polyline points="0,8 300,8" fill="none" stroke="rgba(245,243,238,.08)" strokeWidth="1" strokeDasharray="2 4" />
                        <polyline data-r="b7line" points="0.0,12.7 10.0,16.7 20.0,20.3 30.0,23.4 40.0,26.3 50.0,28.8 60.0,31.1 70.0,33.2 80.0,35.0 90.0,36.6 100.0,38.1 110.0,39.4 120.0,40.6 130.0,41.6 140.0,42.6 150.0,43.4 160.0,44.2 170.0,44.8 180.0,45.4 190.0,46.0 200.0,46.4 210.0,46.9 220.0,47.3 230.0,47.6 240.0,47.9 250.0,48.2 260.0,48.4 270.0,48.7 280.0,48.9 290.0,49.0 300.0,49.2" fill="none" stroke={GREEN} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div data-r="t7wrap" style={{ position: "absolute", left: "clamp(230px,20vw,300px)", right: "clamp(56px,5vw,96px)", top: "50%", transform: "translateY(-50%)", zIndex: 30 }}>
                  <div data-r="t7" style={{ maxWidth: 420, opacity: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img data-ember-still src="/v5/ember-triumphant.webp" alt="Ember, triumphant" style={emberStill} />
                    <Kick>The people who stayed</Kick>
                    <h1 style={h1}>
                      <span data-r="t7n" style={{ fontFamily: MONO, fontWeight: 500, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums" }}>{live.alive}</span>
                      {" "}of the {live.total} who started this month are <span style={serif}>still here.</span>
                    </h1>
                    <p style={body}>Ranks you can lose. Badges you can&apos;t. A streak that only breaks if you sell.</p>
                    <div data-r="t7cta" style={{ opacity: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: "clamp(22px,3.4vh,32px)" }}>
                      <a href="/swap" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "13px 22px", background: GREEN, color: "#110E08", textDecoration: "none", fontFamily: SANS, fontWeight: 500, fontSize: 15, letterSpacing: "-.01em" }}>
                        Join them<span style={{ fontFamily: MONO, fontSize: 13 }}>→</span>
                      </a>
                      <a href="/leaderboard" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "13px 20px", color: "rgba(245,243,238,.72)", textDecoration: "none", border: "1px solid rgba(245,243,238,.16)", fontFamily: SANS, fontSize: 15, letterSpacing: "-.01em" }}>
                        See the board<span style={{ fontFamily: MONO, fontSize: 13 }}>→</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 25, boxShadow: "inset 0 0 190px 70px rgba(17,14,8,.92)" }} />
            </div>

            {/* ── Ember: a persistent layer ABOVE the world, never painted into it ── */}
            <div data-r="emberlayer" style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none" }}>
              <div data-r="emberbox" style={{ position: "absolute", left: 16, bottom: 22, width: 132 }}>
                <div data-r="emberpos">
                  <div data-r="emberwalk" style={{ position: "relative" }}>
                    <div data-r="emberscale" style={{ transformOrigin: "50% 100%" }}>
                      <div data-r="emberfloat" style={{ position: "relative", width: 132, height: 174, animation: "fvEmberFloat 4.6s ease-in-out infinite" }}>
                        <div style={{ position: "absolute", left: "50%", bottom: -4, width: 88, height: 15, transform: "translateX(-50%)", borderRadius: "50%", background: GREEN, filter: "blur(12px)", opacity: .34 }} />
                        <div style={{ position: "absolute", left: "50%", top: "52%", width: 168, height: 168, transform: "translate(-50%,-50%)", borderRadius: "50%", background: GREEN, filter: "blur(38px)", animation: "fvEmberPulse 5.4s ease-in-out infinite" }} />
                        {FACES.map((f, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={f} data-face={f} src={`/v5/ember-${f}.webp`} alt={i === 0 ? "Ember" : ""}
                               style={{ position: "absolute", left: 0, top: 0, width: 132, height: "auto", opacity: i === 0 ? 1 : 0, filter: f === "triumphant" ? "saturate(1.2) drop-shadow(0 0 22px rgba(0,200,5,.6))" : "saturate(1.15) drop-shadow(0 0 16px rgba(0,200,5,.45))" }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div data-r="mark" style={{ position: "fixed", zIndex: 70, top: 22, left: 24, display: "flex", alignItems: "center", gap: 9, fontFamily: MONO, fontSize: 13, letterSpacing: ".12em", color: "rgba(245,243,238,.82)" }}>
        <span data-r="markdollar" style={{ color: "#6B6258" }}>$</span>FIRE
      </div>

      <div data-r="rail" style={{ position: "fixed", zIndex: 70, right: "clamp(12px,1.6vw,26px)", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 9 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} data-tick={i} style={{ width: 14, height: 1, background: "#4A443C" }} />
        ))}
      </div>
    </div>
  );
}
