import {
  bridgeRequestSchema,
  checkoutSchema,
  payoutResultSchema,
  payoutInvoiceSchema,
  type BridgeRequest,
} from "../src/lib/payments/contracts";

export async function paymentBridge(request: BridgeRequest) {
  const url = process.env.PAYMENT_BRIDGE_URL;
  const secret = process.env.PAYMENT_BRIDGE_SECRET;
  if (!url || !secret) throw new Error("Payment server is not configured");
  const response = await fetch(`${url}/api/internal/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(bridgeRequestSchema.parse(request)),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok)
    throw new Error(`Payment server unavailable (${response.status})`);
  const body: unknown = await response.json();
  if (request.operation === "preparePayout") return payoutInvoiceSchema.parse(body);
  return request.operation === "payout"
    ? payoutResultSchema.parse(body)
    : checkoutSchema.parse(body);
}
