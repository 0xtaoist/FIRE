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
| `GET /stats`                   | Active buyers, disqualified count, total FIRE bought |

## Local

```bash
cp .env.example .env   # fill in addresses + START_BLOCK + WSS URL
npm install
npm start
```
