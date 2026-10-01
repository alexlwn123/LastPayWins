export function payoutMemo(kind: "prize" | "refund", amount: number) {
  return kind === "prize"
    ? `Congratulations! You've won the ${amount} satoshi jackpot from LastPayWins!`
    : `LastPayWins: returning your late ${amount} satoshi bid.`;
}
