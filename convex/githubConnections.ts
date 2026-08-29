import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { importPKCS8, SignJWT } from "jose";

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
    .setExpirationTime(now + 600)
    .setIssuer(appId)
    .sign(privateKey);
}

/**
 * 1. Step 1: Begin installation
 * Creates a secure random state tied to the authenticated user with a 15 min TTL.
 */
export const beginInstallation = mutation({
  args: {
    ownerTokenIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const owner = identity?.tokenIdentifier || args.ownerTokenIdentifier;

    if (!owner) {
      throw new Error("Debes iniciar sesión para conectar repositorios.");
    }

    const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutos

    await ctx.db.insert("githubInstallationIntents", {
      state,
      ownerTokenIdentifier: owner,
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
    ownerTokenIdentifier: v.string(),
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
        ownerTokenIdentifier: args.ownerTokenIdentifier,
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
        ownerTokenIdentifier: args.ownerTokenIdentifier,
        accountId: args.accountId,
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        repositorySelection: args.repositorySelection,
        status: "active",
        lastSyncedAt: Date.now(),
      });
    }

    // 3. Mark old repos for this installation as inactive
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

    // 4. Insert or update incoming repositories
    for (const r of args.repositories) {
      const existing = await ctx.db
        .query("githubRepositories")
        .withIndex("by_github_repo_id", (q) => q.eq("githubRepositoryId", r.id))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          installationId: args.installationId,
          ownerTokenIdentifier: args.ownerTokenIdentifier,
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
          ownerTokenIdentifier: args.ownerTokenIdentifier,
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
    ownerTokenIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const owner = identity?.tokenIdentifier || args.ownerTokenIdentifier;

    // 1. Verify intent
    const intent = await ctx.runQuery(internal.githubConnections.getValidIntent, {
      state: args.state,
    });

    if (!intent) {
      throw new Error("Estado de instalación inválido o expirado.");
    }

    if (owner && intent.ownerTokenIdentifier !== owner) {
      throw new Error("El intento de instalación no pertenece a este usuario.");
    }

    const finalOwner = owner || intent.ownerTokenIdentifier;

    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
      throw new Error("Faltan variables de entorno GITHUB_APP_ID o GITHUB_APP_PRIVATE_KEY en Convex.");
    }

    // 2. Generate GitHub App JWT
    const appJwt = await createGitHubAppJWT(appId, privateKey);

    // 3. Create Installation Access Token
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

    const tokenData = (await tokenRes.json()) as { token: string };
    const installationToken = tokenData.token;

    // 4. Fetch Installation details
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

    const installData = (await installRes.json()) as {
      account: { id: number; login: string; type: string };
      repository_selection: string;
    };

    // 5. Fetch repositories for this installation
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
      throw new Error("No se pudieron listar los repositorios de la instalación.");
    }

    const reposData = (await reposRes.json()) as {
      repositories: Array<{
        id: number;
        name: string;
        full_name: string;
        owner: { login: string };
        default_branch?: string;
        private: boolean;
        html_url: string;
      }>;
    };

    const formattedRepos = reposData.repositories.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner.login,
      defaultBranch: r.default_branch,
      isPrivate: r.private,
      htmlUrl: r.html_url,
    }));

    // 6. Save in Convex via internalMutation
    await ctx.runMutation(internal.githubConnections.saveInstallationAndRepos, {
      state: args.state,
      installationId: args.installationId,
      ownerTokenIdentifier: finalOwner,
      accountId: installData.account.id,
      accountLogin: installData.account.login,
      accountType: installData.account.type || "User",
      repositorySelection: installData.repository_selection || "selected",
      repositories: formattedRepos,
    });

    return { success: true, count: formattedRepos.length };
  },
});

/**
 * List installations belonging to the user.
 */
export const listInstallations = query({
  args: {
    ownerTokenIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const owner = identity?.tokenIdentifier || args.ownerTokenIdentifier;
    if (!owner) return [];

    return await ctx.db
      .query("githubInstallations")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

/**
 * List repositories belonging to the user.
 */
export const listRepositories = query({
  args: {
    ownerTokenIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const owner = identity?.tokenIdentifier || args.ownerTokenIdentifier;
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

    return inst ? inst.ownerTokenIdentifier : null;
  },
});

/**
 * Internal helper to update installation status (e.g. deleted or suspended by webhook).
 */
export const updateInstallationStatus = internalMutation({
  args: {
    installationId: v.number(),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("deleted")),
  },
  handler: async (ctx, args) => {
    const inst = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", args.installationId))
      .first();

    if (inst) {
      await ctx.db.patch(inst._id, { status: args.status, lastSyncedAt: Date.now() });

      // If deleted or suspended, update repositories as inactive
      if (args.status !== "active") {
        const repos = await ctx.db
          .query("githubRepositories")
          .withIndex("by_installation_id", (q) => q.eq("installationId", args.installationId))
          .collect();

        for (const repo of repos) {
          await ctx.db.patch(repo._id, { status: "inactive" });
        }
      }
    }
  },
});

/**
 * Internal helper to sync repository changes from `installation_repositories` webhook.
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
    const inst = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", args.installationId))
      .first();

    if (!inst) return;

    // Mark removed repositories as inactive
    for (const r of args.repositoriesRemoved) {
      const existing = await ctx.db
        .query("githubRepositories")
        .withIndex("by_github_repo_id", (q) => q.eq("githubRepositoryId", r.id))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { status: "inactive" });
      }
    }

    // Insert or activate added repositories
    for (const r of args.repositoriesAdded) {
      const existing = await ctx.db
        .query("githubRepositories")
        .withIndex("by_github_repo_id", (q) => q.eq("githubRepositoryId", r.id))
        .first();

      const [owner, name] = r.full_name.split("/");

      if (existing) {
        await ctx.db.patch(existing._id, {
          status: "active",
          ownerTokenIdentifier: inst.ownerTokenIdentifier,
        });
      } else {
        await ctx.db.insert("githubRepositories", {
          githubRepositoryId: r.id,
          installationId: args.installationId,
          ownerTokenIdentifier: inst.ownerTokenIdentifier,
          owner: owner || "",
          name: name || r.name,
          fullName: r.full_name,
          isPrivate: r.private,
          htmlUrl: `https://github.com/${r.full_name}`,
          status: "active",
        });
      }
    }
  },
});

/**
 * Internal helper to handle `installation` webhook with action `created`.
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
    let ownerTokenIdentifier = args.accountLogin;
    const existing = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) => q.eq("installationId", args.installationId))
      .first();

    if (existing) {
      ownerTokenIdentifier = existing.ownerTokenIdentifier;
      await ctx.db.patch(existing._id, {
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
        ownerTokenIdentifier,
        accountId: args.accountId,
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        repositorySelection: args.repositorySelection,
        status: "active",
        lastSyncedAt: Date.now(),
      });
    }

    for (const r of args.repositories) {
      const existingRepo = await ctx.db
        .query("githubRepositories")
        .withIndex("by_github_repo_id", (q) => q.eq("githubRepositoryId", r.id))
        .first();

      const [owner, name] = r.full_name.split("/");

      if (existingRepo) {
        await ctx.db.patch(existingRepo._id, {
          status: "active",
          installationId: args.installationId,
          ownerTokenIdentifier,
        });
      } else {
        await ctx.db.insert("githubRepositories", {
          githubRepositoryId: r.id,
          installationId: args.installationId,
          ownerTokenIdentifier,
          owner: owner || "",
          name: name || r.name,
          fullName: r.full_name,
          isPrivate: r.private,
          htmlUrl: `https://github.com/${r.full_name}`,
          status: "active",
        });
      }
    }
  },
});

