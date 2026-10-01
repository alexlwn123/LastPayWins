/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");
const setup = () => convexTest(schema, modules);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-04T12:00:00Z"));
  vi.stubEnv("PAYMENTS_ENABLED", "true");
  vi.stubEnv("PAYMENT_MODE", "simulation");
  vi.stubEnv("LOCAL_PAYMENTS", "true");
  vi.stubEnv("PAYMENT_BRIDGE_URL", "http://127.0.0.1:3000");
  vi.stubEnv("INVOICE_AMOUNT", "100");
  vi.stubEnv("NEXT_PUBLIC_CLOCK_DURATION", "60");
  vi.stubEnv("MDK_FEE_RESERVE_BPS", "200");
  vi.stubEnv("PAYOUT_RESERVE_SATS_PER_BID", "5");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function fixture(t: ReturnType<typeof setup>) {
  return t.run(async (ctx) => {
    const gameId = await ctx.db.insert("game", {
      status: "WAITING",
      lnAddress: "",
      jackpot: 0,
      timestamp: Date.now(),
      paymentVersion: 2,
      simulation: true,
    });
    const invoiceId = await ctx.db.insert("invoices", {
      uuid: "a-session-with-enough-entropy",
      gameId,
      lnAddress: "alice@example.com",
      amount: 100,
      provider: "mdk",
      status: "pending",
      createdAt: Date.now(),
      checkoutId: "checkout-a",
      generation: 1,
      expiresAt: Date.now() + 300000,
    });
    return { gameId, invoiceId };
  });
}
function confirmed(
  invoiceId: Awaited<ReturnType<typeof fixture>>["invoiceId"],
) {
  return {
    invoiceId,
    generation: 1,
    checkoutId: "checkout-a",
    attemptId: invoiceId,
    status: "paid",
    amount: 100,
    netAmount: 98,
    currency: "SAT",
    sandbox: true,
    expiresAt: Date.now() + 300000,
  };
}

describe("public payment responses", () => {
  test("keeps payout diagnostics on the server", async () => {
    const t = setup();
    const { gameId } = await fixture(t);
    const id = await t.run((ctx) => ctx.db.insert("payouts", {
      gameId, kind: "prize", destination: "alice@example.com",
      amount: 19590, status: "failed", simulation: true,
      createdAt: Date.now(), error: "private provider diagnostic",
    }));
    expect(await t.query(api.payouts.latest)).toEqual({
      kind: "prize", destination: "alice@example.com", amount: 19590, status: "failed",
    });
    expect((await t.run((ctx) => ctx.db.get(id)))?.error).toBe("private provider diagnostic");
  });

  test("replaces stored invoice diagnostics with a safe public message", async () => {
    const t = setup();
    const { invoiceId } = await fixture(t);
    await t.mutation(internal.invoices.fail, {
      invoiceId, generation: 1, error: "private provider diagnostic",
    });
    const state = await t.query(api.invoices.getInvoiceState, {
      uuid: "a-session-with-enough-entropy",
    });
    expect(state.error).toBe("Payment processing is temporarily unavailable. Please try again later.");
    expect(JSON.stringify(state)).not.toContain("private provider diagnostic");
    expect((await t.query(internal.invoices.getById, { invoiceId }))?.error).toBe("private provider diagnostic");
  });
});

describe("payment settlement", () => {
  test("quotes a 2% surcharge and snapshots the bid and memo", async () => {
    const t = setup();
    vi.stubEnv("INVOICE_AMOUNT", "10000");
    const id = await t.mutation(api.invoices.requestInvoice, {
      uuid: "a-session-with-enough-entropy", lnAddress: "alice@example.com",
    });
    expect(await t.query(internal.invoices.getById, { invoiceId: id })).toMatchObject({
      amount: 10200, bidAmount: 10000,
      memo: "Bid - Last Pay Wins — +2% for MDK routing fee",
    });
    expect(await t.query(api.invoices.settings)).toMatchObject({ amount: 10200, creditedAmount: 10000 });
  });

  test("fee-inclusive invoices add the promised bid once and pay the full jackpot", async () => {
    const t = setup();
    const { invoiceId, gameId } = await fixture(t);
    await t.run((ctx) => ctx.db.patch(invoiceId, {
      amount: 10200,
      bidAmount: 10000,
    }));
    // Settlement uses the quote stored on the invoice, even after settings change.
    vi.stubEnv("INVOICE_AMOUNT", "20000");
    const receipt = { ...confirmed(invoiceId), amount: 10200, netAmount: 9996 };
    await t.mutation(internal.invoices.update, receipt);
    await t.mutation(internal.invoices.update, receipt);
    expect((await t.query(api.games.getCurrent)).jackpot).toBe(10000);
    const bids = await t.run((ctx) => ctx.db.query("bids").collect());
    expect(bids).toHaveLength(1);
    expect(bids[0]).toMatchObject({ amount: 10000, creditedAmount: 10000 });
    vi.setSystemTime(Date.now() + 60000);
    await t.mutation(internal.games.endGame, { gameId, bidId: bids[0]._id });
    await t.mutation(internal.games.endGame, { gameId, bidId: bids[0]._id });
    const payouts = await t.run((ctx) => ctx.db.query("payouts").collect());
    expect(payouts).toHaveLength(1);
    expect(payouts[0]).toMatchObject({ kind: "prize", amount: 10000 });
  });

  test("a late fee-inclusive invoice refunds the fixed bid without adding its fees to the prize", async () => {
    const t = setup();
    const { invoiceId, gameId } = await fixture(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(invoiceId, { amount: 10200, bidAmount: 10000 });
      await ctx.db.patch(gameId, { status: "FINISHED" });
    });
    await t.mutation(internal.invoices.update, {
      ...confirmed(invoiceId), amount: 10200, netAmount: 9996,
    });
    const payouts = await t.run((ctx) => ctx.db.query("payouts").collect());
    expect(payouts).toHaveLength(1);
    expect(payouts[0]).toMatchObject({ kind: "refund", amount: 10000 });
    expect(await t.run((ctx) => ctx.db.query("bids").collect())).toHaveLength(0);
  });

  test("duplicate confirmations record one bid and fund one winner payout without browser presence", async () => {
    const t = setup();
    const { invoiceId, gameId } = await fixture(t);
    await Promise.all([
      t.mutation(internal.invoices.update, confirmed(invoiceId)),
      t.mutation(internal.invoices.update, confirmed(invoiceId)),
    ]);
    const bids = await t.run((ctx) => ctx.db.query("bids").collect());
    expect(bids).toHaveLength(1);
    expect(bids[0].creditedAmount).toBe(93);
    expect(await t.query(api.games.getCurrent)).toMatchObject({
      status: "LIVE",
      jackpot: 93,
      lnAddress: "alice@example.com",
    });
    vi.setSystemTime(Date.now() + 60000);
    await t.mutation(internal.games.endGame, { gameId, bidId: bids[0]._id });
    await t.mutation(internal.games.endGame, { gameId, bidId: bids[0]._id });
    const payouts = await t.run((ctx) => ctx.db.query("payouts").collect());
    expect(payouts).toHaveLength(1);
    expect(payouts[0]).toMatchObject({
      amount: 93,
      destination: "alice@example.com",
      status: "pending",
    });
    await t.mutation(internal.payouts.update, {
      payoutId: payouts[0]._id,
      status: "pending",
      error: "Unknown outcome",
    });
    expect((await t.query(api.payouts.latest))?.status).toBe("pending");
    await t.mutation(internal.payouts.update, {
      payoutId: payouts[0]._id,
      status: "succeeded",
      paymentId: "provider-payment",
    });
    await t.mutation(internal.payouts.update, {
      payoutId: payouts[0]._id,
      status: "pending",
    });
    expect((await t.query(api.payouts.latest))?.status).toBe("succeeded");
  });

  test.each([
    { amount: 1 },
    { currency: "USD" },
    { attemptId: "different" },
    { checkoutId: "different" },
    { netAmount: 101 },
  ])("quarantines mismatched payment %j", async (patch) => {
    const t = setup();
    const { invoiceId } = await fixture(t);
    await t.mutation(internal.invoices.update, {
      ...confirmed(invoiceId),
      ...patch,
    });
    expect(await t.run((ctx) => ctx.db.query("bids").collect())).toHaveLength(
      0,
    );
    expect(
      await t.query(internal.invoices.getById, { invoiceId }),
    ).toMatchObject({ status: "review" });
  });

  test("rejects sandbox receipts outside isolated local mode", async () => {
    vi.stubEnv("PAYMENT_MODE", "mdk");
    const t = setup();
    const { invoiceId } = await fixture(t);
    await t.mutation(internal.invoices.update, confirmed(invoiceId));
    expect(
      (await t.query(internal.invoices.getById, { invoiceId }))?.status,
    ).toBe("review");
    expect((await t.query(api.games.getCurrent)).jackpot).toBe(0);
  });

  test("payment exactly at the deadline becomes a refund, preserving the earlier winner", async () => {
    const t = setup();
    const { invoiceId, gameId } = await fixture(t);
    await t.mutation(internal.invoices.update, confirmed(invoiceId));
    const other = await t.run((ctx) =>
      ctx.db.insert("invoices", {
        uuid: "another-session",
        gameId,
        lnAddress: "bob@example.com",
        amount: 100,
        provider: "mdk",
        status: "pending",
        checkoutId: "checkout-b",
        generation: 1,
        createdAt: Date.now(),
      }),
    );
    vi.setSystemTime(Date.now() + 60000);
    await t.mutation(internal.invoices.update, {
      ...confirmed(other),
      checkoutId: "checkout-b",
    });
    const payouts = await t.run((ctx) => ctx.db.query("payouts").collect());
    expect(payouts.map((p) => [p.kind, p.destination, p.amount])).toEqual([
      ["prize", "alice@example.com", 93],
      ["refund", "bob@example.com", 93],
    ]);
    expect(await t.run((ctx) => ctx.db.query("bids").collect())).toHaveLength(
      1,
    );
    expect((await t.query(api.games.getCurrent)).status).toBe("WAITING");
  });

  test("locally expired invoice can still settle before its round closes", async () => {
    const t = setup();
    const { invoiceId } = await fixture(t);
    await t.run((ctx) => ctx.db.patch(invoiceId, { status: "expired" }));
    await t.mutation(internal.invoices.update, confirmed(invoiceId));
    expect((await t.query(api.games.getCurrent)).jackpot).toBe(93);
  });

  test("superseded worker cannot change payment state", async () => {
    const t = setup();
    const { invoiceId } = await fixture(t);
    await t.run((ctx) => ctx.db.patch(invoiceId, { generation: 2 }));
    await t.mutation(internal.invoices.update, confirmed(invoiceId));
    expect((await t.query(api.games.getCurrent)).jackpot).toBe(0);
  });

  test("concurrent invoice requests reserve one attempt and bind destination immutably", async () => {
    const t = setup();
    const args = {
      uuid: "a-session-with-enough-entropy",
      lnAddress: "alice@example.com",
    };
    const ids = await Promise.all([
      t.mutation(api.invoices.requestInvoice, args),
      t.mutation(api.invoices.requestInvoice, args),
    ]);
    expect(ids[0]).toBe(ids[1]);
    expect(
      await t.run((ctx) => ctx.db.query("invoices").collect()),
    ).toHaveLength(1);
    const claim = await t.mutation(internal.invoices.claim, {
      invoiceId: ids[0],
    });
    expect(
      await t.mutation(internal.invoices.claim, { invoiceId: ids[0] }),
    ).toBeNull();
    expect(claim?.lnAddress).toBe("alice@example.com");
  });

  test("event inbox deduplicates before a checkout is bound", async () => {
    const t = setup();
    const { invoiceId } = await fixture(t);
    const event = { eventId: "event-1", attemptId: invoiceId };
    await t.mutation(internal.paymentEvents.receive, event);
    await t.mutation(internal.paymentEvents.receive, event);
    expect(
      await t.run((ctx) => ctx.db.query("paymentEvents").collect()),
    ).toHaveLength(1);
  });

  test("retains historical LND records and refuses to combine a live LND round with MDK funds", async () => {
    const t = setup();
    await t.run(async (ctx) => {
      await ctx.db.insert("invoices", {
        uuid: "old",
        lnAddress: "old@example.com",
        amount: 100,
        paymentHash: "oldhash",
        paymentRequest: "oldinvoice",
        status: "settled",
        createdAt: Date.now(),
      });
      await ctx.db.insert("game", {
        lnAddress: "old@example.com",
        jackpot: 500,
        status: "LIVE",
        timestamp: Date.now(),
      });
    });
    await expect(
      t.mutation(api.invoices.requestInvoice, {
        uuid: "a-session-with-enough-entropy",
        lnAddress: "alice@example.com",
      }),
    ).rejects.toThrow("existing LND round");
  });
});

test("a confirmed payout failure permits a new attempt; uncertainty never does", async () => {
  const t = setup();
  const payoutId = await t.run((ctx) =>
    ctx.db.insert("payouts", {
      kind: "prize",
      destination: "alice@example.com",
      amount: 93,
      status: "pending",
      createdAt: Date.now(),
      simulation: true,
    }),
  );
  await t.mutation(internal.payouts.retry, { payoutId });
  expect((await t.run((ctx) => ctx.db.get(payoutId)))?.attempt).toBeUndefined();
  await t.mutation(internal.payouts.update, {
    payoutId,
    status: "failed",
    terminalFailure: true,
  });
  await t.mutation(internal.payouts.retry, { payoutId });
  expect(await t.run((ctx) => ctx.db.get(payoutId))).toMatchObject({
    status: "pending",
    attempt: 1,
  });
  await t.mutation(internal.payouts.update, {
    payoutId,
    attempt: 0,
    status: "failed",
    terminalFailure: true,
  });
  expect((await t.run((ctx) => ctx.db.get(payoutId)))?.status).toBe("pending");
});

test("simulated winnings cannot be sent through the live payout adapter", async () => {
  vi.stubEnv("PAYMENT_MODE", "mdk");
  const t = setup();
  const payoutId = await t.run((ctx) =>
    ctx.db.insert("payouts", {
      kind: "prize",
      destination: "alice@example.com",
      amount: 93,
      status: "pending",
      createdAt: Date.now(),
      simulation: true,
    }),
  );
  await t.action(internal.payoutActions.execute, { payoutId });
  expect(await t.run((ctx) => ctx.db.get(payoutId))).toMatchObject({
    status: "failed",
    error: "Payment mode does not match this payout's funds",
  });
});

test("a live round cannot mix simulated and real receipts", async () => {
  const t = setup();
  const { invoiceId } = await fixture(t);
  await t.mutation(internal.invoices.update, confirmed(invoiceId));
  vi.stubEnv("PAYMENT_MODE", "mdk");
  await expect(
    t.mutation(api.invoices.requestInvoice, {
      uuid: "another-session-with-entropy",
      lnAddress: "bob@example.com",
    }),
  ).rejects.toThrow("separate local database");
});

test("payout invoice binding is immutable per attempt and survives uncertain retries", async () => {
  const t = setup();
  const payoutId = await t.run((ctx) => ctx.db.insert("payouts", {
    kind: "prize", destination: "alice@example.com", amount: 10000,
    status: "pending", createdAt: Date.now(), simulation: true,
  }));
  const bind = (paymentRequest: string, attempt = 0) => t.mutation(internal.payouts.bindInvoice, { payoutId, attempt, paymentRequest });
  expect(await bind("lnbcfirst")).toBe("lnbcfirst");
  expect(await bind("lnbcsecond")).toBe("lnbcfirst");
  expect(await bind("lnbcstale", 1)).toBeNull();
  await t.mutation(internal.payouts.update, { payoutId, status: "failed", terminalFailure: false });
  await t.mutation(internal.payouts.retry, { payoutId });
  expect(await bind("lnbcsecond")).toBe("lnbcfirst");
  await t.mutation(internal.payouts.update, { payoutId, status: "failed", terminalFailure: true });
  await t.mutation(internal.payouts.retry, { payoutId });
  expect(await bind("lnbcstale")).toBeNull();
  expect(await bind("lnbcnewattempt", 1)).toBe("lnbcnewattempt");
  expect((await t.run((ctx) => ctx.db.get(payoutId)))?.comment).toBe("Congratulations! You've won the 10000 satoshi jackpot from LastPayWins!");
});

test("payout execution persists the commented invoice before dispatch and reuses it after a lost response", async () => {
  const t = setup();
  vi.stubEnv("PAYMENT_MODE", "mdk");
  vi.stubEnv("PAYMENT_BRIDGE_SECRET", "test-secret");
  const comment = "Congratulations! You've won the 10000 satoshi jackpot from LastPayWins!";
  const payoutId = await t.run((ctx) => ctx.db.insert("payouts", {
    kind: "prize", destination: "alice@example.com", amount: 10000,
    status: "pending", createdAt: Date.now(), simulation: false, comment,
  }));
  const requests: Array<Record<string, unknown>> = [];
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    requests.push(request);
    if (request.operation === "preparePayout") return Response.json({ paymentRequest: "lnbc123abc" });
    expect((await t.run((ctx) => ctx.db.get(payoutId)))?.paymentRequest).toBe("lnbc123abc");
    if (requests.length === 2) throw new Error("Lost response");
    return Response.json({ status: "succeeded", paymentId: "payment-1" });
  });
  try {
    await t.action(internal.payoutActions.execute, { payoutId });
    await t.action(internal.payoutActions.execute, { payoutId });
    expect(requests.map((request) => request.operation)).toEqual(["preparePayout", "payout", "payout"]);
    expect(requests[0]).toMatchObject({ destination: "alice@example.com", amount: 10000, comment });
    expect(requests[1]).toEqual(requests[2]);
    expect(requests[1]).toMatchObject({ payoutId: `${payoutId}-0`, destination: "lnbc123abc", amount: 10000 });
    expect((await t.run((ctx) => ctx.db.get(payoutId)))?.status).toBe("succeeded");
  } finally { fetchMock.mockRestore(); }
});
