"use node";

import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";

const LNBITS_URL = process.env.LNBITS_URL!;
const LNBITS_API_KEY = process.env.LNBITS_API_KEY_ADMIN!;
const INVOICE_AMOUNT = parseInt(process.env.INVOICE_AMOUNT ?? "100") || 100;
const INVOICE_EXPIRY = 3600; // 1 hour

// Check interval for pending invoices (5 seconds)
const CHECK_INTERVAL_MS = 5000;

type LnbitsInvoice = {
  payment_hash: string;
  payment_request: string;
};

type CreateInvoiceResult = {
  paymentHash: string;
  paymentRequest: string;
  invoiceId: Id<"invoices">;
};

// Create a new invoice via LNBits and store in database
export const create = action({
  args: { lnAddress: v.string() },
  handler: async (ctx, args): Promise<CreateInvoiceResult> => {
    // Create invoice via LNBits
    const url = `${LNBITS_URL}/api/v1/payments`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LNBITS_API_KEY,
      },
      body: JSON.stringify({
        out: false,
        amount: INVOICE_AMOUNT,
        memo: "Bid - Last Pay Wins",
        expiry: INVOICE_EXPIRY,
        unit: "sat",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create invoice: ${response.statusText}`);
    }

    const invoice = (await response.json()) as LnbitsInvoice;

    // Store in database
    const invoiceId: Id<"invoices"> = await ctx.runMutation(
      internal.invoices.store,
      {
        paymentHash: invoice.payment_hash,
        paymentRequest: invoice.payment_request,
        lnAddress: args.lnAddress,
        amount: INVOICE_AMOUNT,
      }
    );

    // Schedule periodic status checks
    await ctx.scheduler.runAfter(
      CHECK_INTERVAL_MS,
      internal.invoiceActions.checkStatus,
      { invoiceId }
    );

    return {
      paymentHash: invoice.payment_hash,
      paymentRequest: invoice.payment_request,
      invoiceId,
    };
  },
});

// Check invoice status from LNBits
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

    // Check status via LNBits
    const url = `${LNBITS_URL}/api/v1/payments/${invoice.paymentHash}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LNBITS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`Failed to check invoice: ${response.statusText}`);
      // Schedule retry
      await ctx.scheduler.runAfter(
        CHECK_INTERVAL_MS,
        internal.invoiceActions.checkStatus,
        { invoiceId: args.invoiceId }
      );
      return;
    }

    const result = (await response.json()) as { paid: boolean };

    if (result.paid) {
      // Mark as settled and record the bid
      await ctx.runMutation(internal.invoices.settle, {
        invoiceId: args.invoiceId,
      });
    } else {
      // Schedule next check
      await ctx.scheduler.runAfter(
        CHECK_INTERVAL_MS,
        internal.invoiceActions.checkStatus,
        { invoiceId: args.invoiceId }
      );
    }
  },
});
