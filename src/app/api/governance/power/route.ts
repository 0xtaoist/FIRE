import { getPool } from "@/lib/db";
import { ensureSchema, balanceAt } from "@/lib/governance";

export const dynamic = "force-dynamic";

// GET /api/governance/power?id=N&address=0x… — a wallet's voting weight at the
// proposal's snapshot block (so the UI can show it before they sign).
export async function GET(req: Request) {
  const pool = getPool();
  if (!pool) return Response.json({ error: "governance db not configured" }, { status: 503 });
  await ensureSchema();
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  const address = (url.searchParams.get("address") || "") as `0x${string}`;
  if (!id || !address) return Response.json({ error: "id and address required" }, { status: 400 });

  const { rows } = await pool.query(`SELECT snapshot_block FROM gov_proposals WHERE id=$1`, [id]);
  if (!rows.length) return Response.json({ error: "not found" }, { status: 404 });
  try {
    const weight = await balanceAt(address, BigInt(String(rows[0].snapshot_block)));
    return Response.json({ weight: weight.toString(), snapshotBlock: String(rows[0].snapshot_block) });
  } catch {
    return Response.json({ error: "couldn't read snapshot balance (archive RPC needed)" }, { status: 502 });
  }
}
