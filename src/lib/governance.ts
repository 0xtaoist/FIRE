import { getPool } from "./db";
import { createPublicClient, http, getAddress, verifyMessage, formatUnits } from "viem";
import { robinhoodChain } from "./chains";
import { FIRE_CONTRACT } from "./contract";

/* FIRE governance — Snapshot-style off-chain voting.
 * Voters sign a message (no gas); weight = their FIRE balance at the proposal's
 * snapshot block (prevents double-voting via token shuffling). Proposals + votes
 * live in Postgres. Advisory: the team reads results and acts.
 *
 * Rules:
 *  - Submit a proposal: the deployer, OR any wallet holding >= 1% of supply.
 *  - Quorum: 10% of total supply must vote for a result to count.
 *  - Types: "yes_no" (Yes/No) or "choices" (2-N options).
 */

export const DEPLOYER = getAddress(
  process.env.GOV_DEPLOYER || process.env.NEXT_PUBLIC_DEPLOYER || "0xAcc79E7b9F8dBB22e197c76d92Ff8c0472Ac81B4"
);
export const PROPOSE_MIN_BPS = BigInt(process.env.GOV_PROPOSE_MIN_BPS || "100");   // 1%
export const QUORUM_BPS = BigInt(process.env.GOV_QUORUM_BPS || "1000");            // 10%
export const DECIMALS = 18;

const ERC20 = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

// A dedicated client — governance needs historical (archive) balance reads at the
// snapshot block, so prefer an archive RPC if configured.
const govClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.GOV_ARCHIVE_RPC || process.env.NEXT_PUBLIC_RH_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"),
});

export type ProposalType = "yes_no" | "choices";
export type Proposal = {
  id: number;
  title: string;
  description: string;
  type: ProposalType;
  choices: string[];            // ["Yes","No"] for yes_no, or the custom options
  createdBy: string;
  createdAt: string;
  endsAt: string;
  snapshotBlock: string;        // bigint as string
  status: "active" | "closed";
};
export type Tally = {
  totals: Record<string, string>;   // choice -> weighted votes (wei, string)
  voterCount: number;
  totalWeight: string;               // total FIRE that voted (wei)
  supply: string;                    // total supply at snapshot (wei)
  quorumNeeded: string;              // wei
  quorumMet: boolean;
  winner: string | null;             // choice with most weight (if quorum met)
};

// ── schema ──────────────────────────────────────────────────────────────
export async function ensureSchema() {
  const pool = getPool();
  if (!pool) throw new Error("no DATABASE_URL");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gov_proposals (
      id            SERIAL PRIMARY KEY,
      title         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      type          TEXT NOT NULL CHECK (type IN ('yes_no','choices')),
      choices       JSONB NOT NULL,
      created_by    TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      ends_at       TIMESTAMPTZ NOT NULL,
      snapshot_block NUMERIC NOT NULL,
      status        TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS gov_votes (
      proposal_id   INTEGER NOT NULL REFERENCES gov_proposals(id) ON DELETE CASCADE,
      voter         TEXT NOT NULL,
      choice        TEXT NOT NULL,
      weight        NUMERIC NOT NULL,
      signature     TEXT NOT NULL,
      voted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (proposal_id, voter)
    );
  `);
}

// ── on-chain reads ──────────────────────────────────────────────────────
export async function totalSupply(): Promise<bigint> {
  return (await govClient.readContract({ address: FIRE_CONTRACT, abi: ERC20, functionName: "totalSupply" })) as bigint;
}

// balance at a specific block (snapshot weighting). Needs archive RPC.
export async function balanceAt(addr: `0x${string}`, block: bigint): Promise<bigint> {
  return (await govClient.readContract({
    address: FIRE_CONTRACT, abi: ERC20, functionName: "balanceOf", args: [addr], blockNumber: block,
  })) as bigint;
}

export async function currentBlock(): Promise<bigint> {
  return await govClient.getBlockNumber();
}

// ── eligibility ─────────────────────────────────────────────────────────
export async function canPropose(addr: string): Promise<{ ok: boolean; reason?: string; balance?: string; needed?: string }> {
  let a: `0x${string}`;
  try { a = getAddress(addr); } catch { return { ok: false, reason: "bad address" }; }
  if (a.toLowerCase() === DEPLOYER.toLowerCase()) return { ok: true };
  const [bal, supply] = await Promise.all([
    govClient.readContract({ address: FIRE_CONTRACT, abi: ERC20, functionName: "balanceOf", args: [a] }) as Promise<bigint>,
    totalSupply(),
  ]);
  const needed = supply * PROPOSE_MIN_BPS / BigInt(10000);
  return bal >= needed
    ? { ok: true, balance: bal.toString(), needed: needed.toString() }
    : { ok: false, reason: `need >= ${PROPOSE_MIN_BPS === BigInt(100) ? "1%" : Number(PROPOSE_MIN_BPS)/100 + "%"} of supply to propose`, balance: bal.toString(), needed: needed.toString() };
}

// ── vote message (what the wallet signs) ────────────────────────────────
export function voteMessage(proposalId: number, choice: string, snapshotBlock: string) {
  return `FIRE Governance Vote\nProposal: ${proposalId}\nChoice: ${choice}\nSnapshot block: ${snapshotBlock}\n\nSigning proves you control this wallet. No gas, no transaction.`;
}

export async function verifyVoteSig(addr: string, message: string, signature: `0x${string}`): Promise<boolean> {
  try { return await verifyMessage({ address: getAddress(addr), message, signature }); }
  catch { return false; }
}

// ── tally ───────────────────────────────────────────────────────────────
export async function tally(p: Proposal): Promise<Tally> {
  const pool = getPool();
  if (!pool) throw new Error("no DATABASE_URL");
  const { rows } = await pool.query(
    `SELECT choice, SUM(weight) AS w, COUNT(*) AS c FROM gov_votes WHERE proposal_id=$1 GROUP BY choice`, [p.id]
  );
  const totals: Record<string, string> = {};
  for (const c of p.choices) totals[c] = "0";
  let totalWeight = BigInt(0), voterCount = 0;
  for (const r of rows) {
    totals[r.choice] = BigInt(r.w).toString();
    totalWeight += BigInt(r.w);
    voterCount += Number(r.c);
  }
  const supply = await totalSupplyAtSafe(BigInt(p.snapshotBlock));
  const quorumNeeded = supply * QUORUM_BPS / BigInt(10000);
  const quorumMet = totalWeight >= quorumNeeded;
  let winner: string | null = null;
  if (quorumMet) {
    let best = BigInt(-1);
    for (const [c, w] of Object.entries(totals)) { const v = BigInt(w); if (v > best) { best = v; winner = c; } }
  }
  return {
    totals, voterCount,
    totalWeight: totalWeight.toString(),
    supply: supply.toString(),
    quorumNeeded: quorumNeeded.toString(),
    quorumMet, winner,
  };
}

// total supply at the snapshot block (falls back to current if archive read fails)
async function totalSupplyAtSafe(block: bigint): Promise<bigint> {
  try {
    return (await govClient.readContract({ address: FIRE_CONTRACT, abi: ERC20, functionName: "totalSupply", blockNumber: block })) as bigint;
  } catch {
    return await totalSupply();
  }
}

export const fmtFire = (wei: string | bigint) => Number(formatUnits(BigInt(wei), DECIMALS));
