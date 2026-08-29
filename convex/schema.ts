import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const triggerValidator = v.union(
  v.literal("push"),
  v.literal("pull_request"),
  v.literal("release"),
  v.literal("tag"),
);

export const toneValidator = v.union(
  v.literal("devrel"),
  v.literal("technical"),
  v.literal("executive"),
);

export const imageModeValidator = v.union(
  v.literal("none"),
  v.literal("reference"),
  v.literal("abstract"),
);

export const draftStatusValidator = v.union(
  v.literal("queued"),
  v.literal("analyzing"),
  v.literal("generating_text"),
  v.literal("generating_image"),
  v.literal("ready"),
  v.literal("partial"),
  v.literal("failed"),
);

export const imageStatusValidator = v.union(
  v.literal("pending"),
  v.literal("generating"),
  v.literal("generated"),
  v.literal("attached"),
  v.literal("skipped"),
  v.literal("failed"),
);

export const runStageValidator = v.union(
  v.literal("text"),
  v.literal("image"),
  v.literal("all"),
);

export const runStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
);

export const confidenceValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

export const evidenceValidator = v.object({
  claim: v.string(),
  source: v.string(),
  file: v.optional(v.string()),
  lines: v.optional(v.string()),
});

export const metricValidator = v.object({
  label: v.string(),
  value: v.string(),
  source: v.string(),
});

export const fileStatsValidator = v.object({
  added: v.number(),
  modified: v.number(),
  deleted: v.number(),
  renamed: v.number(),
  additions: v.number(),
  deletions: v.number(),
});

export const changeAnalysisValidator = v.object({
  category: v.string(),
  before: v.string(),
  after: v.string(),
  impact: v.string(),
  architectureNotes: v.optional(v.string()),
  apiChanges: v.optional(v.string()),
  unknowns: v.optional(v.array(v.string())),
  evidence: v.array(evidenceValidator),
  metrics: v.array(metricValidator),
  confidence: confidenceValidator,
});

export const visualBriefValidator = v.object({
  subject: v.string(),
  mood: v.string(),
  palette: v.array(v.string()),
  avoid: v.array(v.string()),
});

export const generatedDraftValidator = v.object({
  analysis: changeAnalysisValidator,
  title: v.string(),
  summary: v.string(),
  xThread: v.array(v.string()),
  linkedinPost: v.string(),
  changelogMarkdown: v.string(),
  technicalHighlights: v.array(v.string()),
  breakingChanges: v.array(v.string()),
  hashtags: v.array(v.string()),
  visualBrief: visualBriefValidator,
});

export const generationPolicyValidator = v.object({
  generateOnPush: v.boolean(),
  generateOnVersionTag: v.boolean(),
  generateOnTagCreate: v.boolean(),
});

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.optional(v.boolean()),
  }),

  example_data: defineTable({
    text: v.string(),
    isCompleted: v.optional(v.boolean()),
  }),

  githubIdentities: defineTable({
    betterAuthUserId: v.string(),
    githubUserId: v.number(),
  })
    .index("by_better_auth_user_id", ["betterAuthUserId"])
    .index("by_github_user_id", ["githubUserId"]),

  githubInstallationIntents: defineTable({
    state: v.string(),
    ownerTokenIdentifier: v.optional(v.string()),
    ownerGithubUserId: v.optional(v.number()),
    expiresAt: v.number(),
    installationId: v.optional(v.number()),
    usedAt: v.optional(v.number()),
  })
    .index("by_state", ["state"])
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_github_user_id", ["ownerGithubUserId"]),

  githubInstallations: defineTable({
    installationId: v.number(),
    ownerTokenIdentifier: v.optional(v.string()),
    ownerGithubUserId: v.optional(v.number()),
    accountId: v.number(),
    accountLogin: v.string(),
    accountType: v.string(),
    repositorySelection: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("deleted")
    ),
    lastSyncedAt: v.number(),
  })
    .index("by_installation_id", ["installationId"])
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_github_user_id", ["ownerGithubUserId"])
    .index("by_account_id", ["accountId"]),

  githubRepositories: defineTable({
    githubRepositoryId: v.number(),
    installationId: v.number(),
    ownerTokenIdentifier: v.optional(v.string()),
    ownerGithubUserId: v.optional(v.number()),
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
    .index("by_owner_github_user_id", ["ownerGithubUserId"])
    .index("by_full_name", ["fullName"]),

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
    draftId: v.optional(v.id("contentDrafts")),
    skipReason: v.optional(v.string()),
    installationId: v.optional(v.number()),
    githubRepositoryId: v.optional(v.number()),
    ownerTokenIdentifier: v.optional(v.string()),
    ownerGithubUserId: v.optional(v.number()),
  })
    .index("by_delivery_id", ["deliveryId"])
    .index("by_status", ["status"])
    .index("by_event", ["event"])
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_github_user_id", ["ownerGithubUserId"])
    .index("by_repo", ["githubRepositoryId"])
    .index("by_installation_id", ["installationId"]),

  generationPolicies: defineTable({
    repository: v.string(),
    generateOnPush: v.boolean(),
    generateOnVersionTag: v.boolean(),
    generateOnTagCreate: v.boolean(),
  }).index("by_repository", ["repository"]),

  changeContexts: defineTable({
    githubEventId: v.id("githubEvents"),
    changeKey: v.string(),
    repository: v.string(),
    trigger: triggerValidator,
    title: v.string(),
    beforeSha: v.optional(v.string()),
    afterSha: v.optional(v.string()),
    ref: v.optional(v.string()),
    tag: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    commitMessages: v.array(v.string()),
    releaseNotes: v.optional(v.string()),
    compareUrl: v.optional(v.string()),
    fileStats: v.optional(fileStatsValidator),
    filePaths: v.optional(v.array(v.string())),
    truncated: v.optional(v.boolean()),
    evidenceText: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_github_event_id", ["githubEventId"])
    .index("by_change_key", ["changeKey"]),

  contentDrafts: defineTable({
    githubEventId: v.id("githubEvents"),
    changeContextId: v.id("changeContexts"),
    changeKey: v.string(),
    repository: v.string(),
    trigger: triggerValidator,
    status: draftStatusValidator,
    tone: toneValidator,
    locale: v.string(),
    imageMode: imageModeValidator,
    imageStatus: imageStatusValidator,
    textModel: v.string(),
    imageModel: v.string(),
    promptVersion: v.string(),
    requestedPalette: v.optional(v.array(v.string())),
    agentThreadId: v.optional(v.string()),
    workflowId: v.optional(v.string()),
    analysis: v.optional(changeAnalysisValidator),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    xThread: v.optional(v.array(v.string())),
    linkedinPost: v.optional(v.string()),
    changelogMarkdown: v.optional(v.string()),
    technicalHighlights: v.optional(v.array(v.string())),
    breakingChanges: v.optional(v.array(v.string())),
    hashtags: v.optional(v.array(v.string())),
    visualBrief: v.optional(visualBriefValidator),
    imagePrompt: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    ownerTokenIdentifier: v.optional(v.string()),
    ownerGithubUserId: v.optional(v.number()),
  })
    .index("by_change_key", ["changeKey"])
    .index("by_status_and_updated_at", ["status", "updatedAt"])
    .index("by_updated_at", ["updatedAt"])
    .index("by_owner_and_updated_at", ["ownerTokenIdentifier", "updatedAt"])
    .index("by_owner_github_user_id_and_updated_at", ["ownerGithubUserId", "updatedAt"]),

  generationRuns: defineTable({
    draftId: v.id("contentDrafts"),
    stage: runStageValidator,
    status: runStatusValidator,
    model: v.string(),
    promptVersion: v.string(),
    attempt: v.number(),
    workflowId: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index("by_draft_id", ["draftId"])
    .index("by_status_and_started_at", ["status", "startedAt"]),

  imageReferences: defineTable({
    draftId: v.id("contentDrafts"),
    storageId: v.id("_storage"),
    role: v.union(
      v.literal("style"),
      v.literal("benchmark"),
      v.literal("metric"),
      v.literal("related")
    ),
    filename: v.string(),
    mimeType: v.string(),
    createdAt: v.number(),
  })
    .index("by_draft_id", ["draftId"])
    .index("by_draft_id_and_storage_id", ["draftId", "storageId"]),

  repoSettings: defineTable({
    ownerGithubUserId: v.number(),
    ownerTokenIdentifier: v.optional(v.string()),
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
  })
    .index("by_owner_github_user_id", ["ownerGithubUserId"])
    .index("by_owner_github_user_id_and_github_repository_id", [
      "ownerGithubUserId",
      "githubRepositoryId",
    ]),
});
