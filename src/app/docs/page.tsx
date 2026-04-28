import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "$FIRE - Protocol Documentation",
  description:
    "Full protocol documentation for the $FIRE token on Base. Tax mechanics, reward distribution, LP injection, burn governor, and more.",
};

function Section({
  id,
  label,
  title,
  children,
}: {
  id: string;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="border-t border-divider pt-10 mb-10">
        <p className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-3">
          {label}
        </p>
        <h2 className="font-serif font-black text-ink text-2xl sm:text-3xl leading-tight mb-6">
          {title}
        </h2>
        <div className="prose-fire">{children}</div>
      </div>
    </section>
  );
}

function InfoTable({
  rows,
}: {
  rows: [string, string][];
}) {
  return (
    <div className="overflow-x-auto mb-6">
      <table className="w-full text-sm border border-divider rounded-lg overflow-hidden">
        <tbody>
          {rows.map(([key, value], i) => (
            <tr
              key={key}
              className={i % 2 === 0 ? "bg-cream-dark/50" : "bg-white"}
            >
              <td className="px-4 py-2.5 font-mono text-ink-muted text-xs whitespace-nowrap border-r border-divider w-1/3">
                {key}
              </td>
              <td className="px-4 py-2.5 text-ink text-sm">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TierTable() {
  const tiers = [
    ["0", "< 100", "Any", "0% (inactive)"],
    ["1", ">= 100", ">= 15 days", "10%"],
    ["2", ">= 200", ">= 30 days", "20%"],
    ["3", ">= 500", ">= 45 days", "30%"],
    ["4", ">= 800", ">= 60 days", "40%"],
  ];

  return (
    <div className="overflow-x-auto mb-6">
      <table className="w-full text-sm border border-divider rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-ink text-white">
            <th className="px-4 py-2.5 text-left font-mono text-xs">Tier</th>
            <th className="px-4 py-2.5 text-left font-mono text-xs">
              Whales required
            </th>
            <th className="px-4 py-2.5 text-left font-mono text-xs">
              Hold required
            </th>
            <th className="px-4 py-2.5 text-left font-mono text-xs">
              Rewards burned
            </th>
          </tr>
        </thead>
        <tbody>
          {tiers.map(([tier, count, hold, burn], i) => (
            <tr
              key={tier}
              className={i % 2 === 0 ? "bg-cream-dark/50" : "bg-white"}
            >
              <td className="px-4 py-2.5 font-mono font-bold text-fire">
                {tier}
              </td>
              <td className="px-4 py-2.5 text-ink">{count}</td>
              <td className="px-4 py-2.5 text-ink">{hold}</td>
              <td className="px-4 py-2.5 font-mono text-ink">{burn}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-ink text-cream text-xs font-mono p-4 rounded-lg overflow-x-auto mb-6 leading-relaxed">
      {children}
    </pre>
  );
}

function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warning";
  children: React.ReactNode;
}) {
  const styles =
    type === "warning"
      ? "bg-fire/5 border-fire/20 text-fire"
      : "bg-ink/5 border-ink/10 text-ink";
  return (
    <div className={`border rounded-lg p-4 mb-6 text-sm ${styles}`}>
      {children}
    </div>
  );
}

const TOC_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "parameters", label: "Token Parameters" },
  { id: "tax", label: "Tax Mechanics" },
  { id: "rewards", label: "Reward Distribution" },
  { id: "protected-sell", label: "Protected Sell Windows" },
  { id: "lp", label: "LP Injection" },
  { id: "burn", label: "Burn Governor" },
  { id: "hold-time", label: "Hold-Time Tracking" },
  { id: "admin", label: "Admin Functions" },
  { id: "security", label: "Security" },
  { id: "limitations", label: "Known Limitations" },
  { id: "addresses", label: "Contract Addresses" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-cream/80 backdrop-blur-md border-b border-divider">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 group"
          >
            <div className="bg-ink text-cream font-black text-xs px-2.5 py-1 rounded-lg">
              $FIRE
            </div>
            <span className="font-mono text-ink-muted text-xs group-hover:text-fire transition-colors">
              / docs
            </span>
          </Link>
          <Link
            href="/"
            className="font-mono text-xs text-ink-muted hover:text-fire transition-colors"
          >
            Back to site
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        {/* Title */}
        <div className="mb-12">
          <p className="font-mono text-fire text-xs tracking-[0.2em] uppercase mb-4">
            Protocol Documentation
          </p>
          <h1 className="font-serif font-black text-ink text-3xl sm:text-4xl leading-tight mb-4">
            $FIRE Token
          </h1>
          <p className="text-ink-light text-base sm:text-lg leading-relaxed max-w-2xl">
            ERC-20 on Base with linear time-weighted reflections, automatic
            LP injection, and a tiered burn governor. No off-chain
            keepers. No minting after deployment. 1B fixed supply.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="bg-white border border-divider rounded-lg p-6 mb-12">
          <p className="font-mono text-ink-muted text-xs tracking-[0.15em] uppercase mb-4">
            Contents
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {TOC_ITEMS.map((item, i) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="font-mono text-sm text-ink-light hover:text-fire transition-colors py-1"
              >
                <span className="text-ink-muted mr-2">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* --- Sections --- */}

        <Section id="overview" label="01" title="Protocol Overview">
          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            $FIRE is a reflection token on Base that runs entirely on-chain.
            No bots. No manual work. Everything executes automatically as a
            side effect of regular buys and sells.
          </p>
          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            Every buy and sell generates a <strong className="text-ink">4% tax</strong>{" "}
            split into two functions:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-divider rounded-lg p-5">
              <p className="font-mono text-fire text-xs tracking-wide uppercase mb-2">
                2% &rarr; Liquidity Pool
              </p>
              <p className="text-ink-light text-sm leading-relaxed">
                Tax tokens accumulate in the contract. Once they hit a
                threshold, half is swapped to ETH and paired with the other
                half as Uniswap V2 liquidity. Deeper liquidity means less
                slippage for everyone.
              </p>
            </div>
            <div className="bg-white border border-divider rounded-lg p-5">
              <p className="font-mono text-fire text-xs tracking-wide uppercase mb-2">
                2% &rarr; Holder Rewards
              </p>
              <p className="text-ink-light text-sm leading-relaxed">
                Tax tokens feed a pull-based reward accumulator. Your share
                is weighted by balance &times; time held. Hold longer, earn
                more per token. Rewards auto-sweep to your wallet on your
                next interaction.
              </p>
            </div>
          </div>
          <p className="text-ink-light text-sm sm:text-base leading-relaxed">
            On top of that, a{" "}
            <strong className="text-ink">tiered burn governor</strong> watches
            whale concentration. When enough big holders have held long enough,
            a slice of rewards gets permanently burned to{" "}
            <code className="bg-cream-dark px-1.5 py-0.5 rounded text-xs font-mono">0xdEaD</code>{" "}
            instead of paid out. This is the only burn mechanism in the
            contract.
          </p>
        </Section>

        <Section id="parameters" label="02" title="Token Parameters">
          <InfoTable
            rows={[
              ["Name", "FinancialIndependenceRetireEarly"],
              ["Symbol", "$FIRE"],
              ["Decimals", "18"],
              ["Total Supply", "1,000,000,000 (fixed forever)"],
              ["Mintable", "No - _mint called once in constructor only"],
              ["Network", "Base (chainId 8453)"],
              ["DEX", "Uniswap V2"],
              ["Buy Tax", "4% (2% LP + 2% rewards)"],
              ["Sell Tax", "4% (2% LP + 2% rewards)"],
              ["Wallet-to-Wallet", "0% - tax only on AMM trades"],
            ]}
          />
          <Callout>
            The entire supply is minted to the deployer in the constructor. No
            external mint function exists. Supply can only decrease when the
            burn governor sends reward tokens to the dead address.
          </Callout>
        </Section>

        <Section id="tax" label="03" title="Tax Mechanics">
          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            The tax hooks into the <code className="bg-cream-dark px-1.5 py-0.5 rounded text-xs font-mono">_update</code> override
            at the lowest level of the ERC-20 transfer. You can&apos;t dodge it
            by going directly through the pair or routing through another contract.
          </p>
          <CodeBlock>{`Buy/Sell detected (AMM pair involved):
  taxAmount  = transfer * 4%
  lpTax      = taxAmount / 2    (2% of transfer -> LP pool)
  rewardTax  = taxAmount / 2    (2% of transfer -> holders)

  LP portion accumulates until threshold, then auto-injects
  Net amount delivered to buyer/seller`}</CodeBlock>

          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            What gets taxed
          </h3>
          <InfoTable
            rows={[
              ["Buy from Uniswap", "4% tax applied"],
              ["Sell to Uniswap", "4% tax applied"],
              ["Wallet \u2192 Wallet", "No tax"],
              ["Exempt address", "No tax"],
            ]}
          />

          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            Trading guard
          </h3>
          <p className="text-ink-light text-sm sm:text-base leading-relaxed">
            A one-way <code className="bg-cream-dark px-1.5 py-0.5 rounded text-xs font-mono">tradingOpen</code> flag
            prevents all non-exempt transfers until the owner
            calls <code className="bg-cream-dark px-1.5 py-0.5 rounded text-xs font-mono">openTrading()</code>.
            This is irreversible. Once open, it cannot be closed.
          </p>
        </Section>

        <Section id="rewards" label="04" title="Reward Distribution">
          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            Rewards use a <strong className="text-ink">pull-based O(1) accumulator</strong>.
            A global <code className="bg-cream-dark px-1.5 py-0.5 rounded text-xs font-mono">rewardPerScore</code> index
            advances every time reward tokens come in from a taxed trade. Your
            pending rewards are calculated from this index and auto-swept to
            your wallet whenever your address is involved in any transaction
            (buy, sell, transfer, or claim). No hourly loop. No gas scaling
            with holder count.
          </p>

          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            Hold score formula
          </h3>
          <CodeBlock>{`holdScore = balance * secondsHeld (capped at 2 years)

Your share = your holdScore / total of all holdScores

Pending = scoreSnapshot * (rewardPerScore - rewardPerScorePaid) / PRECISION`}</CodeBlock>

          <div className="space-y-3 mb-6">
            {[
              [
                "Time and size are equally weighted",
                "10,000 tokens held 30 days = 20,000 tokens held 15 days.",
              ],
              [
                "New buyers start at zero",
                "Your score grows continuously from your first buy.",
              ],
              [
                "Adding tokens keeps your clock",
                "Buying more doesn\u2019t reset your hold time.",
              ],
              [
                "Selling resets your clock to zero",
                "Unless you qualify for a protected sell (see next section).",
              ],
              [
                "2-year cap",
                "Prevents oldest wallets from permanently dominating rewards.",
              ],
              [
                "Auto-sweep",
                "Accrued rewards transfer to your wallet automatically on your next on-chain interaction. You can also call claimRewards() manually.",
              ],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <div className="flex-shrink-0 w-1.5 h-1.5 bg-fire rounded-full mt-2" />
                <div>
                  <span className="text-ink font-semibold text-sm">{title}.</span>{" "}
                  <span className="text-ink-light text-sm">{desc}</span>
                </div>
              </div>
            ))}
          </div>

          <Callout type="warning">
            Selling any amount to the AMM resets your hold timer completely
            and your multiplier drops to zero. The one exception is the
            protected sell window described below.
          </Callout>
        </Section>

        <Section id="protected-sell" label="05" title="Protected Sell Windows">
          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            After holding for <strong className="text-ink">15 days</strong>,
            you unlock a protected sell window. You can sell up
            to <strong className="text-ink">20% of your bag</strong> without
            resetting your hold clock. Your multiplier stays intact.
          </p>

          <div className="space-y-3 mb-6">
            {[
              [
                "15-day cooldown",
                "Your first window opens 15 days after your initial buy. After each protected sell, you wait another 15 days for the next one.",
              ],
              [
                "20% max per window",
                "You can sell up to 20% of your balance at the time of the sell. Anything over 20% resets your clock like a normal sell.",
              ],
              [
                "Clock preserved",
                "A valid protected sell keeps your holdStart timestamp. Your multiplier keeps growing as if nothing happened.",
              ],
              [
                "One per window",
                "You get one protected sell per 15-day window. Use it or wait, it doesn\u2019t stack.",
              ],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <div className="flex-shrink-0 w-1.5 h-1.5 bg-fire rounded-full mt-2" />
                <div>
                  <span className="text-ink font-semibold text-sm">{title}.</span>{" "}
                  <span className="text-ink-light text-sm">{desc}</span>
                </div>
              </div>
            ))}
          </div>

          <CodeBlock>{`Protected sell check:
  1. holdStart must be > 0 (you're holding)
  2. Must have held >= 15 days
  3. Last protected sell must be >= 15 days ago (or never used)
  4. Sell amount must be <= 20% of your balance

  Pass all four = clock preserved
  Fail any one  = full clock reset`}</CodeBlock>

          <Callout>
            The dashboard shows your protected sell allowance
            via <code className="bg-cream-dark px-1.5 py-0.5 rounded text-xs font-mono">protectedSellAllowance(addr)</code> and
            time until your next window
            via <code className="bg-cream-dark px-1.5 py-0.5 rounded text-xs font-mono">timeUntilNextWindow(addr)</code>.
          </Callout>
        </Section>

        <Section id="lp" label="06" title="LP Injection">
          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            The 2% LP portion of every tax accumulates in the contract. Once
            it hits <strong className="text-ink">0.1% of total supply</strong> (~1M
            tokens), the contract automatically injects liquidity:
          </p>

          <CodeBlock>{`LP injection (triggered automatically):
  1. Take accumulated LP tokens
  2. Swap half to ETH via Uniswap
  3. Pair the other half + ETH as liquidity
  4. LP tokens sent to contract owner

  Threshold: 1,000,000 FIRE (0.1% of supply)`}</CodeBlock>

          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            This deepens the liquidity pool over time, reducing slippage for
            all traders. The injection runs inside the same transaction as a
            normal trade, so nobody needs to trigger it manually.
          </p>

          <Callout>
            Anyone can call <code className="bg-cream-dark px-1.5 py-0.5 rounded text-xs font-mono">manualInjectLP()</code> to
            force an injection if the threshold is met. The owner can
            call <code className="bg-cream-dark px-1.5 py-0.5 rounded text-xs font-mono">forceInjectLP()</code> to
            inject at any accumulated amount.
          </Callout>
        </Section>

        <Section id="burn" label="07" title="Burn Governor">
          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            The burn governor is the <strong className="text-ink">only burn
            mechanism</strong> in the contract. It watches whale concentration
            and burns a percentage of reward tokens
            to <code className="bg-cream-dark px-1.5 py-0.5 rounded text-xs font-mono">0xdEaD</code> before
            they get distributed to holders.
          </p>

          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            How it works
          </h3>
          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            When reward tokens come in from a taxed trade, the contract checks
            the current burn tier. If a tier is active, that percentage of the
            reward tokens gets sent to the dead address instead of entering
            the reward accumulator. The rest goes to holders as normal.
          </p>

          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            Whale qualification
          </h3>
          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            An address qualifies as a whale when it holds &ge; 100,000 tokens
            continuously. Any dip below this threshold fully resets the clock.
            Whales are tracked in real-time using O(1) band counters, not
            by iterating all holders.
          </p>

          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            Tier table
          </h3>
          <TierTable />

          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            Both conditions (whale count and hold duration) must be true at
            the same time. The contract checks from Tier 4 down and picks the
            highest qualifying tier. If nothing qualifies, burn rate is 0% and
            all rewards go to holders.
          </p>

          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            Fully reversible
          </h3>
          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            If whales sell, their clocks reset, the qualifying count falls, and
            the burn tier drops automatically. No owner action needed.
            Burned tokens are sent
            to <code className="bg-cream-dark px-1.5 py-0.5 rounded text-xs font-mono">0xdEaD</code>,
            permanently removing them from circulation.
          </p>

          <Callout>
            Burn tier is re-evaluated at most once per hour. Call{" "}
            <code className="bg-cream-dark px-1.5 py-0.5 rounded text-xs font-mono">manualCheckBurnTier()</code>{" "}
            to force an immediate re-check.
          </Callout>
        </Section>

        <Section id="hold-time" label="08" title="Hold-Time Tracking">
          <p className="text-ink-light text-sm sm:text-base leading-relaxed mb-4">
            Every address has two independent clocks:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-divider rounded-lg p-5">
              <p className="font-mono text-fire text-xs tracking-wide uppercase mb-2">
                holdStart
              </p>
              <p className="text-ink-light text-sm leading-relaxed">
                When you began holding. Used for reward scoring and protected
                sell eligibility. Resets on any non-protected sell to AMM.
              </p>
            </div>
            <div className="bg-white border border-divider rounded-lg p-5">
              <p className="font-mono text-fire text-xs tracking-wide uppercase mb-2">
                whaleStart
              </p>
              <p className="text-ink-light text-sm leading-relaxed">
                When you first crossed the 100k token threshold. Used by the
                burn governor. Resets if balance drops below 100k.
              </p>
            </div>
          </div>

          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            Clock rules
          </h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border border-divider rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-ink text-white">
                  <th className="px-4 py-2.5 text-left font-mono text-xs">
                    Event
                  </th>
                  <th className="px-4 py-2.5 text-left font-mono text-xs">
                    holdStart
                  </th>
                  <th className="px-4 py-2.5 text-left font-mono text-xs">
                    whaleStart
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["First buy", "Set to now", "Set if >= 100k"],
                  ["Buy more (already holding)", "Unchanged", "Set if newly crosses 100k"],
                  ["Receive rewards", "Unchanged", "Set if crosses 100k"],
                  ["Protected sell (\u226420%, 15d+)", "Unchanged", "Reset if < 100k"],
                  ["Normal sell to AMM", "Reset to 0", "Reset if < 100k"],
                  ["Wallet transfer out (partial)", "Unchanged", "Reset if < 100k"],
                  ["Wallet transfer out (all)", "Reset to 0", "Reset to 0"],
                ].map(([event, hold, whale], i) => (
                  <tr
                    key={event}
                    className={i % 2 === 0 ? "bg-cream-dark/50" : "bg-white"}
                  >
                    <td className="px-4 py-2.5 text-ink text-sm">{event}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-light">
                      {hold}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-light">
                      {whale}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            View functions
          </h3>
          <InfoTable
            rows={[
              ["secondsHeld(addr)", "Seconds since holdStart (max 2 years)"],
              ["holdScore(addr)", "balance \u00d7 secondsHeld"],
              ["rewardShare(addr)", "Your fraction of the reward pool (scaled to 1e18)"],
              ["pendingReward(addr)", "Tokens you can claim right now"],
              ["protectedSellAllowance(addr)", "Max tokens you can sell without clock reset"],
              ["timeUntilNextWindow(addr)", "Seconds until your next protected sell window"],
            ]}
          />
        </Section>

        <Section id="admin" label="09" title="Admin & Public Functions">
          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            Owner-only
          </h3>
          <InfoTable
            rows={[
              ["openTrading()", "Enable public trading (irreversible)"],
              ["setExempt(addr, bool)", "Add/remove tax exemption"],
              ["setAMMPair(addr, bool)", "Register additional AMM pairs"],
              ["forceInjectLP()", "Inject LP at any accumulated amount"],
              ["rescueETH(amount)", "Recover stranded ETH"],
              ["rescueTokens(token, amount)", "Recover stuck tokens (can't touch LP-earmarked tokens)"],
            ]}
          />

          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            Anyone can call
          </h3>
          <InfoTable
            rows={[
              ["claimRewards()", "Manually claim your accrued reward tokens"],
              ["manualInjectLP()", "Trigger LP injection if threshold is met"],
              ["manualCheckBurnTier()", "Force burn tier re-evaluation"],
            ]}
          />
        </Section>

        <Section id="security" label="10" title="Security">
          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            Audit findings (resolved)
          </h3>
          <div className="space-y-4 mb-6">
            <div className="bg-white border border-divider rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-fire text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                  Critical (Fixed)
                </span>
              </div>
              <p className="text-ink font-semibold text-sm mb-1">
                Tax split math error
              </p>
              <p className="text-ink-light text-sm leading-relaxed">
                Original code double-divided by basis points, sending 98% of tax
                to LP and ~2% to rewards. Fixed to a clean 50/50 split.
              </p>
            </div>
            <div className="bg-white border border-divider rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-fire text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                  Critical (Fixed)
                </span>
              </div>
              <p className="text-ink font-semibold text-sm mb-1">
                rescueTokens always returned 0
              </p>
              <p className="text-ink-light text-sm leading-relaxed">
                Arithmetic identity made protected amount always equal contract
                balance. Fixed to correctly calculate rescuable portion.
              </p>
            </div>
          </div>

          <h3 className="font-serif font-bold text-ink text-lg mb-3">
            Confirmed safe
          </h3>
          <div className="space-y-3 mb-6">
            {[
              [
                "Reentrancy",
                "State changes before external calls. All public functions carry nonReentrant.",
              ],
              [
                "No minting",
                "_mint is internal, called once in constructor. No external mint function exists.",
              ],
              [
                "Trading guard",
                "All transfers between non-exempt addresses revert until openTrading() is called.",
              ],
              [
                "O(1) gas",
                "Rewards use a pull-based accumulator. Whale counting uses band counters. Neither iterates holders. Gas cost is constant regardless of holder count.",
              ],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <div className="flex-shrink-0 w-1.5 h-1.5 bg-fire rounded-full mt-2" />
                <div>
                  <span className="text-ink font-semibold text-sm">{title}.</span>{" "}
                  <span className="text-ink-light text-sm">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="limitations" label="11" title="Known Limitations">
          <div className="space-y-3">
            {[
              [
                "Early-buyer advantage",
                "Adding tokens doesn\u2019t reset your clock. Early buyers who DCA accumulate faster in hold-score terms. This is intentional.",
              ],
              [
                "1-hour burn cache",
                "Burn tier updates at most once per hour. A whale who sells right after evaluation still counts for up to an hour. Call manualCheckBurnTier() to force re-evaluation.",
              ],
              [
                "Token-denominated rewards",
                "All rewards are in $FIRE tokens. USD value fluctuates with price. No on-chain oracle.",
              ],
              [
                "LP injection timing",
                "LP injection only triggers when the accumulated LP tax hits 0.1% of supply. Low-volume periods may see delayed injections.",
              ],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <div className="flex-shrink-0 w-1.5 h-1.5 bg-ink-muted rounded-full mt-2" />
                <div>
                  <span className="text-ink font-semibold text-sm">{title}.</span>{" "}
                  <span className="text-ink-light text-sm">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="addresses" label="12" title="Contract Addresses (Base)">
          <InfoTable
            rows={[
              ["Uniswap V2 Router", "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"],
              ["WETH on Base", "0x4200000000000000000000000000000000000006"],
              ["$FIRE Token", "0x6774D36C037ba6465f21b189eb4FfF9011e2Eb98"],
              ["Burn Address", "0x000000000000000000000000000000000000dEaD"],
            ]}
          />
        </Section>

        {/* Footer */}
        <div className="border-t border-divider pt-8 mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-sm text-ink-muted hover:text-fire transition-colors"
          >
            &larr; Back to $FIRE
          </Link>
        </div>
      </div>
    </div>
  );
}
