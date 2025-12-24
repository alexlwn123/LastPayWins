import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// Consider a user offline if no heartbeat for 30 seconds
const PRESENCE_TIMEOUT_MS = 30_000;

export const heartbeat = mutation({
  args: {
    oduc: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_uuid", (q) => q.eq("oduc", args.oduc))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: now });
    } else {
      await ctx.db.insert("presence", {
        oduc: args.oduc,
        lastSeen: now,
      });
    }
  },
});

export const disconnect = mutation({
  args: {
    oduc: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_uuid", (q) => q.eq("oduc", args.oduc))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getOnlineCount = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - PRESENCE_TIMEOUT_MS;
    const activeUsers = await ctx.db
      .query("presence")
      .filter((q) => q.gt(q.field("lastSeen"), cutoff))
      .collect();

    return activeUsers.length;
  },
});

// Cleanup stale presence records (called periodically via cron)
export const cleanupStale = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - PRESENCE_TIMEOUT_MS * 2;
    const staleRecords = await ctx.db
      .query("presence")
      .filter((q) => q.lt(q.field("lastSeen"), cutoff))
      .collect();

    for (const record of staleRecords) {
      await ctx.db.delete(record._id);
    }

    return { cleaned: staleRecords.length };
  },
});
