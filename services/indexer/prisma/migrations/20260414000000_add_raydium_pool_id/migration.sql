-- AddColumn: raydiumPoolId on Auction
-- Stores the Raydium CLMM pool pubkey after pool creation.

ALTER TABLE "Auction"
  ADD COLUMN "raydiumPoolId" TEXT;
