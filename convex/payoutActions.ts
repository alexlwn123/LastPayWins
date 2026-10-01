import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { paymentBridge } from "./paymentBridge";
import { payoutResultSchema, payoutInvoiceSchema } from "../src/lib/payments/contracts";
import { acceptsSimulation } from "./paymentRules";

export const execute = internalAction({
  args: { payoutId: v.id("payouts") },
  handler: async (ctx, args) => {
    const payout = await ctx.runMutation(internal.payouts.claim, args);
    if (!payout) return;
    if ((payout.simulation ?? false) !== acceptsSimulation()) {
      await ctx.runMutation(internal.payouts.update, {
        payoutId: payout._id,
        attempt: payout.attempt ?? 0,
        status: "failed",
        error: "Payment mode does not match this payout's funds",
      });
      return;
    }
    try {
      let destination = payout.paymentRequest ?? payout.destination;
      if (payout.comment && !payout.paymentRequest && !payout.simulation) {
        const prepared = payoutInvoiceSchema.parse(await paymentBridge({
          operation: "preparePayout", destination: payout.destination,
          amount: payout.amount, comment: payout.comment,
        }));
        const bound = await ctx.runMutation(internal.payouts.bindInvoice, {
          payoutId: payout._id, attempt: payout.attempt ?? 0,
          paymentRequest: prepared.paymentRequest,
        });
        if (!bound) return;
        destination = bound;
      }
      const result = payoutResultSchema.parse(
        await paymentBridge({
          operation: "payout",
          payoutId: `${payout._id}-${payout.attempt ?? 0}`,
          destination,
          amount: payout.amount,
        }),
      );
      await ctx.runMutation(internal.payouts.update, {
        payoutId: payout._id,
        attempt: payout.attempt ?? 0,
        ...result,
      });
    } catch {
      await ctx.runMutation(internal.payouts.update, {
        payoutId: payout._id,
        attempt: payout.attempt ?? 0,
        status: "pending",
        error:
          "Payout outcome is uncertain. Rechecking with the same payment key.",
      });
    }
  },
});
