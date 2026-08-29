import { createClient, type AuthFunctions } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import { betterAuth } from "better-auth/minimal";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    account: {
      onCreate: async (ctx, doc) => {
        if (doc.providerId !== "github") {
          return;
        }
        const githubUserId = Number(doc.accountId);
        if (!Number.isFinite(githubUserId) || githubUserId <= 0) {
          return;
        }
        const existing = await ctx.db
          .query("githubIdentities")
          .withIndex("by_better_auth_user_id", (q) =>
            q.eq("betterAuthUserId", doc.userId)
          )
          .first();
        if (existing) {
          await ctx.db.patch(existing._id, { githubUserId });
          return;
        }
        await ctx.db.insert("githubIdentities", {
          betterAuthUserId: doc.userId,
          githubUserId,
        });
      },
      onUpdate: async (ctx, newDoc) => {
        if (newDoc.providerId !== "github") {
          return;
        }
        const githubUserId = Number(newDoc.accountId);
        if (!Number.isFinite(githubUserId) || githubUserId <= 0) {
          return;
        }
        const existing = await ctx.db
          .query("githubIdentities")
          .withIndex("by_better_auth_user_id", (q) =>
            q.eq("betterAuthUserId", newDoc.userId)
          )
          .first();
        if (existing) {
          await ctx.db.patch(existing._id, { githubUserId });
          return;
        }
        await ctx.db.insert("githubIdentities", {
          betterAuthUserId: newDoc.userId,
          githubUserId,
        });
      },
    },
  },
});

const siteUrl = process.env.SITE_URL!;

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [siteUrl, "http://localhost:3000"],
    database: authComponent.adapter(ctx),
    // Old in-memory Better Auth wrote JWE session_data cookies. Compact
    // decode treats the JWT dots as invalid Base64 and 500s get-session.
    session: {
      cookieCache: {
        enabled: true,
        strategy: "jwe",
        maxAge: 60 * 5,
      },
    },
    socialProviders: {
      github: {
        clientId:
          process.env.GITHUB_APP_CLIENT_ID || process.env.GITHUB_CLIENT_ID || "",
        clientSecret:
          process.env.GITHUB_APP_CLIENT_SECRET ||
          process.env.GITHUB_CLIENT_SECRET ||
          "",
        mapProfileToUser: (profile) => ({
          name: profile.name || profile.login,
        }),
      },
    },
    plugins: [convex({ authConfig })],
  });
};

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await authComponent.safeGetAuthUser(ctx);
    } catch {
      return null;
    }
  },
});
