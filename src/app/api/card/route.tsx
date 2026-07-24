import { ImageResponse } from "next/og";
import { formatUnits } from "viem";
import { FIRE_CONTRACT, FIRE_ABI } from "@/lib/contract";
import { baseClient as client } from "@/lib/rpc";
import { getPool } from "@/lib/db";
import { getStockPricesUsd } from "@/lib/stockPrices";
import { lifetimeFor } from "@/lib/distributions";

// This route returns a next/og ImageResponse and queries the worker DB via pg
// (getPool). pg is Node-only and cannot run on the Edge runtime. As of Next 16,
// OG image routes are no longer implicitly upgraded to Edge, so declare the
// Node.js runtime explicitly — otherwise the handler can throw and the route
// returns a 500 text body instead of an image (no card on X / in the preview).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LifetimeRow = {
  total_claimed_wei: string;
  pending_rewards_wei: string;
  hold_start_unix: number | null;
};

async function getLifetimeStats(address: string): Promise<{
  totalEarned: number;
  claimed: number;
  pending: number;
  contractCount: number;
  daysHeld: number;
} | null> {
  const pool = getPool();
  if (!pool) return null;
  const addr = address.toLowerCase();
  try {
    // The lifetime total (holder_stats) is the critical value and must not be
    // coupled to the optional contract count: a single Promise.all rejection
    // (e.g. the COUNT query timing out) would discard the total too and force
    // the card to fall back to current-contract pending. Run the stats query on
    // its own; fetch the contract count separately and degrade to 1 on failure.
    const statsRes = await pool.query<LifetimeRow>(
      `SELECT total_claimed_wei::text, pending_rewards_wei::text, hold_start_unix
       FROM holder_stats WHERE address = $1`,
      [addr]
    );
    if (statsRes.rows.length === 0) return null;
    const r = statsRes.rows[0];
    const claimedWei = BigInt(r.total_claimed_wei);
    const pendingWei = BigInt(r.pending_rewards_wei);
    const claimed = Number(formatUnits(claimedWei, 18));
    const pending = Number(formatUnits(pendingWei, 18));
    const daysHeld = r.hold_start_unix
      ? Math.max(Math.floor((Date.now() / 1000 - r.hold_start_unix) / 86400), 0)
      : 0;

    const contractCount = await pool
      .query<{ c: string }>(
        `SELECT COUNT(DISTINCT contract)::text AS c FROM reward_claimed_events WHERE holder = $1`,
        [addr]
      )
      .then((res) => Math.max(parseInt(res.rows[0]?.c || "0", 10), 1))
      .catch((e) => {
        console.error("Contract count query failed (non-fatal):", e);
        return 1;
      });

    return {
      totalEarned: claimed + pending,
      claimed,
      pending,
      contractCount,
      daysHeld,
    };
  } catch (e) {
    console.error("Lifetime stats query failed:", e);
    return null;
  }
}

const STATE_VIEW = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b" as const;
const FIRE_POOL_ID = "0x2276440d38b33394989f7819f63b1df5ed62e48192706c172cabef1480547efd" as const;

async function getTokenPrice(): Promise<number> {
  try {
    const [slot0, cg] = await Promise.all([
      client.readContract({
        address: STATE_VIEW,
        abi: [{ name: "getSlot0", type: "function", stateMutability: "view",
          inputs: [{ name: "poolId", type: "bytes32" }],
          outputs: [
            { name: "sqrtPriceX96", type: "uint160" }, { name: "tick", type: "int24" },
            { name: "protocolFee", type: "uint24" }, { name: "lpFee", type: "uint24" },
          ] }] as const,
        functionName: "getSlot0",
        args: [FIRE_POOL_ID],
      }),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
        { next: { revalidate: 60 } }).then((r) => r.json()),
    ]);
    const sqrtP = Number((slot0 as readonly [bigint, number, number, number])[0]) / 2 ** 96;
    const firePerEth = sqrtP * sqrtP;
    const ethUsd = cg?.ethereum?.usd || 0;
    return firePerEth > 0 && ethUsd > 0 ? ethUsd / firePerEth : 0;
  } catch {
    return 0;
  }
}

function fmtTokens(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: n >= 1 ? 0 : 4 })}`;
}

function fmtPrice(n: number): string {
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}

// Shared orange blob backgrounds
function OrangeBlobs() {
  return (
    <>
      <div style={{ position: "absolute", top: "-70px", left: "-70px", width: "220px", height: "220px", borderRadius: "50%", background: "#00c805", opacity: 0.07 }} />
      <div style={{ position: "absolute", top: "-50px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "#00c805", opacity: 0.07 }} />
      <div style={{ position: "absolute", bottom: "-60px", left: "120px", width: "170px", height: "170px", borderRadius: "50%", background: "#00c805", opacity: 0.06 }} />
      <div style={{ position: "absolute", bottom: "-50px", right: "60px", width: "210px", height: "210px", borderRadius: "50%", background: "#00c805", opacity: 0.06 }} />
    </>
  );
}

function Footer() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "auto", paddingTop: "20px" }}>
      <span style={{ fontSize: "22px" }}>🔥</span>
      <span style={{ fontSize: "20px", color: "rgba(245,243,238,0.55)" }}>retirewithfire.org</span>
    </div>
  );
}

// Card 1: Retirement Card - earnings focused
// `earned` is the accumulative lifetime FIRE total (claimed + pending across ALL
// contracts, from the worker DB) so this matches the dashboard hero. It falls
// back to the current-contract pending rewards when the worker has no row yet.
function RetirementCard({ earned, price, earnedUsd }: { earned: number; price: number; earnedUsd: number }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#110e08", position: "relative", fontFamily: "system-ui, sans-serif" }}>
      <OrangeBlobs />
      <div style={{ width: "1060px", height: "520px", background: "#1a1610", borderRadius: "16px", border: "2px solid #00c805", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 56px", position: "relative" }}>
        {/* Header */}
        <div style={{ fontSize: "36px", fontWeight: 900, color: "#f5f3ee", letterSpacing: "2px", textTransform: "uppercase" }}>
          RETIREMENT CARD
        </div>
        <div style={{ fontSize: "20px", color: "#00c805", fontWeight: 600, marginTop: "4px" }}>
          FIRE Token
        </div>

        {/* FIRE Earned */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "36px", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{ fontSize: "24px" }}>🔥</span>
            <span style={{ fontSize: "22px", color: "rgba(245,243,238,0.85)" }}><span style={{ fontWeight: 800 }}>FIRE</span> Earned</span>
          </div>
          <div style={{ fontSize: "80px", fontWeight: 900, color: "#00c805", letterSpacing: "-2px", lineHeight: 1 }}>
            {fmtTokens(earned)}
          </div>
        </div>

        {/* Divider + Token Price */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(245,243,238,0.18)", padding: "20px 20px 0 20px" }}>
          <span style={{ fontSize: "22px", color: "rgba(245,243,238,0.55)" }}>Token Price</span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#f5f3ee" }}>{fmtPrice(price)}</span>
        </div>

        {/* Divider + Total Earned */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(245,243,238,0.18)", padding: "20px 20px 0 20px", marginTop: "12px" }}>
          <span style={{ fontSize: "22px", color: "rgba(245,243,238,0.55)" }}>Total Earned</span>
          <span style={{ fontSize: "32px", fontWeight: 900, color: "#00c805" }}>{fmtUsd(earnedUsd)}</span>
        </div>

        <Footer />
      </div>
    </div>
  );
}

// Card 2: Holder Status - tier badge + holdings + value
function HolderStatusCard({ balance, balanceUsd, daysHeld, hoursHeld }: { balance: number; balanceUsd: number; daysHeld: number; hoursHeld: number }) {
  const tierLabel = daysHeld >= 30 ? "DIAMOND\nHANDS" : daysHeld >= 14 ? "IRON\nHANDS" : daysHeld >= 7 ? "STEADY\nHANDS" : "FRESH\nBUY";
  const statusLabel = daysHeld >= 60 ? "RETIRED" : daysHeld >= 30 ? "ALMOST RETIRED" : daysHeld >= 14 ? "ON TRACK" : "ACCUMULATING";
  const holdStr = daysHeld < 1 ? `Held ${hoursHeld.toFixed(0)} hours.` : daysHeld === 1 ? "Held 1 day." : `Held ${daysHeld} days.`;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#110e08", position: "relative", fontFamily: "system-ui, sans-serif" }}>
      <OrangeBlobs />
      <div style={{ width: "1060px", height: "520px", background: "#1a1610", borderRadius: "16px", border: "1px solid rgba(245,243,238,0.22)", display: "flex", flexDirection: "column", padding: "44px 56px", position: "relative" }}>
        {/* Header + Badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#f5f3ee", letterSpacing: "1px", textTransform: "uppercase" }}>
              FIRE Holder Status:
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
              <div style={{ fontSize: "52px", fontWeight: 900, color: "#00c805" }}>{statusLabel}</div>
              <span style={{ fontSize: "44px" }}>🔥</span>
            </div>
          </div>
          <div style={{ width: "140px", height: "140px", borderRadius: "50%", background: "#00c805", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "white", textAlign: "center", lineHeight: 1.2, letterSpacing: "1px" }}>
              {tierLabel}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "28px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "20px" }}>
            <span style={{ fontSize: "22px", color: "rgba(245,243,238,0.55)", width: "150px" }}>Holdings:</span>
            <span style={{ fontSize: "44px", fontWeight: 900, color: "#f5f3ee" }}>{fmtTokens(balance)} FIRE</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "20px" }}>
            <span style={{ fontSize: "22px", color: "rgba(245,243,238,0.55)", width: "150px" }}>Value:</span>
            <span style={{ fontSize: "44px", fontWeight: 900, color: "#00c805" }}>{fmtUsd(balanceUsd)}</span>
          </div>
          <div style={{ fontSize: "22px", color: "#AAA", fontStyle: "italic", marginTop: "4px" }}>{holdStr}</div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

// Card 3: My FIRE Bag - big balance + USD in orange circle
function BagCard({ balance, balanceUsd }: { balance: number; balanceUsd: number }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "white", position: "relative", fontFamily: "system-ui, sans-serif", padding: "60px 80px" }}>
      <OrangeBlobs />
      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", position: "relative" }}>
        <span style={{ fontSize: "40px", fontWeight: 900, color: "#f5f3ee", letterSpacing: "1px" }}>MY FIRE BAG</span>
        <span style={{ fontSize: "36px" }}>💰</span>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", alignItems: "center", flex: 1, position: "relative" }}>
        {/* Left: token amount */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "96px", fontWeight: 900, color: "#00c805", letterSpacing: "-3px", lineHeight: 1 }}>
            {fmtTokens(balance)}
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "rgba(245,243,238,0.55)", marginTop: "8px" }}>FIRE</div>
        </div>

        {/* Right: USD circle */}
        <div style={{ width: "260px", height: "260px", borderRadius: "50%", background: "#00c805", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontSize: "42px", fontWeight: 900, color: "#f5f3ee" }}>
            {`= ${fmtUsd(balanceUsd)}`}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// Card 4: Proof of Doing Nothing - days held + earned + value gained
function ProofCard({ daysHeld, pending, earnedUsd }: { daysHeld: number; pending: number; earnedUsd: number }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", background: "white", position: "relative", fontFamily: "system-ui, sans-serif", padding: "48px 60px" }}>
      <OrangeBlobs />

      {/* Title */}
      <div style={{ fontSize: "52px", fontWeight: 400, color: "#f5f3ee", display: "flex", justifyContent: "center", gap: "12px", position: "relative", letterSpacing: "-1px" }}>
        <span>PROOF OF</span>
        <span style={{ fontWeight: 900 }}>DOING</span>
        <span style={{ fontWeight: 900, color: "#00c805" }}>NOTHING</span>
      </div>
      <div style={{ fontSize: "20px", color: "rgba(245,243,238,0.55)", fontStyle: "italic", marginTop: "8px" }}>
        Earnings accumulated while doing absolutely nothing.
      </div>

      {/* Hourglass icon */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "28px", marginBottom: "8px", position: "relative" }}>
        <div style={{ width: "2px", height: "1px", background: "#DDD", position: "absolute", left: "-400px", right: "-400px", top: "50%" }} />
        <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "#00c805", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <span style={{ fontSize: "32px" }}>⏳</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", width: "100%", justifyContent: "center", gap: "80px", marginTop: "24px", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "20px", color: "rgba(245,243,238,0.55)" }}>Days Held:</span>
          <span style={{ fontSize: "64px", fontWeight: 900, color: "#00c805", lineHeight: 1.1 }}>{Math.floor(daysHeld)}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "20px", color: "rgba(245,243,238,0.55)" }}>FIRE Earned:</span>
          <span style={{ fontSize: "64px", fontWeight: 900, color: "#f5f3ee", lineHeight: 1.1 }}>{fmtTokens(pending)}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "20px", color: "rgba(245,243,238,0.55)" }}>Value Gained:</span>
          <span style={{ fontSize: "64px", fontWeight: 900, color: "#00c805", lineHeight: 1.1 }}>{fmtUsd(earnedUsd)}</span>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// Card 5: Lifetime Earnings — cumulative FIRE across ALL contracts (worker DB)
function LifetimeCard({
  shortAddr, totalEarned, claimed, pending, earnedUsd, contractCount, daysHeld,
}: {
  shortAddr: string; totalEarned: number; claimed: number; pending: number;
  earnedUsd: number; contractCount: number; daysHeld: number;
}) {
  const bigNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
    return fmtTokens(n);
  };
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0A0A0A", position: "relative", fontFamily: "system-ui, sans-serif", color: "#F8F4F0", padding: "44px 60px" }}>
      {/* Glow accents */}
      <div style={{ position: "absolute", top: "-120px", right: "-120px", width: "440px", height: "440px", borderRadius: "50%", background: "#00c805", opacity: 0.35, filter: "blur(20px)" }} />
      <div style={{ position: "absolute", bottom: "-100px", left: "-80px", width: "320px", height: "320px", borderRadius: "50%", background: "#FFB627", opacity: 0.25, filter: "blur(20px)" }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "28px" }}>🔥</span>
          <span style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: "#FFB627" }}>
            LIFETIME EARNINGS
          </span>
        </div>
        <span style={{ fontSize: "16px", color: "rgba(245,243,238,0.55)", fontFamily: "ui-monospace, monospace" }}>{shortAddr}</span>
      </div>

      {/* Main number */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, position: "relative" }}>
        <div style={{ fontSize: "18px", color: "#999", letterSpacing: "4px", textTransform: "uppercase", marginBottom: "4px" }}>
          Total $FIRE Earned
        </div>
        <div style={{ fontSize: "180px", fontWeight: 900, color: "#00c805", letterSpacing: "-6px", lineHeight: 1, textShadow: "0 0 40px rgba(232,113,10,0.4)" }}>
          {bigNum(totalEarned)}
        </div>
        <div style={{ fontSize: "56px", fontWeight: 800, color: "#FFB627", marginTop: "12px" }}>
          {fmtUsd(earnedUsd)}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #2A2A2A", paddingTop: "20px", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "14px", color: "rgba(245,243,238,0.55)", letterSpacing: "2px", textTransform: "uppercase" }}>Claimed</span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#F8F4F0" }}>{bigNum(claimed)}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "14px", color: "rgba(245,243,238,0.55)", letterSpacing: "2px", textTransform: "uppercase" }}>Pending</span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#F8F4F0" }}>{bigNum(pending)}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "14px", color: "rgba(245,243,238,0.55)", letterSpacing: "2px", textTransform: "uppercase" }}>Contracts</span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#F8F4F0" }}>{contractCount}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "14px", color: "rgba(245,243,238,0.55)", letterSpacing: "2px", textTransform: "uppercase" }}>Days Held</span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#F8F4F0" }}>{daysHeld}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "16px", position: "relative" }}>
        <span style={{ fontSize: "16px", color: "#666" }}>Do nothing. Get paid.</span>
        <span style={{ fontSize: "16px", color: "rgba(245,243,238,0.85)" }}>·</span>
        <span style={{ fontSize: "16px", color: "rgba(245,243,238,0.55)" }}>retirewithfire.org</span>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  {
    const url = new URL(request.url);
    if (url.searchParams.get("type") === "dividends") {
      return dividendsCard(url.searchParams.get("address") || "");
    }
  }
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const type = searchParams.get("type") || "retirement";

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return new Response("Invalid address", { status: 400 });
    }

    // v2 shape: streak/tier/tranches (Robinhood Chain)
    type HolderStatusResult = {
      balance: bigint;
      streakDays_: bigint;
      tierMultX100: bigint;
      peak: bigint;
      breakBelowBalance: bigint;
      tranches_: bigint;
      migrated: boolean;
    };

    const Z = BigInt(0);
    const EMPTY_STATUS: HolderStatusResult = {
      balance: Z, streakDays_: Z, tierMultX100: BigInt(100),
      peak: Z, breakBelowBalance: Z, tranches_: Z, migrated: false,
    };

    // Read on-chain status + price defensively: a single failed RPC/price call
    // must not blow up the whole route (which would 500 and produce no image).
    const [status, price] = await Promise.all([
      (client.readContract({
        address: FIRE_CONTRACT,
        abi: FIRE_ABI,
        functionName: "holderStatus",
        args: [address as `0x${string}`],
      }) as Promise<HolderStatusResult>).catch((e) => {
        console.error("holderStatus read failed:", e);
        return EMPTY_STATUS;
      }),
      getTokenPrice(),
    ]);

    const balance = Number(formatUnits(status.balance, 18));
    const pending = 0; // dividends are stock epochs now — lifetime comes from the DB below
    const daysHeld = Number(status.streakDays_);
    const hoursHeld = daysHeld * 24;
    const balanceUsd = balance * price;
    const earnedUsd = pending * price;

    // Accumulative lifetime FIRE (claimed + pending across ALL contracts) from the
    // worker DB — same value the dashboard hero shows. Falls back to the current
    // contract's live pending rewards when the worker has not indexed this address.
    const lifetime = await getLifetimeStats(address);
    const lifetimeEarned = lifetime ? lifetime.totalEarned : pending;
    const lifetimeEarnedUsd = lifetimeEarned * price;

    let card;
    switch (type) {
      case "status":
        card = <HolderStatusCard balance={balance} balanceUsd={balanceUsd} daysHeld={daysHeld} hoursHeld={hoursHeld} />;
        break;
      case "bag":
        card = <BagCard balance={balance} balanceUsd={balanceUsd} />;
        break;
      case "proof":
        card = <ProofCard daysHeld={daysHeld} pending={pending} earnedUsd={earnedUsd} />;
        break;
      case "lifetime": {
        if (lifetime) {
          const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
          card = (
            <LifetimeCard
              shortAddr={shortAddr}
              totalEarned={lifetime.totalEarned}
              claimed={lifetime.claimed}
              pending={lifetime.pending}
              earnedUsd={lifetime.totalEarned * price}
              contractCount={lifetime.contractCount}
              daysHeld={lifetime.daysHeld}
            />
          );
        } else {
          // Fall back to retirement card if worker DB hasn't indexed this address.
          card = <RetirementCard earned={lifetimeEarned} price={price} earnedUsd={lifetimeEarnedUsd} />;
        }
        break;
      }
      default:
        card = <RetirementCard earned={lifetimeEarned} price={price} earnedUsd={lifetimeEarnedUsd} />;
        break;
    }

    // `emoji` is required for the 🔥 / 💰 / ⏳ glyphs to render — the default
    // next/og font has no emoji coverage, so without this they come out blank.
    return new ImageResponse(card, { width: 1200, height: 630, emoji: "twemoji" });
  } catch (e) {
    console.error("Card generation error:", e);
    return new Response("Failed to generate card", { status: 500 });
  }
}


// ─── DIVIDENDS SHARE CARD (push-model; reads distribution records, no DB) ───

/** Precision that scales with size so small holdings never render as "0". */
function fmtAmt(n: number): string {
  if (n === 0) return "0";
  const dp = n >= 1 ? 4 : n >= 0.01 ? 5 : n >= 0.0001 ? 6 : 8;
  return n.toLocaleString(undefined, { maximumFractionDigits: dp });
}

async function dividendsCard(addressRaw: string) {
  const address = addressRaw.toLowerCase();
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  const lifetime = lifetimeFor(address);

  // streak + tier straight from the token (the hero of the card)
  let streakDays = 0, tierX = 1, migrated = false;
  try {
    const s = (await client.readContract({
      address: FIRE_CONTRACT, abi: FIRE_ABI, functionName: "holderStatus",
      args: [address as `0x${string}`],
    })) as { streakDays_: bigint; tierMultX100: bigint; migrated: boolean };
    streakDays = Number(s.streakDays_ ?? 0);
    tierX = Number(s.tierMultX100 ?? BigInt(100)) / 100;
    migrated = Boolean(s.migrated);
  } catch { /* card still renders without chain read */ }

  const { prices } = await getStockPricesUsd().catch(() => ({ prices: {} as Record<string, number> }));
  const rows = Object.entries(lifetime).map(([asset, l]) => {
    const amount = Number(formatUnits(l.amount, l.decimals));
    const usd = prices[asset] ? amount * prices[asset] : null;
    return { symbol: l.symbol, amount, usd };
  }).sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0));
  const totalUsd = rows.reduce((s, r) => s + (r.usd ?? 0), 0);

  const green = "#00c805";
  const line = "rgba(245,243,238,0.16)";
  const muted = "rgba(245,243,238,0.55)";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#110e08", color: "#f5f3ee", padding: "48px 56px", fontFamily: "monospace" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: green, letterSpacing: 2 }}>FIRE</div>
            <div style={{ display: "flex", fontSize: 15, color: muted, textTransform: "uppercase", letterSpacing: 3 }}>Robinhood Chain</div>
          </div>
          <div style={{ display: "flex", fontSize: 19, color: muted }}>{short}</div>
        </div>

        {/* HERO: the streak */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 34 }}>
          <div style={{ display: "flex", fontSize: 19, color: muted, textTransform: "uppercase", letterSpacing: 5 }}>
            Holding streak
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
            <div style={{ display: "flex", fontSize: 148, fontWeight: 700, lineHeight: 1.02, letterSpacing: -4 }}>
              DAY {streakDays}
            </div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: green }}>
              {tierX.toFixed(2)}x
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 17, color: muted, marginTop: 4 }}>
            {migrated ? "carried from day one on Base · never broken" : streakDays >= 90 ? "in the jackpot draw every Friday" : `${90 - streakDays} days to jackpot entry`}
          </div>
        </div>

        {/* SECOND: dollar value */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
          <div style={{ display: "flex", fontSize: 17, color: muted, textTransform: "uppercase", letterSpacing: 4 }}>
            Stock dividends earned
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: green, lineHeight: 1.1 }}>
            ${totalUsd.toFixed(2)}
          </div>
        </div>

        {/* SMALLER: the stocks */}
        {rows.length > 0 && (
          <div style={{ display: "flex", gap: 26, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${line}` }}>
            {rows.slice(0, 4).map((r) => (
              <div key={r.symbol} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 22, fontWeight: 700 }}>
                  {fmtAmt(r.amount)} {r.symbol}
                </div>
                <div style={{ display: "flex", fontSize: 16, color: muted }}>
                  {r.usd !== null ? `$${r.usd.toFixed(2)}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
          <div style={{ display: "flex", fontSize: 19, color: "rgba(245,243,238,0.8)" }}>
            Hold. Earn stocks. Don&apos;t break your streak.
          </div>
          <div style={{ display: "flex", fontSize: 19, color: muted }}>retirewithfire.org</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
