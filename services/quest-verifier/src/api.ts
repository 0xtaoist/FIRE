import { Router, Request, Response } from "express";
import { prisma } from "./db";
import { initializeQuestsForAuction } from "./quest-init";

const router = Router();

// BigInt serialization helper
function serializeBigInts(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializeBigInts(value);
    }
    return result;
  }
  return obj;
}

// POST /api/quests/init - Initialize quests for a new auction
router.post("/api/quests/init", async (req: Request, res: Response) => {
  try {
    const { mint, ticker } = req.body;

    if (!mint || !ticker) {
      res.status(400).json({ error: "mint and ticker are required" });
      return;
    }

    await initializeQuestsForAuction(mint, ticker);
    res.json({ success: true, mint });
  } catch (err) {
    console.error("[api] Error initializing quests:", err);
    res.status(500).json({ error: "Failed to initialize quests" });
  }
});

// GET /api/quests/:mint - Returns all quests for a token
router.get("/api/quests/:mint", async (req: Request, res: Response) => {
  try {
    const { mint } = req.params;

    const quests = await prisma.quest.findMany({
      where: { auctionMint: mint },
      orderBy: { createdAt: "asc" },
    });

    res.json(serializeBigInts(quests));
  } catch (err) {
    console.error("[api] Error fetching quests:", err);
    res.status(500).json({ error: "Failed to fetch quests" });
  }
});

// GET /api/quests/:mint/badges - Returns list of earned badge strings
router.get("/api/quests/:mint/badges", async (req: Request, res: Response) => {
  try {
    const { mint } = req.params;

    const completedQuests = await prisma.quest.findMany({
      where: {
        auctionMint: mint,
        completed: true,
      },
      select: { reward: true },
    });

    const badges = completedQuests.map((q) => q.reward);
    res.json(badges);
  } catch (err) {
    console.error("[api] Error fetching badges:", err);
    res.status(500).json({ error: "Failed to fetch badges" });
  }
});

export default router;
