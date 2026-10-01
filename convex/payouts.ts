import { payoutMemo } from "../src/lib/payments/payoutMemo";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";

export const latest = query({
  args: {},
  handler: async (ctx) => {
    const payout = await ctx.db.query("payouts").order("desc").first();
    return payout
      ? {
          kind: payout.kind,
          destination: payout.destination,
          amount: payout.amount,
          status: payout.status,
        }
      : null;
  },
});

export const claim = internalMutation({
  args: { payoutId: v.id("payouts") },
  handler: async (ctx, args) => {
    const payout = await ctx.db.get(args.payoutId);
    if (
      !payout ||
      payout.status !== "pending" ||
      (payout.leaseUntil ?? 0) > Date.now()
    )
      return null;
    await ctx.db.patch(payout._id, {
      leaseUntil: Date.now() + 90_000,
      nextCheckAt: Date.now() + 90_000,
    });
    return payout;
  },
});

export const update = internalMutation({
  args: {
    payoutId: v.id("payouts"),
    attempt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
    ),
    paymentId: v.optional(v.string()),
    error: v.optional(v.string()),
    terminalFailure: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const payout = await ctx.db.get(args.payoutId);
    if (
      !payout ||
      payout.status !== "pending" ||
      (payout.attempt ?? 0) !== (args.attempt ?? 0)
    )
      return;
    await ctx.db.patch(payout._id, {
      status: args.status,
      paymentId: args.paymentId ?? payout.paymentId,
      error: args.error,
      leaseUntil: 0,
      nextCheckAt: args.status === "pending" ? Date.now() + 30_000 : undefined,
      completedAt: args.status === "succeeded" ? Date.now() : undefined,
      terminalFailure: args.terminalFailure,
    });
    if (args.status === "succeeded" && payout.kind === "prize") {
      await ctx.scheduler.runAfter(0, internal.actions.notifyWinner, {
        lnAddress: payout.destination,
        jackpot: payout.amount,
      });
    }
  },
});

export const retry = internalMutation({
  args: { payoutId: v.id("payouts") },
  handler: async (ctx, args) => {
    const payout = await ctx.db.get(args.payoutId);
    if (!payout || payout.status !== "failed") return;
    // A new key is permitted only after an authoritative terminal failure.
    // Timeouts and lost acknowledgements always retain their original key.
    await ctx.db.patch(payout._id, {
      status: "pending",
      error: undefined,
      leaseUntil: 0,
      nextCheckAt: Date.now(),
      attempt: (payout.attempt ?? 0) + (payout.terminalFailure ? 1 : 0),
      terminalFailure: undefined,
      paymentId: payout.terminalFailure ? undefined : payout.paymentId,
      paymentRequest: payout.terminalFailure ? undefined : payout.paymentRequest,
      comment: payout.terminalFailure ? (payout.comment ?? payoutMemo(payout.kind, payout.amount)) : payout.comment,
    });
    await ctx.scheduler.runAfter(0, internal.payoutActions.execute, args);
  },
});

export const reconcile = internalMutation({
  args: {},
  handler: async (ctx) => {
    const payouts = await ctx.db
      .query("payouts")
      .withIndex("by_nextCheckAt", (q) =>
        q.gt("nextCheckAt", 0).lte("nextCheckAt", Date.now()),
      )
      .take(20);
    for (const payout of payouts) {
      await ctx.db.patch(payout._id, { nextCheckAt: Date.now() + 90_000 });
      await ctx.scheduler.runAfter(0, internal.payoutActions.execute, {
        payoutId: payout._id,
      });
    }
  },
});

export const bindInvoice = internalMutation({
  args: { payoutId: v.id("payouts"), attempt: v.number(), paymentRequest: v.string() },
  handler: async (ctx, args) => {
    const payout = await ctx.db.get(args.payoutId);
    if (!payout || payout.status !== "pending" || (payout.attempt ?? 0) !== args.attempt) return null;
    if (payout.paymentRequest) return payout.paymentRequest;
    await ctx.db.patch(payout._id, { paymentRequest: args.paymentRequest });
    return args.paymentRequest;
  },
});
