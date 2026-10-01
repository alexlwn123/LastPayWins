// @vitest-environment node
import { Webhook } from "standardwebhooks";
import { expect, test } from "vitest";
import { verifyPaymentEvent } from "./webhook";

const secret = `whsec_${Buffer.alloc(32, 1).toString("base64")}`;
function signed(body: string, date = new Date()) {
  return new Headers({
    "webhook-id": "event-123",
    "webhook-timestamp": Math.floor(date.getTime() / 1000).toString(),
    "webhook-signature": new Webhook(secret).sign("event-123", date, body),
  });
}
const payload = JSON.stringify({
  type: "checkout.completed",
  data: { metadata: { attemptId: "invoice-123" }, amountSats: 100 },
});
test("validates the raw signed body and extracts only the bound payment reference", () => {
  expect(verifyPaymentEvent(payload, signed(payload), secret)).toEqual({
    eventId: "event-123",
    attemptId: "invoice-123",
  });
});
test("rejects forged or replayed callbacks", () => {
  expect(() =>
    verifyPaymentEvent(
      payload.replace("100", "10000"),
      signed(payload),
      secret,
    ),
  ).toThrow();
  expect(() =>
    verifyPaymentEvent(
      payload,
      signed(payload, new Date(Date.now() - 3600000)),
      secret,
    ),
  ).toThrow();
});
test("requires metadata for reconciliation and ignores unrelated signed events", () => {
  const missing = JSON.stringify({ type: "checkout.completed", data: {} });
  expect(() => verifyPaymentEvent(missing, signed(missing), secret)).toThrow();
  const other = JSON.stringify({ type: "subscription.created", data: {} });
  expect(verifyPaymentEvent(other, signed(other), secret)).toBeNull();
});
