# PROVE Protocol

Token launch platform with batch auctions, creator staking, and fee routing on Solana.

## Architecture

```
programs/
  batch-auction/   Solana program — 5-min batch auctions, commit/claim/refund lifecycle
  fee-router/      Solana program — Raydium CLMM LP NFT custody, 80/20 fee split
  stake-manager/   Solana program — 2 SOL creator stake, 72h milestone evaluation

services/
  indexer/         Event listener, feed API, fee collection crank, swap indexer
  quest-verifier/  Quest completion verification loop (holders, hold time, X posts)

app/               Next.js frontend (Privy auth, Wallet Adapter, Tailwind)
packages/common/   Shared TypeScript utilities (address validation, BigInt serialization)
scripts/           Deployment, DB seed, Raydium pool creation helpers
```

See `docs/PR2_HANDOFF.md` for the full protocol design and security model.

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example .env

# Generate Prisma client
pnpm db:generate

# Run in development
pnpm dev:app       # Next.js frontend on :3000
pnpm dev:indexer   # Indexer API on :4000
pnpm dev:quest     # Quest verifier on :4001
```

## Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `SOLANA_RPC_URL` | Solana RPC endpoint |
| `DATABASE_URL` | PostgreSQL connection string |
| `BATCH_AUCTION_PROGRAM_ID` | Deployed program ID (set by `scripts/deploy-devnet.sh`) |
| `FEE_ROUTER_PROGRAM_ID` | Deployed program ID |
| `STAKE_MANAGER_PROGRAM_ID` | Deployed program ID |
| `PROTOCOL_VAULT_ADDRESS` | Protocol treasury wallet (receives 20% fee share) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID for auth |
| `PRIVY_APP_SECRET` | Privy server secret (indexer only) |
| `APP_ORIGIN` | CORS allowed origin for API services |

See `.env.example` for the full list.

## Deployment

Services are deployed to **Railway** (nixpacks). Each service has its own
`railway.toml` with build/start commands. The database is PostgreSQL provisioned
via the Railway dashboard.

Solana programs are deployed via `scripts/deploy-devnet.sh` using the Anchor CLI.

## On-Chain Programs

All three programs are built with Anchor 0.30.1. Key design decisions:

- **Rent-floor protection**: `transfer_lamports_with_floor()` prevents PDAs from
  going below rent-exempt minimum during refund waves
- **Two-step authority rotation**: `propose_authority` → `accept_authority` pattern
  prevents accidental lockout
- **Emergency pause**: Global kill switch that blocks commits and unlocks refunds
- **Checked arithmetic**: All math uses `checked_*` methods; release profile enables
  `overflow-checks = true`

## Archive

`archive/` contains deprecated programs (`prove-amm`, `ticker-registry`) kept
for reference only. **Do not deploy or import them.**
