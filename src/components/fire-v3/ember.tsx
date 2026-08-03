"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Ember — the $FIRE mascot.
 *
 * Source art is 1280² 24fps renders (masters in brand/ember/); the clips served
 * here are 640² h264 cuts, ~590KB for the whole set. Each state is a separate
 * short file rather than one sprite sheet so a state change is a src swap and
 * the browser only ever fetches what it shows.
 *
 * The clips are scenes, not cut-outs — Ember sits on a desk in a warm dark room,
 * which lands close enough to --fv-bg that a rounded panel + vignette reads as a
 * window into her world rather than a video pasted onto the page.
 */

export type EmberState =
  /** calm, eyes closed — ambient, used once the day is already claimed */
  | "idle"
  /** flopped asleep on a phone — waiting to be checked in on */
  | "sleeping"
  /** gets up off the phone — plays once, on the check-in tap */
  | "wake"
  /** lit up and grinning — plays into a loop on success */
  | "happy"
  /** dimmed and sagging, red chart behind — the streak is near its break line */
  | "worried"
  /** at a rainy window — after a broken streak */
  | "rain";

/** Which states are ambient loops vs. one-shot transitions. */
const LOOPING: Record<EmberState, boolean> = {
  idle: true,
  sleeping: true,
  wake: false,
  happy: false,
  worried: true,
  rain: true,
};

const SRC = (state: EmberState) => `/ember/${state}.mp4`;
const POSTER = (state: EmberState) => `/ember/${state}.jpg`;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Subscribed rather than read into state in an effect — no cascading render,
 *  and it renders correctly on the very first paint instead of one frame late. */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false // server render: assume motion is fine, the client corrects it
  );
}

export function Ember({
  state,
  size = 260,
  onEnded,
  className = "",
}: {
  state: EmberState;
  size?: number;
  /** Fires when a one-shot clip finishes — chain wake → happy with this. */
  onEnded?: () => void;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();

  // Autoplay is allowed for muted inline video, but a rejected play() promise
  // (backgrounded tab, low-power mode) must not throw into React.
  useEffect(() => {
    if (reducedMotion) return;
    videoRef.current?.play().catch(() => {});
  }, [state, reducedMotion]);

  // Reduced motion: hold the poster frame. Ember is still there, just still.
  if (reducedMotion) {
    return (
      <div
        className={`relative overflow-hidden rounded-[20px] ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={POSTER(state)} alt="Ember" width={size} height={size} className="w-full h-full object-cover" />
        <EmberVignette />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[20px] ${className}`}
      style={{ width: size, height: size }}
    >
      <video
        // Remount on state change so the new source actually loads and starts
        // from frame 0 — assigning src alone leaves the old frame on screen.
        key={state}
        ref={videoRef}
        src={SRC(state)}
        poster={POSTER(state)}
        width={size}
        height={size}
        muted
        playsInline
        autoPlay
        loop={LOOPING[state]}
        preload="auto"
        onEnded={onEnded}
        className="w-full h-full object-cover"
      />
      <EmberVignette />
    </div>
  );
}

/** Feathers the clip's edges into the panel so it doesn't read as a video box. */
function EmberVignette() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        boxShadow: "inset 0 0 40px 12px var(--fv-bg, #110e08)",
        borderRadius: 20,
      }}
    />
  );
}

/**
 * Warms the clips a check-in is about to need. Called when the modal mounts so
 * the wake → happy hand-off doesn't stall on a cold fetch mid-animation.
 */
export function preloadEmber(states: EmberState[]) {
  if (typeof document === "undefined") return;
  for (const s of states) {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "video";
    link.href = SRC(s);
    document.head.appendChild(link);
  }
}
