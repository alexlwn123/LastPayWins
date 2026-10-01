import "server-only";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { isLocalSimulation } from "./config";
import type {
  BridgeRequest,
  PaymentCheckout,
  PaymentPayoutResult,
} from "./contracts";

type State = {
  checkouts: Record<string, PaymentCheckout>;
  payouts: Record<
    string,
    PaymentPayoutResult & { amount: number; destination: string }
  >;
};
const directory = join(process.cwd(), ".local-payments");
const file = join(directory, "state.json");
function read(): State {
  if (!isLocalSimulation())
    throw new Error("Local payment simulation is disabled");
  return existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : { checkouts: {}, payouts: {} };
}
function write(state: State) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(`${file}.tmp`, JSON.stringify(state), { mode: 0o600 });
  renameSync(`${file}.tmp`, file);
}
export function simulationState() {
  return read();
}
export function simulateReceipt(checkoutId: string) {
  const state = read();
  const checkout = state.checkouts[checkoutId];
  if (
    !checkout ||
    checkout.status === "unconfirmed" ||
    checkout.status === "confirmed"
  )
    throw new Error("Invoice is not available");
  checkout.status = "paid";
  write(state);
  return checkout;
}
export function handleSimulation(request: BridgeRequest) {
  const state = read();
  if (request.operation === "create") {
    const existing = Object.values(state.checkouts).find(
      (c) => c.attemptId === request.attemptId,
    );
    if (existing) return existing;
    const checkout: PaymentCheckout = {
      checkoutId: randomUUID(),
      attemptId: request.attemptId,
      status: "confirmed",
      currency: "SAT",
      amount: request.amount,
      netAmount: request.amount - Math.ceil(request.amount * 0.02),
      sandbox: true,
      expiresAt: Date.now() + 300_000,
    };
    state.checkouts[checkout.checkoutId] = checkout;
    write(state);
    return checkout;
  }
  if (request.operation === "payout") {
    const existing = state.payouts[request.payoutId];
    if (existing) {
      if (
        existing.amount !== request.amount ||
        existing.destination !== request.destination
      )
        throw new Error("Idempotency key reused with different payout");
      return existing;
    }
    const result = {
      status: "succeeded" as const,
      paymentId: `simulation-${request.payoutId}`,
      amount: request.amount,
      destination: request.destination,
    };
    state.payouts[request.payoutId] = result;
    write(state);
    return result;
  }
  const checkout = state.checkouts[request.checkoutId];
  if (!checkout) throw new Error("Unknown checkout");
  if (request.operation === "prepare" && checkout.status === "confirmed") {
    checkout.status = "pending";
    checkout.paymentRequest = `simulation:${checkout.checkoutId}`;
    checkout.paymentHash = checkout.checkoutId
      .replaceAll("-", "")
      .padEnd(64, "0");
    write(state);
  }
  return checkout;
}
