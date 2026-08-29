import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";

const eventStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("processed"),
  v.literal("failed"),
);

const githubEventDocValidator = v.object({
  _id: v.id("githubEvents"),
  _creationTime: v.number(),
  deliveryId: v.string(),
  event: v.string(),
  action: v.optional(v.string()),
  repository: v.optional(v.string()),
  sender: v.optional(v.string()),
  payload: v.any(),
  status: eventStatusValidator,
  error: v.optional(v.string()),
  processedAt: v.optional(v.number()),
  draftId: v.optional(v.id("contentDrafts")),
  skipReason: v.optional(v.string()),
});

export const saveEvent = internalMutation({
  args: {
    deliveryId: v.string(),
    event: v.string(),
    action: v.optional(v.string()),
    repository: v.optional(v.string()),
    sender: v.optional(v.string()),
    payload: v.any(),
  },
  returns: v.object({
    eventId: v.id("githubEvents"),
    isNew: v.boolean(),
    status: eventStatusValidator,
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("githubEvents")
      .withIndex("by_delivery_id", (q) => q.eq("deliveryId", args.deliveryId))
      .first();
    if (existing) {
      return {
        eventId: existing._id,
        isNew: false,
        status: existing.status,
      };
    }
    const eventId = await ctx.db.insert("githubEvents", {
      ...args,
      status: "pending",
    });
    return { eventId, isNew: true, status: "pending" as const };
  },
});

export const processEvent = internalMutation({
  args: { eventId: v.id("githubEvents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      return null;
    }
    if (event.status === "processed" || event.status === "processing") {
      return null;
    }
    await ctx.scheduler.runAfter(0, internal.postGeneration.enqueueFromEvent, {
      eventId: event._id,
    });
    return null;
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(githubEventDocValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(50, Math.floor(args.limit ?? 20)));
    return await ctx.db.query("githubEvents").order("desc").take(limit);
  },
});

export const getById = query({
  args: { id: v.id("githubEvents") },
  returns: v.union(githubEventDocValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.id),
});
