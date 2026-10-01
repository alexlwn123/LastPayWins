"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import {
  sendTelegramBidNotification,
  sendTelegramWinnerNotification,
} from "./telegram";

export const notifyWinner = internalAction({
  args: { lnAddress: v.string(), jackpot: v.number() },
  handler: async (_ctx, args) => {
    if (process.env.PAYMENT_NOTIFICATIONS_ENABLED !== "true") return;
    await sendTelegramWinnerNotification({
      ...args,
      chargeFee: false,
      payoutAmount: args.jackpot,
    });
  },
});

export const sendBidNotification = internalAction({
  args: { jackpot: v.number(), lnAddress: v.string() },
  handler: async (_ctx, args) => {
    if (process.env.PAYMENT_NOTIFICATIONS_ENABLED !== "true") return;
    await sendTelegramBidNotification(args);
  },
});
