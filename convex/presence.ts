import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// Consider a user offline if no heartbeat for 30 seconds
const PRESENCE_TIMEOUT_MS = 30_000;

export const heartbeat = mutation({
  args: {
    uuid: v.string(),
    lnAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeen: now,
      });
    } else {
      await ctx.db.insert("presence", {
        uuid: args.uuid,
        lastSeen: now,
      });
    }
  },
});

export const disconnect = mutation({
  args: {
    uuid: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
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
      .withIndex("by_lastSeen", (q) => q.gt("lastSeen", cutoff))
      .take(1000);

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
      .withIndex("by_lastSeen", (q) => q.lt("lastSeen", cutoff))
      .take(100);

    for (const record of staleRecords) {
      await ctx.db.delete(record._id);
    }

    return { cleaned: staleRecords.length };
  },
});
