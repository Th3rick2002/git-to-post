import { importPKCS8, SignJWT } from "jose";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  env,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { ownerFromIdentity } from "./lib/owner";
import schema from "./schema";

const installationStatusValidator = v.union(
  v.literal("active"),
  v.literal("suspended"),
  v.literal("deleted"),
);

const incomingRepoValidator = v.object({
  id: v.number(),
  name: v.string(),
  fullName: v.string(),
  owner: v.string(),
  defaultBranch: v.optional(v.string()),
  isPrivate: v.boolean(),
  htmlUrl: v.string(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function createGitHubAppJWT(
  appId: string,
  privateKeyPem: string,
): Promise<string> {
  const normalizedKey = privateKeyPem.replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(normalizedKey, "RS256");
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 600)
    .setIssuer(appId)
    .sign(privateKey);
}

export const beginInstallation = mutation({
  args: {
    ownerTokenIdentifier: v.optional(v.string()),
  },
  returns: v.object({ state: v.string() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const owner = ownerFromIdentity(identity, args.ownerTokenIdentifier);
    if (!owner) {
      throw new Error("Debes iniciar sesión para conectar repositorios.");
    }

    const state =
      crypto.randomUUID().replace(/-/g, "") +
      crypto.randomUUID().replace(/-/g, "");
    await ctx.db.insert("githubInstallationIntents", {
      state,
      ownerTokenIdentifier: owner,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    return { state };
  },
});

export const getValidIntent = internalQuery({
  args: {
    state: v.string(),
    now: v.number(),
  },
  returns: v.union(schema.doc("githubInstallationIntents"), v.null()),
  handler: async (ctx, args) => {
    const intent = await ctx.db
      .query("githubInstallationIntents")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
    if (!intent || intent.usedAt || intent.expiresAt < args.now) {
      return null;
    }
    return intent;
  },
});

export const saveInstallationAndRepos = internalMutation({
  args: {
    state: v.string(),
    installationId: v.number(),
    ownerTokenIdentifier: v.string(),
    accountId: v.number(),
    accountLogin: v.string(),
    accountType: v.string(),
    repositorySelection: v.string(),
    repositories: v.array(incomingRepoValidator),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
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

    const existingInstallation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) =>
        q.eq("installationId", args.installationId),
      )
      .first();
    const installationFields = {
      ownerTokenIdentifier: args.ownerTokenIdentifier,
      accountId: args.accountId,
      accountLogin: args.accountLogin,
      accountType: args.accountType,
      repositorySelection: args.repositorySelection,
      status: "active" as const,
      lastSyncedAt: Date.now(),
    };
    if (existingInstallation) {
      await ctx.db.patch(existingInstallation._id, installationFields);
    } else {
      await ctx.db.insert("githubInstallations", {
        installationId: args.installationId,
        ...installationFields,
      });
    }

    const existingRepos = await ctx.db
      .query("githubRepositories")
      .withIndex("by_installation_id", (q) =>
        q.eq("installationId", args.installationId),
      )
      .take(500);
    const activeIds = new Set(args.repositories.map((repo) => repo.id));
    for (const repo of existingRepos) {
      if (!activeIds.has(repo.githubRepositoryId)) {
        await ctx.db.patch(repo._id, { status: "inactive" });
      }
    }

    for (const repo of args.repositories) {
      const existing = await ctx.db
        .query("githubRepositories")
        .withIndex("by_github_repo_id", (q) =>
          q.eq("githubRepositoryId", repo.id),
        )
        .first();
      const repoFields = {
        installationId: args.installationId,
        ownerTokenIdentifier: args.ownerTokenIdentifier,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        defaultBranch: repo.defaultBranch,
        isPrivate: repo.isPrivate,
        htmlUrl: repo.htmlUrl,
        status: "active" as const,
      };
      if (existing) {
        await ctx.db.patch(existing._id, repoFields);
      } else {
        await ctx.db.insert("githubRepositories", {
          githubRepositoryId: repo.id,
          ...repoFields,
        });
      }
    }

    return { success: true };
  },
});

export const completeInstallation = action({
  args: {
    state: v.string(),
    code: v.optional(v.string()),
    installationId: v.number(),
    ownerTokenIdentifier: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const owner = ownerFromIdentity(identity, args.ownerTokenIdentifier);
    const intent = await ctx.runQuery(internal.githubConnections.getValidIntent, {
      state: args.state,
      now: Date.now(),
    });
    if (!intent) {
      throw new Error("Estado de instalación inválido o expirado.");
    }
    if (owner && intent.ownerTokenIdentifier !== owner) {
      throw new Error("El intento de instalación no pertenece a este usuario.");
    }

    const finalOwner = owner || intent.ownerTokenIdentifier;
    const appId = env.GITHUB_APP_ID;
    const privateKey = env.GITHUB_APP_PRIVATE_KEY;
    if (!appId || !privateKey) {
      throw new Error(
        "Faltan GITHUB_APP_ID o GITHUB_APP_PRIVATE_KEY en Convex.",
      );
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
      },
    );
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(
        `Error obteniendo token de instalación: ${tokenRes.status} ${errText}`,
      );
    }
    const tokenJson: unknown = await tokenRes.json();
    if (!isRecord(tokenJson) || typeof tokenJson.token !== "string") {
      throw new Error("GitHub no devolvió un token de instalación válido.");
    }

    const installRes = await fetch(
      `https://api.github.com/app/installations/${args.installationId}`,
      {
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "PublicaDev-App",
        },
      },
    );
    if (!installRes.ok) {
      throw new Error("No se pudo obtener información de la instalación en GitHub.");
    }
    const installJson: unknown = await installRes.json();
    if (
      !isRecord(installJson) ||
      !isRecord(installJson.account) ||
      typeof installJson.account.id !== "number" ||
      typeof installJson.account.login !== "string"
    ) {
      throw new Error("GitHub no devolvió una instalación válida.");
    }
    const accountType =
      typeof installJson.account.type === "string"
        ? installJson.account.type
        : "User";
    const repositorySelection =
      typeof installJson.repository_selection === "string"
        ? installJson.repository_selection
        : "selected";

    const reposRes = await fetch(
      "https://api.github.com/installation/repositories?per_page=100",
      {
        headers: {
          Authorization: `Bearer ${tokenJson.token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "PublicaDev-App",
        },
      },
    );
    if (!reposRes.ok) {
      throw new Error("No se pudieron listar los repositorios de la instalación.");
    }
    const reposJson: unknown = await reposRes.json();
    if (!isRecord(reposJson) || !Array.isArray(reposJson.repositories)) {
      throw new Error("GitHub no devolvió la lista de repositorios.");
    }

    const formattedRepos = [];
    for (const raw of reposJson.repositories) {
      if (
        !isRecord(raw) ||
        typeof raw.id !== "number" ||
        typeof raw.name !== "string" ||
        typeof raw.full_name !== "string" ||
        !isRecord(raw.owner) ||
        typeof raw.owner.login !== "string" ||
        typeof raw.private !== "boolean" ||
        typeof raw.html_url !== "string"
      ) {
        continue;
      }
      formattedRepos.push({
        id: raw.id,
        name: raw.name,
        fullName: raw.full_name,
        owner: raw.owner.login,
        defaultBranch:
          typeof raw.default_branch === "string"
            ? raw.default_branch
            : undefined,
        isPrivate: raw.private,
        htmlUrl: raw.html_url,
      });
    }

    await ctx.runMutation(internal.githubConnections.saveInstallationAndRepos, {
      state: args.state,
      installationId: args.installationId,
      ownerTokenIdentifier: finalOwner,
      accountId: installJson.account.id,
      accountLogin: installJson.account.login,
      accountType,
      repositorySelection,
      repositories: formattedRepos,
    });

    return { success: true, count: formattedRepos.length };
  },
});

export const listInstallations = query({
  args: {
    ownerTokenIdentifier: v.optional(v.string()),
  },
  returns: v.array(schema.doc("githubInstallations")),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const owner = ownerFromIdentity(identity, args.ownerTokenIdentifier);
    if (!owner) {
      return [];
    }
    return await ctx.db
      .query("githubInstallations")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(50);
  },
});

export const listRepositories = query({
  args: {
    ownerTokenIdentifier: v.optional(v.string()),
  },
  returns: v.array(schema.doc("githubRepositories")),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const owner = ownerFromIdentity(identity, args.ownerTokenIdentifier);
    if (!owner) {
      return [];
    }
    return await ctx.db
      .query("githubRepositories")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(200);
  },
});

export const findOwnerByInstallation = internalQuery({
  args: {
    installationId: v.number(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const installation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) =>
        q.eq("installationId", args.installationId),
      )
      .first();
    return installation ? installation.ownerTokenIdentifier : null;
  },
});

export const updateInstallationStatus = internalMutation({
  args: {
    installationId: v.number(),
    status: installationStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const installation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) =>
        q.eq("installationId", args.installationId),
      )
      .first();
    if (!installation) {
      return null;
    }
    await ctx.db.patch(installation._id, {
      status: args.status,
      lastSyncedAt: Date.now(),
    });
    if (args.status !== "active") {
      const repos = await ctx.db
        .query("githubRepositories")
        .withIndex("by_installation_id", (q) =>
          q.eq("installationId", args.installationId),
        )
        .take(500);
      for (const repo of repos) {
        await ctx.db.patch(repo._id, { status: "inactive" });
      }
    }
    return null;
  },
});

export const handleInstallationRepositoriesWebhook = internalMutation({
  args: {
    installationId: v.number(),
    repositoriesAdded: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        full_name: v.string(),
        private: v.boolean(),
      }),
    ),
    repositoriesRemoved: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        full_name: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const installation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) =>
        q.eq("installationId", args.installationId),
      )
      .first();
    if (!installation) {
      return null;
    }

    for (const repo of args.repositoriesRemoved) {
      const existing = await ctx.db
        .query("githubRepositories")
        .withIndex("by_github_repo_id", (q) =>
          q.eq("githubRepositoryId", repo.id),
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { status: "inactive" });
      }
    }

    for (const repo of args.repositoriesAdded) {
      const existing = await ctx.db
        .query("githubRepositories")
        .withIndex("by_github_repo_id", (q) =>
          q.eq("githubRepositoryId", repo.id),
        )
        .first();
      const [owner, name] = repo.full_name.split("/");
      if (existing) {
        await ctx.db.patch(existing._id, {
          status: "active",
          ownerTokenIdentifier: installation.ownerTokenIdentifier,
        });
      } else {
        await ctx.db.insert("githubRepositories", {
          githubRepositoryId: repo.id,
          installationId: args.installationId,
          ownerTokenIdentifier: installation.ownerTokenIdentifier,
          owner: owner || "",
          name: name || repo.name,
          fullName: repo.full_name,
          isPrivate: repo.private,
          htmlUrl: `https://github.com/${repo.full_name}`,
          status: "active",
        });
      }
    }
    return null;
  },
});
