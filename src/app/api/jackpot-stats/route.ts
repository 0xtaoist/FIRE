import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/** Serves keeper/jackpot_stats.json — eligible-wallet count for the jackpot. */
export async function GET() {
  const candidates = [
    process.env.JACKPOT_STATS_FILE,
    path.join(process.cwd(), "jackpot_stats.json"),
  ].filter(Boolean) as string[];
  for (const f of candidates) {
    try {
      if (fs.existsSync(f)) {
        const d = JSON.parse(fs.readFileSync(f, "utf8"));
        return Response.json({
          eligible: d.eligible ?? 0,
          totalHolders: d.totalHolders ?? 0,
          minStreakDays: d.minStreakDays ?? 90,
          updatedAt: d.updatedAt ?? null,
        });
      }
    } catch { /* try next */ }
  }
  return Response.json({ eligible: 0, totalHolders: 0, minStreakDays: 90, updatedAt: null });
}
