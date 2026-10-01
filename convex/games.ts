import { payoutMemo } from "../src/lib/payments/payoutMemo";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { acceptsSimulation, clockDuration } from "./paymentRules";

export async function activeGame(ctx: QueryCtx) {
  return (
    (await ctx.db
      .query("game")
      .withIndex("by_status", (q) => q.eq("status", "LIVE"))
      .first()) ??
    (await ctx.db
      .query("game")
      .withIndex("by_status", (q) => q.eq("status", "WAITING"))
      .first())
  );
}

export async function finishGame(ctx: MutationCtx, game: Doc<"game">) {
  if (game.status !== "LIVE" || game.timestamp + clockDuration() > Date.now())
    return;
  await ctx.db.patch(game._id, { status: "FINISHED" });
  if (game.activeBidId)
    await ctx.db.patch(game.activeBidId, {
      isWinner: true,
      jackpotWon: game.jackpot,
    });
  // Legacy obligations require explicit reconciliation during cutover.
  if (game.paymentVersion === 2 && game.jackpot > 0) {
    const payoutId = await ctx.db.insert("payouts", {
      gameId: game._id,
      kind: "prize",
      destination: game.lnAddress,
      amount: game.jackpot,
      comment: payoutMemo("prize", game.jackpot),
      status: "pending",
      createdAt: Date.now(),
      nextCheckAt: Date.now(),
      simulation: game.simulation ?? false,
    });
    await ctx.scheduler.runAfter(0, internal.payoutActions.execute, {
      payoutId,
    });
  }
}

export async function ensureGame(ctx: MutationCtx) {
  let game = await activeGame(ctx);
  if (
    game?.status === "LIVE" &&
    game.timestamp + clockDuration() <= Date.now()
  ) {
    await finishGame(ctx, game);
    game = await activeGame(ctx);
  }
  if (game) {
    if (game.status === "WAITING" && !game.paymentVersion) {
      await ctx.db.patch(game._id, {
        paymentVersion: 2,
        simulation: acceptsSimulation(),
      });
      return { ...game, paymentVersion: 2, simulation: acceptsSimulation() };
    }
    if (game.paymentVersion !== 2)
      throw new Error(
        "Resolve the existing LND round before enabling MDK bids",
      );
    if (
      game.status === "WAITING" &&
      game.jackpot === 0 &&
      game.simulation === undefined
    ) {
      await ctx.db.patch(game._id, { simulation: acceptsSimulation() });
      return { ...game, simulation: acceptsSimulation() };
    }
    if (game.simulation !== acceptsSimulation())
      throw new Error(
        "Use a separate local database when switching between simulation and real payments",
      );
    return game;
  }
  const id = await ctx.db.insert("game", {
    status: "WAITING",
    lnAddress: "",
    jackpot: 0,
    timestamp: Date.now(),
    paymentVersion: 2,
    simulation: acceptsSimulation(),
  });
  return (await ctx.db.get(id))!;
}

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const game = (await activeGame(ctx)) ?? {
      status: "WAITING" as const,
      lnAddress: "",
      jackpot: 0,
      timestamp: 0,
    };
    const previous =
      game.status === "WAITING"
        ? await ctx.db
            .query("game")
            .withIndex("by_status", (q) => q.eq("status", "FINISHED"))
            .order("desc")
            .first()
        : null;
    return {
      ...game,
      previousWinner: previous
        ? { lnAddress: previous.lnAddress, jackpot: previous.jackpot }
        : null,
    };
  },
});

export const endGame = internalMutation({
  args: { gameId: v.id("game"), bidId: v.id("bids") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.activeBidId !== args.bidId || game.status !== "LIVE")
      return;
    await finishGame(ctx, game);
    await ensureGame(ctx);
  },
});

export async function recordPaidBid(
  ctx: MutationCtx,
  invoice: Doc<"invoices">,
  creditedAmount: number,
) {
  const game = invoice.gameId ? await ctx.db.get(invoice.gameId) : null;
  const now = Date.now();
  if (
    !game ||
    game.status === "FINISHED" ||
    (game.status === "LIVE" && game.timestamp + clockDuration() <= now)
  ) {
    if (game?.status === "LIVE") await finishGame(ctx, game);
    if (creditedAmount > 0) {
      const payoutId = await ctx.db.insert("payouts", {
        invoiceId: invoice._id,
        kind: "refund",
        destination: invoice.lnAddress,
        amount: creditedAmount,
        comment: payoutMemo("refund", creditedAmount),
        status: "pending",
        createdAt: now,
        nextCheckAt: now,
        simulation: invoice.sandbox ?? acceptsSimulation(),
      });
      await ctx.scheduler.runAfter(0, internal.payoutActions.execute, {
        payoutId,
      });
    }
    await ensureGame(ctx);
    return false;
  }
  const bidId = await ctx.db.insert("bids", {
    invoiceId: invoice._id,
    gameId: game._id,
    lnAddress: invoice.lnAddress,
    amount: invoice.bidAmount ?? invoice.amount,
    creditedAmount,
    timestamp: now,
    isWinner: false,
  });
  const jackpot = game.jackpot + creditedAmount;
  await ctx.db.patch(game._id, {
    status: "LIVE",
    lnAddress: invoice.lnAddress,
    activeBidId: bidId,
    jackpot,
    timestamp: now,
  });
  await ctx.scheduler.runAfter(clockDuration(), internal.games.endGame, {
    gameId: game._id,
    bidId,
  });
  await ctx.scheduler.runAfter(0, internal.actions.sendBidNotification, {
    lnAddress: invoice.lnAddress,
    jackpot,
  });
  return true;
}
