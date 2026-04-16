"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";

/* ── Section wrapper ── */

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <Reveal>
        <h2 className="text-xl lg:text-2xl font-bold text-white mb-6 font-mono">
          {title}
        </h2>
        <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
          {children}
        </div>
      </Reveal>
    </section>
  );
}

function Param({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-white/5">
      <span className="text-zinc-500">{label}</span>
      <div className="text-right">
        <span className="font-mono text-white text-sm">{value}</span>
        {note && (
          <span className="block text-[11px] text-zinc-600">{note}</span>
        )}
      </div>
    </div>
  );
}

/* ── Table of contents ── */

const TOC = [
  { id: "overview", label: "overview" },
  { id: "batch-auction", label: "batch auction" },
  { id: "creator-stake", label: "creator stake" },
  { id: "fees", label: "fees & earnings" },
  { id: "prove-score", label: "prove score" },
  { id: "quests", label: "quests" },
  { id: "parameters", label: "parameters" },
  { id: "for-creators", label: "for creators" },
  { id: "for-traders", label: "for traders" },
  { id: "architecture", label: "architecture" },
  { id: "programs", label: "on-chain programs" },
  { id: "faq", label: "faq" },
];

export default function DocsPage() {
  return (
    <div className="relative bg-[#050507] min-h-screen">
      {/* ── Header ── */}
      <section className="max-w-5xl mx-auto px-6 lg:px-8 pt-16 pb-12 border-b border-white/10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-400 text-xs font-mono transition-colors mb-8"
          >
            <span>&larr;</span>
            <span>back</span>
          </Link>
          <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight mb-4">
            documentation.
          </h1>
          <p className="text-zinc-500 text-base lg:text-lg font-mono max-w-xl">
            everything you need to know about prove. fair launches, creator
            earnings, and the mechanics that make it work.
          </p>
        </motion.div>
      </section>

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-16">
          {/* ── Sidebar TOC ── */}
          <aside className="hidden lg:block sticky top-24 self-start">
            <nav className="space-y-1">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-3 block">
                contents
              </span>
              {TOC.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-xs text-zinc-600 hover:text-zinc-300 font-mono py-1 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* ── Content ── */}
          <div className="space-y-16">
            {/* Overview */}
            <Section id="overview" title="overview">
              <p>
                prove is a token launch platform on Solana designed to fix the
                fundamental problems with existing launchpads. 98.6% of tokens
                on platforms like pump.fun rug within days. the issue isn't the
                people &mdash; it's the architecture.
              </p>
              <p>
                prove replaces the bonding curve with a{" "}
                <strong className="text-white">batch auction</strong>, requires
                creators to{" "}
                <strong className="text-white">stake real capital</strong>, and
                pays them{" "}
                <strong className="text-white">
                  0.8% of every trade forever
                </strong>
                . the result: creators are incentivized to build, not dump.
                communities get a fair start. and the feed only shows tokens
                that survived.
              </p>
              <div className="glass-card p-5 bg-gradient-to-br from-primary/5 to-transparent mt-4">
                <p className="text-xs text-zinc-500 font-mono">
                  &quot;coins deserve a fair start, not one decided by bots in
                  the first 10 seconds. creators should earn by building, not
                  by dumping.&quot;
                </p>
              </div>
            </Section>

            {/* Batch Auction */}
            <Section id="batch-auction" title="batch auction">
              <p>
                every token on prove launches through a 15-minute batch
                auction. during this window, participants commit SOL. when it
                closes, everyone receives tokens at the same uniform price.
              </p>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                how it works
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-zinc-400">
                <li>
                  creator configures their token (name, ticker, supply) and
                  stakes 2 SOL
                </li>
                <li>
                  a 15-minute gathering window opens &mdash; anyone can commit
                  SOL
                </li>
                <li>
                  when the window closes, the auction is finalized
                  (permissionless &mdash; anyone can trigger it)
                </li>
                <li>
                  if the auction met the minimums (50 wallets + 50 SOL), a
                  uniform price is calculated and participants claim their
                  tokens
                </li>
                <li>
                  if minimums weren't met, all SOL is returned automatically
                  &mdash; no penalty
                </li>
              </ol>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                why batch auctions?
              </h3>
              <ul className="space-y-2">
                <li>
                  <strong className="text-zinc-300">no front-running:</strong>{" "}
                  bots can't snipe because there's no price curve to game
                </li>
                <li>
                  <strong className="text-zinc-300">no MEV extraction:</strong>{" "}
                  uniform price means order doesn't matter
                </li>
                <li>
                  <strong className="text-zinc-300">fair for everyone:</strong>{" "}
                  first wallet and last wallet pay the exact same price
                </li>
              </ul>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                token supply split
              </h3>
              <p>
                65% of total supply goes to auction participants. the remaining
                35% is paired with all committed SOL to seed a Raydium CLMM
                liquidity pool. this means every token launches with real,
                protocol-owned liquidity.
              </p>
            </Section>

            {/* Creator Stake */}
            <Section id="creator-stake" title="creator stake">
              <p>
                every creator stakes 2 SOL when launching a token. this isn't a
                fee &mdash; it's collateral that proves the creator believes in
                their project.
              </p>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                the 72-hour milestone
              </h3>
              <p>
                after a successful auction, the clock starts. the creator has 72
                hours to reach{" "}
                <strong className="text-white">100 unique token holders</strong>
                . if they hit it, the 2 SOL stake is returned. if they don't,
                it's forfeited to the survivor pool.
              </p>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                the survivor pool
              </h3>
              <p>
                forfeited stakes accumulate in a shared pool. this capital is
                redistributed to support tokens that actually gained traction
                &mdash; bad launches fund good ones.
              </p>
            </Section>

            {/* Fees */}
            <Section id="fees" title="fees & creator earnings">
              <p>
                every token on prove trades on a Raydium CLMM pool with a
                hardcoded 1% fee tier. this fee cannot be bypassed &mdash; it
                applies to every swap through Raydium, Jupiter, or any
                aggregator.
              </p>

              <div className="glass-card p-5 mt-4 space-y-3">
                <Param label="total pool fee" value="1%" note="hardcoded at pool creation" />
                <Param label="creator share" value="0.8%" note="80% of fees" />
                <Param label="protocol share" value="0.2%" note="20% of fees" />
              </div>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                what this means for creators
              </h3>
              <p>
                at $50K daily trading volume, the creator earns roughly $400 per
                day &mdash; automatically, forever, as long as the community
                trades. this is the core incentive: creators earn by building
                community, not by dumping tokens.
              </p>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                no dynamic fees
              </h3>
              <p>
                there's no sniper tax, no graduated fees, no hidden mechanics.
                1% flat on every trade, split 80/20, always.
              </p>
            </Section>

            {/* Prove Score */}
            <Section id="prove-score" title="prove score">
              <p>
                prove score is a wallet reputation system that rewards
                long-term participation. it tracks your behavior across all
                launches on the platform.
              </p>

              <ul className="space-y-2 mt-4">
                <li>
                  <strong className="text-zinc-300">earning:</strong>{" "}
                  participate in auctions, hold tokens longer, complete quests
                </li>
                <li>
                  <strong className="text-zinc-300">decay:</strong> score drops
                  2 points per week of inactivity &mdash; you have to stay
                  engaged
                </li>
                <li>
                  <strong className="text-zinc-300">benefits cap:</strong>{" "}
                  perks plateau at 70 points so newcomers can always catch up
                </li>
                <li>
                  <strong className="text-zinc-300">max score:</strong> 100
                  points
                </li>
              </ul>

              <p className="mt-4">
                higher prove scores unlock priority in auctions, badges, and
                increased feed visibility. the system rewards diamond hands and
                filters out flippers.
              </p>
            </Section>

            {/* Quests */}
            <Section id="quests" title="quests">
              <p>
                quests are challenges that reward creators and communities with
                platform visibility. there's no treasury for bounties &mdash;
                the reward is attention.
              </p>

              <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {[
                  {
                    name: "X Posts",
                    req: "50 posts mentioning $TICKER in 2 hours",
                    reward: "feed pin for 24 hours",
                  },
                  {
                    name: "100 Holders",
                    req: "reach 100 unique wallet holders",
                    reward: "verified badge",
                  },
                  {
                    name: "Diamond Hands",
                    req: "community avg hold time > 12 hours",
                    reward: "diamond hands feature",
                  },
                  {
                    name: "Above Batch",
                    req: "price stays above launch price for 48h",
                    reward: "survivor badge",
                  },
                  {
                    name: "Graduation",
                    req: "200 holders + 3 quests completed",
                    reward: "graduation badge + feed boost",
                  },
                ].map((q) => (
                  <StaggerItem
                    key={q.name}
                    className="glass-card p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <h4 className="text-white text-xs font-semibold font-mono mb-1">
                      {q.name}
                    </h4>
                    <p className="text-zinc-500 text-xs mb-2">{q.req}</p>
                    <span className="inline-block text-[10px] font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded">
                      {q.reward}
                    </span>
                  </StaggerItem>
                ))}
              </StaggerGroup>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                feed ranking
              </h3>
              <p>
                the discover feed ranks tokens by a weighted score: holders
                (40%), 24h volume (30%), average hold time (20%), and quest
                completions (10%). only tokens that survived appear.
              </p>
            </Section>

            {/* Parameters */}
            <Section id="parameters" title="protocol parameters">
              <div className="glass-card p-5 space-y-0">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-4 block">
                  batch auction
                </span>
                <Param label="auction duration" value="15 min" />
                <Param label="minimum wallets" value="50" />
                <Param label="minimum SOL" value="50 SOL" />
                <Param label="buyer allocation" value="65%" note="of total supply" />
                <Param label="pool allocation" value="35%" note="+ all committed SOL" />
                <Param label="cooldown" value="30 sec" />
              </div>

              <div className="glass-card p-5 space-y-0 mt-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-4 block">
                  creator stake
                </span>
                <Param label="stake amount" value="2 SOL" />
                <Param label="milestone window" value="72 hours" />
                <Param label="holder requirement" value="100 unique wallets" />
              </div>

              <div className="glass-card p-5 space-y-0 mt-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-4 block">
                  fees
                </span>
                <Param label="pool fee" value="1%" note="hardcoded, cannot be bypassed" />
                <Param label="creator share" value="80%" note="0.8% of volume" />
                <Param label="protocol share" value="20%" note="0.2% of volume" />
              </div>

              <div className="glass-card p-5 space-y-0 mt-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-4 block">
                  prove score
                </span>
                <Param label="max score" value="100" />
                <Param label="benefits cap" value="70" />
                <Param label="weekly decay" value="2 points" />
              </div>
            </Section>

            {/* For Creators */}
            <Section id="for-creators" title="for creators">
              <h3 className="text-white font-semibold text-sm mb-2">
                launch day
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-zinc-400">
                <li>connect your wallet and go to /launch</li>
                <li>
                  configure your token: ticker, name, description, total supply
                </li>
                <li>
                  confirm the launch &mdash; this stakes 2 SOL and creates the
                  batch auction
                </li>
                <li>
                  share the auction link. you have 15 minutes to get 50 wallets
                  and 50 SOL committed
                </li>
              </ol>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                after launch
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-zinc-400">
                <li>
                  if the auction succeeds, a Raydium pool is created
                  automatically with 35% of supply + all committed SOL
                </li>
                <li>
                  your token is now tradeable on Raydium, Jupiter, and every
                  Solana aggregator
                </li>
                <li>you earn 0.8% of every trade, paid automatically</li>
                <li>
                  hit 100 holders within 72 hours to get your 2 SOL stake back
                </li>
                <li>
                  complete quests to earn badges and boost your token's feed
                  visibility
                </li>
              </ol>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                earnings example
              </h3>
              <div className="glass-card p-5 space-y-0 mt-2">
                <Param label="$10K daily volume" value="$80/day" />
                <Param label="$50K daily volume" value="$400/day" />
                <Param label="$100K daily volume" value="$800/day" />
                <Param label="$500K daily volume" value="$4,000/day" />
              </div>
            </Section>

            {/* For Traders */}
            <Section id="for-traders" title="for traders">
              <h3 className="text-white font-semibold text-sm mb-2">
                participating in auctions
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-zinc-400">
                <li>browse active auctions on the discover page</li>
                <li>commit any amount of SOL during the 15-minute window</li>
                <li>
                  when the auction closes, claim your tokens at the uniform
                  price
                </li>
                <li>
                  if the auction fails, your SOL is returned automatically
                </li>
              </ol>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                why it's different
              </h3>
              <ul className="space-y-2">
                <li>
                  <strong className="text-zinc-300">same price as everyone:</strong>{" "}
                  no matter when you commit, you pay the same price
                </li>
                <li>
                  <strong className="text-zinc-300">no bot disadvantage:</strong>{" "}
                  batch auctions eliminate the speed advantage that bots have
                  on bonding curves
                </li>
                <li>
                  <strong className="text-zinc-300">creator is invested:</strong>{" "}
                  2 SOL stake means the creator has skin in the game
                </li>
                <li>
                  <strong className="text-zinc-300">
                    real liquidity from day one:
                  </strong>{" "}
                  35% of supply + all auction SOL goes into a Raydium pool
                </li>
              </ul>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                building your prove score
              </h3>
              <p>
                hold tokens longer, participate in more auctions, and stay
                active to increase your prove score. higher scores unlock perks
                and priority access.
              </p>
            </Section>

            {/* Architecture */}
            <Section id="architecture" title="architecture">
              <p>
                prove runs on three Solana programs backed by an off-chain
                indexer, quest verifier, and a Next.js frontend. all trading
                happens on Raydium CLMM &mdash; prove does not operate its own
                AMM.
              </p>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                permissionless safety
              </h3>
              <p>
                critical lifecycle instructions &mdash; finalize auction, claim
                tokens, refund &mdash; are all permissionless. if the backend
                goes down, users can self-serve. there's no single point of
                failure.
              </p>

              <h3 className="text-white font-semibold text-sm mt-6 mb-2">
                emergency pause
              </h3>
              <p>
                the admin can pause the protocol globally. during a pause, new
                commits are blocked and users can self-refund their
                commitments. this protects users if any component is
                compromised.
              </p>
            </Section>

            {/* Programs */}
            <Section id="programs" title="on-chain programs">
              <div className="space-y-4">
                {[
                  {
                    name: "batch auction",
                    id: "D92hy2gaPK8uzTvfncRBsu2RXHZP7ZEsjRbynvc2tBdD",
                    desc: "token launches, SOL commitment, finalization, claims, and refunds",
                  },
                  {
                    name: "fee router",
                    id: "6RMoCadvfUsKCYMsTNUKv9vXk6MfrVHRkB7iZ6Kd6gck",
                    desc: "Raydium fee collection and 80/20 creator/protocol split",
                  },
                  {
                    name: "stake manager",
                    id: "3MWbnFSuwGpxRgGaYgtRRABmC8HDjdmZctjf5JZm5faE",
                    desc: "creator stake deposits, milestone evaluation, survivor pool",
                  },
                ].map((p) => (
                  <div key={p.name} className="glass-card p-4">
                    <h4 className="text-white text-xs font-semibold font-mono mb-1">
                      {p.name}
                    </h4>
                    <code className="text-[10px] text-zinc-600 font-mono break-all block mb-2">
                      {p.id}
                    </code>
                    <p className="text-zinc-500 text-xs">{p.desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* FAQ */}
            <Section id="faq" title="faq">
              {[
                {
                  q: "what happens if the auction doesn't meet the minimums?",
                  a: "all committed SOL is returned to participants automatically. there's no penalty for failed auctions (except the creator's 2 SOL stake is forfeited to the survivor pool).",
                },
                {
                  q: "can bots front-run the auction?",
                  a: "no. batch auctions calculate a single uniform price after the window closes. there's no advantage to being first. every wallet pays the same price.",
                },
                {
                  q: "how does the creator earn money?",
                  a: "0.8% of every trade on the token's Raydium pool flows to the creator automatically. this is enforced on-chain and cannot be changed. the creator earns as long as the community trades.",
                },
                {
                  q: "what if the creator rugs?",
                  a: "creators don't receive tokens. they earn through trade fees only. their 2 SOL stake is locked and forfeited if the token doesn't reach 100 holders. the incentive structure makes building more profitable than dumping.",
                },
                {
                  q: "what is the survivor pool?",
                  a: "when a token fails its 72-hour milestone (doesn't reach 100 holders), the creator's 2 SOL stake is forfeited to the survivor pool. this capital is redistributed to support tokens that actually gained traction.",
                },
                {
                  q: "can i trade on any DEX?",
                  a: "yes. after the auction succeeds, a Raydium CLMM pool is created. you can trade through Raydium, Jupiter, or any Solana aggregator. the 1% pool fee applies everywhere.",
                },
                {
                  q: "what blockchain is prove on?",
                  a: "Solana mainnet. all programs are deployed and verified on-chain.",
                },
                {
                  q: "is the code open source?",
                  a: "the on-chain programs are publicly verifiable on Solana. the full codebase is available on GitHub.",
                },
              ].map((item, i) => (
                <Reveal key={i}>
                  <div className="py-4 border-b border-white/5">
                    <h3 className="text-white text-sm font-medium mb-2">
                      {item.q}
                    </h3>
                    <p className="text-zinc-500 text-sm">{item.a}</p>
                  </div>
                </Reveal>
              ))}
            </Section>

            {/* CTA */}
            <Reveal>
              <div className="text-center pt-8">
                <h2 className="text-2xl font-bold text-white mb-4">
                  ready to prove it?
                </h2>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/launch"
                    className="group inline-flex items-center justify-center gap-2 px-7 py-3 bg-white text-zinc-950 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    launch a token
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/discover"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 border border-white/20 text-white text-sm font-semibold transition-all duration-200 hover:bg-white/5"
                  >
                    explore tokens
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
