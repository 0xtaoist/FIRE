# FIRE Reward Worker

Hourly Railway cron service. Snapshots cumulative reward data per holder
into Postgres so the dashboard can compute the 30-day projection from
**all-time earnings** (claimed + pending) instead of just `pending` (which
resets to 0 after every claim).

## Tables

- `reward_claimed_events` — every `RewardClaimed` log, written incrementally
- `holder_stats` — current snapshot per holder (total claimed, pending, balance, hold start)
- `scan_state` — single row tracking the last block scanned

## Env

| Var | Source |
|---|---|
| `TOKEN_ADDRESS` | `0xa7E1E8Ab7B7c93F9e3CeB10724843a4b74f5308C` |
| `DATABASE_URL` | injected by Railway when this service is connected to Postgres |
| `BASE_RPC_URL` | optional; defaults to `https://base.publicnode.com` |

## Deploy on Railway

This is a separate service from `fire-launchpad`, deployed from the same
repo with **Root Directory** = `/worker`.

1. Railway → project → **+ New** → **Database** → **PostgreSQL**
2. Railway → project → **+ New** → **GitHub Repo** → select this repo →
   open the new service settings:
   - **Root Directory**: `/worker`
   - **Service variables**:
     - `TOKEN_ADDRESS=0xa7E1E8Ab7B7c93F9e3CeB10724843a4b74f5308C`
     - `DATABASE_URL=${{Postgres.DATABASE_URL}}` (uses Railway reference)
   - **Cron schedule** (Settings → Cron Schedule): `0 * * * *`

Also add `DATABASE_URL=${{Postgres.DATABASE_URL}}` to the existing
`fire-launchpad` service so the Next.js API can read from Postgres.

## Local

```bash
cp .env.example .env  # fill in TOKEN_ADDRESS + DATABASE_URL
npm install
npm start             # one-shot
npm run watch         # hourly loop
```
