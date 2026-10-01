import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

export const receive = internalMutation({
  args: { eventId: v.string(), attemptId: v.string() },
  handler: async (ctx, args) => {
    const exists = await ctx.db
      .query("paymentEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (exists) return;
    await ctx.db.insert("paymentEvents", {
      ...args,
      receivedAt: Date.now(),
      status: "received",
      nextCheckAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.paymentEvents.reconcile, {});
  },
});

export const reconcile = internalMutation({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("paymentEvents")
      .withIndex("by_nextCheckAt", (q) =>
        q.gt("nextCheckAt", 0).lte("nextCheckAt", Date.now()),
      )
      .take(50);
    for (const event of events) {
      const id = ctx.db.normalizeId("invoices", event.attemptId);
      const invoice = id ? await ctx.db.get(id) : null;
      if (!invoice || invoice.provider !== "mdk") {
        await ctx.db.patch(event._id, {
          status: "review",
          error: "Unknown payment attempt",
          nextCheckAt: undefined,
        });
      } else if (invoice.status === "settled" || invoice.status === "review") {
        await ctx.db.patch(event._id, {
          status: invoice.status === "settled" ? "processed" : "review",
          error: invoice.status === "settled" ? undefined : invoice.error,
          nextCheckAt: undefined,
        });
      } else {
        await ctx.scheduler.runAfter(0, internal.invoiceActions.process, {
          invoiceId: invoice._id,
        });
        await ctx.db.patch(event._id, {
          nextCheckAt:
            Date.now() +
            (Date.now() - event.receivedAt > 60_000 ? 60_000 : 5000),
          error:
            Date.now() - event.receivedAt > 60_000
              ? "MDK completion event is not reflected in checkout state. Investigate provider reconciliation."
              : undefined,
        });
      }
    }
  },
});
