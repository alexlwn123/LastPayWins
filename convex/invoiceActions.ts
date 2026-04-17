"use node";

import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { checkLndInvoice, createLndInvoice } from "./lightning";

const INVOICE_AMOUNT = parseInt(process.env.INVOICE_AMOUNT ?? "100") || 100;
const INVOICE_EXPIRY = 300; // 5 minutes

type CreateInvoiceResult = {
  paymentHash: string;
  paymentRequest: string;
  invoiceId: Id<"invoices">;
};

// Internal action to create invoice (scheduled by mutation)
export const createInvoice = internalAction({
  args: {
    uuid: v.string(),
    lnAddress: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    // Double-check no pending invoice exists (in case of race)
    const existing = await ctx.runQuery(internal.invoices.getPendingByOduc, {
      uuid: args.uuid,
    });

    if (existing) {
      return;
    }

    await createInvoiceForSession(ctx, args.uuid, args.lnAddress);
  },
});

const createInvoiceForSession = async (
  ctx: ActionCtx,
  uuid: string,
  lnAddress: string,
): Promise<CreateInvoiceResult> => {
  const invoice = await createLndInvoice(
    INVOICE_AMOUNT,
    "Bid - Last Pay Wins",
    INVOICE_EXPIRY,
  );

  // Store in database
  const invoiceId: Id<"invoices"> = await ctx.runMutation(
    internal.invoices.store,
    {
      paymentHash: invoice.paymentHash,
      paymentRequest: invoice.paymentRequest,
      uuid,
      lnAddress,
      amount: INVOICE_AMOUNT,
    }
  );

  return {
    paymentHash: invoice.paymentHash,
    paymentRequest: invoice.paymentRequest,
    invoiceId,
  };
};

// Check invoice status from LND
export const checkStatus = internalAction({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    // Get invoice from database
    const invoice = await ctx.runQuery(internal.invoices.getById, {
      invoiceId: args.invoiceId,
    });

    if (!invoice || invoice.status !== "pending") {
      return; // Already settled or not found
    }

    // Check if expired (older than 1 hour)
    if (Date.now() - invoice.createdAt > INVOICE_EXPIRY * 1000) {
      await ctx.runMutation(internal.invoices.markExpired, {
        invoiceId: args.invoiceId,
      });
      return;
    }

    try {
      const result = await checkLndInvoice(invoice.paymentHash);
      if (result.settled) {
        await ctx.runMutation(internal.invoices.settle, {
          invoiceId: args.invoiceId,
        });
      }
    } catch (error) {
      console.error("Failed to check LND invoice", error);
      return;
    }
  },
});
