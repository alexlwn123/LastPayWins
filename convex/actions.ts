"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { payLightningAddress } from "./lightning";
import { sendTelegramMessage, sendTelegramWinnerNotification } from "./telegram";

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

    try {
      await sendTelegramWinnerNotification({
        chargeFee,
        jackpot: args.jackpot,
        lnAddress: args.lnAddress,
        payoutAmount,
      });
    } catch (error) {
      console.error("Telegram notification failed", error);
    }

    return { success: true, payResult };
  },
});

export const testTelegramNotification = internalAction({
  args: {
    jackpot: v.optional(v.number()),
    lnAddress: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const lnAddress = args.lnAddress ?? "test@getalby.com";
    const jackpot = args.jackpot ?? 12345;
    const chargeFee = jackpot >= 20000;
    const payoutAmount = chargeFee
      ? Math.floor(jackpot * 0.9)
      : jackpot;

    const lines = [
      "TEST: Last Pay Wins Telegram notification",
      `Winner: ${lnAddress}`,
      `Jackpot: ${jackpot} sats`,
      `Payout: ${payoutAmount} sats`,
    ];

    if (chargeFee) {
      lines.push("Fee: 10%");
    }

    await sendTelegramMessage(lines.join("\n"));

    return {
      success: true,
      chargeFee,
      jackpot,
      lnAddress,
      payoutAmount,
    };
  },
});
