import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/** Serves keeper/first_rwa.json — the First-RWA counter. */
export async function GET() {
  const candidates = [
    process.env.FIRST_RWA_FILE,
    path.join(process.env.DIST_DIR || path.join(process.cwd(), "distributions"), "..", "first_rwa.json"),
    path.join(process.cwd(), "first_rwa.json"),
  ].filter(Boolean) as string[];
  for (const f of candidates) {
    try {
      if (fs.existsSync(f)) {
        const d = JSON.parse(fs.readFileSync(f, "utf8"));
        return Response.json({
          firstViaFire: d.firstViaFire ?? d.count ?? 0,
          total: d.total ?? ((Array.isArray(d.wallets) ? d.wallets.length : 0) || d.count || 0),
          updatedAt: d.updatedAt ?? null,
        });
      }
    } catch { /* try next */ }
  }
  return Response.json({ firstViaFire: 0, total: 0, updatedAt: null });
}
