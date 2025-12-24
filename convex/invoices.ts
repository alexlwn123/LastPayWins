import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ============ Queries ============

// Get pending invoice for a user
export const getPending = query({
  args: { lnAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_address_status", (q) =>
        q.eq("lnAddress", args.lnAddress).eq("status", "pending")
      )
      .first();
  },
});

// Get invoice by payment hash
export const getByHash = query({
  args: { paymentHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_hash", (q) => q.eq("paymentHash", args.paymentHash))
      .first();
  },
});

// ============ Internal Queries ============

// Get invoice by ID (internal)
export const getById = internalQuery({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.invoiceId);
  },
});

// ============ Internal Mutations ============

// Store a new invoice
export const store = internalMutation({
  args: {
    paymentHash: v.string(),
    paymentRequest: v.string(),
    lnAddress: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Mark any existing pending invoices as expired
    const existingPending = await ctx.db
      .query("invoices")
      .withIndex("by_address_status", (q) =>
        q.eq("lnAddress", args.lnAddress).eq("status", "pending")
      )
      .collect();

    for (const inv of existingPending) {
      await ctx.db.patch(inv._id, { status: "expired" });
    }

    // Create new invoice
    return await ctx.db.insert("invoices", {
      paymentHash: args.paymentHash,
      paymentRequest: args.paymentRequest,
      lnAddress: args.lnAddress,
      amount: args.amount,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Mark invoice as settled and record the bid
export const settle = internalMutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.status !== "pending") {
      return;
    }

    // Mark invoice as settled
    await ctx.db.patch(args.invoiceId, { status: "settled" });

    // Record the bid via internal mutation
    await ctx.scheduler.runAfter(0, internal.games.recordBidInternal, {
      lnAddress: invoice.lnAddress,
    });
  },
});

// Mark invoice as expired
export const markExpired = internalMutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.status !== "pending") {
      return;
    }
    await ctx.db.patch(args.invoiceId, { status: "expired" });
  },
});
