-- Reward claim events from any FIRE contract this project has launched.
CREATE TABLE IF NOT EXISTS reward_claimed_events (
  tx_hash       TEXT       NOT NULL,
  log_index     INT        NOT NULL,
  block_number  BIGINT     NOT NULL,
  contract      TEXT       NOT NULL DEFAULT '',
  holder        TEXT       NOT NULL,
  amount_wei    NUMERIC    NOT NULL,
  PRIMARY KEY (tx_hash, log_index)
);

ALTER TABLE reward_claimed_events ADD COLUMN IF NOT EXISTS contract TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_events_holder   ON reward_claimed_events (holder);
CREATE INDEX IF NOT EXISTS idx_events_block    ON reward_claimed_events (block_number);
CREATE INDEX IF NOT EXISTS idx_events_contract ON reward_claimed_events (contract);

-- Per-holder snapshot, refreshed each run.
-- total_claimed_wei is summed across ALL contracts (cumulative since first launch).
-- pending/balance/hold_start are from the PRIMARY (current) contract.
CREATE TABLE IF NOT EXISTS holder_stats (
  address              TEXT        PRIMARY KEY,
  total_claimed_wei    NUMERIC     NOT NULL DEFAULT 0,
  pending_rewards_wei  NUMERIC     NOT NULL DEFAULT 0,
  current_balance_wei  NUMERIC     NOT NULL DEFAULT 0,
  hold_start_unix      BIGINT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-contract scan progress for incremental polling.
CREATE TABLE IF NOT EXISTS contract_scan_state (
  contract              TEXT        PRIMARY KEY,
  last_block_processed  BIGINT      NOT NULL DEFAULT 0,
  last_run_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
