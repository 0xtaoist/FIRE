"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const links = [
  { href: "/", label: "Feed" },
  { href: "/launch", label: "Launch" },
  { href: "/profile", label: "Profile" },
  { href: "/dashboard", label: "Creator Dashboard" },
] as const;

export function Nav() {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-secondary)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--accent-primary)",
          }}
        >
          PROVE
        </Link>

        <div style={{ display: "flex", gap: 20 }}>
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-secondary)")
              }
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <WalletMultiButton />
    </nav>
  );
}
