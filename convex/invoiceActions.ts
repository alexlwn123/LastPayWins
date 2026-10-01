import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { paymentBridge } from "./paymentBridge";
import { checkoutSchema } from "../src/lib/payments/contracts";

export const process = internalAction({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const inv = await ctx.runMutation(internal.invoices.claim, args);
    if (!inv) return;
    try {
      let checkoutId = inv.checkoutId;
      if (!checkoutId) {
        // Create an unminted checkout; persist its ID before asking MDK for a payable invoice.
        const created = checkoutSchema.parse(
          await paymentBridge({
            operation: "create",
            attemptId: inv._id,
            amount: inv.amount,
            memo: inv.memo,
          }),
        );
        const bound = await ctx.runMutation(internal.invoices.bind, {
          invoiceId: inv._id,
          generation: inv.generation,
          checkoutId: created.checkoutId,
        });
        if (!bound) return;
        checkoutId = created.checkoutId;
      }
      let checkout = checkoutSchema.parse(
        await paymentBridge({ operation: "lookup", checkoutId }),
      );
      if (
        checkout.status === "unconfirmed" ||
        checkout.status === "confirmed"
      ) {
        checkout = checkoutSchema.parse(
          await paymentBridge({ operation: "prepare", checkoutId }),
        );
      }
      await ctx.runMutation(internal.invoices.update, {
        invoiceId: inv._id,
        generation: inv.generation,
        ...checkout,
      });
    } catch (error) {
      console.error(
        "Payment reconciliation failed",
        inv._id,
        error instanceof Error ? error.message : "Unknown error",
      );
      await ctx.runMutation(internal.invoices.fail, {
        invoiceId: inv._id,
        generation: inv.generation,
        error: "Payment service unavailable. Retrying automatically.",
      });
    }
  },
});
