import type { GenericQueryCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";
import { authComponent } from "../auth";
import { components } from "../_generated/api";

type AuthCtx = {
  auth: GenericQueryCtx<DataModel>["auth"];
};

type DbCtx = GenericQueryCtx<DataModel>;

export async function requireIdentity(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Debes iniciar sesión para continuar.");
  }
  return identity;
}

export async function getGithubUserId(ctx: DbCtx): Promise<number | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  let user = null;
  try {
    user = await authComponent.safeGetAuthUser(ctx);
  } catch {
    return null;
  }
  if (!user) {
    return null;
  }
  const row = await ctx.db
    .query("githubIdentities")
    .withIndex("by_better_auth_user_id", (q) =>
      q.eq("betterAuthUserId", user._id)
    )
    .first();
  if (row?.githubUserId) {
    return row.githubUserId;
  }

  // Fallback: query account directly from Better Auth component
  try {
    const account = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "account",
        where: [
          { field: "userId", value: user._id },
          { field: "providerId", value: "github" },
        ],
      }
    )) as { accountId?: string | number } | null;

    if (account?.accountId) {
      const githubUserId = Number(account.accountId);
      if (Number.isFinite(githubUserId) && githubUserId > 0) {
        return githubUserId;
      }
    }
  } catch {
    // If component query fails, return null
  }

  return null;
}

export async function requireGithubUserId(ctx: DbCtx): Promise<number> {
  await requireIdentity(ctx);
  const githubUserId = await getGithubUserId(ctx);
  if (githubUserId === null) {
    throw new Error("No se pudo resolver tu usuario de GitHub. Vuelve a iniciar sesión.");
  }
  return githubUserId;
}

export const getCurrentGithubUserId = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getGithubUserId(ctx);
  },
});
