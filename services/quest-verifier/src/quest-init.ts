import { prisma } from "./db";

const DEFAULT_QUESTS = [
  { type: "HOLDER_COUNT" as const, target: 100, reward: "Verified Community badge" },
  { type: "HOLD_TIME" as const, target: 12, reward: "Diamond Hands feature" },
  { type: "PRICE_ABOVE_BATCH" as const, target: 48, reward: "Survivor badge" },
  { type: "X_POSTS" as const, target: 50, reward: "Feed pin 24hrs" },
  { type: "GRADUATION" as const, target: 1, reward: "Graduation eligible" },
];

export async function initializeQuestsForAuction(mint: string, _ticker: string): Promise<void> {
  console.log(`[quest-init] Initializing quests for mint=${mint}`);

  for (const quest of DEFAULT_QUESTS) {
    await prisma.quest.upsert({
      where: {
        auctionMint_type: { auctionMint: mint, type: quest.type },
      },
      update: {},
      create: {
        auctionMint: mint,
        type: quest.type,
        target: quest.target,
        reward: quest.reward,
      },
    });
  }

  console.log(`[quest-init] Created ${DEFAULT_QUESTS.length} quests for mint=${mint}`);
}
