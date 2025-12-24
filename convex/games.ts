import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

// Environment variable for clock duration (set in Convex dashboard)
const CLOCK_DURATION_MS =
  (parseInt(process.env.CLOCK_DURATION ?? "60") || 60) * 1000;
const INVOICE_AMOUNT = parseInt(process.env.INVOICE_AMOUNT ?? "100") || 100;

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const game = await ctx.db.query("game").first();

    if (!game) {
      return {
        lnAddress: "none",
        jackpot: 0,
        timestamp: 0,
        timeLeft: CLOCK_DURATION_MS / 1000,
        status: "WAITING" as const,
      };
    }

    const timeLeft = Math.floor(
      (game.timestamp + CLOCK_DURATION_MS - Date.now()) / 1000
    );
    const status =
      game.jackpot === 0 ? "WAITING" : timeLeft < 0 ? "EXPIRED" : "LIVE";

    return {
      lnAddress: game.lnAddress,
      jackpot: game.jackpot,
      timestamp: game.timestamp,
      timeLeft,
      status: status as "WAITING" | "EXPIRED" | "LIVE",
    };
  },
});

// Core bid recording logic (shared between public and internal mutations)
const recordBidHandler = async (
  ctx: { db: any; scheduler: any },
  args: { lnAddress: string }
) => {
  const existingGame = await ctx.db.query("game").first();
  const now = Date.now();

  // Calculate if previous jackpot is still active
  let previousJackpot = 0;
  if (existingGame) {
    const timeLeft = existingGame.timestamp + CLOCK_DURATION_MS - now;
    if (timeLeft > 0) {
      previousJackpot = existingGame.jackpot;
    }

    // Cancel the previous scheduled payout if exists
    if (existingGame.scheduledPayoutId) {
      await ctx.scheduler.cancel(existingGame.scheduledPayoutId);
    }
  }

  const newJackpot = previousJackpot + INVOICE_AMOUNT;

  // Schedule the payout for when timer expires
  const scheduledPayoutId = await ctx.scheduler.runAfter(
    CLOCK_DURATION_MS,
    internal.games.triggerPayout,
    {
      lnAddress: args.lnAddress,
      jackpot: newJackpot,
      timestamp: now,
    }
  );

  // Record the bid in history
  await ctx.db.insert("bids", {
    lnAddress: args.lnAddress,
    amount: INVOICE_AMOUNT,
    timestamp: now,
    isWinner: false,
  });

  // Update or create game state
  if (existingGame) {
    await ctx.db.patch(existingGame._id, {
      lnAddress: args.lnAddress,
      jackpot: newJackpot,
      timestamp: now,
      scheduledPayoutId,
    });
  } else {
    await ctx.db.insert("game", {
      lnAddress: args.lnAddress,
      jackpot: newJackpot,
      timestamp: now,
      scheduledPayoutId,
    });
  }

  return {
    lnAddress: args.lnAddress,
    jackpot: newJackpot,
    timestamp: now,
  };
};

// Public mutation for direct bid recording
export const recordBid = mutation({
  args: {
    lnAddress: v.string(),
  },
  handler: async (ctx, args) => recordBidHandler(ctx, args),
});

// Internal mutation for recording bids from invoice settlement
export const recordBidInternal = internalMutation({
  args: {
    lnAddress: v.string(),
  },
  handler: async (ctx, args) => recordBidHandler(ctx, args),
});

// Internal mutation called by scheduled function
export const triggerPayout = internalMutation({
  args: {
    lnAddress: v.string(),
    jackpot: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify this is still the winning bid (no new bids came in)
    const game = await ctx.db.query("game").first();
    if (!game || game.timestamp !== args.timestamp) {
      console.log("Payout cancelled - new bid received");
      return { cancelled: true };
    }

    // Mark the bid as winner in history
    const winningBid = await ctx.db
      .query("bids")
      .filter((q) =>
        q.and(
          q.eq(q.field("lnAddress"), args.lnAddress),
          q.eq(q.field("timestamp"), args.timestamp)
        )
      )
      .first();

    if (winningBid) {
      await ctx.db.patch(winningBid._id, {
        isWinner: true,
        jackpotWon: args.jackpot,
      });
    }

    // Trigger the actual payment via action
    await ctx.scheduler.runAfter(0, internal.actions.payWinner, {
      lnAddress: args.lnAddress,
      jackpot: args.jackpot,
    });

    // Reset game state for next round
    await ctx.db.patch(game._id, {
      jackpot: 0,
      scheduledPayoutId: undefined,
    });

    return { success: true, winner: args.lnAddress, jackpot: args.jackpot };
  },
});
