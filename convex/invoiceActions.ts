"use node";

import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const LNBITS_URL = process.env.LNBITS_URL!;
const LNBITS_API_KEY = process.env.LNBITS_API_KEY_ADMIN!;
const LNBITS_WALLET_ID = process.env.LNBITS_WALLET_ID!;
const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL!;
const INVOICE_AMOUNT = parseInt(process.env.INVOICE_AMOUNT ?? "100") || 100;
const INVOICE_EXPIRY = 300; // 5 minutes


type SatspayCharge = {
  id: string;
  payment_hash: string;
  payment_request: string;
};

type CreateInvoiceResult = {
  chargeId: string;
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

    await createChargeFromSatspay(ctx, args.uuid, args.lnAddress);
  },
});

const createChargeFromSatspay = async (
  ctx: ActionCtx,
  uuid: string,
  lnAddress: string
): Promise<CreateInvoiceResult> => {
  const webhookUrl = `${CONVEX_SITE_URL}/webhook/satspay`;
  const url = `${LNBITS_URL}/satspay/api/v1/charge`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": LNBITS_API_KEY,
    },
    body: JSON.stringify({
      lnbitswallet: LNBITS_WALLET_ID,
      description: "Bid - Last Pay Wins",
      webhook: webhookUrl,
      completelink: "",
      completelinktext: "",
      time: INVOICE_EXPIRY,
      amount: INVOICE_AMOUNT,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create SatsPay charge: ${response.statusText} - ${errorText}`);
  }

  const charge = (await response.json()) as SatspayCharge;

  // Store in database
  const invoiceId: Id<"invoices"> = await ctx.runMutation(
    internal.invoices.store,
    {
      paymentHash: charge.payment_hash,
      paymentRequest: charge.payment_request,
      chargeId: charge.id,
      uuid,
      lnAddress,
      amount: INVOICE_AMOUNT,
    }
  );

  return {
    chargeId: charge.id,
    paymentHash: charge.payment_hash,
    paymentRequest: charge.payment_request,
    invoiceId,
  };
};

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
      return;
    }

    const result = (await response.json()) as { paid: boolean };

    if (result.paid) {
      // Mark as settled and record the bid
      await ctx.runMutation(internal.invoices.settle, {
        invoiceId: args.invoiceId,
      });
    } 
  },
});
