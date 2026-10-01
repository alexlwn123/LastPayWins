import { z } from "zod";

export const checkoutSchema = z.object({
  checkoutId: z.string(),
  attemptId: z.string(),
  status: z.enum(["unconfirmed", "confirmed", "pending", "paid", "expired"]),
  currency: z.literal("SAT"),
  amount: z.number().int().positive(),
  netAmount: z.number().int().nonnegative(),
  sandbox: z.boolean(),
  paymentRequest: z.string().optional(),
  paymentHash: z.string().optional(),
  expiresAt: z.number(),
});
export type PaymentCheckout = z.infer<typeof checkoutSchema>;

export const payoutInvoiceSchema = z.object({
  paymentRequest: z
    .string()
    .max(4096)
    .regex(/^lnbc[0-9a-z]+$/i),
});

export const payoutResultSchema = z.object({
  status: z.enum(["pending", "succeeded", "failed"]),
  paymentId: z.string().optional(),
  error: z.string().optional(),
  terminalFailure: z.boolean().optional(),
});
export type PaymentPayoutResult = z.infer<typeof payoutResultSchema>;

export const bridgeRequestSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("create"),
    attemptId: z.string(),
    amount: z.number().int().positive(),
    memo: z.string().max(500).optional(),
  }),
  z.object({ operation: z.literal("prepare"), checkoutId: z.string() }),
  z.object({ operation: z.literal("lookup"), checkoutId: z.string() }),
  z.object({
    operation: z.literal("preparePayout"),
    destination: z.string(),
    amount: z.number().int().positive(),
    comment: z.string().max(500),
  }),
  z.object({
    operation: z.literal("payout"),
    payoutId: z.string(),
    destination: z.string(),
    amount: z.number().int().positive(),
  }),
]);
export type BridgeRequest = z.infer<typeof bridgeRequestSchema>;
