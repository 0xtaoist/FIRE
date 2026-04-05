"use client";

import { useEffect, useState } from "react";
import styles from "./ProveScoreRing.module.css";

interface ProveScoreRingProps {
  score: number;
  size?: number;
  label?: string;
}

function getColor(score: number): string {
  if (score < 25) return "var(--danger)";
  if (score < 50) return "var(--warning)";
  return "var(--success)";
}

export function ProveScoreRing({
  score,
  size = 120,
  label = "Prove Score",
}: ProveScoreRingProps) {
  const [mounted, setMounted] = useState(false);
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  useEffect(() => {
    setMounted(true);
  }, []);

  const fontSize = size >= 100 ? 32 : size >= 60 ? 20 : 14;

  return (
    <div className={styles.wrap}>
      <div className={styles.ring} style={{ width: size, height: size }}>
        <svg
          className={styles.svg}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            className={styles.trackCircle}
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
          <circle
            className={styles.progressCircle}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor(clamped)}
            strokeDasharray={circumference}
            strokeDashoffset={mounted ? offset : circumference}
          />
        </svg>
        <div className={styles.scoreLabel}>
          <span
            className={styles.scoreValue}
            style={{ fontSize, color: getColor(clamped) }}
          >
            {clamped}
          </span>
          {size >= 80 && (
            <span className={styles.scoreCaption}>{label}</span>
          )}
        </div>
      </div>
    </div>
  );
}
