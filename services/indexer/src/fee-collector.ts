/**
 * Fee collection crank.
 *
 * Every 15 minutes:
 *   1. Find all TRADING auctions with a pool id.
 *   2. For each pool: read pending SOL fees from the Meteora DLMM position.
 *   3. If fees exceed the threshold, claim them via the Meteora SDK.
 *   4. Transfer the SOL portion into the pool_fee_account PDA.
 *   5. Call `fee_router::claim_and_split` which enforces the 80/20
 *      split on-chain and sends SOL to creator + protocol treasury.
 *   6. Mirror the amounts into CreatorFee in the indexer DB.
 *
 * Only SOL fees are routed. Token-side fees accrue in the crank's ATA
 * and are logged for manual sweep.
 *
 * Crank key: CRANK_KEYPAIR_JSON or ANCHOR_WALLET.
 * Fee router program id: FEE_ROUTER_PROGRAM_ID.
 * Protocol vault: read from ProtocolConfig (pinned by assertProtocolConfig).
 */

import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import BN from "bn.js";
import { prisma } from "./db";
import { getProtocolVaultAddress, splitFee } from "./protocol-config";
import {
  getPositionFees,
  claimPositionFees,
  type MeteoraContext,
} from "./meteora-client";

const CLAIM_THRESHOLD_LAMPORTS = 10_000_000; // 0.01 SOL min to claim
const CLAIM_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export function startFeeCollector(): NodeJS.Timeout {
  console.log("[fee-collector] Starting fee collection loop (every 15m)");
  void collectFees();
  return setInterval(() => void collectFees(), CLAIM_INTERVAL_MS);
}

async function collectFees(): Promise<void> {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) {
    console.error("[fee-collector] SOLANA_RPC_URL not set — skipping cycle");
    return;
  }
  const feeRouterId = process.env.FEE_ROUTER_PROGRAM_ID;
  if (!feeRouterId) {
    console.error(
      "[fee-collector] FEE_ROUTER_PROGRAM_ID not set — skipping cycle",
    );
    return;
  }

  let crank: Keypair;
  try {
    crank = loadCrankKeypair();
  } catch (err) {
    console.error("[fee-collector] Cannot load crank keypair:", err);
    return;
  }

  const feeRouterProgramId = new PublicKey(feeRouterId);
  const connection = new Connection(rpcUrl, "confirmed");
  const ctx: MeteoraContext = { connection, crank };

  const pools = await prisma.auction.findMany({
    where: { state: "TRADING", raydiumPoolId: { not: null } },
  });
  console.log(
    `[fee-collector] Checking ${pools.length} pools for claimable fees`,
  );

  const protocolVault = await getProtocolVaultAddress();

  for (const pool of pools) {
    try {
      await collectFeesForPool(
        pool.mint,
        pool.raydiumPoolId!,
        pool.creator,
        pool.ticker,
        protocolVault,
        ctx,
        connection,
        crank,
        feeRouterProgramId,
      );
    } catch (err) {
      console.error(
        `[fee-collector] Error collecting fees for ${pool.ticker}:`,
        err,
      );
    }
  }
}

async function collectFeesForPool(
  mint: string,
  poolId: string,
  creator: string,
  ticker: string,
  protocolVault: string,
  ctx: MeteoraContext,
  connection: Connection,
  crank: Keypair,
  feeRouterProgramId: PublicKey,
): Promise<void> {
  const poolAddress = new PublicKey(poolId);

  // We need the position address. For now, query the DLMM pool for the
  // crank's position. The position address was stored during graduation
  // but the DB schema doesn't have a separate field for it — it's encoded
  // in the on-chain PoolFeeAccount. Read it from there.
  //
  // Simplified approach: load the pool and find crank's positions.
  const DLMM = (await import("@meteora-ag/dlmm")).default;
  let dlmmPool;
  try {
    dlmmPool = await DLMM.create(connection, poolAddress);
  } catch (err) {
    console.log(
      `[fee-collector] ${ticker}: could not load pool ${poolId} — skipping`,
    );
    return;
  }

  // Get all positions owned by the crank in this pool
  const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(
    crank.publicKey,
  );

  if (!userPositions || userPositions.length === 0) {
    console.log(
      `[fee-collector] ${ticker}: crank has no positions in ${poolId}`,
    );
    return;
  }

  // Use the first position (we only create one per pool)
  const position = userPositions[0];
  const feeSOL = position.positionData.feeY; // Y = WSOL in our pools
  const feeToken = position.positionData.feeX; // X = auctioned token

  if (feeSOL.lt(new BN(CLAIM_THRESHOLD_LAMPORTS))) {
    console.log(
      `[fee-collector] ${ticker}: pending SOL fees ${feeSOL.toString()} below threshold (${CLAIM_THRESHOLD_LAMPORTS}) — skipping`,
    );
    return;
  }

  console.log(
    `[fee-collector] ${ticker}: claiming ${feeSOL.toString()} lamports (SOL) + ${feeToken.toString()} tokens from ${poolId}`,
  );

  // 1. Claim fees via Meteora SDK
  const claimTxIds = await claimPositionFees(ctx, poolAddress, position);
  console.log(
    `[fee-collector] ${ticker}: Meteora claim tx(s) ${claimTxIds.join(", ")}`,
  );

  // 2. Transfer the SOL portion to the pool_fee_account PDA so
  //    claim_and_split can split it on-chain.
  const [poolFeePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_fee"), new PublicKey(mint).toBuffer()],
    feeRouterProgramId,
  );
  const [feeVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_vault")],
    feeRouterProgramId,
  );

  const transferIx = SystemProgram.transfer({
    fromPubkey: crank.publicKey,
    toPubkey: poolFeePda,
    lamports: BigInt(feeSOL.toString()),
  });

  // 3. Call fee_router::claim_and_split
  const claimIx = buildClaimAndSplitIx({
    feeRouterProgramId,
    crank: crank.publicKey,
    feeVault: feeVaultPda,
    poolFeeAccount: poolFeePda,
    creator: new PublicKey(creator),
    protocolTreasury: new PublicKey(protocolVault),
  });

  const tx = new Transaction().add(transferIx, claimIx);
  const splitTxId = await sendAndConfirmTransaction(connection, tx, [crank], {
    commitment: "confirmed",
  });
  console.log(
    `[fee-collector] ${ticker}: claim_and_split tx ${splitTxId}`,
  );

  // 4. Mirror the split into CreatorFee accounting.
  const totalLamports = BigInt(feeSOL.toString());
  const { creatorLamports, protocolLamports } = splitFee(totalLamports);

  await prisma.creatorFee.upsert({
    where: { mint_creator: { mint, creator } },
    update: {
      totalEarned: { increment: creatorLamports },
    },
    create: {
      mint,
      creator,
      totalEarned: creatorLamports,
    },
  });

  console.log(
    `[fee-collector] ${ticker}: recorded ${creatorLamports.toString()} to creator, ${protocolLamports.toString()} to protocol`,
  );

  // Token-side fees are NOT routed — they sit in the crank's ATA.
  if (feeToken.gtn(0)) {
    console.log(
      `[fee-collector] ${ticker}: ${feeToken.toString()} token-side fees sitting in crank ATA — manual sweep required`,
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadCrankKeypair(): Keypair {
  const inlineJson = process.env.CRANK_KEYPAIR_JSON;
  if (inlineJson) {
    const raw = JSON.parse(inlineJson);
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  }

  const walletPath = process.env.ANCHOR_WALLET;
  if (!walletPath) {
    throw new Error(
      "ANCHOR_WALLET or CRANK_KEYPAIR_JSON env var is required",
    );
  }
  const resolved = walletPath.startsWith("~/")
    ? path.join(process.env.HOME ?? "", walletPath.slice(2))
    : walletPath;
  if (!fs.existsSync(resolved)) {
    throw new Error(`Crank keypair file not found at ${resolved}`);
  }
  const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function anchorDiscriminator(name: string): Buffer {
  return createHash("sha256").update(`global:${name}`).digest().slice(0, 8);
}

function buildClaimAndSplitIx(params: {
  feeRouterProgramId: PublicKey;
  crank: PublicKey;
  feeVault: PublicKey;
  poolFeeAccount: PublicKey;
  creator: PublicKey;
  protocolTreasury: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: params.feeRouterProgramId,
    keys: [
      { pubkey: params.crank, isSigner: true, isWritable: false },
      { pubkey: params.feeVault, isSigner: false, isWritable: false },
      { pubkey: params.poolFeeAccount, isSigner: false, isWritable: true },
      { pubkey: params.creator, isSigner: false, isWritable: true },
      { pubkey: params.protocolTreasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: anchorDiscriminator("claim_and_split"),
  });
}
