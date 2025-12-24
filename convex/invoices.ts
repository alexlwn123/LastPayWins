import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Get invoice state with pending invoice and last settlement time (by uuid)
export const getInvoiceState = query({
  args: { uuid: v.string() },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("invoices")
      .withIndex("by_uuid_status", (q) =>
        q.eq("uuid", args.uuid).eq("status", "pending")
      )
      .first();

    // Get most recent settled invoice for this session
    const lastSettled = await ctx.db
      .query("invoices")
      .withIndex("by_uuid_status", (q) =>
        q.eq("uuid", args.uuid).eq("status", "settled")
      )
      .order("desc")
      .first();

    return {
      paymentRequest: pending?.paymentRequest ?? null,
      lastSettledAt: lastSettled?.settledAt ?? null,
    };
  },
});

// Get pending invoice by uuid (internal)
export const getPendingByOduc = internalQuery({
  args: { uuid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_uuid_status", (q) =>
        q.eq("uuid", args.uuid).eq("status", "pending")
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

// Get invoice by SatsPay charge ID (internal, for webhook)
export const getByChargeId = internalQuery({
  args: { chargeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_charge", (q) => q.eq("chargeId", args.chargeId))
      .first();
  },
});

// Get invoice by ID (internal)
export const getById = internalQuery({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.invoiceId);
  },
});

// Store a new invoice (SatsPay charge)
export const store = internalMutation({
  args: {
    paymentHash: v.string(),
    paymentRequest: v.string(),
    chargeId: v.string(),
    uuid: v.string(),
    lnAddress: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Mark any existing pending invoices for this session as expired
    const existingPending = await ctx.db
      .query("invoices")
      .withIndex("by_uuid_status", (q) =>
        q.eq("uuid", args.uuid).eq("status", "pending")
      )
      .collect();

    for (const inv of existingPending) {
      await ctx.db.patch(inv._id, { status: "expired" });
    }

    // Create new invoice
    return await ctx.db.insert("invoices", {
      paymentHash: args.paymentHash,
      paymentRequest: args.paymentRequest,
      chargeId: args.chargeId,
      uuid: args.uuid,
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
    await ctx.db.patch(args.invoiceId, {
      status: "settled",
      settledAt: Date.now(),
    });

    // Record the bid via internal mutation
    await ctx.scheduler.runAfter(0, internal.games.recordBid, {
      lnAddress: invoice.lnAddress,
    });

    // Auto-create next invoice for same session
    await ctx.scheduler.runAfter(0, internal.invoiceActions.createInvoice, {
      uuid: invoice.uuid,
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
