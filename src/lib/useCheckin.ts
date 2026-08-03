"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Client state for the daily check-in (the cosmetic visit streak).
 *
 * Talks to /api/checkin, and falls back to localStorage when the database
 * isn't reachable — locally there is no DATABASE_URL, and in production a
 * database blip should never be the reason somebody can't check in. The
 * fallback is per-device rather than per-wallet-everywhere, which is the
 * honest trade: a cosmetic counter that always works beats one that 503s.
 */

export type CheckinStatus = {
  checkedInToday: boolean;
  visitStreak: number;
  longestStreak: number;
  totalCheckins: number;
  lastCheckin: string | null;
  recent: string[];
  /** Where this came from — "local" means it won't follow the user to another device. */
  source: "db" | "local";
};

export function utcDay(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function daysBetween(aIso: string, bIso: string): number {
  return Math.round(
    (Date.parse(aIso + "T00:00:00Z") - Date.parse(bIso + "T00:00:00Z")) / 86_400_000
  );
}

const localKey = (address: string) => `fire_checkin_days_${address.toLowerCase()}`;
const seenKey = (address: string) => `fire_checkin_seen_${address.toLowerCase()}`;

function readLocalDays(address: string): string[] {
  try {
    const raw = localStorage.getItem(localKey(address));
    const days: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(days) ? (days as string[]).slice(0, 400) : [];
  } catch {
    return [];
  }
}

/** Same streak rules as the server — yesterday still counts as alive. */
function statusFromDays(days: string[], source: CheckinStatus["source"]): CheckinStatus {
  const today = utcDay();
  let visitStreak = 0;
  if (days.length > 0 && daysBetween(today, days[0]) <= 1) {
    visitStreak = 1;
    for (let i = 1; i < days.length; i++) {
      if (daysBetween(days[i - 1], days[i]) === 1) visitStreak++;
      else break;
    }
  }

  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    if (i === 0 || daysBetween(days[i - 1], days[i]) === 1) run++;
    else run = 1;
    if (run > longestStreak) longestStreak = run;
  }

  return {
    checkedInToday: days[0] === today,
    visitStreak,
    longestStreak: Math.max(longestStreak, visitStreak),
    totalCheckins: days.length,
    lastCheckin: days[0] ?? null,
    recent: days.slice(0, 30),
    source,
  };
}

export function useCheckin(address: string | undefined) {
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!address) {
      setStatus(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    fetch(`/api/checkin?address=${address.toLowerCase()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!cancelled) setStatus({ ...d, source: "db" as const });
      })
      .catch(() => {
        if (!cancelled) setStatus(statusFromDays(readLocalDays(address), "local"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  const checkIn = useCallback(async (): Promise<CheckinStatus | null> => {
    if (!address) return null;
    setSaving(true);

    // Optimistic: the animation starts the instant it's tapped. The write is
    // idempotent per UTC day, so reconciling with the server can only correct
    // the counter, never double it.
    const optimistic = statusFromDays(
      Array.from(new Set([utcDay(), ...readLocalDays(address)])).sort().reverse(),
      status?.source ?? "local"
    );
    setStatus(optimistic);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: address.toLowerCase() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const d = await res.json();
      const next = { ...d, source: "db" as const };
      setStatus(next);
      return next;
    } catch {
      // Database unavailable — persist locally so the streak still advances.
      const days = Array.from(new Set([utcDay(), ...readLocalDays(address)]))
        .sort()
        .reverse();
      try {
        localStorage.setItem(localKey(address), JSON.stringify(days.slice(0, 400)));
      } catch {
        /* storage full or blocked — the in-memory status still stands for this session */
      }
      const next = statusFromDays(days, "local");
      setStatus(next);
      return next;
    } finally {
      setSaving(false);
    }
  }, [address, status?.source]);

  return { status, loading, saving, checkIn };
}

/**
 * Has this wallet been shown the check-in yet today? Drives the auto-popup, and
 * is deliberately separate from whether they actually checked in — dismissing
 * the modal shouldn't make it reappear on every navigation.
 */
export function shouldAutoOpen(address: string | undefined): boolean {
  if (!address || typeof window === "undefined") return false;
  try {
    return localStorage.getItem(seenKey(address)) !== utcDay();
  } catch {
    return false;
  }
}

export function markAutoOpened(address: string | undefined) {
  if (!address || typeof window === "undefined") return;
  try {
    localStorage.setItem(seenKey(address), utcDay());
  } catch {
    /* ignore */
  }
}
