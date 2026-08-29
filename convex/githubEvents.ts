import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const saveEvent = internalMutation({
  args: {
    deliveryId: v.string(),
    event: v.string(),
    action: v.optional(v.string()),
    repository: v.optional(v.string()),
    sender: v.optional(v.string()),
    payload: v.any(),
    installationId: v.optional(v.number()),
    githubRepositoryId: v.optional(v.number()),
    ownerTokenIdentifier: v.optional(v.string()),
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

    let owner = args.ownerTokenIdentifier;

    // If owner was not directly supplied, look it up from the installation record
    if (!owner && args.installationId) {
      const installation = await ctx.db
        .query("githubInstallations")
        .withIndex("by_installation_id", (q) =>
          q.eq("installationId", args.installationId!)
        )
        .first();

      if (installation) {
        owner = installation.ownerTokenIdentifier;
      }
    }

    const eventId = await ctx.db.insert("githubEvents", {
      deliveryId: args.deliveryId,
      event: args.event,
      action: args.action,
      repository: args.repository,
      sender: args.sender,
      payload: args.payload,
      status: "pending",
      installationId: args.installationId,
      githubRepositoryId: args.githubRepositoryId,
      ownerTokenIdentifier: owner,
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
      console.log(`Processing GitHub event [${event.event}] for delivery: ${event.deliveryId}`);

      if (event.event === "push") {
        const commits = event.payload?.commits || [];
        console.log(`Received ${commits.length} commits for repo ${event.repository}`);
      } else if (event.event === "pull_request") {
        console.log(`PR action: ${event.action} for repo ${event.repository}`);
      } else if (event.event === "release") {
        console.log(`Release created: ${event.payload?.release?.tag_name}`);
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

/**
 * List events belonging to the user.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    ownerTokenIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const owner = identity?.tokenIdentifier || args.ownerTokenIdentifier;

    if (!owner) {
      return [];
    }

    const limit = args.limit ?? 50;

    return await ctx.db
      .query("githubEvents")
      .withIndex("by_owner", (q) =>
        q.eq("ownerTokenIdentifier", owner)
      )
      .order("desc")
      .take(limit);
  },
});

/**
 * Get single event details with ownership check.
 */
export const getById = query({
  args: {
    id: v.id("githubEvents"),
    ownerTokenIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const owner = identity?.tokenIdentifier || args.ownerTokenIdentifier;

    if (!owner) return null;

    const event = await ctx.db.get(args.id);
    if (!event || event.ownerTokenIdentifier !== owner) {
      return null;
    }

    return event;
  },
});
