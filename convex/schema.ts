import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.optional(v.boolean()),
  }),

  // Temporary intents to secure the installation flow with TTL and prevent CSRF / installation spoofing
  githubInstallationIntents: defineTable({
    state: v.string(),
    ownerTokenIdentifier: v.string(),
    expiresAt: v.number(),
    installationId: v.optional(v.number()),
    usedAt: v.optional(v.number()),
  })
    .index("by_state", ["state"])
    .index("by_owner", ["ownerTokenIdentifier"]),

  // GitHub App installations mapped to platform owners
  githubInstallations: defineTable({
    installationId: v.number(),
    ownerTokenIdentifier: v.string(),
    accountId: v.number(),
    accountLogin: v.string(),
    accountType: v.string(), // "User" | "Organization"
    repositorySelection: v.string(), // "all" | "selected"
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("deleted")
    ),
    lastSyncedAt: v.number(),
  })
    .index("by_installation_id", ["installationId"])
    .index("by_owner", ["ownerTokenIdentifier"]),

  // Connected repositories accessible via GitHub App
  githubRepositories: defineTable({
    githubRepositoryId: v.number(),
    installationId: v.number(),
    ownerTokenIdentifier: v.string(),
    owner: v.string(),
    name: v.string(),
    fullName: v.string(),
    defaultBranch: v.optional(v.string()),
    isPrivate: v.boolean(),
    htmlUrl: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_github_repo_id", ["githubRepositoryId"])
    .index("by_installation_id", ["installationId"])
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_full_name", ["fullName"]),

  // GitHub webhook events with tenant attribution
  githubEvents: defineTable({
    deliveryId: v.string(),
    event: v.string(),
    action: v.optional(v.string()),
    repository: v.optional(v.string()),
    sender: v.optional(v.string()),
    payload: v.any(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    // Multitenancy attribution fields
    installationId: v.optional(v.number()),
    githubRepositoryId: v.optional(v.number()),
    ownerTokenIdentifier: v.optional(v.string()),
  })
    .index("by_delivery_id", ["deliveryId"])
    .index("by_status", ["status"])
    .index("by_event", ["event"])
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_repo", ["githubRepositoryId"]),
});
