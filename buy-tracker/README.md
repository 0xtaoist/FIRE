# FIRE Cumulative Buy Competition Tracker

Standalone Railway service that tracks **cumulative FIRE bought per address**
over a 2-week window. **Any sell disqualifies the address entirely** — they're
removed from the leaderboard for the rest of the competition.

Buy + sell detection works through:
- Direct EOA → pair swaps
- Any router/aggregator (GMGN, 1inch, OKX, etc) — extracted via `tx.from`
- ERC-4337 smart-account flows (FOMO etc) via `UserOperationEvent.sender`

## Deploy on Railway (same repo as `fire-launchpad`)

1. Railway project → **+ New** → **GitHub Repo** → select this repo
2. Open the new service → **Settings**:
   - **Root Directory**: `/buy-tracker`
   - **Start command**: `npm start` (default)
   - **Variables**:
     ```
     TOKEN_ADDRESS=0xa7E1E8Ab7B7c93F9e3CeB10724843a4b74f5308C
     PAIR_ADDRESS=0x4Fe3941B13AC5942E4FEa0D0a1B10E31A92E7c9A
     START_BLOCK=46778550
     COMPETITION_END_BLOCK=0          # 0 = auto-calc 2 weeks from START_BLOCK
     BASE_RPC_URL=https://mainnet.base.org
     BASE_WS_RPC_URL=wss://base-mainnet.g.alchemy.com/v2/<key>  # required for reliable live tracking
     TRACKER_PORT=3001

     # ── Showdown (king-of-the-hill countdown, the "new season") ──
     SHOWDOWN_START=2026-06-15T05:00:00Z   # Mon 12:00 AM EST; unix-seconds also OK. empty = disabled
     SHOWDOWN_RESET_SECONDS=60             # clock resets to this on every new lead
     SHOWDOWN_MIN_PCT=5                    # a new lead must beat current by this %...
     SHOWDOWN_MIN_ABS_USD=200              # ...OR this many $ (whichever is easier)
     SHOWDOWN_MIN_FIRST_USD=0              # floor for the very first bid (0 = any buy)
     SHOWDOWN_HOLD_WEEKS=4                 # winner must hold this long (display only)
     ```
   - **Volume** mounted at `/data` — leaderboard survives redeploys.
3. After the service is up, set on `fire-launchpad`:
   ```
   BUY_TRACKER_URL=http://${{buy-tracker.RAILWAY_PRIVATE_DOMAIN}}:${{buy-tracker.PORT}}
   ```

## Competition rules

- Window: 604,800 Base blocks ≈ **2 weeks** from `START_BLOCK`
- Metric: **total FIRE bought** during the window
- **One sell → disqualified for the rest of the competition** (no re-entry)
- Stop service to lock in the leaderboard, or set `COMPETITION_END_BLOCK`

## API

| Endpoint                       | Description                                  |
|--------------------------------|----------------------------------------------|
| `GET /leaderboard`             | Top 100 active buyers (disqualified excluded) |
| `GET /leaderboard/:address`    | Single address — includes disqualified state |
| `GET /showdown`                | King-of-the-hill countdown: phase, current leader, clock, podium, takeover history |
| `GET /stats`                   | Active buyers, disqualified count, total FIRE bought |

## Showdown (last-buy-wins countdown)

When `SHOWDOWN_START` passes, a sudden-death contest opens alongside the
cumulative tracker, sharing the same on-chain buy stream:

- A `SHOWDOWN_RESET_SECONDS` clock starts. The **first** buy after the bell
  takes the throne; **every** buy that takes the lead resets the clock.
- A new lead must beat the current one by `SHOWDOWN_MIN_PCT`% **or**
  `SHOWDOWN_MIN_ABS_USD` (whichever is easier to clear), priced in USD.
- The clock is driven by **block timestamps**, so the winner is deterministic
  and verifiable from chain data alone — a buy whose block timestamp lands
  after the deadline cannot steal the lead.
- The last wallet leading when the clock hits 0 wins. `GET /showdown` exposes
  the live `phase` (`scheduled` → `awaiting` → `live` → `ended`/`void`),
  `currentLeader`, `countdownEndsAt`, `nextThresholdUsd`, `podium`, and the
  full takeover `leadHistory`.

The service keeps its live listener running past the cumulative `END_BLOCK`
while the Showdown is active, and shuts the listener down once both contests
are over.

## Local

```bash
cp .env.example .env   # fill in addresses + START_BLOCK + WSS URL
npm install
npm start
```
