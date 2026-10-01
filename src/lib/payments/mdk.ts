import "server-only";
import {
  createMoneyDevKitClient,
  deriveNodeIdFromConfig,
  getCheckout,
} from "@moneydevkit/core";
import {
  programmaticPayout,
  waitForPayoutResult,
} from "@moneydevkit/nextjs/server";
import { requireLiveConfig } from "./config";
import {
  type BridgeRequest,
  checkoutSchema,
  type PaymentPayoutResult,
} from "./contracts";

import { payoutInvoice } from "./payoutInvoice";

type Checkout = Awaited<ReturnType<typeof getCheckout>>;

export function normalizeCheckout(checkout: Checkout) {
  const statuses = {
    UNCONFIRMED: "unconfirmed",
    CONFIRMED: "confirmed",
    PENDING_PAYMENT: "pending",
    PAYMENT_RECEIVED: "paid",
    EXPIRED: "expired",
  } as const;
  const amount = checkoutSchema.shape.amount.parse(
    checkout.invoice?.amountSats ??
      checkout.providedAmount ??
      checkout.invoiceAmountSats,
  );
  let netAmount = checkout.netAmount ?? amount;
  if (checkout.status === "PAYMENT_RECEIVED") {
    // MDK reports the gross invoice amount separately from sats received after
    // its fee. Keep the actual receipt separate from the promised bid amount.
    const received = checkout.invoice.amountSatsReceived;
    if (
      received === null ||
      !Number.isSafeInteger(received) ||
      received < 0 ||
      received > amount
    )
      throw new Error("Invalid received amount");
    netAmount = Math.min(netAmount, received);
  }
  return checkoutSchema.parse({
    checkoutId: checkout.id,
    attemptId: checkout.userMetadata?.attemptId,
    status: statuses[checkout.status],
    currency: checkout.currency,
    amount,
    netAmount,
    sandbox: checkout.sandbox,
    paymentRequest: checkout.invoice?.invoice,
    paymentHash: checkout.invoice?.paymentHash,
    expiresAt: Math.min(
      checkout.expiresAt.getTime(),
      checkout.invoice?.expiresAt.getTime() ?? Infinity,
    ),
  });
}

async function payout(
  request: Extract<BridgeRequest, { operation: "payout" }>,
): Promise<PaymentPayoutResult> {
  const idempotencyKey = `lpw-${request.payoutId}`;
  // Read by the stable key first, including after a dispatch timed out.
  const previous = await waitForPayoutResult({ idempotencyKey, timeoutMs: 1 });
  if (previous.data?.status === "SUCCESS") return { status: "succeeded" };
  if (previous.data?.status === "FAILED")
    return {
      status: "failed",
      error: previous.data.failureReason ?? "Lightning payout failed",
      terminalFailure: true,
    };
  const sent = await programmaticPayout({
    destination: request.destination,
    amountSats: request.amount,
    idempotencyKey,
  });
  if (sent.error) {
    return {
      status: sent.error.retryable === false ? "failed" : "pending",
      error: sent.error.reason ?? "Payout requires reconciliation",
    };
  }
  const result = await waitForPayoutResult({
    paymentId: sent.data.paymentId,
    timeoutMs: 5000,
  });
  return {
    status:
      result.data?.status === "SUCCESS"
        ? "succeeded"
        : result.data?.status === "FAILED"
          ? "failed"
          : "pending",
    paymentId: sent.data.paymentId,
    terminalFailure: result.data?.status === "FAILED",
    ...(result.data?.failureReason ? { error: result.data.failureReason } : {}),
  };
}

export async function handleMdk(request: BridgeRequest) {
  requireLiveConfig();
  if (request.operation === "preparePayout")
    return payoutInvoice(request.destination, request.amount, request.comment);
  if (request.operation === "payout") return payout(request);
  if (request.operation === "lookup")
    return normalizeCheckout(await getCheckout(request.checkoutId));
  const client = createMoneyDevKitClient();
  if (request.operation === "create") {
    // Intentionally stop before mintInvoice so Convex can persist the binding.
    return normalizeCheckout(
      await client.checkouts.create(
        {
          currency: "SAT",
          amount: request.amount,
          metadata: {
            attemptId: request.attemptId,
            title: "Bid - Last Pay Wins",
            description: request.memo ?? "Bid - Last Pay Wins",
          },
          sandbox: false,
        },
        deriveNodeIdFromConfig(),
      ),
    );
  }
  let checkout = await getCheckout(request.checkoutId);
  if (checkout.status === "UNCONFIRMED")
    checkout = await client.checkouts.confirm({
      checkoutId: request.checkoutId,
    });
  if (checkout.status === "CONFIRMED")
    checkout = await client.checkouts.mintInvoice({
      checkoutId: request.checkoutId,
      expirySecs: 300,
    });
  return normalizeCheckout(checkout);
}
