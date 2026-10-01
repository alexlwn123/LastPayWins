import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { ensureGame, recordPaidBid } from "./games";
import { acceptsSimulation, bidQuote, contribution } from "./paymentRules";

export const settings = query({
  args: {},
  handler: async () => ({
    simulation: acceptsSimulation(),
    enabled: process.env.PAYMENTS_ENABLED === "true",
    amount: bidQuote().amount,
    creditedAmount: bidQuote().bidAmount,
  }),
});

export const requestInvoice = mutation({
  args: { uuid: v.string(), lnAddress: v.string() },
  handler: async (ctx, args) => {
    if (process.env.PAYMENTS_ENABLED !== "true")
      throw new Error("Payments are paused");
    if (
      args.uuid.length < 16 ||
      args.uuid.length > 100 ||
      !/^[^\s@]{1,128}@[^\s@]{1,253}\.[^\s@]+$/.test(args.lnAddress)
    )
      throw new Error("Invalid payment session or Lightning address");
    const address = args.lnAddress.trim().toLowerCase();
    const game = await ensureGame(ctx);
    const latest = await ctx.db
      .query("invoices")
      .withIndex("by_uuid_and_createdAt", (q) => q.eq("uuid", args.uuid))
      .order("desc")
      .first();
    if (latest && latest.lnAddress === address && latest.gameId === game._id) {
      if (
        latest.status === "creating" ||
        latest.status === "review" ||
        (latest.status === "pending" && (latest.expiresAt ?? 0) > Date.now())
      )
        return latest._id;
    }
    if (latest && Date.now() - latest.createdAt < 2000) return latest._id;
    const quote = bidQuote();
    const id = await ctx.db.insert("invoices", {
      uuid: args.uuid,
      lnAddress: address,
      gameId: game._id,
      ...quote,
      provider: "mdk",
      status: "creating",
      createdAt: Date.now(),
      nextCheckAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.invoiceActions.process, {
      invoiceId: id,
    });
    return id;
  },
});

export const getInvoiceState = query({
  args: { uuid: v.string() },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("invoices")
      .withIndex("by_uuid_and_createdAt", (q) => q.eq("uuid", args.uuid))
      .order("desc")
      .first();
    const paid = await ctx.db
      .query("invoices")
      .withIndex("by_uuid_status", (q) =>
        q.eq("uuid", args.uuid).eq("status", "settled"),
      )
      .order("desc")
      .first();
    const refund = latest
      ? await ctx.db
          .query("payouts")
          .withIndex("by_invoiceId", (q) => q.eq("invoiceId", latest._id))
          .first()
      : null;
    return {
      invoiceId: latest?._id ?? null,
      checkoutId: latest?.checkoutId ?? null,
      paymentRequest:
        latest?.status === "pending" ? (latest.paymentRequest ?? null) : null,
      status: latest?.status ?? null,
      lnAddress: latest?.lnAddress ?? null,
      expiresAt: latest?.expiresAt ?? null,
      lastSettledAt: paid?.settledAt ?? null,
      error: latest?.error
        ? "Payment processing is temporarily unavailable. Please try again later."
        : null,
      refundStatus: refund?.status ?? null,
      simulation: acceptsSimulation(),
      amount: latest?.amount ?? null,
      bidAmount: latest?.bidAmount ?? null,
    };
  },
});

export const getById = internalQuery({
  args: { invoiceId: v.id("invoices") },
  handler: (ctx, args) => ctx.db.get(args.invoiceId),
});

export const claim = internalMutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (
      !invoice ||
      invoice.provider !== "mdk" ||
      invoice.status === "settled" ||
      (invoice.leaseUntil ?? 0) > Date.now()
    )
      return null;
    const generation = (invoice.generation ?? 0) + 1;
    await ctx.db.patch(invoice._id, {
      leaseUntil: Date.now() + 90_000,
      generation,
      nextCheckAt: Date.now() + 90_000,
    });
    return { ...invoice, generation };
  },
});

export const bind = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    checkoutId: v.string(),
    generation: v.number(),
  },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv || inv.generation !== args.generation) return false;
    if (inv.checkoutId && inv.checkoutId !== args.checkoutId)
      throw new Error("Checkout already bound");
    await ctx.db.patch(inv._id, { checkoutId: args.checkoutId });
    return true;
  },
});

export const update = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    generation: v.number(),
    checkoutId: v.string(),
    attemptId: v.string(),
    status: v.string(),
    amount: v.number(),
    netAmount: v.number(),
    currency: v.string(),
    sandbox: v.boolean(),
    paymentRequest: v.optional(v.string()),
    paymentHash: v.optional(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv || inv.status === "settled" || inv.generation !== args.generation)
      return;
    if (
      inv.checkoutId !== args.checkoutId ||
      inv._id !== args.attemptId ||
      inv.amount !== args.amount ||
      args.currency !== "SAT" ||
      !Number.isSafeInteger(args.netAmount) ||
      args.netAmount < 0 ||
      args.netAmount > args.amount ||
      args.sandbox !== acceptsSimulation()
    ) {
      await ctx.db.patch(inv._id, {
        status: "review",
        error: "Provider payment details do not match the reserved bid",
        leaseUntil: 0,
        nextCheckAt: undefined,
      });
      return;
    }
    const fields = {
      expiresAt: args.expiresAt,
      sandbox: args.sandbox,
      paymentHash: args.paymentHash ?? inv.paymentHash,
      paymentRequest: args.paymentRequest ?? inv.paymentRequest,
      leaseUntil: 0,
      error: undefined,
    };
    if (args.status === "paid") {
      // Old invoices retain their original pricing. New invoices promise a fixed bid.
      const { net, credited } = inv.bidAmount === undefined
        ? contribution(inv.amount, args.netAmount)
        : { net: args.netAmount, credited: inv.bidAmount };
      await ctx.db.patch(inv._id, {
        ...fields,
        status: "settled",
        settledAt: Date.now(),
        netAmount: net,
        creditedAmount: credited,
        nextCheckAt: undefined,
      });
      await recordPaidBid(ctx, inv, credited);
    } else {
      const expired = args.status === "expired" || args.expiresAt <= Date.now();
      await ctx.db.patch(inv._id, {
        ...fields,
        status: expired
          ? "expired"
          : args.status === "pending"
            ? "pending"
            : "creating",
        // Expired records still reconcile: delayed confirmations may require a refund.
        nextCheckAt: Date.now() + (expired ? 300_000 : 5000),
      });
    }
  },
});

export const fail = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    generation: v.number(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv || inv.generation !== args.generation || inv.status === "settled")
      return;
    await ctx.db.patch(inv._id, {
      error: args.error.slice(0, 300),
      leaseUntil: 0,
      nextCheckAt: Date.now() + 30_000,
    });
  },
});

export const reconcile = internalMutation({
  args: {},
  handler: async (ctx) => {
    const due = await ctx.db
      .query("invoices")
      .withIndex("by_nextCheckAt", (q) =>
        q.gt("nextCheckAt", 0).lte("nextCheckAt", Date.now()),
      )
      .take(50);
    for (const inv of due) {
      await ctx.db.patch(inv._id, { nextCheckAt: Date.now() + 90_000 });
      await ctx.scheduler.runAfter(0, internal.invoiceActions.process, {
        invoiceId: inv._id,
      });
    }
  },
});
