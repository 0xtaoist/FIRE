"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { FIRE_CONTRACT, FIRE_ABI, HOOK_CONTRACT, HOOK_ABI, TIER, tierAtDays, type TierConfig } from "@/lib/contract";
import { formatUnits } from "viem";
import { ranksFor, rankProgress, heatAtDays } from "@/lib/ranks";
import type { EarnedBadge } from "@/lib/badges";
import { utcDay } from "@/lib/useCheckin";
import {
  C, MONO, Kick, Panel, Medallion, Ring, DotGrid, ScrubChart, Spark,
  useCountOnce, type DotState,
} from "./primitives";
import { ProtocolV4 } from "./protocol-v4";
import { DistributedAssets } from "./distributed-assets";

/* v4 dashboard — built from the Claude Design prototype
   (FIRE Dashboard Prototype.dc.html), which ships BOTH a 390×844 mobile layout
   and a 1280×900 desktop one. Desktop is a `480px 1fr` two-column grid: the
   identity rail (hero / next rank / check-in) on the left, everything data on
   the right. Sizes below are lifted from the mock per breakpoint. */

type BadgesRes = { earned: number; total: number; badges: EarnedBadge[]; tier: TierConfig; jackpotMinStreakDays: number | null };
type CheckinRes = { checkedInToday: boolean; visitStreak: number; longestStreak: number; totalCheckins: number; recent: string[] };
type SeriesRes = { totalUsd: number; drops: number; firstAt: string | null; points: { t: string; day: number; usd: number }[]; assets: { symbol: string; totalUsd: number; priced: boolean; points: { usd: number }[] }[]; history?: DropRow[] };
type CohortRes = { cohort: string; cohortLabel: string; startedInMonth: number; stillUnbroken: number; monthDay: number; hasTrueSurvival: boolean; survivalSeries: { day: number; alive: number }[] };

const RANGES: [string, number][] = [["1W", 7], ["1M", 30], ["3M", 90], ["ALL", 0]];
const usd = (n: number) => `$${n.toFixed(2)}`;
const DESKTOP = "(min-width: 1024px)";

/** Subscribed, not read into state — renders right on first paint and never
 *  cascades. Server snapshot is `false`, so SSR emits the mobile tree. */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false
  );
}

export function DashboardV4({ address, readOnly }: { address: `0x${string}`; readOnly?: boolean }) {
  const lg = useIsDesktop();

  const [badges, setBadges] = useState<BadgesRes | null>(null);
  const [checkin, setCheckin] = useState<CheckinRes | null>(null);
  const [series, setSeries] = useState<SeriesRes | null>(null);
  const [lastDropAt, setLastDropAt] = useState<string | null>(null);
  const [cohort, setCohort] = useState<CohortRes | null>(null);
  const [range, setRange] = useState("ALL");
  const [open, setOpen] = useState<string | null>(null);
  const [moment, setMoment] = useState<EarnedBadge | null>(null);
  const [saving, setSaving] = useState(false);
  const [feesOpen, setFeesOpen] = useState(false);

  const { data: status } = useReadContract({
    address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "holderStatus", args: [address],
  });
  // pending sell-fee rebate owed to this wallet (hook)
  const { data: rebateOwed } = useReadContract({
    address: HOOK_CONTRACT, abi: HOOK_ABI, functionName: "rebateOwed", args: [address],
  });
  // the exact unix second this wallet's streak began — this, not today's date,
  // decides which monthly cohort it belongs to
  const { data: streakStart } = useReadContract({
    address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "streakStart", args: [address],
  });
  // effective sell-fee this wallet would pay on its whole balance right now
  const { data: sellFeeBps } = useReadContract({
    address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "previewSellFeeBps",
    args: [address, status?.balance ?? BigInt(0)],
  });

  const load = useCallback(() => {
    const a = address.toLowerCase();
    fetch(`/api/badges?address=${a}`).then((r) => r.json()).then(setBadges).catch(() => {});
    fetch(`/api/checkin?address=${a}`).then((r) => (r.ok ? r.json() : null)).then(setCheckin).catch(() => {});
    fetch(`/api/dividend-series?address=${a}`).then((r) => r.json()).then(setSeries).catch(() => {});
    fetch(`/api/distributions`).then((r) => r.json()).then((d) => setLastDropAt(d?.lastDropAt ?? null)).catch(() => {});
  }, [address]);
  useEffect(load, [load]);

  /* A wallet's cohort is the month ITS streak began — not whichever month you
     happen to be reading in. Asking for the current month and calling it "your
     cohort" showed a 127-day holder the August board it is explicitly filtered
     out of. Derive the month from streakStart and ask for that one. */
  const cohortKey = useMemo(() => {
    if (streakStart === undefined) return null;
    const secs = Number(streakStart);
    if (!secs) return null;
    const d = new Date(secs * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }, [streakStart]);

  useEffect(() => {
    if (!cohortKey) return;
    let live = true;
    fetch(`/api/monthly-leaderboard?cohort=${cohortKey}`)
      .then((r) => r.json())
      .then((d) => { if (live) setCohort(d); })
      .catch(() => {});
    return () => { live = false; };
  }, [cohortKey]);

  const tier: TierConfig = badges?.tier ?? TIER;
  const ranks = useMemo(() => ranksFor(tier), [tier]);

  const days = status ? Number(status.streakDays_) : 0;
  const balance = status?.balance ?? BigInt(0);
  const breakBelow = status?.breakBelowBalance ?? BigInt(0);
  const peak = status?.peak ?? BigInt(0);
  const inDanger = peak > BigInt(0) && balance > BigInt(0) && balance < (breakBelow * BigInt(120)) / BigInt(100);

  const prog = useMemo(() => rankProgress(days, ranks), [days, ranks]);
  const heat = useMemo(() => heatAtDays(days, ranks), [days, ranks]);
  // Real multiplier straight from chain (tierMultX100 = multiplier × 100). This
  // already accounts for migrated wallets, backdated starts and prestige bumps —
  // so we don't recompute from days here. Fall back to the day-curve only if the
  // read hasn't landed yet.
  const mult = useMemo(() => {
    const onChain = status?.tierMultX100 !== undefined ? Number(status.tierMultX100) / 100 : null;
    return onChain ?? tierAtDays(days, false, tier);
  }, [status?.tierMultX100, days, tier]);
  const multMaxed = mult >= tier.maxBaseX;
  const multLabel = (Math.round(mult * 10) / 10).toFixed(mult >= 10 ? 0 : 1).replace(/\.0$/, "") + "×";

  const hero = days === 0 ? "ember-sleeping" : inDanger ? "ember-idle" : heat >= 0.6 ? "ember-happy" : "ember-idle";
  const disc = Math.round(78 + heat * 68) + (lg ? 28 : 0);
  const shownDays = Math.round(useCountOnce(days));

  const claimed = checkin?.checkedInToday ?? false;
  const streak = checkin?.visitStreak ?? 0;

  const dots: DotState[] = useMemo(() => {
    const recent = new Set(checkin?.recent ?? []);
    const first = checkin?.recent?.length ? checkin.recent[checkin.recent.length - 1] : null;
    const out: DotState[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = utcDay(-i);
      if (i === 0) out.push(recent.has(d) ? "today-done" : "today");
      else if (recent.has(d)) out.push("done");
      else if (!first || d < first) out.push("future");
      else out.push("missed");
    }
    return out;
  }, [checkin]);

  const doCheckIn = async () => {
    if (claimed || saving) return;
    setSaving(true);
    const before = new Set((badges?.badges ?? []).filter((b) => b.earned).map((b) => b.key));
    try {
      const res = await fetch("/api/checkin", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: address.toLowerCase() }),
      });
      if (res.ok) setCheckin(await res.json());
      const fresh: BadgesRes = await fetch(`/api/badges?address=${address.toLowerCase()}`).then((r) => r.json());
      setBadges(fresh);
      const unlocked = fresh.badges.find((b) => b.earned && !before.has(b.key));
      if (unlocked) setMoment(unlocked);
    } catch {
      /* offline — the strip just won't advance */
    } finally {
      setSaving(false);
    }
  };

  const win = useMemo(() => {
    const pts = series?.points ?? [];
    const n = RANGES.find((r) => r[0] === range)?.[1] ?? 0;
    if (!n || pts.length <= n) return pts;
    return pts.slice(-n);
  }, [series, range]);

  const rankBadges = (badges?.badges ?? []).filter((b) => b.group === "rank");
  const achvBadges = (badges?.badges ?? []).filter((b) => b.group !== "rank");
  const closest = (badges?.badges ?? []).filter((b) => !b.earned && b.progress).slice(0, 3);
  const sheet = open ? (badges?.badges ?? []).find((b) => b.key === open) ?? null : null;

  const pad = lg ? 24 : 18;

  /* ── sections ── */

  const heroBlock = (
    <div style={lg ? undefined : { padding: "20px 20px 24px" }}>
      <Panel bare={!lg} style={lg ? { padding: pad } : { padding: 0, border: "none", background: "transparent" }}>
        <Kick>hold streak · on-chain</Kick>
        <div style={{ display: "flex", alignItems: "center", gap: lg ? 22 : 16, marginTop: lg ? 20 : 16 }}>
          <div style={{ position: "relative", width: lg ? 164 : 136, height: lg ? 164 : 136, flex: "none", display: "grid", placeItems: "center" }}>
            <div style={{ position: "absolute", borderRadius: "50%", background: C.greenSoft, width: disc, height: disc }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/badges/${hero}.png`} alt="Ember" width={lg ? 146 : 118} height={lg ? 146 : 118}
                 style={{ display: "block", width: lg ? 146 : 118, height: lg ? 146 : 118, borderRadius: "50%", position: "relative" }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className={MONO} style={{ fontSize: lg ? 78 : 64, lineHeight: lg ? 0.9 : 0.92, letterSpacing: "-0.03em", color: C.text }}>{shownDays}</div>
            <div className={MONO} style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginTop: lg ? 10 : 8 }}>days held</div>
            <div style={{ marginTop: lg ? 16 : 14, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span className={MONO} style={{ display: "inline-flex", alignItems: "center", height: lg ? 28 : 26, padding: lg ? "0 14px" : "0 12px", borderRadius: 999, border: `1px solid ${C.greenLine}`, background: C.greenSoft, color: C.green, fontSize: lg ? 13 : 12, fontWeight: 600, letterSpacing: "0.12em" }}>
                {prog.rank.label}
              </span>
              <span
                className={MONO}
                title={multMaxed ? "Maximum reward multiplier" : `Your dividend multiplier — grows to ${tier.maxBaseX}× at ${tier.rampDays} days`}
                style={{
                  display: "inline-flex", alignItems: "center", height: lg ? 28 : 26,
                  padding: lg ? "0 14px" : "0 12px", borderRadius: 999,
                  fontSize: lg ? 13 : 12, fontWeight: 600, letterSpacing: "0.08em",
                  border: `1px solid ${multMaxed ? C.greenLine : C.line}`,
                  background: multMaxed ? C.greenSoft : "transparent",
                  color: multMaxed ? C.green : C.muted,
                }}
              >
                {multLabel}{multMaxed ? " MAX" : ` of ${tier.maxBaseX}×`}
              </span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: lg ? 20 : 18, fontSize: lg ? 16 : 15, lineHeight: 1.45, color: C.muted, textWrap: "pretty" }}>
          {inDanger ? "You are close to the break line. Selling below half your peak resets everything." : prog.rank.blurb}
        </div>
      </Panel>
    </div>
  );

  const nextBlock = (
    <Panel style={{ padding: pad }}>
      <Kick>next rank</Kick>
      <div style={{ display: "flex", alignItems: "center", gap: lg ? 22 : 18, marginTop: lg ? 16 : 14 }}>
        <Ring pct={prog.pct} size={lg ? 128 : 116} centre={prog.maxed ? "—" : prog.daysToNext} sub="days" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className={MONO} style={{ fontSize: lg ? 13 : 12, fontWeight: 600, letterSpacing: "0.14em", color: C.green }}>
            {prog.maxed ? "TOP RANK" : prog.next?.label}
          </div>
          <div style={{ fontSize: lg ? 21 : 19, lineHeight: 1.3, color: C.text, marginTop: lg ? 10 : 8, textWrap: "pretty" }}>
            {prog.maxed ? "There is nothing above this." : prog.next?.blurb}
          </div>
          <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint, marginTop: lg ? 14 : 12 }}>
            {prog.maxed ? `${days} days and counting` : `day ${prog.next?.atDays} · ${Math.round(prog.pct)}% from ${prog.rank.label.toLowerCase()}`}
          </div>
        </div>
      </div>
    </Panel>
  );

  const checkinBlock = (
    <Panel style={{ padding: pad }}>
      <Kick>{days > 30 ? "check-in · last 30 days" : "check-in · since you arrived"}</Kick>
      <div style={{ display: "flex", alignItems: "baseline", gap: lg ? 10 : 8, marginTop: lg ? 16 : 14 }}>
        <span className={MONO} style={{ fontSize: lg ? 34 : 30, lineHeight: 1, color: C.text }}>{streak}</span>
        <span className={MONO} style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>day check-in streak</span>
      </div>

      {claimed ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, height: 48, marginTop: lg ? 18 : 16, padding: "0 16px", borderRadius: 999, border: `1px solid ${C.greenLine}`, background: C.greenSoft }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, flex: "none" }} />
          <span style={{ fontSize: lg ? 16 : 15, fontWeight: 500, color: C.text }}>Checked in today.</span>
          <span style={{ fontSize: lg ? 16 : 15, color: C.muted }}>Back tomorrow.</span>
        </div>
      ) : readOnly ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, height: 48, marginTop: lg ? 18 : 16, padding: "0 16px", borderRadius: 999, border: `1px solid ${C.line}`, background: "rgba(245,243,238,0.03)" }}>
          <span style={{ fontSize: lg ? 15 : 14, color: C.muted }}>Viewing read-only — connect this wallet to check in.</span>
        </div>
      ) : (
        <button onClick={doCheckIn} disabled={saving}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 48, marginTop: lg ? 18 : 16, borderRadius: 999, background: C.green, color: "#0b0a06", fontSize: 16, fontWeight: 600, border: "none", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "…" : `Check in — day ${streak + 1}`}
        </button>
      )}

      <div style={{ marginTop: lg ? 22 : 20 }}><DotGrid dots={dots} dotSize={lg ? 11 : 10} /></div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: lg ? 20 : 18, paddingTop: lg ? 16 : 14, borderTop: `1px solid ${C.line}` }}>
        <span className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint }}>best {checkin?.longestStreak ?? 0} days</span>
        <span className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint }}>{checkin?.totalCheckins ?? 0} days on record</span>
      </div>
      <div style={{ fontSize: lg ? 13 : 12, lineHeight: 1.5, color: C.faint, marginTop: lg ? 12 : 10, textWrap: "pretty" }}>
        Check-ins are cosmetic and pay nothing. Dividends come from holding only.
      </div>
    </Panel>
  );

  const paidBlock = (
    <Panel style={{ padding: pad }}>
      <div style={lg ? { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 } : undefined}>
        <div style={{ minWidth: 0 }}>
          <Kick>paid to you · lifetime</Kick>
          <div className={MONO} style={{ fontSize: lg ? 52 : 44, lineHeight: 1, letterSpacing: "-0.02em", marginTop: 14, color: series && series.totalUsd > 0 ? C.text : C.faint }}>
            {series ? usd(series.totalUsd) : "—"}
          </div>
          <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint, marginTop: lg ? 10 : 8 }}>
            {series && series.drops > 0 ? `as of today · ${series.drops} distributions` : `nothing yet · day ${days} of holding`}
          </div>
        </div>
        {lg && series && series.points.length > 1 && <RangeTabs range={range} setRange={setRange} />}
      </div>

      {series && series.points.length > 1 ? (
        <>
          {!lg && <div style={{ marginTop: 18 }}><RangeTabs range={range} setRange={setRange} /></div>}
          <ScrubChart values={win.map((p) => p.usd)} labels={win.map((p) => `day ${p.day}`)} height={lg ? 190 : 132} fmt={usd} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: lg ? 16 : 14, paddingTop: lg ? 16 : 14, borderTop: `1px solid ${C.line}` }}>
            <span className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint }}>day {win[0]?.day ?? 1}</span>
            <span className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint }}>today</span>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: lg ? 20 : 18, marginTop: 20, padding: lg ? 22 : 18, background: C.surface2, borderRadius: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/badges/ember-sleeping.png" alt="" width={lg ? 96 : 84} height={lg ? 96 : 84} style={{ display: "block", width: lg ? 96 : 84, height: lg ? 96 : 84, flex: "none" }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: lg ? 19 : 17, lineHeight: 1.3, color: C.text, textWrap: "pretty" }}>{nextDropCopy(lastDropAt)}</div>
            <div style={{ fontSize: lg ? 14 : 13, lineHeight: 1.45, color: C.muted, marginTop: 6 }}>Nothing to do but hold.</div>
          </div>
        </div>
      )}
      <div style={{ fontSize: lg ? 13 : 12, lineHeight: 1.5, color: C.faint, marginTop: 14, textWrap: "pretty" }}>
        Real dividends from held assets, valued at today&apos;s prices. Paid on holding, never on checking in.
      </div>
    </Panel>
  );

  const assetBlock = series && series.assets.length > 0 && (
    <Panel style={{ padding: pad }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <Kick>by asset</Kick>
        <div className={MONO} style={{ fontSize: 11, letterSpacing: "0.1em", color: C.faint }}>{series.assets.length} distributed</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: lg ? 10 : 8 }}>
        {series.assets.map((a) => (
          <div key={a.symbol} style={{ display: "flex", alignItems: "center", gap: lg ? 14 : 12, padding: lg ? "12px 0" : "11px 0", borderBottom: `1px solid ${C.line}` }}>
            <span className={MONO} style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", width: lg ? 50 : 46, flex: "none", color: C.text }}>{a.symbol}</span>
            <Spark values={a.points.map((p) => p.usd)} />
            <span className={MONO} style={{ fontSize: lg ? 14 : 13, width: lg ? 66 : 60, textAlign: "right", flex: "none", color: a.priced ? C.text : C.faint }}>
              {a.priced ? usd(a.totalUsd) : "—"}
            </span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: lg ? 13 : 12, lineHeight: 1.5, color: C.faint, marginTop: 14, textWrap: "pretty" }}>
        One line per asset, each on its own scale. Green means gain, not identity.
      </div>
    </Panel>
  );

  const cohortMonth = cohort?.cohortLabel?.split(" ")[0]?.toLowerCase();
  // Only claim it is theirs if the month we got back is the month they started.
  const inCohort = !!cohort && !!cohortKey && cohort.cohort === cohortKey;
  const cohortBlock = cohort && cohort.survivalSeries?.length > 1 && (
    <Panel style={{ padding: pad }}>
      <Kick>{inCohort ? "your cohort" : "this month"} · {cohortMonth}</Kick>
      <div style={{ fontSize: lg ? 20 : 19, lineHeight: 1.35, color: C.text, marginTop: lg ? 14 : 12, textWrap: "pretty" }}>
        {cohort.hasTrueSurvival
          ? `${cohort.stillUnbroken} of ${cohort.startedInMonth} who started in ${cohortMonth} are still here.`
          : `${cohort.stillUnbroken} wallets that started in ${cohortMonth} are still holding.`}
      </div>
      <StepChart series={cohort.survivalSeries} height={lg ? 126 : 88} />
      {/* The axis is days into the cohort's own month, so it ends at that
          month's last indexed day — never at the reader's total streak, which
          for an older wallet runs far past the right-hand edge. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: lg ? 14 : 12, paddingTop: lg ? 16 : 14, borderTop: `1px solid ${C.line}` }}>
        <span className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint }}>day 1</span>
        <span className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint }}>day {cohort.monthDay}</span>
      </div>
      <div style={{ fontSize: lg ? 13 : 12, lineHeight: 1.5, color: C.faint, marginTop: 12, textWrap: "pretty" }}>
        {inCohort ? `You are one of them — day ${days} and counting. ` : ""}
        {cohort.hasTrueSurvival ? "" : "Counts wallets still holding; anyone who started that month and quit is not indexed yet."}
      </div>
    </Panel>
  );

  const badgeBlock = (
    <Panel style={{ padding: pad }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <Kick>badge case</Kick>
        <div className={MONO} style={{ fontSize: lg ? 12 : 11, letterSpacing: "0.1em", color: C.green }}>
          {badges ? `${badges.earned} / ${badges.total}` : "—"}
        </div>
      </div>

      <Section label="ranks · kept forever" top={lg ? 20 : 18} />
      <Grid lg={lg}>
        {rankBadges.map((b) => (
          <Medallion key={b.key} slug={b.key.replace(/_/g, "-")} label={b.label} size={lg ? 72 : 64} earned={b.earned}
                     current={b.label.toUpperCase() === prog.rank.label} onClick={() => setOpen(b.key)} />
        ))}
      </Grid>

      <Section label="achievements" top={lg ? 26 : 24} />
      <Grid lg={lg}>
        {achvBadges.map((b) => (
          <Medallion key={b.key} slug={b.key.replace(/_/g, "-")} label={b.label} size={lg ? 72 : 64} earned={b.earned} onClick={() => setOpen(b.key)} />
        ))}
      </Grid>

      {closest.length > 0 && (
        <div style={{ marginTop: lg ? 26 : 24, paddingTop: lg ? 18 : 16, borderTop: `1px solid ${C.line}` }}>
          <div className={MONO} style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: C.faint }}>closest three</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: lg ? 12 : 10 }}>
            {closest.map((b) => (
              <button key={b.key} onClick={() => setOpen(b.key)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 0", background: "none", border: "none", borderBottom: `1px solid ${C.line}`, cursor: "pointer", width: "100%" }}>
                <span style={{ fontSize: 14, color: C.text }}>{b.label}</span>
                <span className={MONO} style={{ fontSize: 11, color: C.muted }}>{b.progress}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );

  const mechBlock = (
    <Panel bare style={{ padding: pad }}>
      <Kick>the mechanics</Kick>
      <div style={{ fontSize: lg ? 13 : 12, lineHeight: 1.5, color: C.faint, marginTop: 14, textWrap: "pretty" }}>
        The jackpot minimum is a live contract parameter and has moved before. It currently sits at{" "}
        <span style={{ color: C.muted }}>{badges?.jackpotMinStreakDays ?? "—"} days</span>.
      </div>
      <button onClick={() => setFeesOpen(true)} className={MONO}
        style={{ display: "inline-flex", alignItems: "center", height: 36, marginTop: 14, padding: "0 16px", borderRadius: 999, border: `1px solid ${C.line}`, color: C.muted, fontSize: 12, background: "transparent", cursor: "pointer" }}>
        Fees, tranches &amp; rebate ↗
      </button>
    </Panel>
  );

  /* ── layout ── */

  const overlays = (
    <>
      {sheet && <BadgeSheet badge={sheet} isRank={sheet.group === "rank"} lg={lg} onClose={() => setOpen(null)} />}
      {moment && <Moment badge={moment} lg={lg} onClose={() => setMoment(null)} />}
      {feesOpen && (
        <FeesSheet
          lg={lg}
          onClose={() => setFeesOpen(false)}
          tranches={status ? Number(status.tranches_) : 0}
          streakDays={days}
          sellFeeBps={sellFeeBps !== undefined ? Number(sellFeeBps) : null}
          rebateOwed={rebateOwed ?? null}
          history={series?.history ?? []}
          totalUsd={series?.totalUsd ?? 0}
        />
      )}
    </>
  );

  if (!lg) {
    return (
      <div style={{ paddingBottom: 28 }}>
        {heroBlock}
        <div style={{ margin: "0 20px" }}>{nextBlock}</div>
        <div style={{ margin: "12px 20px 0" }}>{checkinBlock}</div>
        <div style={{ margin: "12px 20px 0" }}>{badgeBlock}</div>
        <div style={{ margin: "12px 20px 0" }}>{paidBlock}</div>
        {assetBlock && <div style={{ margin: "12px 20px 0" }}>{assetBlock}</div>}
        {cohortBlock && <div style={{ margin: "12px 20px 0" }}>{cohortBlock}</div>}
        <div style={{ margin: "12px 20px 0" }}>{mechBlock}</div>
        <div style={{ margin: "28px 20px 0" }}><ProtocolV4 lg={false} /></div>
        <div style={{ margin: "12px 20px 0" }}><DistributedAssets compact /></div>
        <div style={{ margin: "12px 20px 0" }}><LamboCalculator lg={false} tier={tier} /></div>
        {overlays}
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 36px 40px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "480px 1fr", gap: 28, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {heroBlock}
          {nextBlock}
          {checkinBlock}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {paidBlock}
          <div style={{ display: "grid", gridTemplateColumns: assetBlock && cohortBlock ? "1fr 1fr" : "1fr", gap: 16, alignItems: "start" }}>
            {assetBlock}
            {cohortBlock}
          </div>
          {badgeBlock}
          {mechBlock}
        </div>
      </div>
      <div style={{ marginTop: 32 }}><ProtocolV4 lg /></div>
      <div style={{ marginTop: 16 }}><DistributedAssets /></div>
      <div style={{ marginTop: 16 }}><LamboCalculator lg tier={tier} /></div>
      {overlays}
    </div>
  );
}

/* ── small local pieces ── */

// "How much can you earn" calculator — the lambo calculator, reintroduced on
// the v4 dashboard. Projects dividend earnings from your bag, your streak
// multiplier (real tierAtDays curve), and a daily-volume assumption the user
// controls — so the projection is honest and transparent, not hardcoded hype.
function LamboCalculator({ lg, tier }: { lg: boolean; tier: TierConfig }) {
  const [usd, setUsd] = useState(1000);
  const [days, setDays] = useState(90);
  const [dailyVol, setDailyVol] = useState(250_000); // user-adjustable daily $ volume

  const r = useMemo(() => {
    const mult = tierAtDays(days, false, tier);
    const multMaxed = mult >= tier.maxBaseX;
    // dividend pool ≈ daily volume × total fee to dividends. Buy 1% + sell ~1-3%;
    // use a conservative blended ~1.5% of volume flowing to the dividend pool.
    const DIV_RATE = 0.015;
    const dailyPool = dailyVol * DIV_RATE;
    // your weighted share of the pool. Model the rest of the pool as holding
    // ~$1.5M weighted at an average 2.5x. Your weight = bag × your multiplier.
    const NETWORK_WEIGHTED_USD = 1_500_000 * 2.5;
    const yourWeight = usd * mult;
    const share = yourWeight / (yourWeight + NETWORK_WEIGHTED_USD);
    const daily = dailyPool * share;
    return {
      mult, multMaxed,
      multLabel: (Math.round(mult * 100) / 100).toString() + "×",
      daily, monthly: daily * 30, yearly: daily * 365,
    };
  }, [usd, days, dailyVol, tier]);

  const fmtUsd = (n: number) =>
    n >= 1 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
           : `$${n.toFixed(4)}`;

  const slider = (label: string, val: number, set: (n: number) => void, min: number, max: number, step: number, fmt: (n: number) => string, lo: string, hi: string, prefix?: string, suffix?: string) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>{label}</div>
      <div style={{ position: "relative" }}>
        {prefix && <span className={MONO} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.faint, fontSize: 15 }}>{prefix}</span>}
        <input type="number" value={val} min={min} max={max}
          onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value))))}
          className={MONO}
          style={{ width: "100%", height: 46, padding: prefix ? "0 14px 0 26px" : suffix ? "0 52px 0 14px" : "0 14px", fontSize: 17, color: C.text, background: "rgba(245,243,238,0.04)", border: `1px solid ${C.line}`, borderRadius: 12, outline: "none" }} />
        {suffix && <span className={MONO} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: C.faint, fontSize: 13 }}>{suffix}</span>}
      </div>
      <input type="range" min={min} max={max} step={step} value={Math.min(val, max)}
        onChange={(e) => set(Number(e.target.value))}
        style={{ width: "100%", marginTop: 12, accentColor: C.green }} />
      <div className={MONO} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.faint, marginTop: 2 }}>
        <span>{lo}</span><span>{hi}</span>
      </div>
    </div>
  );

  const result = (label: string, value: string, big?: boolean) => (
    <div>
      <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>{label}</div>
      <div className={MONO} style={{ fontSize: big ? (lg ? 30 : 24) : (lg ? 20 : 18), lineHeight: 1, color: big ? C.green : C.text }}>{value}</div>
    </div>
  );

  return (
    <Panel style={{ padding: lg ? 28 : 22 }}>
      <Kick>the fun math</Kick>
      <div style={{ fontSize: lg ? 24 : 20, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 6, marginBottom: 4 }}>
        How much retirement can you afford?
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: C.muted, marginBottom: lg ? 24 : 20, textWrap: "pretty" }}>
        Your bag, your streak, and how busy the market is. Drag the sliders and dream a little.
      </div>

      <div style={{ display: "flex", gap: lg ? 20 : 16, flexDirection: lg ? "row" : "column" }}>
        {slider("Your bag", usd, setUsd, 100, 100000, 100, fmtUsd, "$100", "$100K", "$")}
        {slider("Days held", days, setDays, 1, 365, 1, (n) => `${n}`, "1", "365", undefined, "days")}
      </div>
      <div style={{ marginTop: lg ? 18 : 16 }}>
        {slider("Daily market volume (assumption)", dailyVol, setDailyVol, 10000, 5000000, 10000, fmtUsd, "$10K", "$5M", "$")}
      </div>

      {/* results */}
      <div style={{ marginTop: lg ? 26 : 22, paddingTop: lg ? 22 : 18, borderTop: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: lg ? 16 : 10 }}>
        {result("Multiplier", r.multLabel)}
        {result("Daily", fmtUsd(r.daily))}
        {result("Monthly", fmtUsd(r.monthly))}
        {result("Yearly", fmtUsd(r.yearly), true)}
      </div>

      <div className={MONO} style={{ fontSize: 10, lineHeight: 1.5, color: C.faint, marginTop: 18, textWrap: "pretty" }}>
        Rough projection, not a promise. Real dividends depend on actual trading volume and the total weighted holdings of everyone in the pool — all of which move constantly. This models your share at the volume you set; it is not financial advice or a guaranteed return.
      </div>
    </Panel>
  );
}

function RangeTabs({ range, setRange }: { range: string; setRange: (r: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, flex: "none" }}>
      {RANGES.map(([label]) => (
        <button key={label} onClick={() => setRange(label)} className={MONO}
          style={{ display: "inline-flex", alignItems: "center", height: 28, padding: "0 12px", borderRadius: 999, cursor: "pointer", border: "none",
                   background: label === range ? C.greenSoft : "transparent", color: label === range ? C.green : C.muted }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em" }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

function Section({ label, top = 18 }: { label: string; top?: number }) {
  return <div className={MONO} style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: C.faint, marginTop: top }}>{label}</div>;
}

function Grid({ children, lg }: { children: React.ReactNode; lg: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${lg ? 6 : 4}, 1fr)`, gap: lg ? "18px 12px" : "16px 8px", marginTop: lg ? 14 : 12 }}>
      {children}
    </div>
  );
}

function StepChart({ series, height = 88 }: { series: { day: number; alive: number }[]; height?: number }) {
  const W = 350, H = 88;
  const hi = Math.max(...series.map((s) => s.alive), 1);
  const x = (i: number) => +((i / Math.max(1, series.length - 1)) * W).toFixed(2);
  const y = (v: number) => +(H - (v / hi) * (H - 6)).toFixed(2);
  let d = `M${x(0)},${y(series[0].alive)}`;
  for (let i = 1; i < series.length; i++) d += ` L${x(i)},${y(series[i - 1].alive)} L${x(i)},${y(series[i].alive)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", width: "100%", height, marginTop: 18 }}>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={C.greenSoft} />
      <path d={d} fill="none" stroke={C.green} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function BadgeSheet({ badge, isRank, lg, onClose }: { badge: EarnedBadge; isRank: boolean; lg: boolean; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const art = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/badges/${badge.key.replace(/_/g, "-")}.png`} alt="" width={lg ? 136 : 128} height={lg ? 136 : 128}
           style={{ display: "block", width: lg ? 136 : 128, height: lg ? 136 : 128, borderRadius: "50%", filter: badge.earned ? undefined : "grayscale(1) brightness(0.35)" }} />
      <div className={MONO} style={{ fontSize: lg ? 15 : 14, fontWeight: 600, letterSpacing: "0.2em", color: C.text, marginTop: lg ? 18 : 16 }}>{badge.label.toUpperCase()}</div>
      <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: lg ? 8 : 7, color: badge.earned ? C.green : C.faint }}>
        {isRank ? "rank · one at a time" : "achievement · permanent"}
      </div>
      <div style={{ fontSize: lg ? 17 : 16, lineHeight: 1.5, color: C.muted, textAlign: "center", marginTop: 18, textWrap: "pretty" }}>{badge.requirement}</div>
      <div style={{ width: "100%", marginTop: 24, paddingTop: 6, borderTop: `1px solid ${C.line}` }}>
        <Row k={badge.earned ? "Status" : "Unlock by"} v={badge.earned ? "Earned" : badge.requirement} color={badge.earned ? C.green : C.text} />
        {!badge.earned && badge.progress && <Row k="You need" v={badge.progress} color={C.green} />}
        <Row k="Can be lost" v={isRank ? "yes" : "no"} color={isRank ? C.muted : C.green} />
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: C.faint, marginTop: 16, textAlign: "center", textWrap: "pretty" }}>
        {isRank ? "Your rank can fall back if the hold streak breaks." : "Achievements never expire and never downgrade."}
      </div>
    </>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: `rgba(6,5,3,${lg ? 0.76 : 0.72})`, animation: "fvFade 180ms ease-out" }} />
      {lg ? (
        // Desktop is a centred modal, not a bottom sheet — straight from the mock.
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 460, maxHeight: "86vh", overflowY: "auto", background: "#151109", border: "1px solid rgba(245,243,238,0.12)", borderRadius: 24, padding: 32, animation: "fvPop 240ms cubic-bezier(0.22,1,0.36,1)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {art}
            <button onClick={onClose}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 44, width: "100%", marginTop: 22, borderRadius: 999, background: "none", border: `1px solid rgba(245,243,238,0.12)`, color: "rgba(245,243,238,0.8)", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 430, margin: "0 auto", background: "#151109", border: "1px solid rgba(245,243,238,0.12)", borderBottom: "none", borderRadius: "26px 26px 0 0", padding: "0 24px 28px", animation: "fvSheet 260ms cubic-bezier(0.22,1,0.36,1)", maxHeight: "88vh", overflowY: "auto" }}>
          <div onClick={onClose} style={{ display: "flex", justifyContent: "center", padding: "14px 0 18px", cursor: "pointer" }}>
            <div style={{ width: 44, height: 4, borderRadius: 999, background: C.lineStrong }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>{art}</div>
        </div>
      )}
    </div>
  );
}

type DropRow = { date: string; asset: string; symbol: string; amount: string; usd: number; priced: boolean };

// Dividend drops land daily. If today's drop (UTC) has already landed, the
// holder's next one is tomorrow; otherwise it's today. Derived from the newest
// distribution record's date (lastDropAt) so it reflects reality, not a
// hardcoded day.
function nextDropCopy(lastDropAt: string | null): string {
  if (!lastDropAt) return "Your first drop lands today.";
  const todayUTC = new Date().toISOString().slice(0, 10);
  const lastUTC = new Date(lastDropAt).toISOString().slice(0, 10);
  return lastUTC >= todayUTC
    ? "Your first drop lands tomorrow."   // today's drop already ran
    : "Your first drop lands today.";      // today's hasn't happened yet
}

function FeesSheet({
  lg, onClose, tranches, streakDays, sellFeeBps, rebateOwed, history, totalUsd,
}: {
  lg: boolean; onClose: () => void;
  tranches: number; streakDays: number; sellFeeBps: number | null;
  rebateOwed: bigint | null; history: DropRow[]; totalUsd: number;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const rebateEth = rebateOwed !== null ? Number(formatUnits(rebateOwed, 18)) : null;
  const feePct = sellFeeBps !== null ? (sellFeeBps / 100).toFixed(2) : "—";
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const fmtAmt = (a: string) => { const n = Number(a); return n >= 1 ? n.toLocaleString(undefined, { maximumFractionDigits: 4 }) : n.toPrecision(3); };

  const body = (
    <>
      <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted }}>
        your fees, tranches &amp; dividends
      </div>

      {/* current standing */}
      <div style={{ width: "100%", marginTop: 18, paddingTop: 4 }}>
        <Row k="Hold streak" v={`${streakDays} days`} color={C.text} />
        <Row k="Tranches held" v={`${tranches}`} color={C.text} />
        <Row k="Sell fee now" v={`${feePct}%`} color={sellFeeBps !== null && sellFeeBps <= 150 ? C.green : C.text} />
        <Row k="Rebate owed" v={rebateEth !== null ? `${rebateEth.toFixed(6)} ETH` : "—"} color={rebateEth && rebateEth > 0 ? C.green : C.muted} />
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: C.faint, marginTop: 12, textWrap: "pretty" }}>
        Your sell fee starts at 3% and rebates down toward 1% as your tranches age (LIFO). Any rebate owed is claimable from the hook.
      </div>

      {/* distribution history */}
      <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginTop: 24, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
        <span>dividend history</span>
        <span style={{ color: C.faint }}>{history.length} drop{history.length === 1 ? "" : "s"} · ${totalUsd.toLocaleString()}</span>
      </div>
      {history.length === 0 ? (
        <div style={{ fontSize: 13, color: C.faint, padding: "16px 0", textAlign: "center" }}>
          No dividends yet. Hold through the next distribution to appear here.
        </div>
      ) : (
        <div style={{ maxHeight: lg ? 320 : 300, overflowY: "auto", marginLeft: -4, marginRight: -4 }}>
          {history.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 4px", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span className={MONO} style={{ fontSize: 13, color: C.text }}>{fmtAmt(r.amount)} {r.symbol}</span>
                <span className={MONO} style={{ fontSize: 10, color: C.faint }}>{fmtDate(r.date)}</span>
              </div>
              <span className={MONO} style={{ fontSize: 13, color: r.priced ? C.green : C.faint, flex: "none" }}>
                {r.priced ? `$${r.usd.toFixed(2)}` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, lineHeight: 1.5, color: C.faint, marginTop: 14, textWrap: "pretty" }}>
        USD is valued at current prices, not the price on each distribution day. Dividends are paid straight to your wallet — nothing to claim here.
      </div>
    </>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: `rgba(6,5,3,${lg ? 0.76 : 0.72})`, animation: "fvFade 180ms ease-out" }} />
      {lg ? (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 480, maxHeight: "86vh", overflowY: "auto", background: "#151109", border: "1px solid rgba(245,243,238,0.12)", borderRadius: 24, padding: 32, animation: "fvPop 240ms cubic-bezier(0.22,1,0.36,1)" }}>
          {body}
          <button onClick={onClose}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 44, width: "100%", marginTop: 22, borderRadius: 999, background: "none", border: `1px solid rgba(245,243,238,0.12)`, color: "rgba(245,243,238,0.8)", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
            Close
          </button>
        </div>
      ) : (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 430, margin: "0 auto", background: "#151109", border: "1px solid rgba(245,243,238,0.12)", borderBottom: "none", borderRadius: "26px 26px 0 0", padding: "0 24px 28px", animation: "fvSheet 260ms cubic-bezier(0.22,1,0.36,1)", maxHeight: "88vh", overflowY: "auto" }}>
          <div onClick={onClose} style={{ display: "flex", justifyContent: "center", padding: "14px 0 18px", cursor: "pointer" }}>
            <div style={{ width: 44, height: 4, borderRadius: 999, background: C.lineStrong }} />
          </div>
          {body}
        </div>
      )}
    </div>
  );
}

function Row({ k, v, color }: { k: string; v: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 14, color: C.muted }}>{k}</span>
      <span className={MONO} style={{ fontSize: 14, textAlign: "right", color }}>{v}</span>
    </div>
  );
}

function Moment({ badge, lg, onClose }: { badge: EarnedBadge; lg: boolean; onClose: () => void }) {
  const size = lg ? 184 : 152;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "#0d0b06", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: lg ? 40 : "32px 24px", animation: "fvFade 200ms ease-out" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", animation: "fvPop 340ms cubic-bezier(0.22,1,0.36,1)" }}>
        <div className={MONO} style={{ fontSize: lg ? 11 : 10, letterSpacing: "0.16em", textTransform: "uppercase", color: C.faint }}>badge unlocked</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/badges/${badge.key.replace(/_/g, "-")}.png`} alt="" width={size} height={size}
             style={{ display: "block", width: size, height: size, marginTop: lg ? 18 : 16, borderRadius: "50%" }} />
        <div className={MONO} style={{ fontSize: lg ? 16 : 15, fontWeight: 600, letterSpacing: "0.22em", color: C.green, marginTop: lg ? 16 : 14 }}>{badge.label.toUpperCase()}</div>
        <div style={{ fontSize: lg ? 32 : 26, lineHeight: 1.25, color: C.text, textAlign: "center", marginTop: lg ? 18 : 16, maxWidth: 560, textWrap: "pretty" }}>{badge.requirement}</div>
        <div style={{ fontSize: lg ? 17 : 15, lineHeight: 1.45, color: C.muted, textAlign: "center", marginTop: lg ? 12 : 10, maxWidth: 520, textWrap: "pretty" }}>
          Added to your case. It can never be taken away.
        </div>
        <button onClick={onClose}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", height: lg ? 50 : 48, width: lg ? 320 : 280, marginTop: lg ? 32 : 30, borderRadius: 999, background: C.green, color: "#0b0a06", fontSize: lg ? 17 : 16, fontWeight: 600, border: "none", cursor: "pointer" }}>
          See my case
        </button>
      </div>
    </div>
  );
}

/* ── connect gate ── */

// Manual address entry — lets anyone who can't (or won't) connect a wallet
// pull a wallet's stats read-only. Navigates to /dashboard?address=0x… which
// the page routes straight into the read-only DashboardV4 render.
function AddressEntry({ compact }: { compact?: boolean }) {
  const [val, setVal] = useState("");
  const valid = /^0x[a-fA-F0-9]{40}$/.test(val.trim());
  const go = () => { if (valid) window.location.href = `/dashboard?address=${val.trim().toLowerCase()}`; };
  return (
    <div style={{ maxWidth: 380, margin: compact ? "20px auto 0" : "0 auto", width: "100%" }}>
      {!compact && (
        <div className={MONO} style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>
          or look up any wallet
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="0x…"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          className={MONO}
          style={{
            flex: 1, minWidth: 0, height: 44, padding: "0 14px", fontSize: 13,
            background: "rgba(245,243,238,0.04)", color: C.text,
            border: `1px solid ${valid || val === "" ? C.line : "rgba(230,90,60,0.5)"}`,
            borderRadius: 12, outline: "none",
          }}
        />
        <button
          onClick={go}
          disabled={!valid}
          className="fv-btn"
          style={{ padding: "0 18px", height: 44, fontSize: 14, opacity: valid ? 1 : 0.4, cursor: valid ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}
        >
          View
        </button>
      </div>
      {val !== "" && !valid && (
        <div style={{ fontSize: 11, color: "rgba(230,90,60,0.8)", marginTop: 8 }}>
          That doesn&apos;t look like a wallet address (0x + 40 hex characters).
        </div>
      )}
    </div>
  );
}

export function DashboardV4Page() {
  // Providers falls back to read-only wagmi when there's no Privy app id, so
  // usePrivy would throw. Guard on the same env var it keys off.
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return <NoConnect />;
  return <ConnectGate />;
}

function NoConnect() {
  return (
    <div style={{ padding: "72px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 18, color: C.text, marginBottom: 8 }}>Look up any wallet&apos;s stats.</div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
        Paste a wallet address to see its streak, rank, badges and dividends — no connection needed.
      </div>
      <AddressEntry />
      <div style={{ textAlign: "left", marginTop: 48 }}><ProtocolV4 lg /></div>
      <div style={{ maxWidth: 720, margin: "24px auto 0", textAlign: "left" }}><DistributedAssets /></div>
      <div style={{ maxWidth: 720, margin: "24px auto 0", textAlign: "left" }}><LamboCalculator lg tier={TIER} /></div>
    </div>
  );
}

function ConnectGate() {
  const { ready, authenticated, login } = usePrivy();
  const { address } = useAccount();

  if (!ready) return null;
  if (!authenticated || !address) {
    return (
      <div style={{ padding: "72px 24px", textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/badges/ember-sleeping.png" alt="" width={120} height={120} style={{ display: "block", width: 120, height: 120, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 20, color: C.text, marginBottom: 8 }}>Connect to see your streak.</div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Your rank, badges and everything you have been paid.</div>
        <button onClick={login} className="fv-btn" style={{ padding: "0 24px", height: 46, fontSize: 15 }}>Connect wallet</button>
        <AddressEntry />
        <div style={{ textAlign: "left", marginTop: 48 }}><ProtocolV4 lg /></div>
        <div style={{ maxWidth: 720, margin: "24px auto 0", textAlign: "left" }}><DistributedAssets /></div>
        <div style={{ maxWidth: 720, margin: "24px auto 0", textAlign: "left" }}><LamboCalculator lg tier={TIER} /></div>
      </div>
    );
  }
  return <DashboardV4 address={address} />;
}
