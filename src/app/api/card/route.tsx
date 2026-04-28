import { ImageResponse } from "next/og";
import { createPublicClient, http, formatUnits } from "viem";
import { base } from "viem/chains";
import { FIRE_CONTRACT, FIRE_ABI } from "@/lib/contract";

export const dynamic = "force-dynamic";

const client = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

async function getTokenPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/pairs/base/0x195872D17a64b323e93040881150C5462f3C2f67",
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    return parseFloat(data.pair?.priceUsd || "0");
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
      <div style={{ position: "absolute", top: "-70px", left: "-70px", width: "220px", height: "220px", borderRadius: "50%", background: "#FF8C42", opacity: 0.55 }} />
      <div style={{ position: "absolute", top: "-50px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "#FF8C42", opacity: 0.6 }} />
      <div style={{ position: "absolute", bottom: "-60px", left: "120px", width: "170px", height: "170px", borderRadius: "50%", background: "#FF8C42", opacity: 0.45 }} />
      <div style={{ position: "absolute", bottom: "-50px", right: "60px", width: "210px", height: "210px", borderRadius: "50%", background: "#FF8C42", opacity: 0.5 }} />
    </>
  );
}

function Footer() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "auto", paddingTop: "20px" }}>
      <span style={{ fontSize: "22px" }}>🔥</span>
      <span style={{ fontSize: "20px", color: "#555" }}>retirewithfire.org</span>
    </div>
  );
}

// Card 1: Retirement Card - earnings focused
function RetirementCard({ pending, price, earnedUsd }: { pending: number; price: number; earnedUsd: number }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F4F0", position: "relative", fontFamily: "system-ui, sans-serif" }}>
      <OrangeBlobs />
      <div style={{ width: "1060px", height: "520px", background: "white", borderRadius: "28px", border: "3px solid #E8710A", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 56px", position: "relative" }}>
        {/* Header */}
        <div style={{ fontSize: "36px", fontWeight: 900, color: "#222", letterSpacing: "2px", textTransform: "uppercase" }}>
          RETIREMENT CARD
        </div>
        <div style={{ fontSize: "20px", color: "#E8710A", fontWeight: 600, marginTop: "4px" }}>
          FIRE Token
        </div>

        {/* FIRE Earned */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "36px", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{ fontSize: "24px" }}>🔥</span>
            <span style={{ fontSize: "22px", color: "#444" }}><span style={{ fontWeight: 800 }}>FIRE</span> Earned</span>
          </div>
          <div style={{ fontSize: "80px", fontWeight: 900, color: "#E8710A", letterSpacing: "-2px", lineHeight: 1 }}>
            {fmtTokens(pending)}
          </div>
        </div>

        {/* Divider + Token Price */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #EEE", padding: "20px 20px 0 20px" }}>
          <span style={{ fontSize: "22px", color: "#888" }}>Token Price</span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#222" }}>{fmtPrice(price)}</span>
        </div>

        {/* Divider + Total Earned */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #EEE", padding: "20px 20px 0 20px", marginTop: "12px" }}>
          <span style={{ fontSize: "22px", color: "#888" }}>Total Earned</span>
          <span style={{ fontSize: "32px", fontWeight: 900, color: "#E8710A" }}>{fmtUsd(earnedUsd)}</span>
        </div>

        <Footer />
      </div>
    </div>
  );
}

// Card 2: Holder Status - tier badge + holdings + value
function HolderStatusCard({ balance, balanceUsd, daysHeld }: { balance: number; balanceUsd: number; daysHeld: number }) {
  const tierLabel = daysHeld >= 30 ? "DIAMOND\nHANDS" : daysHeld >= 14 ? "IRON\nHANDS" : daysHeld >= 7 ? "STEADY\nHANDS" : "FRESH\nBUY";
  const statusLabel = daysHeld >= 60 ? "RETIRED" : daysHeld >= 30 ? "ALMOST RETIRED" : daysHeld >= 14 ? "ON TRACK" : "ACCUMULATING";
  const holdStr = daysHeld < 1 ? `Held ${(daysHeld * 24).toFixed(0)} hours.` : `Held since Day 1.`;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F4F0", position: "relative", fontFamily: "system-ui, sans-serif" }}>
      <OrangeBlobs />
      <div style={{ width: "1060px", height: "520px", background: "white", borderRadius: "28px", border: "2px solid #E8E0D8", display: "flex", flexDirection: "column", padding: "44px 56px", position: "relative" }}>
        {/* Header + Badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#333", letterSpacing: "1px", textTransform: "uppercase" }}>
              FIRE Holder Status:
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
              <div style={{ fontSize: "52px", fontWeight: 900, color: "#E8710A" }}>{statusLabel}</div>
              <span style={{ fontSize: "44px" }}>🔥</span>
            </div>
          </div>
          <div style={{ width: "140px", height: "140px", borderRadius: "50%", background: "#E8710A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "white", textAlign: "center", lineHeight: 1.2, letterSpacing: "1px" }}>
              {tierLabel}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "28px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "20px" }}>
            <span style={{ fontSize: "22px", color: "#888", width: "150px" }}>Holdings:</span>
            <span style={{ fontSize: "44px", fontWeight: 900, color: "#222" }}>{fmtTokens(balance)} FIRE</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "20px" }}>
            <span style={{ fontSize: "22px", color: "#888", width: "150px" }}>Value:</span>
            <span style={{ fontSize: "44px", fontWeight: 900, color: "#E8710A" }}>{fmtUsd(balanceUsd)}</span>
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
        <span style={{ fontSize: "40px", fontWeight: 900, color: "#222", letterSpacing: "1px" }}>MY FIRE BAG</span>
        <span style={{ fontSize: "36px" }}>💰</span>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", alignItems: "center", flex: 1, position: "relative" }}>
        {/* Left: token amount */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "96px", fontWeight: 900, color: "#E8710A", letterSpacing: "-3px", lineHeight: 1 }}>
            {fmtTokens(balance)}
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#555", marginTop: "8px" }}>FIRE</div>
        </div>

        {/* Right: USD circle */}
        <div style={{ width: "260px", height: "260px", borderRadius: "50%", background: "#E8710A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontSize: "42px", fontWeight: 900, color: "#222" }}>
            = {fmtUsd(balanceUsd)}
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
      <div style={{ fontSize: "52px", fontWeight: 400, color: "#222", textAlign: "center", position: "relative", letterSpacing: "-1px" }}>
        PROOF OF <span style={{ fontWeight: 900 }}>DOING</span> <span style={{ fontWeight: 900, color: "#E8710A" }}>NOTHING</span>
      </div>
      <div style={{ fontSize: "20px", color: "#888", fontStyle: "italic", marginTop: "8px" }}>
        Earnings accumulated while doing absolutely nothing.
      </div>

      {/* Hourglass icon */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "28px", marginBottom: "8px", position: "relative" }}>
        <div style={{ width: "2px", height: "1px", background: "#DDD", position: "absolute", left: "-400px", right: "-400px", top: "50%" }} />
        <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "#E8710A", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <span style={{ fontSize: "32px" }}>⏳</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", width: "100%", justifyContent: "center", gap: "80px", marginTop: "24px", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "20px", color: "#888" }}>Days Held:</span>
          <span style={{ fontSize: "64px", fontWeight: 900, color: "#E8710A", lineHeight: 1.1 }}>{Math.floor(daysHeld)}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "20px", color: "#888" }}>FIRE Earned:</span>
          <span style={{ fontSize: "64px", fontWeight: 900, color: "#222", lineHeight: 1.1 }}>{fmtTokens(pending)}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "20px", color: "#888" }}>Value Gained:</span>
          <span style={{ fontSize: "64px", fontWeight: 900, color: "#E8710A", lineHeight: 1.1 }}>{fmtUsd(earnedUsd)}</span>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const type = searchParams.get("type") || "retirement";

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return new Response("Invalid address", { status: 400 });
    }

    const [status, price] = await Promise.all([
      client.readContract({
        address: FIRE_CONTRACT,
        abi: FIRE_ABI,
        functionName: "holderStatus",
        args: [address as `0x${string}`],
      }) as Promise<{
        balance: bigint;
        pendingRewards: bigint;
        rewardSharePct: bigint;
        secondsHeld: bigint;
        daysHeld: bigint;
        clockActive: boolean;
        isWhale: boolean;
      }>,
      getTokenPrice(),
    ]);

    const balance = Number(formatUnits(status.balance, 18));
    const pending = Number(formatUnits(status.pendingRewards, 18));
    const daysHeld = Number(status.secondsHeld) / 86400;
    const balanceUsd = balance * price;
    const earnedUsd = pending * price;

    let card;
    switch (type) {
      case "status":
        card = <HolderStatusCard balance={balance} balanceUsd={balanceUsd} daysHeld={daysHeld} />;
        break;
      case "bag":
        card = <BagCard balance={balance} balanceUsd={balanceUsd} />;
        break;
      case "proof":
        card = <ProofCard daysHeld={daysHeld} pending={pending} earnedUsd={earnedUsd} />;
        break;
      default:
        card = <RetirementCard pending={pending} price={price} earnedUsd={earnedUsd} />;
        break;
    }

    return new ImageResponse(card, { width: 1200, height: 630 });
  } catch (e) {
    console.error("Card generation error:", e);
    return new Response("Failed to generate card", { status: 500 });
  }
}
