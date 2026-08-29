import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";
import { getGithubUserId } from "./lib/githubIdentity";
import { ownerFromIdentity } from "./lib/owner";

const eventStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("processed"),
  v.literal("failed")
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
  installationId: v.optional(v.number()),
  githubRepositoryId: v.optional(v.number()),
  ownerTokenIdentifier: v.optional(v.string()),
  ownerGithubUserId: v.optional(v.number()),
});

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
    ownerGithubUserId: v.optional(v.number()),
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

    let owner = args.ownerTokenIdentifier;
    let ownerGithubUserId = args.ownerGithubUserId;
    const installationId = args.installationId;

    if (installationId !== undefined && (!owner || ownerGithubUserId === undefined)) {
      const installation = await ctx.db
        .query("githubInstallations")
        .withIndex("by_installation_id", (q) =>
          q.eq("installationId", installationId)
        )
        .first();

      if (installation) {
        owner = owner || installation.ownerTokenIdentifier;
        ownerGithubUserId = ownerGithubUserId ?? installation.ownerGithubUserId;
      }
    }

    const eventId = await ctx.db.insert("githubEvents", {
      deliveryId: args.deliveryId,
      event: args.event,
      payload: args.payload,
      status: "pending",
      ...(args.action !== undefined ? { action: args.action } : {}),
      ...(args.repository !== undefined ? { repository: args.repository } : {}),
      ...(args.sender !== undefined ? { sender: args.sender } : {}),
      ...(args.installationId !== undefined
        ? { installationId: args.installationId }
        : {}),
      ...(args.githubRepositoryId !== undefined
        ? { githubRepositoryId: args.githubRepositoryId }
        : {}),
      ...(owner !== undefined ? { ownerTokenIdentifier: owner } : {}),
      ...(ownerGithubUserId !== undefined
        ? { ownerGithubUserId }
        : {}),
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

    // Schedule AI generation workflow
    await ctx.scheduler.runAfter(0, internal.postGeneration.enqueueFromEvent, {
      eventId: event._id,
    });

    return null;
  },
});

/**
 * List events belonging to the signed-in GitHub user.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    ownerTokenIdentifier: v.optional(v.string()),
  },
  returns: v.array(githubEventDocValidator),
  handler: async (ctx, args) => {
    const ownerGithubUserId = await getGithubUserId(ctx);
    const limit = Math.max(1, Math.min(50, Math.floor(args.limit ?? 20)));

    if (ownerGithubUserId !== null) {
      const events = await ctx.db
        .query("githubEvents")
        .withIndex("by_owner_github_user_id", (q) =>
          q.eq("ownerGithubUserId", ownerGithubUserId)
        )
        .order("desc")
        .take(limit);

      if (events.length > 0) return events;
    }

    const identity = await ctx.auth.getUserIdentity();
    const owner = ownerFromIdentity(identity, args.ownerTokenIdentifier);

    if (owner) {
      return await ctx.db
        .query("githubEvents")
        .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
        .order("desc")
        .take(limit);
    }

    return [];
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
  returns: v.union(githubEventDocValidator, v.null()),
  handler: async (ctx, args) => {
    const ownerGithubUserId = await getGithubUserId(ctx);
    const event = await ctx.db.get(args.id);
    if (!event) return null;

    if (ownerGithubUserId !== null && event.ownerGithubUserId === ownerGithubUserId) {
      return event;
    }

    const identity = await ctx.auth.getUserIdentity();
    const owner = ownerFromIdentity(identity, args.ownerTokenIdentifier);
    if (owner && event.ownerTokenIdentifier === owner) {
      return event;
    }

    return null;
  },
});
