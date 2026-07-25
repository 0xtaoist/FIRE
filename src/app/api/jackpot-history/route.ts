import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/** Serves keeper/jackpot_history.json — past draws, winners, assets, tx hashes. */
export async function GET() {
  const candidates = [
    process.env.JACKPOT_HISTORY_FILE,
    path.join(process.cwd(), "jackpot_history.json"),
  ].filter(Boolean) as string[];
  for (const f of candidates) {
    try {
      if (fs.existsSync(f)) {
        const d = JSON.parse(fs.readFileSync(f, "utf8"));
        return Response.json({ draws: d.draws ?? [], updatedAt: d.updatedAt ?? null });
      }
    } catch { /* try next */ }
  }
  return Response.json({ draws: [], updatedAt: null });
}
