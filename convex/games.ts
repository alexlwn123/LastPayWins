import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, query, QueryCtx } from "./_generated/server";

const CLOCK_DURATION_MS =
  (parseInt(process.env.NEXT_PUBLIC_CLOCK_DURATION ?? "60") || 60) * 1000;
const INVOICE_AMOUNT = parseInt(process.env.INVOICE_AMOUNT ?? "100") || 100;

const getActiveGame = async (ctx: QueryCtx) => {
  const liveGame = await ctx.db
    .query("game")
    .withIndex("by_status", (q) => q.eq("status", "LIVE"))
    .first();
  if (liveGame) return liveGame;

  const waitingGame = await ctx.db
    .query("game")
    .withIndex("by_status", (q) => q.eq("status", "WAITING"))
    .first();
  if (waitingGame) return waitingGame;

  throw new Error("No active game found");
};

export const getCurrent = query({
  args: {},
  handler: getActiveGame,
});

export const recordBid = internalMutation({
  args: {
    lnAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const activeGame = await getActiveGame(ctx);
    const now = Date.now();

    let previousJackpot = 0;
    if (activeGame.status === "LIVE") {
      const timeLeft = activeGame.timestamp + CLOCK_DURATION_MS - now;
      if (timeLeft > 0) {
        previousJackpot = activeGame.jackpot;
      }
    }

    const newJackpot = previousJackpot + INVOICE_AMOUNT;

    // Record the bid in history
    const bid = await ctx.db.insert("bids", {
      lnAddress: args.lnAddress,
      amount: INVOICE_AMOUNT,
      timestamp: now,
      isWinner: false,
    });

    // Update active game to LIVE
    await ctx.db.patch(activeGame._id, {
      lnAddress: args.lnAddress,
      activeBidId: bid,
      jackpot: newJackpot,
      timestamp: now,
      status: "LIVE",
    });


    // Schedule game end when timer expires
    await ctx.scheduler.runAfter(CLOCK_DURATION_MS, internal.games.endGame, {
      gameId: activeGame._id,
      bidId: bid,
    });

    return {
      lnAddress: args.lnAddress,
      jackpot: newJackpot,
      timestamp: now,
    };
  },
});

export const endGame = internalMutation({
  args: {
    gameId: v.id("game"),
    bidId: v.id("bids"),
  },
  handler: async (ctx, args) => {
    const bid = await ctx.db.get("bids",args.bidId);
    const game = await ctx.db.get("game", args.gameId);
    if (!game || game.status !== "LIVE") {
      console.warn("Game end cancelled - game not live");
      return
    } else if (!bid || bid._id !== game.activeBidId) {
      console.warn("Game end cancelled - bid not active");
      return
    }

    const { lnAddress, jackpot } = game;

    await ctx.db.patch("bids", args.bidId, {
      isWinner: true,
      jackpotWon: jackpot,
    });

    await ctx.db.patch("game", args.gameId, {
      status: "FINISHED",
    });

    await ctx.db.insert("game", {
      lnAddress,
      jackpot: 0,
      timestamp: Date.now(),
      status: "WAITING",
    });

    ctx.scheduler.runAfter(0, internal.actions.payWinner, {
      lnAddress,
      jackpot,
    });

    return { success: true, winner: lnAddress, jackpot };
  },
});
