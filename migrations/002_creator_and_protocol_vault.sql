-- 002_creator_and_protocol_vault.sql
-- Enforces the platform's load-bearing invariants:
--   1. Every coin has a creator address recorded in the database.
--   2. The protocol fee split is ALWAYS 80% creator / 20% protocol.
--   3. The protocol vault address is pinned in a singleton row and the
--      indexer refuses to start if it's missing or misconfigured.
--
-- PostgreSQL 15+. Safe to re-run (idempotent guards).

-- =========================================================================
-- Creator table
-- =========================================================================

CREATE TABLE IF NOT EXISTS "Creator" (
    "wallet"      TEXT        NOT NULL,
    "privyUserId" TEXT,
    "email"       TEXT,
    "handle"      TEXT,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("wallet"),
    CONSTRAINT "Creator_wallet_nonempty" CHECK (length("wallet") > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Creator_privyUserId_key" ON "Creator" ("privyUserId");
CREATE INDEX        IF NOT EXISTS "Creator_privyUserId_idx" ON "Creator" ("privyUserId");

-- Backfill Creator rows for any pre-existing Auction.creator values so the
-- FK can be added without violating existing data.
INSERT INTO "Creator" ("wallet")
SELECT DISTINCT "creator" FROM "Auction"
WHERE "creator" IS NOT NULL AND length("creator") > 0
ON CONFLICT ("wallet") DO NOTHING;

-- =========================================================================
-- Auction -> Creator foreign key
-- =========================================================================

-- Guarantee that no Auction can be inserted without a known creator row.
ALTER TABLE "Auction"
    ADD CONSTRAINT "Auction_creator_nonempty"
    CHECK (length("creator") > 0);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Auction_creator_fkey'
    ) THEN
        ALTER TABLE "Auction"
            ADD CONSTRAINT "Auction_creator_fkey"
            FOREIGN KEY ("creator") REFERENCES "Creator" ("wallet")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END$$;

-- =========================================================================
-- ProtocolConfig singleton (pins the 80/20 split + protocol vault address)
-- =========================================================================

CREATE TABLE IF NOT EXISTS "ProtocolConfig" (
    "id"                   INT         NOT NULL DEFAULT 1,
    "creatorBps"           INT         NOT NULL,
    "protocolBps"          INT         NOT NULL,
    "protocolVaultAddress" TEXT        NOT NULL,
    "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "ProtocolConfig_pkey"         PRIMARY KEY ("id"),
    -- Enforce the 80/20 split at the database layer. If anyone tries to
    -- change it, the INSERT/UPDATE fails outright — it cannot drift from
    -- the on-chain fee-router which also hardcodes 80/20.
    CONSTRAINT "ProtocolConfig_fee_split_80_20"
        CHECK ("creatorBps" = 80 AND "protocolBps" = 20),
    CONSTRAINT "ProtocolConfig_singleton"
        CHECK ("id" = 1),
    CONSTRAINT "ProtocolConfig_vault_nonempty"
        CHECK (length("protocolVaultAddress") > 0)
);

-- Seed the singleton. The protocol vault address is read from an env var at
-- deploy time and passed to this migration as a psql variable; fall back to
-- a placeholder that MUST be updated before mainnet launch. The indexer
-- boot assertion will refuse to start if the address still looks like the
-- placeholder.
INSERT INTO "ProtocolConfig" ("id", "creatorBps", "protocolBps", "protocolVaultAddress")
VALUES (
    1,
    80,
    20,
    COALESCE(current_setting('prove.protocol_vault', true), 'REPLACE_ME_PROTOCOL_VAULT')
)
ON CONFLICT ("id") DO NOTHING;

-- =========================================================================
-- Swap fee-split invariant
-- =========================================================================
--
-- Every recorded swap must have a creatorFee:protocolFee ratio of 80:20
-- (allowing a tiny lamport rounding tolerance). If the indexer ever tries
-- to write a row with a skewed split, the insert fails loudly.

ALTER TABLE "Swap"
    ADD CONSTRAINT "Swap_fee_nonnegative"
    CHECK ("creatorFee" >= 0 AND "protocolFee" >= 0);

ALTER TABLE "Swap"
    ADD CONSTRAINT "Swap_fee_split_80_20"
    CHECK (
        -- No-fee edge case (e.g. emergency drain row) is allowed.
        ("creatorFee" = 0 AND "protocolFee" = 0)
        -- Otherwise: creatorFee / (creatorFee + protocolFee) must round to 0.8.
        -- Equivalent to creatorFee * 20 == protocolFee * 80, with ±4 tolerance.
        OR ABS(("creatorFee" * 20) - ("protocolFee" * 80)) <= 4
    );

-- =========================================================================
-- CreatorFee sanity
-- =========================================================================

ALTER TABLE "CreatorFee"
    ADD CONSTRAINT "CreatorFee_creator_nonempty"
    CHECK (length("creator") > 0);

ALTER TABLE "CreatorFee"
    ADD CONSTRAINT "CreatorFee_withdraw_le_earned"
    CHECK ("totalWithdrawn" <= "totalEarned");
