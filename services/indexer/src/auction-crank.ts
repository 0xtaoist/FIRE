/**
 * Auction lifecycle crank.
 *
 * Handles all post-auction automation:
 *   1. Auto-finalize expired auctions
 *   2. Create Meteora pool (BEFORE draining funds)
 *   3. Call seed_pool (release tokens + SOL to crank)
 *   4. Add liquidity to pool
 *   5. Call set_pool_id + update DB to TRADING
 *
 * Safety: pool is created BEFORE seed_pool, so if pool creation fails
 * the auction funds remain safely in the vault. No more stranded funds.
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
import Decimal from "decimal.js";
import { prisma } from "./db";

const CRANK_INTERVAL_MS = 30_000; // 30 seconds
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

// Pool config
const BIN_STEP = 80;
const FEE_BPS = 200;
const POSITION_WIDTH = 34; // 69 bins per position
const NUM_UPSIDE_POSITIONS = 8; // 8 × 69 bins = ~100,000x upside range

export function startAuctionCrank(): NodeJS.Timeout | null {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) {
    console.warn("[auction-crank] SOLANA_RPC_URL not set — crank disabled");
    return null;
  }

  let crank: Keypair;
  try {
    crank = loadCrankKeypair();
  } catch (err) {
    console.warn("[auction-crank] No crank keypair — crank disabled");
    return null;
  }

  console.log("[auction-crank] Starting auction lifecycle crank (every 30s)");
  console.log(`[auction-crank] Crank wallet: ${crank.publicKey.toBase58()}`);

  const connection = new Connection(rpcUrl, "confirmed");

  const run = () => void crankCycle(connection, crank).catch((err) => {
    console.error("[auction-crank] Cycle error:", err);
  });

  run();
  return setInterval(run, CRANK_INTERVAL_MS);
}

async function crankCycle(connection: Connection, crank: Keypair): Promise<void> {
  const batchAuctionId = process.env.BATCH_AUCTION_PROGRAM_ID;
  const feeRouterId = process.env.FEE_ROUTER_PROGRAM_ID;
  if (!batchAuctionId || !feeRouterId) return;

  const batchAuctionProgramId = new PublicKey(batchAuctionId);

  // 1. Auto-finalize expired GATHERING auctions
  const expiredAuctions = await prisma.auction.findMany({
    where: {
      state: "GATHERING",
      endTime: { lt: new Date() },
    },
  });

  for (const auction of expiredAuctions) {
    try {
      await finalizeAuction(connection, crank, batchAuctionProgramId, auction.mint);
    } catch (err) {
      console.error(`[auction-crank] Failed to finalize ${auction.ticker}:`, err);
    }
  }

  // 2. Graduate SUCCEEDED auctions (pool creation + liquidity)
  const succeededAuctions = await prisma.auction.findMany({
    where: {
      state: "SUCCEEDED",
      raydiumPoolId: null,
      poolSeeded: false,
    },
  });

  for (const auction of succeededAuctions) {
    try {
      await graduateAuction(connection, crank, batchAuctionProgramId, new PublicKey(feeRouterId), auction);
    } catch (err) {
      console.error(`[auction-crank] Failed to graduate ${auction.ticker}:`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Step 1: Finalize expired auctions
// ---------------------------------------------------------------------------

async function finalizeAuction(
  connection: Connection,
  crank: Keypair,
  batchAuctionProgramId: PublicKey,
  mint: string,
): Promise<void> {
  const mintPubkey = new PublicKey(mint);
  const [auctionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("auction"), mintPubkey.toBuffer()],
    batchAuctionProgramId,
  );
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    batchAuctionProgramId,
  );

  console.log(`[auction-crank] Finalizing auction ${mint.slice(0, 8)}...`);

  const tx = new Transaction().add(new TransactionInstruction({
    programId: batchAuctionProgramId,
    keys: [
      { pubkey: auctionPda, isSigner: false, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: crank.publicKey, isSigner: true, isWritable: false },
    ],
    data: anchorDiscriminator("finalize_auction"),
  }));

  const sig = await sendAndConfirmTransaction(connection, tx, [crank], {
    commitment: "confirmed",
  });

  // Read on-chain state to determine result
  const info = await connection.getAccountInfo(auctionPda);
  if (!info) return;
  const d = info.data;
  let off = 8 + 32 + 32;
  const tickerLen = d.readUInt32LE(off); off += 4 + tickerLen;
  off += 8 + 8 + 8 + 8 + 4; // start, end, sol, supply, count
  const state = d[off];
  const newState = state === 1 ? "SUCCEEDED" : "FAILED";

  await prisma.auction.update({
    where: { mint },
    data: { state: newState },
  });

  console.log(`[auction-crank] Finalized ${mint.slice(0, 8)} → ${newState} (tx: ${sig.slice(0, 20)}...)`);
}

// ---------------------------------------------------------------------------
// Step 2: Graduate succeeded auctions
// ---------------------------------------------------------------------------

async function graduateAuction(
  connection: Connection,
  crank: Keypair,
  batchAuctionProgramId: PublicKey,
  feeRouterProgramId: PublicKey,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auction: any,
): Promise<void> {
  const mint = new PublicKey(auction.mint);
  const ticker = auction.ticker;

  console.log(`[auction-crank] Graduating ${ticker} (${auction.mint.slice(0, 8)})...`);

  // SAFETY: Create pool FIRST, before draining any funds
  // If this fails, the vault is untouched.

  // Step 2a: Create Meteora pool (empty)
  console.log(`[auction-crank] ${ticker}: creating Meteora DLMM pool...`);

  const DLMM = (await import("@meteora-ag/dlmm")).default;
  const { StrategyType, ActivationType, deriveCustomizablePermissionlessLbPair } = await import("@meteora-ag/dlmm");

  const WSOL = new PublicKey("So11111111111111111111111111111111111111112");
  const [poolAddr] = deriveCustomizablePermissionlessLbPair(mint, WSOL, new BN(BIN_STEP));

  // Calculate price from auction data
  const buyerBps = BigInt(auction.buyerBps);
  const totalSupply = auction.totalSupply;
  const poolTokens = (totalSupply * (10000n - buyerBps)) / 10000n;
  const poolSol = auction.totalSol;

  if (poolTokens === 0n || poolSol === 0n) {
    console.error(`[auction-crank] ${ticker}: zero pool amounts, skipping`);
    return;
  }

  const price = new Decimal(poolSol.toString()).dividedBy(poolTokens.toString());
  const binStepDec = new Decimal(BIN_STEP).dividedBy(10000);
  const activeId = Math.round(price.ln().dividedBy(binStepDec.plus(1).ln()).toNumber());

  const existingPool = await connection.getAccountInfo(poolAddr);
  if (!existingPool) {
    try {
      const createTx = await DLMM.createCustomizablePermissionlessLbPair(
        connection,
        new BN(BIN_STEP),
        mint,
        WSOL,
        new BN(activeId),
        new BN(FEE_BPS),
        ActivationType.Slot,
        false,
        crank.publicKey,
      );
      await sendAndConfirmTransaction(connection, createTx, [crank], {
        commitment: "confirmed",
      });
      console.log(`[auction-crank] ${ticker}: pool created at ${poolAddr.toBase58()}`);
    } catch (err) {
      console.error(`[auction-crank] ${ticker}: pool creation FAILED — aborting (vault safe)`);
      throw err; // Don't proceed — vault is untouched
    }
  } else {
    console.log(`[auction-crank] ${ticker}: pool ${poolAddr.toBase58()} already exists`);
  }

  // Wait for pool to be queryable
  await new Promise(r => setTimeout(r, 5000));

  // Step 2b: Call seed_pool (releases tokens + SOL to crank)
  console.log(`[auction-crank] ${ticker}: calling seed_pool...`);

  const [auctionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("auction"), mint.toBuffer()],
    batchAuctionProgramId,
  );
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    batchAuctionProgramId,
  );
  const [tokenVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), mint.toBuffer()],
    batchAuctionProgramId,
  );

  const crankTokenAta = getAta(mint, crank.publicKey);
  const seedTx = new Transaction();

  const ataInfo = await connection.getAccountInfo(crankTokenAta);
  if (!ataInfo) {
    seedTx.add(buildCreateAtaIx(crank.publicKey, crankTokenAta, crank.publicKey, mint));
  }

  seedTx.add(buildSeedPoolIx({
    batchAuctionProgramId,
    auction: auctionPda,
    config: configPda,
    tokenVault: tokenVaultPda,
    crankTokenAccount: crankTokenAta,
    crankSolDestination: crank.publicKey,
    crank: crank.publicKey,
  }));

  await sendAndConfirmTransaction(connection, seedTx, [crank], {
    commitment: "confirmed",
  });

  await prisma.auction.update({
    where: { mint: auction.mint },
    data: { poolSeeded: true },
  });
  console.log(`[auction-crank] ${ticker}: seed_pool done`);

  // Step 2c: Add liquidity to pool
  console.log(`[auction-crank] ${ticker}: adding liquidity...`);

  try {
    const pool = await DLMM.create(connection, poolAddr);

    // Main position (centered on current price)
    const posKp = Keypair.generate();
    const liqTx = await pool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: posKp.publicKey,
      totalXAmount: new BN(poolTokens.toString()),
      totalYAmount: new BN(poolSol.toString()),
      strategy: {
        strategyType: StrategyType.Spot,
        minBinId: activeId - POSITION_WIDTH,
        maxBinId: activeId + POSITION_WIDTH,
      },
      user: crank.publicKey,
      slippage: 10,
    });

    const txs = Array.isArray(liqTx) ? liqTx : [liqTx];
    for (const tx of txs) {
      await sendAndConfirmTransaction(connection, tx, [crank, posKp], {
        commitment: "confirmed",
      });
    }
    console.log(`[auction-crank] ${ticker}: main liquidity added`);

    // Upside positions (token-only, extending the range)
    const tokenPerUpside = poolTokens / BigInt(NUM_UPSIDE_POSITIONS * 2); // Use half of pool tokens for upside
    let startBin = activeId + POSITION_WIDTH + 1;

    for (let i = 0; i < NUM_UPSIDE_POSITIONS; i++) {
      try {
        const upKp = Keypair.generate();
        const uTx = await pool.initializePositionAndAddLiquidityByStrategy({
          positionPubKey: upKp.publicKey,
          totalXAmount: new BN(tokenPerUpside.toString()),
          totalYAmount: new BN(0),
          strategy: {
            strategyType: StrategyType.Spot,
            minBinId: startBin,
            maxBinId: startBin + 68,
          },
          user: crank.publicKey,
          slippage: 10,
        });
        const uTxs = Array.isArray(uTx) ? uTx : [uTx];
        for (const t of uTxs) {
          await sendAndConfirmTransaction(connection, t, [crank, upKp], {
            commitment: "confirmed",
          });
        }
        startBin += 69;
      } catch (err) {
        console.warn(`[auction-crank] ${ticker}: upside position ${i + 1} failed, continuing`);
        break; // Likely out of SOL for rent
      }
      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`[auction-crank] ${ticker}: upside positions added`);
  } catch (err) {
    console.error(`[auction-crank] ${ticker}: liquidity add failed:`, err);
    // Pool exists and seed_pool was called. Funds are in crank wallet.
    // Admin can add liquidity manually.
    return;
  }

  // Step 2d: Call set_pool_id on-chain
  console.log(`[auction-crank] ${ticker}: calling set_pool_id...`);

  const setPoolTx = new Transaction().add(buildSetPoolIdIx({
    batchAuctionProgramId,
    crank: crank.publicKey,
    config: configPda,
    auction: auctionPda,
    poolId: poolAddr,
  }));

  await sendAndConfirmTransaction(connection, setPoolTx, [crank], {
    commitment: "confirmed",
  });

  // Step 2e: Update DB
  await prisma.auction.update({
    where: { mint: auction.mint },
    data: {
      state: "TRADING",
      raydiumPoolId: poolAddr.toBase58(),
    },
  });

  console.log(`[auction-crank] ${ticker}: GRADUATED — pool ${poolAddr.toBase58()}, state=TRADING`);
}

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------

function anchorDiscriminator(name: string): Buffer {
  return createHash("sha256").update(`global:${name}`).digest().slice(0, 8);
}

function buildSeedPoolIx(params: {
  batchAuctionProgramId: PublicKey;
  auction: PublicKey;
  config: PublicKey;
  tokenVault: PublicKey;
  crankTokenAccount: PublicKey;
  crankSolDestination: PublicKey;
  crank: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: params.batchAuctionProgramId,
    keys: [
      { pubkey: params.auction, isSigner: false, isWritable: true },
      { pubkey: params.config, isSigner: false, isWritable: false },
      { pubkey: params.tokenVault, isSigner: false, isWritable: true },
      { pubkey: params.crankTokenAccount, isSigner: false, isWritable: true },
      { pubkey: params.crankSolDestination, isSigner: false, isWritable: true },
      { pubkey: params.crank, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: anchorDiscriminator("seed_pool"),
  });
}

function buildSetPoolIdIx(params: {
  batchAuctionProgramId: PublicKey;
  crank: PublicKey;
  config: PublicKey;
  auction: PublicKey;
  poolId: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: params.batchAuctionProgramId,
    keys: [
      { pubkey: params.auction, isSigner: false, isWritable: true },
      { pubkey: params.config, isSigner: false, isWritable: false },
      { pubkey: params.crank, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([
      anchorDiscriminator("set_pool_id"),
      params.poolId.toBuffer(),
    ]),
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAta(mint: PublicKey, owner: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return ata;
}

function buildCreateAtaIx(
  payer: PublicKey,
  ata: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });
}

function loadCrankKeypair(): Keypair {
  const inlineJson = process.env.CRANK_KEYPAIR_JSON;
  if (inlineJson) {
    const raw = JSON.parse(inlineJson);
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  }
  const walletPath = process.env.ANCHOR_WALLET;
  if (!walletPath) {
    throw new Error("ANCHOR_WALLET or CRANK_KEYPAIR_JSON env var is required");
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
