/**
 * init-mainnet.ts — Initialize on-chain config accounts for mainnet.
 *
 * Uses raw Anchor instruction discriminators since IDL generation is
 * broken with anchor-syn 0.30.1 + newer proc-macro2.
 *
 * Usage:
 *   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
 *   ANCHOR_WALLET=./keys/mainnet/deployer.json \
 *   npx tsx scripts/init-mainnet.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

// Program IDs (mainnet)
const BATCH_AUCTION = new PublicKey("D92hy2gaPK8uzTvfncRBsu2RXHZP7ZEsjRbynvc2tBdD");
const FEE_ROUTER = new PublicKey("6RMoCadvfUsKCYMsTNUKv9vXk6MfrVHRkB7iZ6Kd6gck");
const STAKE_MANAGER = new PublicKey("3MWbnFSuwGpxRgGaYgtRRABmC8HDjdmZctjf5JZm5faE");

// Anchor instruction discriminator: first 8 bytes of sha256("global:<method>")
function disc(method: string): Buffer {
  return Buffer.from(
    crypto.createHash("sha256").update(`global:${method}`).digest().subarray(0, 8)
  );
}

function loadKeypair(filePath: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const walletPath = process.env.ANCHOR_WALLET || path.join(__dirname, "..", "keys", "mainnet", "deployer.json");

  const connection = new Connection(rpcUrl, "confirmed");
  const payer = loadKeypair(walletPath);

  console.log(`RPC: ${rpcUrl}`);
  console.log(`Authority: ${payer.publicKey.toBase58()}\n`);

  // ── 1. BatchAuction — initialize_config ────────────────────────────
  try {
    console.log("1. Initializing BatchAuction config...");
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      BATCH_AUCTION
    );

    const ix = new TransactionInstruction({
      programId: BATCH_AUCTION,
      keys: [
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: disc("initialize_config"),
    });

    const tx = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
    console.log(`   ✔ BatchAuction config initialized: ${tx}`);
  } catch (err: any) {
    handleError("BatchAuction", err);
  }

  // ── 2. StakeManager — initialize_vault ──────────────────────────────
  try {
    console.log("2. Initializing StakeManager vault...");
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake_vault")],
      STAKE_MANAGER
    );

    const ix = new TransactionInstruction({
      programId: STAKE_MANAGER,
      keys: [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: disc("initialize_vault"),
    });

    const tx = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
    console.log(`   ✔ StakeManager vault initialized: ${tx}`);
  } catch (err: any) {
    handleError("StakeManager", err);
  }

  // ── 3. FeeRouter — initialize_vault(protocol_treasury) ──────────────
  try {
    console.log("3. Initializing FeeRouter vault...");
    const [feeVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault")],
      FEE_ROUTER
    );

    // initialize_vault takes a PublicKey arg (protocol_treasury)
    // Anchor serializes it as 32 bytes after the 8-byte discriminator
    const protocolTreasury = new PublicKey("GtDMrE937zauzdj871V9swsW5x9GjnBhae2B29n1Xfrp");
    const data = Buffer.concat([
      disc("initialize_vault"),
      protocolTreasury.toBuffer(),
    ]);

    const ix = new TransactionInstruction({
      programId: FEE_ROUTER,
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: feeVaultPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
    console.log(`   ✔ FeeRouter vault initialized: ${tx}`);
  } catch (err: any) {
    handleError("FeeRouter", err);
  }

  console.log("\nAll program initializations complete.");
}

function handleError(name: string, err: any): void {
  const msg = err?.message || String(err);
  if (msg.includes("already in use") || msg.includes("0x0")) {
    console.log(`   ⏭ ${name} already initialized (account exists). Skipping.`);
  } else {
    console.error(`   ✖ ERROR initializing ${name}: ${msg}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
