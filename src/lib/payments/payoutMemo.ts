export function payoutMemo(
  kind: "prize" | "refund",
  amount: number,
  fee?: { jackpot: number; feeBps: number },
) {
  if (kind === "refund")
    return `LastPayWins: returning your late ${amount} satoshi bid.`;
  const message = `Congratulations! You've won the ${fee?.jackpot ?? amount} satoshi jackpot from LastPayWins!`;
  return fee?.feeBps
    ? `${message} (${fee.feeBps / 100}% deducted for platform fees; ${amount} sats paid)`
    : message;
}
