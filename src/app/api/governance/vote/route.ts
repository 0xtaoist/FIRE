import { getPool } from "@/lib/db";
import {
  ensureSchema, voteMessage, verifyVoteSig, balanceAt, tally,
  type Proposal,
} from "@/lib/governance";

export const dynamic = "force-dynamic";

function rowToProposal(r: Record<string, unknown>): Proposal {
  const now = Date.now();
  const endsAt = new Date(r.ends_at as string).getTime();
  return {
    id: r.id as number, title: r.title as string, description: (r.description as string) || "",
    type: r.type as Proposal["type"],
    choices: Array.isArray(r.choices) ? (r.choices as string[]) : JSON.parse((r.choices as string) || "[]"),
    createdBy: r.created_by as string, createdAt: new Date(r.created_at as string).toISOString(),
    endsAt: new Date(r.ends_at as string).toISOString(), snapshotBlock: String(r.snapshot_block),
    status: endsAt < now ? "closed" : (r.status as Proposal["status"]),
  };
}

// GET /api/governance/vote?id=N — tally + (optional) a wallet's existing vote
export async function GET(req: Request) {
  const pool = getPool();
  if (!pool) return Response.json({ error: "governance db not configured" }, { status: 503 });
  await ensureSchema();
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  const voter = (url.searchParams.get("address") || "").toLowerCase();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const { rows } = await pool.query(`SELECT * FROM gov_proposals WHERE id=$1`, [id]);
  if (!rows.length) return Response.json({ error: "not found" }, { status: 404 });
  const proposal = rowToProposal(rows[0]);
  const result = await tally(proposal);

  let myVote: string | null = null;
  if (voter) {
    const v = await pool.query(`SELECT choice FROM gov_votes WHERE proposal_id=$1 AND voter=$2`, [id, voter]);
    if (v.rows.length) myVote = v.rows[0].choice;
  }

  // detail=1 → include the full voter breakdown (votes are signed & public)
  let voters: { voter: string; choice: string; weight: string; votedAt: string }[] | undefined;
  if (url.searchParams.get("detail") === "1") {
    const vr = await pool.query(
      `SELECT voter, choice, weight, voted_at FROM gov_votes WHERE proposal_id=$1 ORDER BY weight DESC LIMIT 500`, [id]
    );
    voters = vr.rows.map((r: Record<string, unknown>) => ({
      voter: r.voter as string, choice: r.choice as string,
      weight: String(r.weight), votedAt: new Date(r.voted_at as string).toISOString(),
    }));
  }
  return Response.json({ proposal, tally: result, myVote, voters });
}

// POST /api/governance/vote — cast a signed vote
// body: { proposalId, address, choice, signature }
export async function POST(req: Request) {
  const pool = getPool();
  if (!pool) return Response.json({ error: "governance db not configured" }, { status: 503 });
  await ensureSchema();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  const proposalId = Number(body.proposalId);
  const address = String(body.address || "");
  const choice = String(body.choice || "");
  const signature = String(body.signature || "") as `0x${string}`;
  if (!proposalId || !address || !choice || !signature) return Response.json({ error: "missing fields" }, { status: 400 });

  const { rows } = await pool.query(`SELECT * FROM gov_proposals WHERE id=$1`, [proposalId]);
  if (!rows.length) return Response.json({ error: "proposal not found" }, { status: 404 });
  const p = rowToProposal(rows[0]);

  // closed?
  if (new Date(p.endsAt).getTime() < Date.now()) return Response.json({ error: "voting has ended" }, { status: 400 });
  // valid choice?
  if (!p.choices.includes(choice)) return Response.json({ error: "invalid choice" }, { status: 400 });

  // verify the signature matches the exact message for this proposal/choice/snapshot
  const msg = voteMessage(proposalId, choice, p.snapshotBlock);
  const sigOk = await verifyVoteSig(address, msg, signature);
  if (!sigOk) return Response.json({ error: "signature verification failed" }, { status: 401 });

  // weight = FIRE balance at the snapshot block (prevents shuffling to double-vote)
  let weight: bigint;
  try { weight = await balanceAt(address as `0x${string}`, BigInt(p.snapshotBlock)); }
  catch { return Response.json({ error: "couldn't read snapshot balance (archive RPC needed)" }, { status: 502 }); }
  if (weight === 0n) return Response.json({ error: "no FIRE balance at snapshot block — nothing to vote with" }, { status: 403 });

  // upsert: one vote per wallet per proposal; changing vote overwrites (same snapshot weight)
  await pool.query(
    `INSERT INTO gov_votes (proposal_id, voter, choice, weight, signature)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (proposal_id, voter)
     DO UPDATE SET choice=EXCLUDED.choice, weight=EXCLUDED.weight, signature=EXCLUDED.signature, voted_at=now()`,
    [proposalId, address.toLowerCase(), choice, weight.toString(), signature]
  );

  const result = await tally(p);
  return Response.json({ ok: true, weight: weight.toString(), tally: result });
}
