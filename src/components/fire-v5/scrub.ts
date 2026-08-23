/* The v5 scroll engine.
 *
 * A near-verbatim port of the Claude Design prototype's scrub logic. The ramp
 * boundaries below (.098/.172, .412/.462 …) were hand-tuned against that exact
 * markup — they are not arbitrary and should not be "tidied" without re-timing
 * the whole page. It drives everything off one number: p, the timeline's scroll
 * progress from 0 to 1.
 *
 * Returns a teardown function.
 */

type Opts = { cohortPct: number; cohortAlive: number };

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ramp = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eo = (t: number) => 1 - Math.pow(1 - t, 3);
const fmt = (n: number) => n.toLocaleString("en-US");

function lerpHex(a: string, b: string, t: number) {
  const p = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}

const BEATS: [number, number][] = [[0, .145], [.145, .29], [.29, .435], [.435, .58], [.58, .725], [.725, .87], [.87, 1]];

export function mountScrollWorld(root: HTMLElement, opts: Opts): () => void {
  const q = (n: string) => root.querySelector<HTMLElement>(`[data-r="${n}"]`);
  const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));

  const el: Record<string, HTMLElement> = {};
  for (const n of ["page", "timeline", "stage", "worldclip", "arc", "w1", "w1i", "w1v", "w1scrim", "w2", "w2i",
    "b2wrap", "t1", "t1wrap", "t2", "num", "parts", "anno", "w3", "w3p", "w3total", "w3tn", "t3", "t3wrap",
    "w5", "w5p", "w5dest", "w5destlabel", "t5", "t5wrap", "w6", "w6i", "w6scrim", "t6", "t6wrap", "t6foot",
    "l6row", "w7", "w7p", "b7grid", "b7cap", "b7chart", "b7line", "b7pct", "t7", "t7wrap", "t7n", "t7cta",
    "w4", "w4i", "b4mid", "b4right", "t4", "t4titles", "t4titlebox", "t4b", "emberbox", "emberpos",
    "emberwalk", "emberscale", "emberfloat", "rail", "mark", "markdollar"]) {
    const node = q(n);
    if (node) el[n] = node;
  }
  if (!el.timeline || !el.stage) return () => {};

  const digits = qa("[data-g]");
  const rows3 = qa("[data-row3]"), bars3 = qa("[data-bar3]"), counts3 = qa("[data-count3]");
  const paths5 = qa("[data-p5]"), bars5 = qa("[data-p5bar]");
  const live6 = qa("[data-l6]"), badges7 = qa("[data-b7]");
  const emberStills = qa("[data-ember-still]");
  const partEls = qa("[data-part]");
  const drawX = qa('[data-draw="x"]'), drawY = qa('[data-draw="y"]');
  const ticks = qa("[data-tick]");
  const faces: Record<string, HTMLElement | null> = {};
  for (const n of ["sleeping", "worried", "shocked", "curious", "determined", "stepping", "happy", "smug", "triumphant"]) {
    faces[n] = root.querySelector<HTMLElement>(`[data-face="${n}"]`);
  }

  // 100svh where supported, 100vh otherwise — never a bare svh.
  el.stage.style.height = "100vh";
  if (window.CSS?.supports?.("height", "100svh")) el.stage.style.height = "100svh";

  // Cache each fragment's vector to centre so it can converge on scrub.
  const pr = el.parts.getBoundingClientRect();
  const partVecs = partEls.map((e) => {
    const r = e.getBoundingClientRect();
    return [pr.left + pr.width / 2 - (r.left + r.width / 2), pr.top + pr.height / 2 - (r.top + r.height / 2)];
  });

  let wide = false, baseScale = 1, curveLen = 0;
  let walk = { dxMid: 0, dyMid: 0, dxRight: 0, scale: 1 };

  function measureWalk() {
    const fl = el.emberfloat.getBoundingClientRect();
    const mid = el.b4mid.getBoundingClientRect();
    const right = el.b4right.getBoundingClientRect();
    const imgH = el.w4i.getBoundingClientRect().height || 1;
    const feetX = fl.left + fl.width / 2, feetY = fl.bottom;
    walk = {
      dxMid: mid.left - feetX, dyMid: mid.top - feetY,
      dxRight: right.left - feetX, scale: clamp(.212 * imgH / 174, .34, .72),
    };
  }

  function applyLayout() {
    wide = window.innerWidth >= 900;
    const roomy = window.innerWidth >= 1180;
    baseScale = wide ? 1 : .52;
    el.emberpos.style.transform = wide ? "translateY(-50%)" : "none";
    el.emberscale.style.transform = `scale(${baseScale})`;
    el.emberwalk.style.transform = "none";
    el.emberbox.style.left = wide ? "clamp(24px,4vw,74px)" : "12px";
    el.emberbox.style.top = wide ? "50%" : "auto";
    el.emberbox.style.bottom = wide ? "auto" : "18px";
    for (const t of [el.t1wrap, el.b2wrap]) {
      t.style.left = wide ? "clamp(230px,20vw,300px)" : "clamp(18px,5vw,26px)";
      t.style.right = wide ? "clamp(56px,5vw,96px)" : "clamp(18px,5vw,26px)";
      t.style.top = wide ? "50%" : "46%";
    }
    for (const t of [el.t1, el.t2]) t.style.maxWidth = wide ? "560px" : "100%";

    // Beat 3/5/7 split copy | panel. Derive the panel's left edge from the copy
    // column in px so the two can never collide at an in-between width.
    const railL = Math.min(300, Math.max(230, 0.2 * window.innerWidth));
    const copyW = roomy ? 400 : 340;
    el.t3wrap.style.left = wide ? "clamp(230px,20vw,300px)" : "clamp(18px,5vw,26px)";
    el.t3.style.maxWidth = wide ? `${copyW}px` : "100%";
    el.w3p.style.left = wide ? `${Math.round(railL + copyW + (roomy ? 56 : 36))}px` : "clamp(18px,5vw,26px)";
    el.w3p.style.right = wide ? "clamp(56px,5vw,96px)" : "clamp(18px,5vw,26px)";

    for (const [wp, tw, tt, cw] of [["w5p", "t5wrap", "t5", 400], ["w7p", "t7wrap", "t7", 420]] as const) {
      const c = roomy ? cw : Math.min(cw, 340);
      el[tw].style.left = wide ? "clamp(230px,20vw,300px)" : "clamp(18px,5vw,26px)";
      el[tt].style.maxWidth = wide ? `${c}px` : "100%";
      el[wp].style.left = wide ? `${Math.round(railL + c + (roomy ? 56 : 36))}px` : "clamp(18px,5vw,26px)";
      el[wp].style.right = wide ? "clamp(56px,5vw,96px)" : "clamp(18px,5vw,26px)";
    }

    // The same anti-collision idea on the vertical axis. Desktop centres both
    // columns; mobile stacks them, so the panel's top is derived from the copy's
    // measured bottom — a headline that wraps to an extra line pushes the panel
    // down instead of landing on top of it, and nothing runs off the stage.
    const stack: [string, string, string][] = [["t3wrap", "t3", "w3p"], ["t5wrap", "t5", "w5p"], ["t7wrap", "t7", "w7p"]];
    for (const [tw, tt, wp] of stack) {
      if (wide) {
        for (const n of [tw, wp]) { el[n].style.top = "50%"; el[n].style.transform = "translateY(-50%)"; }
      } else {
        el[tw].style.top = "clamp(52px,7.5vh,76px)";
        el[tw].style.transform = "none";
        el[wp].style.transform = "none";
        const stageTop = el.stage.getBoundingClientRect().top;
        const copyBottom = el[tt].getBoundingClientRect().bottom - stageTop;
        el[wp].style.top = `${Math.round(copyBottom + 26)}px`;
      }
    }
    el.t6.style.maxWidth = roomy ? "430px" : wide ? "360px" : "100%";
    el.w6i.style.left = wide ? (roomy ? "68%" : "72%") : "50%";
    el.w6i.style.width = wide ? (roomy ? "min(920px,58vw)" : "min(620px,52vw)") : "108vw";
    el.w4i.style.width = wide ? "min(1080px,74vw)" : "104vw";
    el.w4i.style.top = wide ? "55%" : "49%";
    el.t4titles.style.flexDirection = wide ? "row" : "column";
    el.t4b.style.textAlign = wide ? "right" : "left";

    // Soft pools behind copy only — a full-height curtain would flatten the art.
    const st = el.stage.getBoundingClientRect();
    const c6 = el.t6wrap.getBoundingClientRect();
    Object.assign(el.w6scrim.style, {
      left: `${Math.round(c6.left - st.left - 70)}px`, top: `${Math.round(c6.top - st.top - 70)}px`,
      width: `${Math.round(Math.min(c6.width, wide ? (roomy ? 430 : 360) : c6.width) + 140)}px`,
      height: `${Math.round(c6.height + 140)}px`,
    });
    const cp = el.t1wrap.getBoundingClientRect(), pad = 78;
    Object.assign(el.w1scrim.style, {
      left: `${Math.round(cp.left - st.left - pad)}px`, top: `${Math.round(cp.top - st.top - pad)}px`,
      width: `${Math.round(Math.min(cp.width, wide ? 560 : cp.width) + pad * 2)}px`,
      height: `${Math.round(cp.height + pad * 2)}px`,
    });
    el.t4titlebox.style.width = wide ? `${Math.round(el.w4i.getBoundingClientRect().width * 0.6)}px` : "100%";

    const line = el.b7line as unknown as SVGGeometryElement | undefined;
    if (line) { curveLen = line.getTotalLength(); line.style.strokeDasharray = String(curveLen); }
    measureWalk();
  }

  /* ── reduced motion: the scrub collapses to stacked sections. Same copy,
     same teaching, zero animation. Not a degraded page — the same page. ── */
  function applyReduced() {
    for (const k of ["w5", "t5", "w5dest", "w5destlabel", "w6", "t6", "t6foot", "w7", "t7", "b7cap", "b7chart", "t7cta", "w2", "w4", "t4", "w3", "t3", "w3total"]) {
      if (el[k]) el[k].style.opacity = "1";
    }
    paths5.forEach((e, i) => { e.style.opacity = "1"; if (bars5[i]) bars5[i].style.width = `${bars5[i].dataset.len}%`; });
    live6.forEach((e) => { e.style.opacity = "1"; });
    badges7.forEach((e) => { e.style.opacity = "1"; });
    const line = el.b7line as unknown as SVGGeometryElement | undefined;
    if (line) { line.style.strokeDasharray = "none"; line.style.strokeDashoffset = "0"; }
    el.b7pct.textContent = `${opts.cohortPct}%`;
    el.w6i.style.transform = "translate(-50%,-50%)";
    el.w3tn.textContent = fmt(4_515_000);
    rows3.forEach((r, i) => {
      r.style.opacity = "1"; r.style.transform = "none";
      if (bars3[i]) bars3[i].style.width = `${bars3[i].dataset.pct}%`;
      if (counts3[i]) counts3[i].textContent = fmt(+(counts3[i].dataset.to || 0));
    });

    el.timeline.style.height = "auto";
    el.stage.style.position = "static";
    el.stage.style.height = "auto";
    el.worldclip.style.position = "static";
    el.worldclip.style.overflow = "visible";
    qa("[data-beat]").forEach((b) => {
      Object.assign(b.style, {
        position: "relative", inset: "auto", minHeight: "0", display: "flex",
        flexDirection: "column", gap: "clamp(28px,5vh,56px)",
        padding: "clamp(52px,9vh,110px) clamp(20px,6vw,80px)",
        maxWidth: "780px", marginInline: "auto",
      });
    });
    const deabsolute = (e: HTMLElement, cap: string | null) => {
      Object.assign(e.style, { position: "static", left: "auto", right: "auto", top: "auto", bottom: "auto", transform: "none", width: "auto" });
      if (cap) e.style.maxWidth = cap;
    };
    qa("[data-beat]").forEach((b) => {
      Array.from(b.children).forEach((c) => {
        const e = c as HTMLElement;
        if (getComputedStyle(e).position === "absolute") deabsolute(e, "640px");
      });
    });
    // Anything absolute carrying text is copy and must stack; anything absolute
    // without text is decoration (blur washes, rules, markers) and stays put.
    qa("[data-beat] *").forEach((e) => {
      if (getComputedStyle(e).position !== "absolute") return;
      if (!e.textContent?.trim()) return;
      if (e.closest("svg")) return;
      deabsolute(e, null);
    });
    for (const k of ["w3p", "w5p", "w7p"]) if (el[k]) el[k].style.maxWidth = "430px";
    // The world plates are decoration with no text, so the pass above leaves them
    // absolute — which drops them straight onto the copy once the stage is static.
    // Flow them instead: they still carry the beat, they just sit under it now.
    for (const [k, cap] of [["w1i", "640px"], ["w4i", "600px"], ["w6i", "560px"]] as const) {
      if (el[k]) Object.assign(el[k].style, { position: "static", left: "auto", top: "auto", transform: "none", width: "100%", maxWidth: cap });
    }
    // The number is sized against the viewport for a full-bleed stage; in a
    // stacked column that overshoots and clips through its own frame.
    el.num.style.fontSize = "clamp(34px,6.4vw,62px)";
    qa('[data-r="t1"],[data-r="t2"],[data-r="t3"],[data-r="t5"],[data-r="t6"],[data-r="t7"]')
      .forEach((t) => { t.style.maxWidth = "62ch"; t.style.opacity = "1"; t.style.transform = "none"; });
    // Copy leads each section, world follows — in source the world comes first.
    for (const k of ["t1wrap", "t3wrap", "t4", "t5wrap", "t6wrap", "t7wrap"]) if (el[k]) el[k].style.order = "1";
    for (const k of ["w1", "w3", "w4", "w5", "w6", "w7"]) if (el[k]) el[k].style.order = "2";
    el.arc.style.display = "none";
    el.w1scrim.style.display = "none";
    el.w6scrim.style.display = "none";
    el.emberbox.style.display = "none";
    emberStills.forEach((im) => { im.style.display = "block"; });
    digits.forEach((d) => { d.style.opacity = "1"; d.style.transform = "none"; d.style.filter = "none"; });
    // The assembling fragments mean nothing without motion — drop the layer.
    el.parts.style.display = "none";
    drawX.forEach((l) => { l.style.transform = "scaleX(1)"; });
    drawY.forEach((l) => { l.style.transform = "scaleY(1)"; });
    el.anno.style.opacity = "1";
    ticks.forEach((t) => { t.style.background = "#00C805"; t.style.width = "14px"; });
    el.rail.style.display = "none";
  }

  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  applyLayout();
  if (mq.matches) { applyReduced(); return () => {}; }

  /* ── the tide: scrubbed, never autoplayed, never looped ── */
  const v = el.w1v as unknown as HTMLVideoElement;
  let tideReady = false, tideDur = 5, seeking = false;
  v.addEventListener("loadedmetadata", () => { tideDur = v.duration || 5; tideReady = true; }, { once: true });
  const prime = () => {
    const p = v.play();
    if (p?.then) p.then(() => v.pause()).catch(() => {});
    else v.pause();
  };
  const primeEvents: (keyof WindowEventMap)[] = ["pointerdown", "touchstart", "wheel", "keydown"];
  primeEvents.forEach((ev) => window.addEventListener(ev, prime, { once: true, passive: true }));

  function scrubTide(u: number) {
    if (!tideReady || seeking) return;
    const t = u * (tideDur - 0.05);
    if (Math.abs(v.currentTime - t) < 0.03) return;
    seeking = true;
    const done = () => { seeking = false; };
    v.addEventListener("seeked", done, { once: true });
    setTimeout(done, 220);
    if (v.fastSeek) v.fastSeek(t); else v.currentTime = t;
  }

  let lastP = -1, lastK4 = 0, raf = 0;

  function scrub() {
    const r = el.timeline.getBoundingClientRect();
    const total = Math.max(1, r.height - window.innerHeight);
    const p = clamp(-r.top / total, 0, 1);
    if (Math.abs(p - lastP) < 0.00004) return;
    lastP = p;
    const R = (a: number, b: number) => ramp(p, a, b), E = ease, EO = eo;

    // 1 — the tide runs one way, then the world pulls up and away.
    const out1 = E(R(.098, .172));
    el.w1.style.opacity = String(1 - out1);
    el.w1i.style.transform = `translate(-50%,-50%) translateY(${-10 * out1}vh) scale(${1 - .15 * out1})`;
    scrubTide(clamp(p / .152, 0, 1));
    const o1 = E(R(.088, .142));
    el.t1.style.opacity = String(1 - o1);
    el.t1.style.transform = `translateY(${-30 * o1}px)`;
    el.t1wrap.style.pointerEvents = p > .16 ? "none" : "auto";

    // 2 — the number assembles out of the fragment field.
    const in2 = E(R(.118, .188)), out2 = E(R(.256, .312));
    el.w2.style.opacity = String(Math.min(in2, 1 - out2));
    el.w2i.style.transform = `translateY(${(1 - in2) * 26 - out2 * 20}px) scale(${.965 + .035 * in2 - .03 * out2})`;
    const asm = E(R(.132, .246));
    digits.forEach((d, i) => {
      const t = EO(clamp((asm - i * .05) / .5, 0, 1));
      d.style.opacity = String(t);
      d.style.transform = `translateY(${(1 - t) * (30 + (i % 3) * 16)}px) scale(${.84 + .16 * t})`;
      d.style.filter = t > .995 ? "none" : `blur(${((1 - t) * 5).toFixed(2)}px)`;
    });
    const cv = clamp((asm - .04) / .62, 0, 1);
    partEls.forEach((qe, i) => {
      const vec = partVecs[i];
      qe.style.opacity = String((1 - cv) * .9);
      qe.style.transform = `translate(${(vec[0] * cv * .55).toFixed(1)}px,${(vec[1] * cv * .55).toFixed(1)}px)`;
    });
    const dr = E(R(.126, .206));
    drawX.forEach((l) => { l.style.transform = `scaleX(${dr})`; });
    drawY.forEach((l) => { l.style.transform = `scaleY(${dr})`; });
    el.anno.style.opacity = String(E(R(.198, .25)) * (1 - out2));
    const i2 = E(R(.162, .215)), o2 = E(R(.252, .3));
    el.t2.style.opacity = String(Math.min(i2, 1 - o2));
    el.t2.style.transform = `translateY(${(1 - i2) * 26 - o2 * 22}px)`;

    // 4 — two doors. Composed to hold as a still: nothing moves during the hold.
    const in4 = E(R(.412, .462)), out4 = E(R(.548, .596));
    el.w4.style.opacity = String(Math.min(in4, 1 - out4));
    el.w4i.style.transform = `translate(-50%,-50%) scale(${.965 + .035 * in4 - .03 * out4})`;
    el.t4.style.opacity = String(Math.min(E(R(.428, .478)), 1 - E(R(.545, .588))));

    // 3 — the roster resolves; bars grow once, counts run up once.
    el.w3.style.opacity = String(Math.min(E(R(.268, .318)), 1 - E(R(.404, .450))));
    el.t3.style.opacity = String(Math.min(E(R(.284, .334)), 1 - E(R(.400, .446))));
    rows3.forEach((row, i) => {
      const u = E(clamp((p - (.282 + i * .0095)) / .044, 0, 1));
      row.style.opacity = String(u);
      row.style.transform = `translateY(${(9 * (1 - u)).toFixed(2)}px)`;
      if (bars3[i]) bars3[i].style.width = `${(parseFloat(bars3[i].dataset.pct || "0") * u).toFixed(2)}%`;
      if (counts3[i]) counts3[i].textContent = fmt(Math.round(+(counts3[i].dataset.to || 0) * u));
    });
    const ut = E(clamp((p - .344) / .038, 0, 1));
    el.w3total.style.opacity = String(ut);
    el.w3tn.textContent = fmt(Math.round(4_515_000 * ut));

    // 5 — five paths draw out to the same destination line.
    el.w5.style.opacity = String(Math.min(E(R(.556, .606)), 1 - E(R(.694, .738))));
    el.t5.style.opacity = String(Math.min(E(R(.572, .622)), 1 - E(R(.690, .734))));
    paths5.forEach((e, i) => {
      const u = E(clamp((p - (.574 + i * .0135)) / .050, 0, 1));
      e.style.opacity = String(u);
      if (bars5[i]) bars5[i].style.width = `${(parseFloat(bars5[i].dataset.len || "0") * u).toFixed(2)}%`;
    });
    const d5 = E(R(.640, .676));
    el.w5dest.style.opacity = String(d5);
    el.w5destlabel.style.opacity = String(d5);

    // 6 — the engine.
    el.w6.style.opacity = String(Math.min(E(R(.702, .752)), 1 - E(R(.838, .882))));
    el.t6.style.opacity = String(Math.min(E(R(.718, .768)), 1 - E(R(.834, .878))));
    el.w6i.style.transform = `translate(-50%,-50%) scale(${(.965 + .035 * E(R(.702, .776))).toFixed(4)})`;
    live6.forEach((e, i) => { e.style.opacity = String(E(clamp((p - (.742 + i * .014)) / .042, 0, 1))); });
    el.t6foot.style.opacity = String(E(R(.790, .828)));

    // 7 — badges light, curve draws, CTA lands.
    el.w7.style.opacity = String(E(R(.846, .896)));
    el.t7.style.opacity = String(E(R(.862, .912)));
    badges7.forEach((e, i) => { e.style.opacity = String(E(clamp((p - (.858 + i * .0042)) / .034, 0, 1))); });
    el.b7cap.style.opacity = String(E(R(.930, .958)));
    const c7 = E(R(.916, .968));
    el.b7chart.style.opacity = String(E(R(.906, .944)));
    if (curveLen) (el.b7line as unknown as SVGGeometryElement).style.strokeDashoffset = String(curveLen * (1 - c7));
    el.b7pct.textContent = `${Math.round(opts.cohortPct * c7)}%`;
    el.t7cta.style.opacity = String(E(R(.948, .984)));
    el.t7cta.style.pointerEvents = p > .95 ? "auto" : "none";

    // Colour is the arc: no green wash at beat 1, fully lit by beat 7.
    el.arc.style.opacity = (0.115 * Math.pow(clamp((p - .13) / .78, 0, 1), 1.35)).toFixed(4);

    // Ember: cross-fade at beat boundaries, never inside a scene.
    const step = E(R(.526, .570));
    const set = (n: string, o: number) => { if (faces[n]) faces[n]!.style.opacity = String(o); };
    set("sleeping", 1 - E(R(.052, .086)));
    set("worried", Math.min(E(R(.052, .086)), 1 - E(R(.148, .184))));
    set("shocked", Math.min(E(R(.148, .184)), 1 - E(R(.272, .308))));
    set("curious", Math.max(
      Math.min(E(R(.272, .308)), 1 - E(R(.420, .452))),
      Math.min(E(R(.566, .602)), 1 - E(R(.706, .742)))));
    set("determined", Math.min(E(R(.420, .452)), 1 - step));
    const tri = E(R(.940, .972));
    set("stepping", Math.min(step, 1 - E(R(.566, .602))));
    set("happy", Math.min(E(R(.706, .742)), 1 - E(R(.844, .880))));
    set("smug", Math.min(E(R(.844, .880)), 1 - tri));
    set("triumphant", tri);

    const bi = BEATS.findIndex((b) => p < b[1]);
    const bidx = bi < 0 ? 6 : bi;

    // Ember leaves the rail, stands between the doors, then steps right.
    const k4 = Math.min(E(R(.418, .482)), 1 - E(R(.566, .604)));
    if (k4 > 0.0005 || lastK4 > 0.0005) {
      const tx = (walk.dxMid + step * (walk.dxRight - walk.dxMid)) * k4;
      const ty = walk.dyMid * k4;
      const sc = baseScale + (walk.scale - baseScale) * k4;
      el.emberwalk.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px)`;
      el.emberscale.style.transform = `scale(${sc.toFixed(4)})`;
    }
    lastK4 = k4;

    // Green enters with beat 2 and grows.
    el.markdollar.style.color = lerpHex("#6B6258", "#00C805", E(R(.13, .3)));
    ticks.forEach((t, i) => {
      const on = i === bidx;
      t.style.width = on ? "26px" : "14px";
      t.style.background = on ? (i === 0 ? "#8A8076" : "#00C805") : "#332F28";
      t.style.opacity = on ? "1" : ".8";
    });
  }

  const tick = () => { scrub(); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);

  const onResize = () => applyLayout();
  window.addEventListener("resize", onResize);
  const onLoad = () => applyLayout();
  window.addEventListener("load", onLoad);
  qa("img").forEach((im) => {
    const i = im as HTMLImageElement;
    if (!i.complete) i.addEventListener("load", onLoad, { once: true });
  });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("load", onLoad);
    primeEvents.forEach((ev) => window.removeEventListener(ev, prime));
  };
}
