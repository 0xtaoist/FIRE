# Archive — DO NOT DEPLOY

This directory contains deprecated Anchor programs that are **no longer part of
the active protocol**. They are kept for historical reference only.

## prove-amm

Replaced by Raydium CLMM pools. All AMM functionality is now handled by the
Raydium SDK (off-chain) and the `fee-router` program (on-chain fee custody).

## ticker-registry

Ticker uniqueness is now enforced **off-chain** by a unique index in the
PostgreSQL `TickerEntry` table. The on-chain registry was unnecessary overhead.

---

**Do not re-add these to `Cargo.toml` workspace members.
Do not import or CPI into these programs from active code.**
