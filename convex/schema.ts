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
    paymentVersion: v.optional(v.number()),
    platformFeeBps: v.optional(v.number()),
    simulation: v.optional(v.boolean()),
  }).index("by_status", ["status"]),

  // Bid history for leaderboard
  bids: defineTable({
    lnAddress: v.string(),
    amount: v.number(),
    timestamp: v.number(),
    isWinner: v.boolean(),
    jackpotWon: v.optional(v.number()),
    invoiceId: v.optional(v.id("invoices")),
    gameId: v.optional(v.id("game")),
    creditedAmount: v.optional(v.number()),
  }).index("by_address", ["lnAddress"]),

  // Presence tracking - heartbeat-based
  presence: defineTable({
    uuid: v.string(),
    lastSeen: v.number(),
  })
    .index("by_uuid", ["uuid"])
    .index("by_lastSeen", ["lastSeen"]),

  // MDK payment attempts and historical LND invoices
  invoices: defineTable({
    paymentHash: v.optional(v.string()),
    paymentRequest: v.optional(v.string()),
    uuid: v.string(),
    lnAddress: v.string(),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("settled"),
      v.literal("expired"),
      v.literal("creating"),
      v.literal("review"),
    ),
    createdAt: v.number(),
    settledAt: v.optional(v.number()),
    provider: v.optional(v.literal("mdk")),
    checkoutId: v.optional(v.string()),
    gameId: v.optional(v.id("game")),
    expiresAt: v.optional(v.number()),
    netAmount: v.optional(v.number()),
    creditedAmount: v.optional(v.number()),
    sandbox: v.optional(v.boolean()),
    error: v.optional(v.string()),
    nextCheckAt: v.optional(v.number()),
    leaseUntil: v.optional(v.number()),
    generation: v.optional(v.number()),
    bidAmount: v.optional(v.number()),
    memo: v.optional(v.string()),
  })
    .index("by_hash", ["paymentHash"])
    .index("by_checkoutId", ["checkoutId"])
    .index("by_nextCheckAt", ["nextCheckAt"])
    .index("by_uuid_and_createdAt", ["uuid", "createdAt"])
    .index("by_address_status", ["lnAddress", "status"])
    .index("by_uuid_status", ["uuid", "status"]),

  paymentEvents: defineTable({
    eventId: v.string(),
    attemptId: v.string(),
    receivedAt: v.number(),
    status: v.union(
      v.literal("received"),
      v.literal("processed"),
      v.literal("review"),
    ),
    error: v.optional(v.string()),
    nextCheckAt: v.optional(v.number()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_nextCheckAt", ["nextCheckAt"]),

  payouts: defineTable({
    simulation: v.optional(v.boolean()),
    gameId: v.optional(v.id("game")),
    invoiceId: v.optional(v.id("invoices")),
    kind: v.union(v.literal("prize"), v.literal("refund")),
    destination: v.string(),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
    ),
    paymentId: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    nextCheckAt: v.optional(v.number()),
    leaseUntil: v.optional(v.number()),
    attempt: v.optional(v.number()),
    terminalFailure: v.optional(v.boolean()),
    jackpotAmount: v.optional(v.number()),
    platformFeeAmount: v.optional(v.number()),
    comment: v.optional(v.string()),
    paymentRequest: v.optional(v.string()),
  })
    .index("by_gameId", ["gameId"])
    .index("by_invoiceId", ["invoiceId"])
    .index("by_nextCheckAt", ["nextCheckAt"]),
});
