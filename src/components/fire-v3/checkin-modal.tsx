"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { FIRE_CONTRACT, FIRE_ABI, TIER } from "@/lib/contract";
import { rankProgress } from "@/lib/ranks";
import { useCheckin } from "@/lib/useCheckin";
import { motion, AnimatePresence } from "@/lib/motion";
import { MONO, SERIF, useCountUp } from "./shared";
import { Ember, preloadEmber, type EmberState } from "./ember";

/**
 * The daily check-in.
 *
 * Two numbers live here and they are NOT the same thing:
 *   • the hold streak — on-chain, pays real dividends, breaks only on a sell
 *     below half of peak. This is the hero number.
 *   • the check-in streak — cosmetic, breaks if you skip a day, moves nothing.
 *     This is the reason to come back tomorrow.
 *
 * Conflating them would mean a holder who stops opening the site loses tier,
 * which is both unfair and not something the contract could honour anyway.
 */

type Phase = "greet" | "waking" | "done";

const SPRING = { type: "spring" as const, stiffness: 420, damping: 34 };

export function CheckInModal({
  open,
  onClose,
  address,
}: {
  open: boolean;
  onClose: () => void;
  address: `0x${string}`;
}) {
  const { status, checkIn } = useCheckin(address);
  const [phase, setPhase] = useState<Phase>("greet");

  const { data: holder } = useReadContract({
    address: FIRE_CONTRACT,
    abi: FIRE_ABI,
    functionName: "holderStatus",
    args: [address],
    query: { enabled: open },
  });

  const days = holder ? Number(holder.streakDays_) : 0;
  const mult = holder ? Number(holder.tierMultX100) / 100 : 1;
  const balance = holder?.balance ?? BigInt(0);
  const breakBelow = holder?.breakBelowBalance ?? BigInt(0);
  const peak = holder?.peak ?? BigInt(0);
  const holds = balance > BigInt(0);

  // Same "within 20% of the break line" rule the dashboard's streak card uses,
  // so the two surfaces can never disagree about who is in danger.
  const inDanger =
    holds && peak > BigInt(0) && balance < (breakBelow * BigInt(120)) / BigInt(100);

  const progress = useMemo(() => rankProgress(days), [days]);

  // Someone who already claimed today re-opens straight into the end state —
  // no fake second reveal, just their standing.
  useEffect(() => {
    if (!open) return;
    if (status?.checkedInToday) setPhase("done");
    else setPhase("greet");
  }, [open, status?.checkedInToday]);

  useEffect(() => {
    if (open) preloadEmber(["wake", "happy"]);
  }, [open]);

  // Escape to close, and hold the page still behind the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const onCheckIn = useCallback(() => {
    setPhase("waking"); // optimistic — the write reconciles underneath
    void checkIn();
  }, [checkIn]);

  const emberState: EmberState = inDanger
    ? "worried"
    : phase === "greet"
      ? "sleeping"
      : phase === "waking"
        ? "wake"
        : "happy";

  // Rolls as soon as the chain read lands, not on the check-in tap — gating it
  // on the tap left the modal showing "you are on day 0" to someone on day 107
  // for as long as they looked at it before pressing anything.
  const revealing = holder !== undefined;
  const shownDays = Math.round(useCountUp(days, revealing, 1100));
  const shownPct = useCountUp(progress.pct, revealing, 1100);

  if (!open) return null;

  return (
    <div
      className="fv-page fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(6,5,3,0.86)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Daily check-in"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] my-auto rounded-[24px] border border-[var(--fv-line-strong)] bg-[var(--fv-bg)] p-5 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <p className={`${MONO} text-[10px] tracking-[0.22em] uppercase text-[var(--fv-green)]`}>
            Daily check-in
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`${MONO} text-sm text-[var(--fv-muted)] hover:text-[var(--fv-text)] px-1 leading-none`}
          >
            ✕
          </button>
        </div>

        <div className="flex justify-center mb-1">
          <Ember
            state={emberState}
            size={220}
            onEnded={() => phase === "waking" && setPhase("done")}
          />
        </div>

        {!holds ? (
          <NotHoldingYet onClose={onClose} />
        ) : (
          <>
            {/* ── the hero number: on-chain hold streak ── */}
            <div className="text-center mb-5">
              <p className={`${MONO} text-[10px] tracking-[0.2em] uppercase text-[var(--fv-faint)] mb-1`}>
                You are on day
              </p>
              <p className={`${MONO} text-[64px] leading-[0.95] font-medium tracking-[-0.03em]`}>
                {revealing ? shownDays : "—"}
              </p>
              <p className={`${MONO} text-[11px] text-[var(--fv-muted)] mt-1.5`}>
                {days === 1 ? "day" : "days"} holding · {mult.toFixed(2)}x multiplier
              </p>
            </div>

            {/* ── rank + what's next ── */}
            <div className="rounded-2xl border border-[var(--fv-line)] px-4 py-3.5 mb-3">
              <div className="flex items-center justify-between mb-2.5">
                <span
                  className={`${MONO} text-[10px] tracking-[0.16em] uppercase border rounded-full px-2.5 py-1 border-[var(--fv-green)] text-[var(--fv-green)]`}
                >
                  {progress.rank.label}
                </span>
                {progress.next && (
                  <span className={`${MONO} text-[10px] tracking-[0.16em] uppercase text-[var(--fv-faint)]`}>
                    next · {progress.next.label}
                  </span>
                )}
              </div>

              <div className="h-1.5 rounded-full bg-[var(--fv-surface-2)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[var(--fv-green)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${revealing ? shownPct : 0}%` }}
                  transition={{ duration: 0 }}
                />
              </div>

              <p className={`${MONO} text-[12px] mt-2.5 leading-relaxed`}>
                {progress.maxed ? (
                  <span className="text-[var(--fv-green)] font-medium">
                    Top rank. {days} days and still counting.
                  </span>
                ) : (
                  <>
                    <span className="text-[var(--fv-green)] font-medium">
                      {progress.daysToNext} {progress.daysToNext === 1 ? "day" : "days"}
                    </span>{" "}
                    <span className="text-[var(--fv-muted)]">
                      until {progress.next?.label}
                      {progress.next?.atDays === TIER.rampDays ? " · 5x + jackpot entry" : ""}
                    </span>
                  </>
                )}
              </p>
              <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-1.5`}>
                {progress.rank.blurb}
              </p>
            </div>

            {inDanger && (
              <p className={`${MONO} text-[11px] text-[var(--fv-red)] leading-relaxed mb-3 px-1`}>
                Ember is worried. Your balance is close to the break line — sell below{" "}
                {Number(breakBelow / BigInt(10) ** BigInt(18)).toLocaleString()} FIRE and the
                streak resets to zero.
              </p>
            )}

            {/* ── the cosmetic bit: visit streak ── */}
            <AnimatePresence>
              {phase === "done" && status && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.1 }}
                  className="flex items-center justify-between rounded-2xl border border-[var(--fv-line)] bg-[var(--fv-surface)] px-4 py-3 mb-4"
                >
                  <div>
                    <p className={`${MONO} text-[10px] tracking-[0.18em] uppercase text-[var(--fv-faint)]`}>
                      Check-in streak
                    </p>
                    <p className={`${MONO} text-[20px] font-medium mt-0.5`}>
                      {status.visitStreak} {status.visitStreak === 1 ? "day" : "days"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`${MONO} text-[10px] text-[var(--fv-faint)]`}>
                      best {status.longestStreak}
                    </p>
                    <p className={`${MONO} text-[10px] text-[var(--fv-faint)] mt-0.5`}>
                      {status.totalCheckins} total
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── actions ── */}
            {phase === "greet" ? (
              <button onClick={onCheckIn} className={`fv-btn w-full py-3.5 text-[15px] ${MONO}`}>
                Check in
              </button>
            ) : (
              <div className="space-y-2.5">
                <Link
                  href={`/streak/${address}`}
                  className={`fv-btn w-full py-3.5 text-[15px] ${MONO}`}
                >
                  Share this ↗
                </Link>
                <div className="flex gap-2.5">
                  <Link
                    href="/dashboard"
                    className={`${MONO} flex-1 text-center text-[13px] rounded-full px-4 py-2.5 no-underline border border-[var(--fv-line-strong)] text-[var(--fv-text)] hover:border-[var(--fv-green)] hover:text-[var(--fv-green)] transition-colors`}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={onClose}
                    className={`${MONO} flex-1 text-[13px] rounded-full px-4 py-2.5 border border-[var(--fv-line-strong)] hover:border-[var(--fv-green)] hover:text-[var(--fv-green)] transition-colors`}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            <p className={`${MONO} text-[10px] text-[var(--fv-faint)] text-center mt-3.5 leading-relaxed`}>
              Checking in is for the streak badge only.{" "}
              <span className={SERIF}>Your dividends never depend on it.</span>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}

/** Connected, but holds nothing — no fake streak, just the way in. */
function NotHoldingYet({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center">
      <p className={`${MONO} text-[10px] tracking-[0.2em] uppercase text-[var(--fv-faint)] mb-2 mt-2`}>
        Day zero
      </p>
      <p className="text-[15px] text-[var(--fv-muted)] leading-relaxed mb-5 px-2">
        Ember doesn&apos;t have anything to count yet. The streak starts on your first
        buy — and the multiplier climbs to 5x over {TIER.rampDays} days.
      </p>
      <Link href="/swap" className={`fv-btn w-full py-3.5 text-[15px] ${MONO}`}>
        Buy $FIRE
      </Link>
      <button
        onClick={onClose}
        className={`${MONO} w-full text-[13px] text-[var(--fv-muted)] hover:text-[var(--fv-text)] mt-3 py-2`}
      >
        Not now
      </button>
    </div>
  );
}
