import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Serves the per-epoch claims file produced by keeper/friday.js --post
 * (epoch_<id>_claims.json). Sources, in priority order:
 *   1. CLAIMS_BASE_URL   — remote (e.g. R2/S3 bucket the keeper uploads to)
 *   2. CLAIMS_DIR        — local directory on the server (default ./claims)
 *
 * GET /api/claims/<epochId>?address=0x...   → that holder's {amount, proof}
 * GET /api/claims/<epochId>                 → epoch metadata (no full claim dump)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ epoch: string }> }
) {
  const { epoch } = await params;
  if (!/^\d+$/.test(epoch)) {
    return Response.json({ error: "bad epoch" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.toLowerCase() || null;

  let data: {
    epochId: number;
    root: string;
    asset: string;
    total: string;
    decimals?: number;
    claims: Record<string, { amount: string; proof: string[] }>;
  } | null = null;

  const baseUrl = process.env.CLAIMS_BASE_URL;
  if (baseUrl) {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/epoch_${epoch}_claims.json`, {
        next: { revalidate: 300 },
      });
      if (res.ok) data = await res.json();
    } catch { /* fall through to disk */ }
  }

  if (!data) {
    const dir = process.env.CLAIMS_DIR || path.join(process.cwd(), "claims");
    const file = path.join(dir, `epoch_${epoch}_claims.json`);
    if (fs.existsSync(file)) {
      try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* noop */ }
    }
  }

  if (!data) return Response.json({ error: "epoch not found" }, { status: 404 });

  if (address) {
    const entry = data.claims[address];
    return Response.json({
      epochId: data.epochId,
      asset: data.asset,
      decimals: data.decimals ?? 18,
      found: !!entry,
      amount: entry?.amount ?? "0",
      proof: entry?.proof ?? [],
    });
  }

  return Response.json({
    epochId: data.epochId,
    root: data.root,
    asset: data.asset,
    decimals: data.decimals ?? 18,
    total: data.total,
    holders: Object.keys(data.claims).length,
  });
}
