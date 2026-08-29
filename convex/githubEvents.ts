import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const saveEvent = internalMutation({
  args: {
    deliveryId: v.string(),
    event: v.string(),
    action: v.optional(v.string()),
    repository: v.optional(v.string()),
    sender: v.optional(v.string()),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    // Check if event already exists (deduplication by delivery ID)
    const existing = await ctx.db
      .query("githubEvents")
      .withIndex("by_delivery_id", (q) => q.eq("deliveryId", args.deliveryId))
      .first();

    if (existing) {
      return existing._id;
    }

    const eventId = await ctx.db.insert("githubEvents", {
      deliveryId: args.deliveryId,
      event: args.event,
      action: args.action,
      repository: args.repository,
      sender: args.sender,
      payload: args.payload,
      status: "pending",
    });

    return eventId;
  },
});

export const processEvent = internalMutation({
  args: {
    eventId: v.id("githubEvents"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return;

    await ctx.db.patch(args.eventId, {
      status: "processing",
    });

    try {
      // Logic to process the event according to type
      // e.g. "push", "pull_request", "release", "issues", etc.
      console.log(`Processing GitHub event [${event.event}] delivery: ${event.deliveryId}`);

      // Example parsing logic based on event type:
      if (event.event === "push") {
        const commits = event.payload?.commits || [];
        console.log(`Received ${commits.length} commits for repo ${event.repository}`);
      } else if (event.event === "pull_request") {
        console.log(`PR action: ${event.action} for repo ${event.repository}`);
      } else if (event.event === "release") {
        console.log(`Release created/published: ${event.payload?.release?.tag_name}`);
      }

      await ctx.db.patch(args.eventId, {
        status: "processed",
        processedAt: Date.now(),
      });
    } catch (error) {
      await ctx.db.patch(args.eventId, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("githubEvents")
      .order("desc")
      .take(limit);
  },
});

export const getById = query({
  args: {
    id: v.id("githubEvents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
