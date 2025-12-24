import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Game records - each game is a separate document
  game: defineTable({
    lnAddress: v.string(),
    jackpot: v.number(),
    timestamp: v.number(),
    status: v.union(
      v.literal("WAITING"),
      v.literal("LIVE"),
      v.literal("FINISHED"),
    ),
    activeBidId: v.optional(v.id("bids")),
  }).index("by_status", ["status"]),

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
    uuid: v.string(),
    lastSeen: v.number(),
  }).index("by_uuid", ["uuid"]),

  // Lightning invoices
  invoices: defineTable({
    paymentHash: v.string(),
    paymentRequest: v.string(),
    uuid: v.string(), 
    lnAddress: v.string(),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("settled"),
      v.literal("expired")
    ),
    createdAt: v.number(),
    settledAt: v.optional(v.number()),
    // ID for scheduled status check
    scheduledCheckId: v.optional(v.id("_scheduled_functions")),
  })
    .index("by_hash", ["paymentHash"])
    .index("by_address_status", ["lnAddress", "status"])
    .index("by_uuid_status", ["uuid", "status"]),
});
