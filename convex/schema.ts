import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Current game state - single document that gets updated
  game: defineTable({
    lnAddress: v.string(),
    jackpot: v.number(),
    timestamp: v.number(),
    // ID of the scheduled payout function (to cancel on new bid)
    scheduledPayoutId: v.optional(v.id("_scheduled_functions")),
  }),

  // Bid history for leaderboard
  bids: defineTable({
    lnAddress: v.string(),
    amount: v.number(),
    timestamp: v.number(),
    isWinner: v.boolean(),
    jackpotWon: v.optional(v.number()),
  }).index("by_address", ["lnAddress"]),

  // Presence tracking - heartbeat-based
  presence: defineTable({
    oduc: v.string(), // unique device/user identifier
    lastSeen: v.number(),
  }).index("by_uuid", ["oduc"]),
});
