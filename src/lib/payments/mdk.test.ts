// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

const mock = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  confirm: vi.fn(),
  mint: vi.fn(),
  send: vi.fn(),
  wait: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@moneydevkit/core", () => ({
  getCheckout: mock.get,
  deriveNodeIdFromConfig: () => "node-id",
  createMoneyDevKitClient: () => ({
    checkouts: {
      create: mock.create,
      confirm: mock.confirm,
      mintInvoice: mock.mint,
    },
  }),
}));
vi.mock("@moneydevkit/nextjs/server", () => ({
  programmaticPayout: mock.send,
  waitForPayoutResult: mock.wait,
}));

import { handleMdk } from "./mdk";

function checkout(status = "CONFIRMED") {
  return {
    id: "checkout-1",
    userMetadata: { attemptId: "attempt-1" },
    status,
    currency: "SAT",
    providedAmount: 100,
    netAmount: 100,
    sandbox: false,
    expiresAt: new Date(Date.now() + 300000),
    invoice:
      status === "CONFIRMED"
        ? null
        : {
            invoice: "lnbc-fixture",
            paymentHash: "hash",
            amountSats: 100,
            amountSatsReceived: status === "PAYMENT_RECEIVED" ? 100 : null,
            expiresAt: new Date(Date.now() + 300000),
          },
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PAYMENT_MODE", "mdk");
  vi.stubEnv("MDK_ACCESS_TOKEN", "test-token");
  vi.stubEnv("MDK_MNEMONIC", "test-only");
  vi.stubEnv("MDK_WEBHOOK_SECRET", "test-secret");
  vi.stubEnv("MDK_PREVIEW", "");
  vi.stubEnv("NEXT_PUBLIC_MDK_PREVIEW", "");
});

test("creates an unminted checkout, leaving a durable binding boundary before minting", async () => {
  mock.create.mockResolvedValue(checkout());
  const result = await handleMdk({
    operation: "create",
    attemptId: "attempt-1",
    amount: 100,
  });
  expect(result).toMatchObject({
    checkoutId: "checkout-1",
    attemptId: "attempt-1",
    status: "confirmed",
  });
  expect(mock.mint).not.toHaveBeenCalled();
  expect(mock.create).toHaveBeenCalledWith(
    expect.objectContaining({
      amount: 100,
      currency: "SAT",
      sandbox: false,
      metadata: expect.objectContaining({ attemptId: "attempt-1" }),
    }),
    "node-id",
  );
});
test("mints the bound checkout with five-minute expiry and keeps an existing invoice on retry", async () => {
  mock.get
    .mockResolvedValueOnce(checkout())
    .mockResolvedValueOnce(checkout("PENDING_PAYMENT"));
  mock.mint.mockResolvedValue(checkout("PENDING_PAYMENT"));
  await handleMdk({ operation: "prepare", checkoutId: "checkout-1" });
  await handleMdk({ operation: "prepare", checkoutId: "checkout-1" });
  expect(mock.mint).toHaveBeenCalledExactlyOnceWith({
    checkoutId: "checkout-1",
    expirySecs: 300,
  });
});
test("payout timeouts stay pending and retries preserve the idempotency key", async () => {
  mock.wait.mockResolvedValue({ data: { status: "REQUESTED" } });
  mock.send.mockResolvedValue({
    data: { accepted: true, paymentId: "payment-1" },
  });
  const request = {
    operation: "payout" as const,
    payoutId: "round-1",
    destination: "alice@example.com",
    amount: 93,
  };
  expect(await handleMdk(request)).toMatchObject({
    status: "pending",
    paymentId: "payment-1",
  });
  expect(await handleMdk(request)).toMatchObject({
    status: "pending",
    paymentId: "payment-1",
  });
  expect(mock.send.mock.calls.map(([args]) => args.idempotencyKey)).toEqual([
    "lpw-round-1",
    "lpw-round-1",
  ]);
});
test("credits actual sats received after MDK fees while retaining the gross invoice amount", async () => {
  const paid = checkout("PAYMENT_RECEIVED");
  if (!paid.invoice) throw new Error("Paid fixture must have an invoice");
  paid.invoice.amountSatsReceived = 98;
  mock.get.mockResolvedValue(paid);
  expect(await handleMdk({ operation: "lookup", checkoutId: "checkout-1" }))
    .toMatchObject({ status: "paid", amount: 100, netAmount: 98 });
});
test.each([null, -1, 101, 98.5, Number.NaN])(
  "rejects an invalid actual receipt (%s) instead of crediting the gross amount",
  async (received) => {
    const paid = checkout("PAYMENT_RECEIVED");
    if (!paid.invoice) throw new Error("Paid fixture must have an invoice");
    paid.invoice.amountSatsReceived = received;
    mock.get.mockResolvedValue(paid);
    await expect(handleMdk({ operation: "lookup", checkoutId: "checkout-1" }))
      .rejects.toThrow("Invalid received amount");
  },
);
test("recovers a successful payout after a lost dispatch response without sending again", async () => {
  mock.wait.mockResolvedValue({
    data: { status: "SUCCESS", preimage: "proof" },
  });
  expect(
    await handleMdk({
      operation: "payout",
      payoutId: "round-1",
      destination: "alice@example.com",
      amount: 93,
    }),
  ).toEqual({ status: "succeeded" });
  expect(mock.send).not.toHaveBeenCalled();
});
test("insufficient funds remain pending and terminal configuration errors are surfaced", async () => {
  mock.wait.mockResolvedValue({ data: { status: "REQUESTED" } });
  mock.send
    .mockResolvedValueOnce({
      error: { reason: "payout_dispatch_failed", retryable: true },
    })
    .mockResolvedValueOnce({
      error: { reason: "programmatic_payouts_disabled", retryable: false },
    });
  const request = {
    operation: "payout" as const,
    payoutId: "round-1",
    destination: "alice@example.com",
    amount: 93,
  };
  expect(await handleMdk(request)).toMatchObject({ status: "pending" });
  expect(await handleMdk(request)).toMatchObject({
    status: "failed",
    error: "programmatic_payouts_disabled",
  });
});
test("preview flags cannot enable fabricated receipts in the live adapter", async () => {
  vi.stubEnv("MDK_PREVIEW", "true");
  await expect(
    handleMdk({ operation: "lookup", checkoutId: "checkout-1" }),
  ).rejects.toThrow("preview flags");
  expect(mock.get).not.toHaveBeenCalled();
});
