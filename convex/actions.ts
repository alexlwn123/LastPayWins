"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// These are set in Convex dashboard as environment variables
const LNBITS_URL = process.env.LNBITS_URL!;
const LNBITS_API_KEY = process.env.LNBITS_API_KEY_ADMIN!;
const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;

type ScanResult = {
  status: string;
  callback: string;
  description: string;
  description_hash: string;
  error?: string;
};

export const payWinner = internalAction({
  args: {
    lnAddress: v.string(),
    jackpot: v.number(),
  },
  handler: async (_ctx, args) => {
    console.log(`Paying winner: ${args.lnAddress} - ${args.jackpot} sats`);

    // Step 1: Scan the winner's lnurl to get callback info
    const scanRes = await fetch(
      `${LNBITS_URL}/api/v1/lnurlscan/${args.lnAddress}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": LNBITS_API_KEY,
        },
      }
    );

    const lnurlData = (await scanRes.json()) as ScanResult;

    if (lnurlData.status !== "OK" || "error" in lnurlData) {
      console.error(
        `Failed to scan lnurl: ${args.lnAddress}`,
        JSON.stringify(lnurlData)
      );
      throw new Error(`Read lnurl failed: ${args.lnAddress}`);
    }

    // Step 2: Pay the winner
    const chargeFee = args.jackpot >= 20000;
    const amountMsats = args.jackpot * 1000 * (chargeFee ? 0.9 : 1);

    const payRes = await fetch(`${LNBITS_URL}/api/v1/payments/lnurl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LNBITS_API_KEY,
      },
      body: JSON.stringify({
        amount: amountMsats,
        callback: lnurlData.callback,
        comment: `Congratulations! You've won the ${args.jackpot} satoshi jackpot from LastPayWins!${chargeFee ? " (10% deducted for fees)" : ""}`,
        description: lnurlData.description,
        description_hash: lnurlData.description_hash,
      }),
    });

    const payResult = (await payRes.json()) as {
      success_action?: string;
      payment_hash?: string;
      error?: string;
    };

    if (!("success_action" in payResult || "payment_hash" in payResult)) {
      console.error(
        `Payment failed: ${args.lnAddress}`,
        JSON.stringify(payResult)
      );
      throw new Error(
        `Pay failed: ${args.lnAddress}: ${args.jackpot} sats - ${JSON.stringify(payResult)}`
      );
    }

    console.log(`Payment successful: ${args.lnAddress} - ${args.jackpot} sats`);

    // Step 3: Hit Zapier webhook (optional)
    if (ZAPIER_WEBHOOK_URL) {
      try {
        await fetch(ZAPIER_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lnAddress: args.lnAddress,
            bid: args.jackpot,
          }),
        });
      } catch (e) {
        console.error("Webhook failed", e);
      }
    }

    return { success: true, payResult };
  },
});
