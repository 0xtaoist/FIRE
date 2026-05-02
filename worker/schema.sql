-- Reward claim events, scanned once and never recomputed.
CREATE TABLE IF NOT EXISTS reward_claimed_events (
  tx_hash       TEXT       NOT NULL,
  log_index     INT        NOT NULL,
  block_number  BIGINT     NOT NULL,
  holder        TEXT       NOT NULL,
  amount_wei    NUMERIC    NOT NULL,
  PRIMARY KEY (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_events_holder ON reward_claimed_events (holder);
CREATE INDEX IF NOT EXISTS idx_events_block  ON reward_claimed_events (block_number);

-- Per-holder snapshot, refreshed each run.
CREATE TABLE IF NOT EXISTS holder_stats (
  address              TEXT        PRIMARY KEY,
  total_claimed_wei    NUMERIC     NOT NULL DEFAULT 0,
  pending_rewards_wei  NUMERIC     NOT NULL DEFAULT 0,
  current_balance_wei  NUMERIC     NOT NULL DEFAULT 0,
  hold_start_unix      BIGINT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Single-row table tracking event scan progress for incremental polling.
CREATE TABLE IF NOT EXISTS scan_state (
  id                    INT         PRIMARY KEY DEFAULT 1,
  last_block_processed  BIGINT      NOT NULL DEFAULT 0,
  last_run_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

INSERT INTO scan_state (id, last_block_processed)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
