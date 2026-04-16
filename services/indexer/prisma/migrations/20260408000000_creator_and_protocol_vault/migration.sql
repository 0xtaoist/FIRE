-- 002_creator_and_protocol_vault — Prisma migration mirror of
-- migrations/002_creator_and_protocol_vault.sql. Enforces:
--   * Creator table with FK from Auction.creator
--   * ProtocolConfig singleton with CHECK constraint pinning the 80/20 split
--   * Swap fee-split CHECK constraint
--   * CreatorFee sanity constraints

-- ── Creator ────────────────────────────────────────────────────────────
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

-- Backfill existing auctions.
INSERT INTO "Creator" ("wallet")
SELECT DISTINCT "creator" FROM "Auction"
WHERE "creator" IS NOT NULL AND length("creator") > 0
ON CONFLICT ("wallet") DO NOTHING;

-- ── Auction FK ─────────────────────────────────────────────────────────
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

-- ── ProtocolConfig singleton ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ProtocolConfig" (
    "id"                   INT         NOT NULL DEFAULT 1,
    "creatorBps"           INT         NOT NULL,
    "protocolBps"          INT         NOT NULL,
    "protocolVaultAddress" TEXT        NOT NULL,
    "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "ProtocolConfig_pkey"         PRIMARY KEY ("id"),
    CONSTRAINT "ProtocolConfig_fee_split_80_20"
        CHECK ("creatorBps" = 80 AND "protocolBps" = 20),
    CONSTRAINT "ProtocolConfig_singleton"
        CHECK ("id" = 1),
    CONSTRAINT "ProtocolConfig_vault_nonempty"
        CHECK (length("protocolVaultAddress") > 0)
);

INSERT INTO "ProtocolConfig" ("id", "creatorBps", "protocolBps", "protocolVaultAddress")
VALUES (1, 80, 20, COALESCE(current_setting('prove.protocol_vault', true), 'REPLACE_ME_PROTOCOL_VAULT'))
ON CONFLICT ("id") DO NOTHING;

-- ── Swap fee-split CHECK ──────────────────────────────────────────────
ALTER TABLE "Swap"
    ADD CONSTRAINT "Swap_fee_nonnegative"
    CHECK ("creatorFee" >= 0 AND "protocolFee" >= 0);

ALTER TABLE "Swap"
    ADD CONSTRAINT "Swap_fee_split_80_20"
    CHECK (
        ("creatorFee" = 0 AND "protocolFee" = 0)
        OR ABS(("creatorFee" * 20) - ("protocolFee" * 80)) <= 4
    );

-- ── CreatorFee sanity ─────────────────────────────────────────────────
ALTER TABLE "CreatorFee"
    ADD CONSTRAINT "CreatorFee_creator_nonempty"
    CHECK (length("creator") > 0);

ALTER TABLE "CreatorFee"
    ADD CONSTRAINT "CreatorFee_withdraw_le_earned"
    CHECK ("totalWithdrawn" <= "totalEarned");
