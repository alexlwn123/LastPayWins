import "server-only";
import { timingSafeEqual } from "node:crypto";

export function isLocalSimulation() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.PAYMENT_MODE === "simulation" &&
    process.env.LOCAL_PAYMENTS === "true" &&
    new URL(process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://invalid")
      .hostname === "127.0.0.1"
  );
}

export function requireLiveConfig() {
  if (process.env.PAYMENT_MODE !== "mdk")
    throw new Error("MDK payments are not enabled");
  if (process.env.MDK_PREVIEW || process.env.NEXT_PUBLIC_MDK_PREVIEW)
    throw new Error("MDK preview flags must be unset");
  for (const name of [
    "MDK_ACCESS_TOKEN",
    "MDK_MNEMONIC",
    "MDK_WEBHOOK_SECRET",
  ]) {
    if (!process.env[name]) throw new Error(`Missing ${name}`);
  }
}

export function authorizedBridge(request: Request) {
  const secret = process.env.PAYMENT_BRIDGE_SECRET;
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return (
    !!secret &&
    supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
  );
}

export async function forwardPaymentEvent(eventId: string, attemptId: string) {
  const site =
    process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!site || !process.env.PAYMENT_BRIDGE_SECRET)
    throw new Error("Payment event bridge is not configured");
  const response = await fetch(`${site}/payments/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PAYMENT_BRIDGE_SECRET}`,
    },
    body: JSON.stringify({ eventId, attemptId }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Could not persist payment event");
}
