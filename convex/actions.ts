"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { payLightningAddress } from "./lightning";

const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;

export const payWinner = internalAction({
  args: {
    lnAddress: v.string(),
    jackpot: v.number(),
  },
  handler: async (_ctx, args) => {
    console.log(`Paying winner: ${args.lnAddress} - ${args.jackpot} sats`);

    const chargeFee = args.jackpot >= 20000;
    const payoutAmount = chargeFee
      ? Math.floor(args.jackpot * 0.9)
      : args.jackpot;
    const comment = `Congratulations! You've won the ${args.jackpot} satoshi jackpot from LastPayWins!${chargeFee ? " (10% deducted for fees)" : ""}`;
    const payResult = await payLightningAddress(
      args.lnAddress,
      payoutAmount,
      comment,
    );

    console.log(`Payment successful: ${args.lnAddress} - ${args.jackpot} sats`);

    // Step 2: Hit Zapier webhook (optional)
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
