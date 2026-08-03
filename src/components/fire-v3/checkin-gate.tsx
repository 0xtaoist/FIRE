"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { CheckInModal } from "./checkin-modal";
import { shouldAutoOpen, markAutoOpened, useCheckin } from "@/lib/useCheckin";

const OPEN_EVENT = "fire:checkin";

/**
 * Dispatches the check-in modal from anywhere — nav chips, dashboard buttons,
 * pages that live outside the wallet Providers tree. A window event rather than
 * context because NavShell renders on both sides of that boundary; a context
 * consumer outside the provider would need a no-op default anyway, and this
 * can't throw.
 */
export function openCheckIn() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * Mounted once inside Providers, so every wallet-connected surface (/swap,
 * /dashboard, /jackpot) gets the check-in without each page wiring it up.
 *
 * Auto-opens at most once per UTC day per wallet. Dismissing counts as seen —
 * a modal that reappears on every navigation stops being a treat.
 */
export function CheckInGate() {
  const { ready, authenticated } = usePrivy();
  const { address } = useAccount();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!ready || !authenticated || !address) return;
    if (!shouldAutoOpen(address)) return;
    // Let the Privy connect sheet finish dismissing before this slides in —
    // two modals crossing on screen reads as a glitch.
    const t = setTimeout(() => {
      setOpen(true);
      markAutoOpened(address);
    }, 900);
    return () => clearTimeout(t);
  }, [ready, authenticated, address]);

  if (!address) return null;

  return (
    <>
      {!open && <EmberChip address={address} onOpen={() => setOpen(true)} />}
      <CheckInModal open={open} onClose={() => setOpen(false)} address={address} />
    </>
  );
}

/**
 * Ember, always on screen — the way back into the check-in after the modal has
 * been dismissed for the day. Shows the check-in streak once there is one, and
 * pulses while today is still unclaimed.
 *
 * Uses the poster still rather than a <video>: at 52px the animation is
 * invisible anyway, and a looping video parked in the corner of every page is a
 * battery cost for nothing.
 */
function EmberChip({ address, onOpen }: { address: `0x${string}`; onOpen: () => void }) {
  const { status } = useCheckin(address);
  const claimed = status?.checkedInToday ?? false;

  return (
    <button
      onClick={onOpen}
      aria-label="Daily check-in"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full border border-[var(--fv-line-strong)] bg-[rgba(17,14,8,0.92)] backdrop-blur-xl pl-1.5 pr-4 py-1.5 cursor-pointer transition-colors hover:border-[var(--fv-green)]"
    >
      <span className="relative flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={claimed ? "/ember/happy.jpg" : "/ember/sleeping.jpg"}
          alt=""
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover"
        />
        {!claimed && (
          <span className="absolute inset-0 rounded-full border-2 border-[var(--fv-green)] animate-ping opacity-60" />
        )}
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="fv-num text-[13px] font-medium text-[var(--fv-text)]">
          {status && status.visitStreak > 0 ? `${status.visitStreak}d` : "Check in"}
        </span>
        <span className="fv-num text-[8px] tracking-[0.18em] uppercase text-[var(--fv-faint)] mt-[3px]">
          {claimed ? "Claimed" : "Tap Ember"}
        </span>
      </span>
    </button>
  );
}
