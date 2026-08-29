import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { importPKCS8, SignJWT } from "jose";
import { getGithubUserId, requireIdentity } from "./lib/githubIdentity";
import { ownerFromIdentity } from "./lib/owner";

/**
 * Creates a JWT to authenticate as the GitHub App.
 */
async function createGitHubAppJWT(appId: string, privateKeyPem: string): Promise<string> {
  let normalizedKey = privateKeyPem.trim();
  if (normalizedKey.includes("\\n")) {
    normalizedKey = normalizedKey.replace(/\\n/g, "\n");
  }
  const privateKey = await importPKCS8(normalizedKey, "RS256");
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 10 * 60)
    .setIssuer(appId)
    .sign(privateKey);
}

/**
 * Helper to update owner on installation and its repos.
 */
async function applyOwnerToInstallation(
  ctx: MutationCtx,
  installationId: number,
  ownerGithubUserId: number
) {
  const installation = await ctx.db
    .query("githubInstallations")
    .withIndex("by_installation_id", (q) => q.eq("installationId", installationId))
    .first();

  if (installation) {
    await ctx.db.patch(installation._id, { ownerGithubUserId });
  }

  const repos = await ctx.db
    .query("githubRepositories")
    .withIndex("by_installation_id", (q) => q.eq("installationId", installationId))
    .collect();

  for (const repo of repos) {
    await ctx.db.patch(repo._id, { ownerGithubUserId });
  }
}

/**
 * 1. Step 1: Begin installation
 * Generates CSRF state and saves intent in DB.
 */
export const beginInstallation = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const ownerGithubUserId = (await getGithubUserId(ctx)) ?? undefined;

    const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = Date.now() + 15 * 60 * 1000;

    await ctx.db.insert("githubInstallationIntents", {
      state,
      ownerTokenIdentifier: identity.tokenIdentifier,
      ...(ownerGithubUserId !== undefined ? { ownerGithubUserId } : {}),
      expiresAt,
    });

    return { state };
  },
});

/**
 * Internal query to validate an installation intent.
 */
export const getValidIntent = internalQuery({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const intent = await ctx.db
      .query("githubInstallationIntents")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!intent) return null;
    if (intent.usedAt) return null;
    if (intent.expiresAt < Date.now()) return null;

    return intent;
  },
});

/**
 * Internal mutation to mark intent used and persist installation + repositories.
 */
export const saveInstallationAndRepos = internalMutation({
  args: {
    state: v.string(),
    installationId: v.number(),
    ownerGithubUserId: v.number(),
    accountId: v.number(),
    accountLogin: v.string(),
    accountType: v.string(),
    repositorySelection: v.string(),
    repositories: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        fullName: v.string(),
        owner: v.string(),
        defaultBranch: v.optional(v.string()),
        isPrivate: v.boolean(),
        htmlUrl: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // 1. Mark intent as used
    const intent = await ctx.db
      .query("githubInstallationIntents")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (intent) {
      await ctx.db.patch(intent._id, {
        usedAt: Date.now(),
        installationId: args.installationId,
      });
    }

    // 2. Save or update installation
    const existingInstallation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", args.installationId))
      .first();

    if (existingInstallation) {
      await ctx.db.patch(existingInstallation._id, {
        ownerGithubUserId: args.ownerGithubUserId,
        accountId: args.accountId,
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        repositorySelection: args.repositorySelection,
        status: "active",
        lastSyncedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("githubInstallations", {
        installationId: args.installationId,
        ownerGithubUserId: args.ownerGithubUserId,
        accountId: args.accountId,
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        repositorySelection: args.repositorySelection,
        status: "active",
        lastSyncedAt: Date.now(),
      });
    }

    const existingRepos = await ctx.db
      .query("githubRepositories")
      .withIndex("by_installation_id", (q) => q.eq("installationId", args.installationId))
      .collect();

    const activeIds = new Set(args.repositories.map((r) => r.id));

    for (const repo of existingRepos) {
      if (!activeIds.has(repo.githubRepositoryId)) {
        await ctx.db.patch(repo._id, { status: "inactive" });
      }
    }

    for (const r of args.repositories) {
      const existing = await ctx.db
        .query("githubRepositories")
        .withIndex("by_github_repo_id", (q) => q.eq("githubRepositoryId", r.id))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          installationId: args.installationId,
          ownerGithubUserId: args.ownerGithubUserId,
          owner: r.owner,
          name: r.name,
          fullName: r.fullName,
          defaultBranch: r.defaultBranch,
          isPrivate: r.isPrivate,
          htmlUrl: r.htmlUrl,
          status: "active",
        });
      } else {
        await ctx.db.insert("githubRepositories", {
          githubRepositoryId: r.id,
          installationId: args.installationId,
          ownerGithubUserId: args.ownerGithubUserId,
          owner: r.owner,
          name: r.name,
          fullName: r.fullName,
          defaultBranch: r.defaultBranch,
          isPrivate: r.isPrivate,
          htmlUrl: r.htmlUrl,
          status: "active",
        });
      }
    }

    await applyOwnerToInstallation(ctx, args.installationId, args.ownerGithubUserId);

    return { success: true };
  },
});

/**
 * 2. Step 2: Complete installation (Action)
 * Verifies the intent, authenticates with GitHub App, queries GitHub API for repos and commits data.
 */
export const completeInstallation = action({
  args: {
    state: v.string(),
    code: v.optional(v.string()),
    installationId: v.number(),
  },
  handler: async (ctx, args) => {
    let ownerGithubUserId = await ctx.runQuery(
      internal.lib.githubIdentity.getCurrentGithubUserId,
      {}
    );

    const intent = await ctx.runQuery(internal.githubConnections.getValidIntent, {
      state: args.state,
    });

    if (!intent) {
      throw new Error("Estado de instalación inválido o expirado.");
    }

    if (
      ownerGithubUserId !== null &&
      intent.ownerGithubUserId !== undefined &&
      intent.ownerGithubUserId !== ownerGithubUserId
    ) {
      throw new Error("El intento de instalación no pertenece a este usuario.");
    }

    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
      throw new Error("Faltan variables de entorno GITHUB_APP_ID o GITHUB_APP_PRIVATE_KEY en Convex.");
    }

    const appJwt = await createGitHubAppJWT(appId, privateKey);

    const tokenRes = await fetch(
      `https://api.github.com/app/installations/${args.installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "PublicaDev-App",
        },
      }
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Error obteniendo token de instalación: ${tokenRes.status} ${errText}`);
    }

    const tokenData: unknown = await tokenRes.json();
    if (
      typeof tokenData !== "object" ||
      tokenData === null ||
      !("token" in tokenData) ||
      typeof tokenData.token !== "string"
    ) {
      throw new Error("Respuesta inválida al obtener token de instalación.");
    }
    const installationToken = tokenData.token;

    const installRes = await fetch(
      `https://api.github.com/app/installations/${args.installationId}`,
      {
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "PublicaDev-App",
        },
      }
    );

    if (!installRes.ok) {
      throw new Error("No se pudo obtener información de la instalación en GitHub.");
    }

    const installData: unknown = await installRes.json();
    if (
      typeof installData !== "object" ||
      installData === null ||
      !("account" in installData) ||
      typeof installData.account !== "object" ||
      installData.account === null
    ) {
      throw new Error("Respuesta inválida de la instalación en GitHub.");
    }

    const account = installData.account as {
      id?: unknown;
      login?: unknown;
      type?: unknown;
    };
    const repositorySelection =
      "repository_selection" in installData &&
      typeof installData.repository_selection === "string"
        ? installData.repository_selection
        : "selected";

    if (typeof account.id !== "number" || typeof account.login !== "string") {
      throw new Error("La instalación de GitHub no incluye una cuenta válida.");
    }

    const reposRes = await fetch(
      "https://api.github.com/installation/repositories?per_page=100",
      {
        headers: {
          Authorization: `Bearer ${installationToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "PublicaDev-App",
        },
      }
    );

    if (!reposRes.ok) {
      const errText = await reposRes.text();
      throw new Error(`Error obteniendo repositorios de GitHub: ${reposRes.status} ${errText}`);
    }

    const reposData: unknown = await reposRes.json();
    if (
      typeof reposData !== "object" ||
      reposData === null ||
      !("repositories" in reposData) ||
      !Array.isArray(reposData.repositories)
    ) {
      throw new Error("Respuesta inválida de repositorios.");
    }

    const rawRepos = reposData.repositories as Array<{
      id?: unknown;
      name?: unknown;
      full_name?: unknown;
      owner?: { login?: unknown };
      default_branch?: unknown;
      private?: unknown;
      html_url?: unknown;
    }>;

    const formattedRepos = rawRepos.flatMap((repo) => {
      if (
        typeof repo.id !== "number" ||
        typeof repo.name !== "string" ||
        typeof repo.full_name !== "string" ||
        typeof repo.owner?.login !== "string" ||
        typeof repo.private !== "boolean" ||
        typeof repo.html_url !== "string"
      ) {
        return [];
      }
      return [
        {
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          defaultBranch:
            typeof repo.default_branch === "string" ? repo.default_branch : undefined,
          isPrivate: repo.private,
          htmlUrl: repo.html_url,
        },
      ];
    });

    if (ownerGithubUserId === null || ownerGithubUserId === undefined) {
      ownerGithubUserId = account.id;
    }

    await ctx.runMutation(internal.githubConnections.saveInstallationAndRepos, {
      state: args.state,
      installationId: args.installationId,
      ownerGithubUserId,
      accountId: account.id,
      accountLogin: account.login,
      accountType: typeof account.type === "string" ? account.type : "User",
      repositorySelection,
      repositories: formattedRepos,
    });

    return { success: true, count: formattedRepos.length };
  },
});

/**
 * Claim personal-account installs whose GitHub accountId is this user.
 */
export const claimInstallationsForCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const ownerGithubUserId = await getGithubUserId(ctx);
    if (ownerGithubUserId === null) {
      return { claimed: 0 };
    }

    const installs = await ctx.db
      .query("githubInstallations")
      .withIndex("by_account_id", (q) => q.eq("accountId", ownerGithubUserId))
      .collect();

    let claimed = 0;
    for (const inst of installs) {
      if (inst.ownerGithubUserId === ownerGithubUserId) {
        continue;
      }
      await applyOwnerToInstallation(ctx, inst.installationId, ownerGithubUserId);
      claimed += 1;
    }

    return { claimed };
  },
});

/**
 * List installations belonging to the signed-in GitHub user.
 */
export const listInstallations = query({
  args: {
    ownerTokenIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerGithubUserId = await getGithubUserId(ctx);
    if (ownerGithubUserId !== null) {
      const installs = await ctx.db
        .query("githubInstallations")
        .withIndex("by_owner_github_user_id", (q) =>
          q.eq("ownerGithubUserId", ownerGithubUserId)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      if (installs.length > 0) return installs;
    }

    const identity = await ctx.auth.getUserIdentity();
    const owner = ownerFromIdentity(identity, args.ownerTokenIdentifier);
    if (!owner) return [];

    return await ctx.db
      .query("githubInstallations")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

/**
 * List repositories belonging to the signed-in GitHub user.
 */
export const listRepositories = query({
  args: {
    ownerTokenIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerGithubUserId = await getGithubUserId(ctx);
    if (ownerGithubUserId !== null) {
      const repos = await ctx.db
        .query("githubRepositories")
        .withIndex("by_owner_github_user_id", (q) =>
          q.eq("ownerGithubUserId", ownerGithubUserId)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      if (repos.length > 0) return repos;
    }

    const identity = await ctx.auth.getUserIdentity();
    const owner = ownerFromIdentity(identity, args.ownerTokenIdentifier);
    if (!owner) return [];

    return await ctx.db
      .query("githubRepositories")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

/**
 * Internal helper to find owner by installation ID (used by Webhook).
 */
export const findOwnerByInstallation = internalQuery({
  args: {
    installationId: v.number(),
  },
  handler: async (ctx, args) => {
    const inst = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", args.installationId))
      .first();

    return inst?.ownerGithubUserId ?? inst?.ownerTokenIdentifier ?? null;
  },
});

/**
 * Update installation status on Webhook events (deleted, suspended, etc.)
 */
export const updateInstallationStatus = internalMutation({
  args: {
    installationId: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("deleted")
    ),
  },
  handler: async (ctx, args) => {
    const installation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", args.installationId))
      .first();

    if (!installation) return;

    await ctx.db.patch(installation._id, {
      status: args.status,
      lastSyncedAt: Date.now(),
    });

    if (args.status !== "active") {
      const repos = await ctx.db
        .query("githubRepositories")
        .withIndex("by_installation_id", (q) => q.eq("installationId", args.installationId))
        .collect();

      for (const r of repos) {
        await ctx.db.patch(r._id, { status: "inactive" });
      }
    }
  },
});

/**
 * Handle repository addition / removal in an existing installation.
 */
export const handleInstallationRepositoriesWebhook = internalMutation({
  args: {
    installationId: v.number(),
    repositoriesAdded: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        full_name: v.string(),
        private: v.boolean(),
      })
    ),
    repositoriesRemoved: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        full_name: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const installation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", args.installationId))
      .first();

    if (!installation) return;

    for (const r of args.repositoriesAdded) {
      const existing = await ctx.db
        .query("githubRepositories")
        .withIndex("by_github_repo_id", (q) => q.eq("githubRepositoryId", r.id))
        .first();

      const [owner] = r.full_name.split("/");

      if (existing) {
        await ctx.db.patch(existing._id, {
          installationId: args.installationId,
          ownerGithubUserId: installation.ownerGithubUserId,
          owner: owner || "",
          name: r.name,
          fullName: r.full_name,
          isPrivate: r.private,
          htmlUrl: `https://github.com/${r.full_name}`,
          status: "active",
        });
      } else {
        await ctx.db.insert("githubRepositories", {
          githubRepositoryId: r.id,
          installationId: args.installationId,
          ownerGithubUserId: installation.ownerGithubUserId,
          owner: owner || "",
          name: r.name,
          fullName: r.full_name,
          isPrivate: r.private,
          htmlUrl: `https://github.com/${r.full_name}`,
          status: "active",
        });
      }
    }

    for (const r of args.repositoriesRemoved) {
      const existing = await ctx.db
        .query("githubRepositories")
        .withIndex("by_github_repo_id", (q) => q.eq("githubRepositoryId", r.id))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { status: "inactive" });
      }
    }
  },
});

/**
 * Handle new installation webhook directly.
 */
export const handleInstallationCreatedWebhook = internalMutation({
  args: {
    installationId: v.number(),
    accountId: v.number(),
    accountLogin: v.string(),
    accountType: v.string(),
    repositorySelection: v.string(),
    repositories: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        full_name: v.string(),
        private: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let ownerGithubUserId: number | undefined;

    const identity = await ctx.db
      .query("githubIdentities")
      .withIndex("by_github_user_id", (q) => q.eq("githubUserId", args.accountId))
      .first();

    if (identity) {
      ownerGithubUserId = identity.githubUserId;
    }

    const existingInstallation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", args.installationId))
      .first();

    if (existingInstallation) {
      await ctx.db.patch(existingInstallation._id, {
        ownerGithubUserId: ownerGithubUserId ?? existingInstallation.ownerGithubUserId,
        accountId: args.accountId,
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        repositorySelection: args.repositorySelection,
        status: "active",
        lastSyncedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("githubInstallations", {
        installationId: args.installationId,
        ownerGithubUserId,
        accountId: args.accountId,
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        repositorySelection: args.repositorySelection,
        status: "active",
        lastSyncedAt: Date.now(),
      });
    }

    for (const r of args.repositories) {
      const existing = await ctx.db
        .query("githubRepositories")
        .withIndex("by_github_repo_id", (q) => q.eq("githubRepositoryId", r.id))
        .first();

      const [owner] = r.full_name.split("/");

      if (existing) {
        await ctx.db.patch(existing._id, {
          installationId: args.installationId,
          ownerGithubUserId: ownerGithubUserId ?? existing.ownerGithubUserId,
          owner: owner || "",
          name: r.name,
          fullName: r.full_name,
          isPrivate: r.private,
          htmlUrl: `https://github.com/${r.full_name}`,
          status: "active",
        });
      } else {
        await ctx.db.insert("githubRepositories", {
          githubRepositoryId: r.id,
          installationId: args.installationId,
          ownerGithubUserId,
          owner: owner || "",
          name: r.name,
          fullName: r.full_name,
          isPrivate: r.private,
          htmlUrl: `https://github.com/${r.full_name}`,
          status: "active",
        });
      }
    }
  },
});
