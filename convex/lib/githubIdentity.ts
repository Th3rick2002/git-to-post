import type { GenericQueryCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";
import { authComponent } from "../auth";

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
  return row?.githubUserId ?? null;
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
