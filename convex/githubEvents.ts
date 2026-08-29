import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { getGithubUserId } from "./lib/githubIdentity";

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
    ownerGithubUserId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("githubEvents")
      .withIndex("by_delivery_id", (q) => q.eq("deliveryId", args.deliveryId))
      .first();

    if (existing) {
      return existing._id;
    }

    let ownerGithubUserId = args.ownerGithubUserId;

    if (ownerGithubUserId === undefined && args.installationId) {
      const installation = await ctx.db
        .query("githubInstallations")
        .withIndex("by_installation_id", (q) =>
          q.eq("installationId", args.installationId!)
        )
        .first();

      if (installation) {
        ownerGithubUserId = installation.ownerGithubUserId;
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
      ownerGithubUserId,
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
      if (event.event === "push") {
        const payload = event.payload;
        const commits =
          typeof payload === "object" &&
          payload !== null &&
          "commits" in payload &&
          Array.isArray(payload.commits)
            ? payload.commits
            : [];
        void commits.length;
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
 * List events belonging to the signed-in GitHub user.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ownerGithubUserId = await getGithubUserId(ctx);
    if (ownerGithubUserId === null) {
      return [];
    }

    const limit = args.limit ?? 50;

    return await ctx.db
      .query("githubEvents")
      .withIndex("by_owner_github_user_id", (q) =>
        q.eq("ownerGithubUserId", ownerGithubUserId)
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
  },
  handler: async (ctx, args) => {
    const ownerGithubUserId = await getGithubUserId(ctx);
    if (ownerGithubUserId === null) return null;

    const event = await ctx.db.get(args.id);
    if (!event || event.ownerGithubUserId !== ownerGithubUserId) {
      return null;
    }

    return event;
  },
});
