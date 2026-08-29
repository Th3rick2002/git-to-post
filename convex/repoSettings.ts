import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getGithubUserId, requireGithubUserId, requireIdentity } from "./lib/githubIdentity";
import schema from "./schema";

const MAX_SETTINGS_PER_OWNER = 200;

export const listForOwner = query({
  args: {},
  returns: v.array(schema.doc("repoSettings")),
  handler: async (ctx) => {
    const ownerGithubUserId = await getGithubUserId(ctx);
    if (ownerGithubUserId === null) {
      return [];
    }

    return await ctx.db
      .query("repoSettings")
      .withIndex("by_owner_github_user_id", (q) =>
        q.eq("ownerGithubUserId", ownerGithubUserId),
      )
      .take(MAX_SETTINGS_PER_OWNER);
  },
});

export const upsert = mutation({
  args: {
    githubRepositoryId: v.number(),
    integrationMethod: v.union(v.literal("grok_bot"), v.literal("manual")),
    triggers: v.object({
      newReleases: v.boolean(),
      tags: v.boolean(),
      commitsOnMain: v.boolean(),
    }),
    artifacts: v.object({
      releaseNotes: v.boolean(),
      changelog: v.boolean(),
      socialCard: v.boolean(),
      apiDocs: v.boolean(),
      execSummary: v.boolean(),
    }),
  },
  returns: v.id("repoSettings"),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const ownerGithubUserId = await requireGithubUserId(ctx);

    const repo = await ctx.db
      .query("githubRepositories")
      .withIndex("by_github_repo_id", (q) => q.eq("githubRepositoryId", args.githubRepositoryId))
      .unique();

    if (!repo || repo.ownerGithubUserId !== ownerGithubUserId || repo.status !== "active") {
      throw new Error("Este repositorio no está conectado a tu cuenta.");
    }

    const existing = await ctx.db
      .query("repoSettings")
      .withIndex("by_owner_github_user_id_and_github_repository_id", (q) =>
        q.eq("ownerGithubUserId", ownerGithubUserId).eq("githubRepositoryId", args.githubRepositoryId),
      )
      .unique();

    const fields = {
      ownerGithubUserId,
      ownerTokenIdentifier: identity.tokenIdentifier,
      githubRepositoryId: args.githubRepositoryId,
      integrationMethod: args.integrationMethod,
      triggers: args.triggers,
      artifacts: args.artifacts,
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }

    return await ctx.db.insert("repoSettings", fields);
  },
});
