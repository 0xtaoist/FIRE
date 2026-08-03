"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { rankProgress } from "@/lib/ranks";
import { motion } from "@/lib/motion";
import { MONO, SERIF, useCountUp } from "@/components/fire-v3/shared";
import { Ember } from "@/components/fire-v3/ember";

/**
 * The vertical share stage — a 9:16 panel built to be screen-recorded.
 *
 * Everything meant to end up in the video lives inside `.stage`; the buttons sit
 * outside it, so a recording cropped to the stage has no UI chrome in frame. The
 * reveal runs on mount and can be replayed, because the first take is never the
 * one you post.
 */
type StageProps = {
  address: string;
  days: number;
  mult: number;
  visitStreak: number;
  /** Absolute, resolved server-side — see the note in page.tsx. */
  shareUrl: string;
};

/** Replay works by remounting: `run` is the key, so every piece of animation
 *  state resets itself rather than being torn back down by hand. */
export function StreakStage(props: StageProps) {
  const [run, setRun] = useState(0);
  return <Stage key={run} {...props} onReplay={() => setRun((r) => r + 1)} />;
}

function Stage({
  days, mult, visitStreak, shareUrl, onReplay,
}: StageProps & { onReplay: () => void }) {
  const [live, setLive] = useState(false);
  const [copied, setCopied] = useState(false);

  const progress = rankProgress(days);
  const shownDays = Math.round(useCountUp(days, live, 1400));
  const shownPct = useCountUp(progress.pct, live, 1400);

  // Beat of stillness before the numbers move — the reveal reads as deliberate
  // instead of as the page still loading.
  useEffect(() => {
    const t = setTimeout(() => setLive(true), 450);
    return () => clearTimeout(t);
  }, []);

  const shareText = progress.maxed
    ? `Day ${days} holding $FIRE. Top rank. Paid in real stocks for doing nothing.`
    : `Day ${days} holding $FIRE — ${progress.daysToNext} days from ${progress.next?.label}. Paid in real stocks for doing nothing.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="fv-page min-h-screen flex flex-col items-center justify-center py-8 px-4 gap-5">
      {/* ── the recordable stage ── */}
      <div
        className="relative w-full max-w-[430px] rounded-[28px] border border-[var(--fv-line-strong)] bg-[var(--fv-bg)] overflow-hidden flex flex-col items-center px-6 pt-7 pb-8"
        style={{ aspectRatio: "9 / 16", maxHeight: "82vh" }}
      >
        <p className={`${MONO} text-[10px] tracking-[0.28em] uppercase text-[var(--fv-green)]`}>
          $FIRE · Day {days}
        </p>

        {/* Ember and the number are one centred group — the slack in a 9:16 box
            belongs between the blocks, not stranded under the character. */}
        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 py-2">
          <Ember state={progress.rank.heat >= 0.75 ? "happy" : "idle"} size={248} />

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, type: "spring", stiffness: 380, damping: 30 }}
            className={`${MONO} text-[84px] leading-[0.9] font-medium tracking-[-0.04em] mt-1`}
          >
            {shownDays}
          </motion.p>
          <p className={`${MONO} text-[11px] text-[var(--fv-muted)] mt-2 tracking-[0.06em]`}>
            {days === 1 ? "DAY" : "DAYS"} HOLDING · {mult.toFixed(2)}x
          </p>
        </div>

        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`${MONO} text-[10px] tracking-[0.18em] uppercase border border-[var(--fv-green)] text-[var(--fv-green)] rounded-full px-3 py-1`}
            >
              {progress.rank.label}
            </span>
            {visitStreak > 1 && (
              <span className={`${MONO} text-[10px] text-[var(--fv-faint)]`}>
                🔥 {visitStreak}-day check-in
              </span>
            )}
          </div>

          <div className="h-1.5 rounded-full bg-[var(--fv-surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--fv-green)]"
              style={{ width: `${live ? shownPct : 0}%` }}
            />
          </div>

          <p className={`${MONO} text-[12px] mt-2.5 text-center`}>
            {progress.maxed ? (
              <span className="text-[var(--fv-green)]">Top rank. Nothing above this.</span>
            ) : (
              <>
                <span className="text-[var(--fv-green)] font-medium">{progress.daysToNext}</span>{" "}
                <span className="text-[var(--fv-muted)]">days to {progress.next?.label}</span>
              </>
            )}
          </p>
        </div>

        <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-4 tracking-[0.14em]`}>
          retirewithfire.org
        </p>
      </div>

      {/* ── controls, deliberately outside the stage ── */}
      <div className="w-full max-w-[430px] flex flex-col gap-2.5">
        <div className="flex gap-2.5">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`fv-btn flex-1 py-3 text-[14px] ${MONO}`}
          >
            Post on 𝕏
          </a>
          <button
            onClick={copy}
            className={`${MONO} flex-1 text-[14px] rounded-full px-4 py-3 border border-[var(--fv-line-strong)] hover:border-[var(--fv-green)] hover:text-[var(--fv-green)] transition-colors`}
          >
            {copied ? "✓ Copied" : "Copy link"}
          </button>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onReplay}
            className={`${MONO} flex-1 text-[13px] rounded-full px-4 py-2.5 border border-[var(--fv-line)] text-[var(--fv-muted)] hover:border-[var(--fv-green)] hover:text-[var(--fv-green)] transition-colors`}
          >
            ↻ Replay
          </button>
          <Link
            href="/dashboard"
            className={`${MONO} flex-1 text-center text-[13px] rounded-full px-4 py-2.5 no-underline border border-[var(--fv-line)] text-[var(--fv-muted)] hover:border-[var(--fv-green)] hover:text-[var(--fv-green)] transition-colors`}
          >
            Dashboard
          </Link>
        </div>
        <p className={`${MONO} text-[10px] text-[var(--fv-faint)] text-center mt-1 leading-relaxed`}>
          Screen-record the card above for TikTok.{" "}
          <span className={SERIF}>Replay resets the animation.</span>
        </p>
      </div>
    </div>
  );
}
