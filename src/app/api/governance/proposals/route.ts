import { getPool } from "@/lib/db";
import { ensureSchema, canPropose, currentBlock, type Proposal } from "@/lib/governance";

export const dynamic = "force-dynamic";

function rowToProposal(r: Record<string, unknown>): Proposal {
  const now = Date.now();
  const endsAt = new Date(r.ends_at as string).getTime();
  return {
    id: r.id as number,
    title: r.title as string,
    description: (r.description as string) || "",
    type: r.type as Proposal["type"],
    choices: Array.isArray(r.choices) ? (r.choices as string[]) : JSON.parse((r.choices as string) || "[]"),
    createdBy: r.created_by as string,
    createdAt: new Date(r.created_at as string).toISOString(),
    endsAt: new Date(r.ends_at as string).toISOString(),
    snapshotBlock: String(r.snapshot_block),
    status: endsAt < now ? "closed" : (r.status as Proposal["status"]),
  };
}

// GET /api/governance/proposals — list all, newest first
export async function GET() {
  const pool = getPool();
  if (!pool) return Response.json({ error: "governance db not configured" }, { status: 503 });
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM gov_proposals ORDER BY created_at DESC`);
  return Response.json({ proposals: rows.map(rowToProposal) });
}

// POST /api/governance/proposals — create (deployer or >=1% holder)
// body: { address, title, description, type, choices?, durationHours }
export async function POST(req: Request) {
  const pool = getPool();
  if (!pool) return Response.json({ error: "governance db not configured" }, { status: 503 });
  await ensureSchema();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  const address = String(body.address || "");
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const type = body.type === "choices" ? "choices" : "yes_no";
  const durationHours = Math.max(1, Math.min(24 * 30, Number(body.durationHours) || 168)); // 1h–30d, default 7d

  if (!title) return Response.json({ error: "title required" }, { status: 400 });

  // eligibility — verified server-side against on-chain balance
  const elig = await canPropose(address);
  if (!elig.ok) return Response.json({ error: elig.reason || "not eligible to propose", ...elig }, { status: 403 });

  // choices
  let choices: string[];
  if (type === "choices") {
    const raw = Array.isArray(body.choices) ? (body.choices as unknown[]).map(c => String(c).trim()).filter(Boolean) : [];
    if (raw.length < 2) return Response.json({ error: "choices type needs at least 2 options" }, { status: 400 });
    if (raw.length > 8) return Response.json({ error: "max 8 choices" }, { status: 400 });
    choices = raw;
  } else {
    choices = ["Yes", "No"];
  }

  const snapshotBlock = await currentBlock();
  const endsAt = new Date(Date.now() + durationHours * 3600 * 1000);

  const { rows } = await pool.query(
    `INSERT INTO gov_proposals (title, description, type, choices, created_by, ends_at, snapshot_block)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [title, description, type, JSON.stringify(choices), address.toLowerCase(), endsAt.toISOString(), snapshotBlock.toString()]
  );
  return Response.json({ ok: true, proposal: rowToProposal(rows[0]) });
}

// PATCH /api/governance/proposals — deployer closes a proposal early
// body: { id, address }  (address must be the deployer)
export async function PATCH(req: Request) {
  const pool = getPool();
  if (!pool) return Response.json({ error: "governance db not configured" }, { status: 503 });
  await ensureSchema();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  const id = Number(body.id);
  const address = String(body.address || "").toLowerCase();
  const { DEPLOYER } = await import("@/lib/governance");
  if (address !== DEPLOYER.toLowerCase()) return Response.json({ error: "only the deployer can close proposals" }, { status: 403 });
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await pool.query(`UPDATE gov_proposals SET status='closed', ends_at=now() WHERE id=$1`, [id]);
  return Response.json({ ok: true });
}
