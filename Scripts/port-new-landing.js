/* Transform the Claude Design `.dc.html` into a standalone page for /new-landing.
   Done as a script rather than by hand: 722 lines of markup retyped by eye is how
   a silent transcription bug ships. Every rule here is mechanical and reversible. */
const fs = require('fs');
const SRC = process.argv[2], OUT = process.argv[3];
let s = fs.readFileSync(SRC, 'utf8');

const lines = s.split('\n');
const at = (needle) => lines.findIndex((l) => l.includes(needle));
const helmetOpen = at('<helmet>'), helmetClose = at('</helmet>');
const dcClose = at('</x-dc>'), scriptOpen = at('<script type="text/x-dc"');

const helmet = lines.slice(helmetOpen + 1, helmetClose).join('\n');
let markup = lines.slice(helmetClose + 1, dcClose).join('\n');
let logic = lines.slice(scriptOpen + 1, lines.length).join('\n')
  .replace(/<\/script>[\s\S]*$/, '');
// the class body opens on the line after the data-props JSON closes
logic = logic.replace(/^[\s\S]*?class Component extends DCLogic \{/, '');
logic = logic.replace(/\}\s*$/, '');

/* ── 1. refs → data-ref. NOT id: some nodes already carry an id (the break
       section has id="break" for its anchor link), and a second id attribute is
       silently dropped by the parser, leaving that ref unbound at runtime. ── */
const refNames = [];
markup = markup.replace(/\s*ref="\{\{\s*([A-Za-z0-9]+)\s*\}\}"/g, (_, n) => {
  refNames.push(n);
  return ` data-ref="${n}"`;
});

/* ── 2. handlers: onClick="{{ onFoo }}" → data-act="onFoo" ── */
const handlers = [];
markup = markup.replace(/\s*onClick="\{\{\s*([A-Za-z0-9]+)\s*\}\}"/g, (_, n) => {
  if (!handlers.includes(n)) handlers.push(n);
  return ` data-act="${n}"`;
});

/* ── 3. style-hover / -active / -focus are DC-only. Hoist each to a real CSS
       rule on a generated class, so the states survive outside the runtime. ── */
const rules = [];
let n = 0;
markup = markup.replace(
  /\s*style-(hover|active|focus)="([^"]*)"/g,
  (_, state, decls) => {
    const cls = `s${++n}`;
    const pseudo = state === 'hover' ? ':hover' : state === 'active' ? ':active' : ':focus-visible';
    /* !important on EVERY declaration, not just the last one. These override
       inline styles, and `a:b;c:d !important` marks only `d` — which silently
       drops the first half of every multi-property hover state. */
    const body = decls.split(';').map((x) => x.trim()).filter(Boolean)
      .map((x) => `${x} !important`).join(';');
    rules.push(`.${cls}${pseudo}{${body}}`);
    return ` data-s="${cls}"`;
  }
);
// data-s may land more than once on an element; fold them into one class attr
markup = markup.replace(/((?:\s*data-s="s\d+"){2,})/g, (m) => {
  const cs = [...m.matchAll(/data-s="(s\d+)"/g)].map((x) => x[1]);
  return ` data-s="${cs.join(' ')}"`;
});

/* ── 4. assets move under /nl/ so the route owns its own tree ── */
markup = markup.replace(/(["'(])assets\/badges\//g, '$1/badges/');   /* 18 badge PNGs are already in public/badges, byte-identical, so no second copy */
markup = markup.replace(/(["'(])assets\//g, '$1/nl/assets/');
const helmetFixed = helmet.replace(/(["'(])assets\//g, '$1/nl/assets/');

/* ── 5. the logic class: React refs → getElementById, .current → direct ── */
const MAP = {
  grind: 'grindRef', drone: 'droneRef', dim: 'dimRef', yr: 'yrRef', yrLab: 'yrLabRef',
  bar: 'barRef', saved: 'savedRef', flash: 'flashRef', skip: 'skipRef', brk: 'breakRef',
  elapsed: 'elapsedRef', act3: 'act3Ref', sliver: 'sliverRef', colA: 'colALabRef',
  colB: 'colBLabRef', tenK: 'tenKRef', ratio: 'ratioRef', ramp: 'rampRef', day: 'dayRef',
  dayTot: 'dayTotRef', share: 'shareRef', shareBar: 'shareBarRef', feed: 'feedRef',
  shareBlock: 'shareBlockRef', volBlock: 'volBlockRef', volNum: 'volNumRef',
  volBar: 'volBarRef', honest: 'honestRef', rampEmber: 'rampEmberRef',
  rampEmber2: 'rampEmber2Ref', clip: 'clipRef', video: 'videoRef', cap: 'capRef',
  mute: 'muteRef', play: 'playRef', receipts: 'receiptsRef', prov: 'provRef'
};
// every ref the markup declares must have a home in the map, or a node goes silently unbound
const unmapped = refNames.filter((r) => !Object.values(MAP).includes(r));
if (unmapped.length) { console.error('UNMAPPED REFS:', unmapped); process.exit(1); }

logic = logic
  .replace(/^\s*r = \{[\s\S]*?\};\n/m, '')          // the React.createRef block
  .replace(/renderVals\(\)\s*\{[\s\S]*$/m, '')       // renderVals, replaced below
  .replace(/\.current\b/g, '')                       // refs are now elements
  .replace(/this\.props \|\| \{\}/, 'this.props');

const refInit = Object.entries(MAP)
  .map(([k, id]) => `      ${k}: document.querySelector('[data-ref=\\"${id}\\"]')`).join(',\n');

// the three handlers, lifted verbatim out of renderVals
const HANDLERS = `
  onMute() {
    const v = this.r.video; if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.paused) v.play().catch(() => {});
  }
  onPlay() {
    const v = this.r.video; if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  }
  onSkip(e) {
    e.preventDefault();
    this.skipped = true;
    this.fired = true;                       /* no flash for a grind you did not do */
    const target = this.r.brk; if (!target) return;
    if (this.lenis) this.lenis.scrollTo(target, { duration: 1.1 });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
  }
`;

/* ── 6. Additions layered on top of the Design build ──────────────────────────
   Kept as an additive layer rather than edits to the markup above, so a fresh
   .dc.html from Design can be re-ported without losing any of it. Everything
   here selects on what already exists and no-ops if it stops existing. */

/* A page that makes you scroll 900vh before offering an action is hostile. The
   bar gives the dashboard and the swap a permanent home; the grind stays bleak
   because the bar is muted until the page turns green. */
const NAV = `
  <nav id="nl-nav" aria-label="Primary">
    <a href="/" id="nl-mark" aria-label="$FIRE home"><img src="/nl/assets/fire-mark.svg" alt="$FIRE" /></a>
    <div id="nl-nav-links">
      <a href="/dashboard" class="nl-link">Dashboard</a>
      <a href="/swap" class="nl-cta">Buy $FIRE</a>
    </div>
  </nav>`;

const ENHANCE_CSS = `
#nl-nav{position:fixed;top:0;left:0;right:0;z-index:46;display:flex;align-items:center;
  justify-content:space-between;gap:12px;padding:10px clamp(12px,3vw,28px);pointer-events:none}
#nl-nav a{pointer-events:auto}
#nl-mark img{height:20px;width:auto;display:block;opacity:.72;transition:opacity .2s ease}
#nl-mark:hover img{opacity:1}
#nl-nav-links{display:flex;align-items:center;gap:clamp(6px,1.4vw,18px)}
.nl-link,.nl-cta{display:flex;align-items:center;min-height:44px;padding:0 clamp(10px,1.4vw,18px);
  font-family:'JBMono',monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;
  font-weight:700;transition:background .16s ease,color .16s ease,border-color .16s ease}
.nl-link{color:#7C838C}
.nl-link:hover{color:#fff !important}
.nl-cta{color:#00C805;border:2px solid #00C805;background:rgba(7,8,10,.6)}
.nl-cta:hover{background:#00C805 !important;color:#07080A !important}
.nl-link:focus-visible,.nl-cta:focus-visible{outline:2px solid #fff;outline-offset:3px}
/* on the green acts the muted greys vanish, so the bar inverts */
#nl-nav.on-green #nl-mark img{filter:brightness(0) !important}
#nl-nav.on-green .nl-link{color:rgba(7,8,10,.72) !important}
#nl-nav.on-green .nl-link:hover{color:#07080A !important}
#nl-nav.on-green .nl-cta{color:#07080A !important;border-color:#07080A !important;background:transparent !important}
#nl-nav.on-green .nl-cta:hover{background:#07080A !important;color:#00C805 !important}
#nl-nav.on-green .nl-link:focus-visible,#nl-nav.on-green .nl-cta:focus-visible{outline-color:#07080A}

/* the skip moves to the bottom — it is a scroll action, so it belongs where the
   thumb already is, and the top-right is now the bar's */
[data-ref="skipRef"]{top:auto !important;bottom:14px !important;right:12px !important}
/* Design's own fixed Buy anchored to #buy; the bar now owns that job */
a[href="#buy"][style*="position:fixed"]{display:none !important}

@media (max-width:520px){ .nl-link{display:none} }

/* Ember breathes. Every instance gets it; the scroll layer adds the rest.

   The idle float animates the translate property, NOT transform. A running CSS
   animation outranks an inline style, so a keyframe on transform silently
   swallows everything the scroll layer writes there — the sink, the shrink and
   the ladder walk all just stop happening. The independent translate/scale
   properties compose with transform instead of overwriting it, so the two
   layers can move the same element without knowing about each other. */
.nl-ember{will-change:transform,translate}
@media (prefers-reduced-motion: no-preference){
  .nl-ember{animation:nl-float 4.2s ease-in-out infinite}
  .nl-ember-slow{animation-duration:6.5s}
}
@keyframes nl-float{0%,100%{translate:0 0}50%{translate:0 -3.5%}}
`;

const ENHANCE_JS = `
  /* ── Ember, moving ───────────────────────────────────────────────────────
     Three scroll-linked behaviours on top of the idle float. Each one is tied
     to something the page is already saying, because motion that is not saying
     anything is the thing the brief calls decoration. */
  function ember() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('img[src*="/ember/"]').forEach((el) => {
      el.classList.add('nl-ember');
      if (/sleeping|worried/.test(el.src)) el.classList.add('nl-ember-slow');
    });
    if (reduced) return;

    const grind = document.querySelector('[data-ref="grindRef"]');
    const sleeper = document.querySelector('img[src*="v2-sleeping"]');
    const woke = document.querySelector('img[src*="v2-shocked"]');
    const ramp = document.querySelector('[data-ref="rampRef"]');
    const climber = document.querySelector('[data-ref="rampEmber2Ref"]');
    if (climber) climber.style.transition = 'transform .5s cubic-bezier(.2,.7,.2,1)';

    const prog = (el) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      const run = el.offsetHeight - innerHeight;
      return run <= 0 ? 0 : Math.min(1, Math.max(0, -r.top / run));
    };

    const frame = () => {

      /* Act 1 — he sinks and fades as the years burn down, on the same curve as
         the dim. Thirty years of nothing happening, happening to him too. */
      if (sleeper && grind) {
        const p = prog(grind);
        sleeper.style.transform = 'translateY(' + (p * 14).toFixed(2) + '%) scale(' + (1 - p * 0.07).toFixed(3) + ')';
        sleeper.style.opacity = (1 - p * 0.45).toFixed(3);
      }

      /* Act 2 — the jolt. He is scaled down and low until the break is actually
         on screen, then he snaps up. The one violent movement on the page. */
      if (woke) {
        const r = woke.getBoundingClientRect();
        const seen = r.top < innerHeight * 0.85 && r.bottom > 0;
        woke.style.transition = 'transform .42s cubic-bezier(.2,1.5,.4,1), opacity .3s ease';
        woke.style.transform = seen ? 'translateY(0) scale(1)' : 'translateY(18%) scale(.82)';
        woke.style.opacity = seen ? '1' : '0';
      }

      /* Act 4 — he walks the ladder. translateX tracks the same day counter that
         drives his face, so he is physically climbing from Spark to Forged.
         The distance is a bounded drift rather than a measured badge-to-badge
         span. The badge row is flex-wrap, so once it wraps, offsetLeft against
         the first badge collapses to a few px on one layout and overshoots the
         viewport on another. A capped drift reads the same at every width. */
      if (climber && ramp && climber.parentElement) {
        const p = Math.min(1, prog(ramp) / 0.72);          /* P2 — matches paintRamp */
        const room = climber.parentElement.clientWidth - climber.offsetWidth;
        const span = Math.max(0, Math.min(140, room));
        climber.style.transform = 'translateX(' + (-span * (1 - p)).toFixed(1) + 'px)';
      }
    };

    /* Drive off GSAP's ticker when it is there — the page already runs one for
       Lenis, so this is free and, unlike a scroll+rAF latch, cannot wedge.
       An earlier version guarded with a boolean set before the rAF and
       cleared inside it; drop that one frame and the flag stays true forever
       and every subsequent scroll is silently ignored. */
    if (window.gsap && window.gsap.ticker) {
      window.gsap.ticker.add(frame);
    } else {
      let queued = false;
      addEventListener('scroll', () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; frame(); });   /* cleared FIRST */
      }, { passive: true });
    }
    addEventListener('resize', frame, { passive: true });
    frame();
  }

  /* The bar inverts over the green acts, because a #00C805 CTA on a #00C805
     ground is invisible. Applied as inline styles rather than a toggled class:
     the equivalent class rules matched the element and lost the cascade even at
     !important, and a legibility fix is not the place to keep fighting that. */
  function navTone() {
    const nav = document.getElementById('nl-nav');
    if (!nav) return;
    const mark = document.getElementById('nl-mark');
    const link = nav.querySelector('.nl-link');
    const cta = nav.querySelector('.nl-cta');
    const DARK = { link: '#7C838C', cta: '#00C805', bg: 'rgba(7,8,10,.6)', mark: 'none' };
    const LIGHT = { link: 'rgba(7,8,10,.72)', cta: '#07080A', bg: 'transparent', mark: 'brightness(0)' };
    let onGreen = null;

    const flip = () => {
      let bg = '';
      for (let el = document.elementFromPoint(innerWidth / 2, 34); el; el = el.parentElement) {
        const c = getComputedStyle(el).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') { bg = c; break; }
      }
      const green = bg === 'rgb(0, 200, 5)';
      if (green === onGreen) return;
      onGreen = green;
      /* both mechanisms on purpose: the class drives the CSS rules, the inline
         styles are the belt-and-braces. Verified only by direct evaluation —
         the tab used to check this had stopped recalculating style entirely. */
      nav.classList.toggle('on-green', green);
      const t = green ? LIGHT : DARK;
      if (link) link.style.color = t.link;
      if (cta) { cta.style.color = t.cta; cta.style.borderColor = t.cta; cta.style.background = t.bg; }
      const img = mark && mark.querySelector('img');
      if (img) img.style.filter = t.mark;
    };

    if (window.gsap && window.gsap.ticker) window.gsap.ticker.add(flip);
    else addEventListener('scroll', flip, { passive: true });
    flip();
  }
`;

const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>$FIRE — Buy $FIRE and retire</title>
<meta name="description" content="The FIRE movement takes thirty years. Hold $FIRE and tokenized stock arrives in your wallet, paid from day one." />
<!-- This page exists to be pasted into a group chat, so the share card is not
     decoration. Absolute URL required: relative OG images are dropped by most
     unfurlers. -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://fire-launchpad-production.up.railway.app/new-landing" />
<meta property="og:title" content="$FIRE — Buy $FIRE and retire" />
<meta property="og:description" content="Their way takes 10,950 days. Ours is 90 — and you're paid the whole way." />
<meta property="og:image" content="https://fire-launchpad-production.up.railway.app/brand/og-v3.png" />
<meta property="og:image:width" content="2400" />
<meta property="og:image:height" content="1260" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="$FIRE — Buy $FIRE and retire" />
<meta name="twitter:description" content="Their way takes 10,950 days. Ours is 90 — and you're paid the whole way." />
<meta name="twitter:image" content="https://fire-launchpad-production.up.railway.app/brand/og-v3.png" />
<meta name="theme-color" content="#07080A" />
${helmetFixed}
<style>
${rules.join('\n')}
${ENHANCE_CSS}
</style>
</head>
<body>
${NAV}
${markup}
<script>
/* Ported from Claude Design's "FIRE Landing.dc.html" by scratchpad/port.js.
   Same logic; DC refs became ids and the runtime's style-hover attributes
   became real CSS rules in <head>. Re-run the script to regenerate. */
(function () {
  class Journey {
    constructor(props) {
      this.props = props || {};
      this.fired = false; this.skipped = false; this.counted = false;
      this.r = {
${refInit}
      };
    }
${logic}
${HANDLERS}
  }

${ENHANCE_JS}

  function boot() {
    /* The dials Design exposed in data-props. Read from the URL so the grind
       length can be tuned on a real phone without a rebuild:
         /new-landing?grindVh=700 */
    const q = new URLSearchParams(location.search);
    const num = (k, d) => (q.has(k) && !Number.isNaN(+q.get(k)) ? +q.get(k) : d);
    const j = new Journey({
      grindVh: num('grindVh', 900),
      compoundRate: num('compoundRate', 1.07),
      dimStrength: num('dimStrength', 0.55),
      droneOpacity: num('droneOpacity', 0.022),
      breakFlash: q.get('breakFlash') !== '0',
      years: num('years', 30),
      rampDays: num('rampDays', 90)
    });
    window.__fireJourney = j;
    j.componentDidMount();
    ember();
    navTone();
    document.querySelectorAll('[data-act]').forEach((el) => {
      const fn = el.getAttribute('data-act');
      if (typeof j[fn] === 'function') el.addEventListener('click', (e) => j[fn](e));
    });
    document.querySelectorAll('[data-s]').forEach((el) => {
      el.getAttribute('data-s').split(/\\s+/).forEach((c) => c && el.classList.add(c));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, out);
console.log(`refs=${refNames.length} handlers=${handlers.join(',')} stateRules=${rules.length}`);
console.log(`wrote ${OUT} (${(out.length / 1024).toFixed(1)} KB)`);
