export const invoiceAmount = () => positiveInteger("INVOICE_AMOUNT", 100);
export function bidQuote() {
  const bidAmount = invoiceAmount();
  const amount = bidAmount + Math.ceil(bidAmount / 50);
  if (!Number.isSafeInteger(amount)) throw new Error("Invalid invoice amount");
  return {
    bidAmount,
    amount,
    memo: "Bid - Last Pay Wins — +2% for MDK routing fee",
  };
}

export const clockDuration = () =>
  positiveInteger("NEXT_PUBLIC_CLOCK_DURATION", 60) * 1000;

function positiveInteger(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`Invalid ${name}`);
  return value;
}

export function contribution(gross: number, reportedNet: number) {
  const feeBps = Number(process.env.MDK_FEE_RESERVE_BPS ?? 200);
  const routingReserve = Number(process.env.PAYOUT_RESERVE_SATS_PER_BID ?? 5);
  if (
    !Number.isInteger(feeBps) ||
    feeBps < 0 ||
    feeBps > 10000 ||
    !Number.isSafeInteger(routingReserve) ||
    routingReserve < 0
  ) {
    throw new Error("Invalid payment reserves");
  }
  const net = Math.min(
    reportedNet,
    gross - Math.ceil((gross * feeBps) / 10000),
  );
  return {
    net,
    credited: Math.max(0, net - routingReserve),
    reserved: gross - Math.max(0, net - routingReserve),
  };
}

export function acceptsSimulation() {
  return (
    process.env.PAYMENT_MODE === "simulation" &&
    process.env.LOCAL_PAYMENTS === "true" &&
    new URL(process.env.PAYMENT_BRIDGE_URL ?? "https://invalid").hostname ===
      "127.0.0.1"
  );
}
