# FIRE Biggest-Buy Competition Tracker

Standalone Railway service that tracks the **top-N largest single buys** on FIRE
token (Base) starting from a configurable block, and exposes a JSON API the
frontend's `/biggest-buy` page consumes.

Detects buys through:
- Direct EOA → pair swaps
- Any contract recipient (router) → falls back to `tx.from`
- Explicit aggregator allowlist (`AGGREGATOR_ROUTERS`) — labelled in logs
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
     START_BLOCK=46772550
     COMPETITION_END_BLOCK=0
     LEADERBOARD_TOP_N=100
     BASE_RPC_URL=https://mainnet.base.org
     STATE_FILE=/data/buy_tracker_state.json
     AGGREGATOR_ROUTERS=0xFOMO_ROUTER,0xGMGN_ROUTER,0xTHIRD_AGGREGATOR
     ```
   - (Recommended) attach a **Volume** mounted at `/data` so the leaderboard
     survives redeploys.
3. After the service is up, copy its public domain (e.g.
   `https://fire-buy-tracker.up.railway.app`) and add it to
   `fire-launchpad` service variables as:
   ```
   BUY_TRACKER_URL=https://fire-buy-tracker.up.railway.app
   ```

## Ending the competition

Either:
- Set `COMPETITION_END_BLOCK` to a block ≥ the desired final block and redeploy
  (the live listener will stop processing past that block), **or**
- Just stop the Railway service when you want to lock in the leaderboard.

## API

| Endpoint                       | Description                          |
|--------------------------------|--------------------------------------|
| `GET /leaderboard`             | Top-N buyers (configurable, default 100) |
| `GET /leaderboard?limit=25`    | Capped at `LEADERBOARD_TOP_N`        |
| `GET /leaderboard/:address`    | Single buyer's biggest buy + rank    |
| `GET /stats`                   | Competition stats                    |
| `GET /health`                  | `{ ok, lastBlock, buyers }`          |

## Local

```bash
cp .env.example .env   # fill in addresses + START_BLOCK
npm install
npm start
```
