import type { Metadata } from "next";
import { NavShell, FooterV3, BuyButton } from "@/components/fire-v3/shared";

export const metadata: Metadata = {
  title: "FIRE — How it works & how to buy",
  description:
    "FIRE pays you in tokenized stocks for holding. Here's how to buy, and how the streak, dividends, jackpot and welcome bonus actually work — in plain terms.",
};

const MONO =
  "font-[family-name:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)]";

/* Small building blocks — kept local so this page is self-contained. */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${MONO} text-[11px] tracking-[0.22em] uppercase`}
      style={{ color: "var(--fv-green)" }}
    >
      {children}
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-5 sm:gap-7">
      <div
        className={`${MONO} shrink-0 text-[15px] leading-none pt-1`}
        style={{ color: "var(--fv-green)", width: 34 }}
      >
        {n}
      </div>
      <div className="min-w-0 pb-9 flex-1" style={{ borderBottom: "1px solid var(--fv-line)" }}>
        <h3 className="text-[19px] sm:text-[22px] font-semibold mb-2 leading-snug">{title}</h3>
        <div className="text-[14.5px] sm:text-[15px] leading-relaxed" style={{ color: "var(--fv-muted)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Card({
  label,
  headline,
  children,
}: {
  label: string;
  headline: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fv-panel p-6 sm:p-7 h-full">
      <div className={`${MONO} text-[10px] tracking-[0.18em] uppercase mb-4`} style={{ color: "var(--fv-muted)" }}>
        {label}
      </div>
      <h3 className="text-[20px] sm:text-[23px] font-semibold mb-3 leading-snug">{headline}</h3>
      <div className="text-[14.5px] leading-relaxed" style={{ color: "var(--fv-muted)" }}>
        {children}
      </div>
    </div>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <span className={MONO} style={{ color: "var(--fv-text)" }}>
      {children}
    </span>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="fv-page min-h-screen">
      <NavShell active="dashboard" />

      <main style={{ maxWidth: 900, margin: "0 auto" }} className="px-5 sm:px-8">
        {/* hero — the thesis, stated plainly */}
        <section className="pt-16 sm:pt-24 pb-14 sm:pb-20">
          <Eyebrow>The one-line version</Eyebrow>
          <h1 className="mt-5 text-[34px] sm:text-[52px] font-semibold leading-[1.05] tracking-tight">
            Hold FIRE.<br />
            Get paid in <span style={{ color: "var(--fv-green)" }}>real stocks.</span>
          </h1>
          <p className="mt-6 text-[16px] sm:text-[18px] leading-relaxed max-w-[620px]" style={{ color: "var(--fv-muted)" }}>
            Every trade on FIRE feeds a pool. That pool buys tokenized stocks — GME, NVDA, and
            others — and pays them out to holders. The longer you hold without selling, the bigger
            your share. No staking, no lockups, no claiming hoops. Just hold.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <BuyButton className="text-[15px] px-6 py-3" />
            <a
              href="#how-to-buy"
              className={`${MONO} text-[13px] tracking-[0.06em] uppercase px-5 py-3 rounded-full`}
              style={{ border: "1px solid var(--fv-line-strong)", color: "var(--fv-muted)" }}
            >
              How to buy ↓
            </a>
          </div>
        </section>

        {/* how to buy — a real sequence, so numbering is honest */}
        <section id="how-to-buy" className="scroll-mt-24 pb-16 sm:pb-24">
          <Eyebrow>How to buy</Eyebrow>
          <h2 className="mt-4 mb-10 text-[26px] sm:text-[34px] font-semibold tracking-tight">
            Four steps, about five minutes.
          </h2>

          <div className="flex flex-col">
            <Step n="01" title="Get a wallet">
              Install a self-custody wallet like MetaMask or Rabby (browser extension or phone app).
              This is your account — nobody else can touch it, so keep your recovery phrase somewhere
              safe and never share it.
            </Step>
            <Step n="02" title="Fund it with ETH on Robinhood Chain">
              FIRE lives on Robinhood Chain. You&apos;ll need a small amount of ETH there to buy with and
              to cover network fees. Bridge or transfer ETH to your wallet on that network.
            </Step>
            <Step n="03" title="Buy through the official swap">
              Use the <a href="/swap" style={{ color: "var(--fv-green)" }}>Buy $FIRE</a> button on this
              site. It routes through the correct FIRE pool automatically, so you always get the real
              token at a fair price. Enter how much ETH you want to spend and confirm in your wallet.
            </Step>
            <Step n="04" title="Hold — and watch your streak start">
              The moment you hold FIRE, your streak begins. Open your{" "}
              <a href="/dashboard" style={{ color: "var(--fv-green)" }}>dashboard</a> to see it grow,
              track dividends you&apos;ve been paid, and check your rank. That&apos;s it — you&apos;re in.
            </Step>
          </div>

          <div
            className="mt-8 p-5 rounded-2xl text-[13.5px] leading-relaxed"
            style={{ background: "var(--fv-green-soft)", color: "var(--fv-muted)" }}
          >
            <span style={{ color: "var(--fv-text)", fontWeight: 600 }}>Only buy through the official link.</span>{" "}
            Copy-cat pools and look-alike tokens exist. The Buy button here always points at the real
            FIRE pool — if you buy elsewhere, check the contract address against the one on this site first.
          </div>
        </section>

        {/* how it works — the four mechanics, plain language */}
        <section className="pb-16 sm:pb-24">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 mb-3 text-[26px] sm:text-[34px] font-semibold tracking-tight">
            The whole system, four ideas.
          </h2>
          <p className="mb-10 text-[15px] leading-relaxed max-w-[620px]" style={{ color: "var(--fv-muted)" }}>
            FIRE rewards patience over size. Here&apos;s every moving part, in plain terms.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            <Card label="Dividends" headline="You get paid in real stocks">
              A small fee on every trade builds a pool. The protocol converts it into a basket of
              tokenized stocks and sends it straight to holders&apos; wallets — nothing to claim. Your cut
              is proportional to how long and how much you&apos;ve held. A portion of each distribution is
              reinvested to deepen the pool&apos;s liquidity, which keeps buys and sells smoother for
              everyone. The current basket is set on-chain and shown on your dashboard.
            </Card>

            <Card label="Streak" headline="The longer you hold, the more you earn">
              Your streak counts the days since you started holding without selling. A longer streak
              means a bigger share of every dividend. Buying more doesn&apos;t reset it — only selling does.
              Money buys a bigger bag; it can&apos;t buy a longer streak.
            </Card>

            <Card label="Jackpot" headline="A weekly prize for diamond hands">
              Every week, one holder wins a jackpot paid in the stock basket. To be eligible you need a{" "}
              <Num>30-day</Num> streak. Your odds scale with your streak and your bag. Recent winners
              sit out a cooldown so it spreads around, and the draw is settled on-chain so nobody can
              rig it.
            </Card>

            <Card label="Welcome bonus" headline="Your first month pays off fast">
              New buyers who put in <Num>$50+</Num> in a single buy and hold for <Num>24 hours</Num>{" "}
              get <Num>$5</Num> of the stock basket, free. First <Num>20</Num> qualifying buyers a day.
              One per wallet — sell inside the 24 hours and you forfeit it, so hold.
            </Card>
          </div>
        </section>

        {/* the numbers — honest, plain, no fine-print games */}
        <section className="pb-16 sm:pb-24">
          <Eyebrow>The numbers, straight</Eyebrow>
          <h2 className="mt-4 mb-8 text-[26px] sm:text-[34px] font-semibold tracking-tight">
            No hidden mechanics.
          </h2>

          <div className="fv-panel divide-y" style={{ borderColor: "var(--fv-line)" }}>
            {[
              ["Buy fee", "1%", "Small fee on buys — feeds the dividend pool."],
              ["Sell fee", "3% → 1%", "Starts at 3%, rebates down toward 1% the longer your tranches age. Patience is cheaper."],
              ["Dividend split", "80%", "Most of every distribution goes to holders as tokenized stocks."],
              ["Liquidity", "reinvested", "A portion of each distribution is reinvested to keep the pool deep and trading smooth."],
              ["Jackpot entry", "30-day streak", "Hold 30 days to be eligible for the weekly draw."],
              ["Jackpot carve", "5%", "5% of each distribution seeds the jackpot pool."],
              ["Welcome bonus", "$5", "For a $50+ buy held 24h — first 20 wallets each day."],
            ].map(([k, v, note]) => (
              <div key={k} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-5 sm:px-6 py-4">
                <div className={`${MONO} text-[11px] tracking-[0.12em] uppercase sm:w-[130px] shrink-0`} style={{ color: "var(--fv-muted)" }}>
                  {k}
                </div>
                <div className={`${MONO} text-[15px] sm:w-[130px] shrink-0`} style={{ color: "var(--fv-green)" }}>
                  {v}
                </div>
                <div className="text-[13.5px] leading-relaxed" style={{ color: "var(--fv-muted)" }}>
                  {note}
                </div>
              </div>
            ))}
          </div>
          <p className={`${MONO} text-[11px] mt-4 leading-relaxed`} style={{ color: "var(--fv-faint)" }}>
            Parameters are set on-chain and can be verified against the contracts. Live values on your
            dashboard are the source of truth if anything here ever drifts.
          </p>
        </section>

        {/* honest expectations */}
        <section className="pb-16 sm:pb-24">
          <div className="fv-panel p-6 sm:p-8">
            <Eyebrow>Worth being clear about</Eyebrow>
            <div className="mt-4 space-y-3 text-[14.5px] leading-relaxed" style={{ color: "var(--fv-muted)" }}>
              <p>
                FIRE is a crypto token. Its price can go up or down, and holding it carries risk like
                any crypto asset — only buy what you can afford to hold.
              </p>
              <p>
                Dividends and the jackpot come from trading activity, so they rise and fall with volume,
                not on a fixed schedule. The streak, the bonus, and the fee curve all reward one thing:
                holding rather than flipping.
              </p>
              <p>
                Nothing here is financial advice. Do your own research, and verify the contract addresses
                on this site before you buy anywhere.
              </p>
            </div>
          </div>
        </section>

        {/* final CTA */}
        <section className="pb-24 sm:pb-32 text-center">
          <h2 className="text-[28px] sm:text-[38px] font-semibold tracking-tight mb-3">
            Ready to start your streak?
          </h2>
          <p className="text-[15px] mb-7 max-w-[440px] mx-auto leading-relaxed" style={{ color: "var(--fv-muted)" }}>
            Buy once, hold, and let the dividends come to you.
          </p>
          <div className="flex justify-center">
            <BuyButton className="text-[16px] px-8 py-3.5" />
          </div>
        </section>
      </main>

      <FooterV3 />
    </div>
  );
}
