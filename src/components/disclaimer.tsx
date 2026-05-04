type DisclaimerProps = {
  variant?: "footer" | "card";
};

export function Disclaimer({ variant = "footer" }: DisclaimerProps) {
  if (variant === "card") {
    return (
      <div className="bg-[var(--fr-paper)] border-2 border-[var(--fr-ink)] p-4 text-[10px] leading-[1.7] font-[family-name:var(--font-mono-jb)] opacity-70">
        <p className="text-[var(--fr-fire)] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">Disclaimer</p>
        <p>
          $FIRE is an experimental onchain game. it is not a financial product, investment vehicle, or security.
          payouts are not guaranteed and depend entirely on trading volume. do not purchase with funds you cannot
          afford to lose.
        </p>
      </div>
    );
  }
  return (
    <div className="border-t border-[rgba(241,234,216,0.18)] mt-6 pt-6">
      <p className="text-[10px] leading-[1.8] opacity-55 max-w-3xl">
        $FIRE is an experimental onchain game. it is not a financial product, investment vehicle, or security.
        payouts are not guaranteed and depend entirely on trading volume. do not purchase with funds you cannot
        afford to lose.
      </p>
    </div>
  );
}
