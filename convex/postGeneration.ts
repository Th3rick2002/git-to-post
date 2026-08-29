import { createThread } from "@convex-dev/agent";
import {
  vResultValidator,
  vWorkflowId,
  WorkflowManager,
} from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { getGithubUserId } from "./lib/githubIdentity";
import { ownerFromIdentity } from "./lib/owner";
import { detectContentLocale } from "./lib/contentLocale";
import {
  DEFAULT_GENERATION_POLICY,
  normalizeGitHubEvent,
  type GenerationPolicy,
  type NormalizedGenerationContext,
} from "./lib/githubEvent";
import {
  changeAnalysisValidator,
  draftStatusValidator,
  fileStatsValidator,
  generatedDraftValidator,
  generationPolicyValidator,
  imageModeValidator,
  imageStatusValidator,
  runStageValidator,
  toneValidator,
  triggerValidator,
  visualBriefValidator,
} from "./schema";

const TEXT_MODEL = "google/gemini-2.5-flash";
const IMAGE_MODEL = "google/gemini-2.5-flash-image";
const PROMPT_VERSION = "github-evidence-v3";
const workflows = new WorkflowManager(components.workflow);

const referenceRoleValidator = v.union(
  v.literal("style"),
  v.literal("benchmark"),
  v.literal("metric"),
  v.literal("related"),
);

const changeContextViewValidator = v.object({
  changeKey: v.string(),
  tag: v.optional(v.string()),
  prNumber: v.optional(v.number()),
  beforeSha: v.optional(v.string()),
  afterSha: v.optional(v.string()),
  ref: v.optional(v.string()),
  compareUrl: v.optional(v.string()),
  fileStats: v.optional(fileStatsValidator),
  filePaths: v.optional(v.array(v.string())),
  truncated: v.optional(v.boolean()),
});

const draftViewValidator = v.object({
  _id: v.id("contentDrafts"),
  repository: v.string(),
  trigger: triggerValidator,
  status: draftStatusValidator,
  tone: toneValidator,
  locale: v.string(),
  imageMode: imageModeValidator,
  imageStatus: imageStatusValidator,
  requestedPalette: v.optional(v.array(v.string())),
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
  imageUrl: v.optional(v.string()),
  error: v.optional(v.string()),
  context: v.optional(changeContextViewValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.optional(v.number()),
});

const referenceViewValidator = v.object({
  _id: v.id("imageReferences"),
  role: referenceRoleValidator,
  filename: v.string(),
  mimeType: v.string(),
  url: v.optional(v.string()),
});

const generationInputValidator = v.object({
  draftId: v.id("contentDrafts"),
  threadId: v.string(),
  repository: v.string(),
  trigger: triggerValidator,
  tone: toneValidator,
  locale: v.string(),
  localeLocked: v.boolean(),
  imageMode: imageModeValidator,
  requestedPalette: v.optional(v.array(v.string())),
  title: v.string(),
  beforeSha: v.optional(v.string()),
  afterSha: v.optional(v.string()),
  ref: v.optional(v.string()),
  tag: v.optional(v.string()),
  prNumber: v.optional(v.number()),
  commitMessages: v.array(v.string()),
  releaseNotes: v.optional(v.string()),
  compareUrl: v.optional(v.string()),
});

function capText(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function capStrings(values: string[], count: number, max: number): string[] {
  return values
    .map((value) => capText(value, max))
    .filter(Boolean)
    .slice(0, count);
}

function contextFromRecentEvent(
  event: Doc<"githubEvents"> | null,
): NormalizedGenerationContext | null {
  if (!event) {
    return null;
  }
  const normalized = normalizeGitHubEvent(event, {
    generateOnPush: true,
    generateOnVersionTag: true,
    generateOnTagCreate: true,
  });
  return normalized.kind === "generate" ? normalized.context : null;
}

function isBusyStatus(status: Doc<"contentDrafts">["status"]): boolean {
  return (
    status === "queued" ||
    status === "analyzing" ||
    status === "generating_text" ||
    status === "generating_image"
  );
}

async function resolvePolicy(
  ctx: MutationCtx,
  repository: string,
): Promise<GenerationPolicy> {
  const override = await ctx.db
    .query("generationPolicies")
    .withIndex("by_repository", (q) => q.eq("repository", repository))
    .first();
  if (override) {
    return {
      generateOnPush: override.generateOnPush,
      generateOnVersionTag: override.generateOnVersionTag,
      generateOnTagCreate: override.generateOnTagCreate,
    };
  }
  const fallback = await ctx.db
    .query("generationPolicies")
    .withIndex("by_repository", (q) => q.eq("repository", "*"))
    .first();
  if (fallback) {
    return {
      generateOnPush: fallback.generateOnPush,
      generateOnVersionTag: fallback.generateOnVersionTag,
      generateOnTagCreate: fallback.generateOnTagCreate,
    };
  }
  return DEFAULT_GENERATION_POLICY;
}

async function toDraftView(ctx: QueryCtx, draft: Doc<"contentDrafts">) {
  let imageUrl = draft.imageStorageId
    ? ((await ctx.storage.getUrl(draft.imageStorageId)) ?? undefined)
    : undefined;
  if (!imageUrl && draft.imageMode === "reference") {
    const reference = await ctx.db
      .query("imageReferences")
      .withIndex("by_draft_id", (q) => q.eq("draftId", draft._id))
      .first();
    imageUrl = reference
      ? ((await ctx.storage.getUrl(reference.storageId)) ?? undefined)
      : undefined;
  }
  const change = await ctx.db.get(draft.changeContextId);
  return {
    _id: draft._id,
    repository: draft.repository,
    trigger: draft.trigger,
    status: draft.status,
    tone: draft.tone,
    locale: draft.locale,
    imageMode: draft.imageMode,
    imageStatus: draft.imageStatus,
    requestedPalette: draft.requestedPalette,
    analysis: draft.analysis,
    title: draft.title,
    summary: draft.summary,
    xThread: draft.xThread,
    linkedinPost: draft.linkedinPost,
    changelogMarkdown: draft.changelogMarkdown,
    technicalHighlights: draft.technicalHighlights,
    breakingChanges: draft.breakingChanges,
    hashtags: draft.hashtags,
    visualBrief: draft.visualBrief,
    imagePrompt: draft.imagePrompt,
    imageUrl,
    error: draft.error,
    context: change
      ? {
          changeKey: change.changeKey,
          tag: change.tag,
          prNumber: change.prNumber,
          beforeSha: change.beforeSha,
          afterSha: change.afterSha,
          ref: change.ref,
          compareUrl: change.compareUrl,
          fileStats: change.fileStats,
          filePaths: change.filePaths,
          truncated: change.truncated,
        }
      : undefined,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    completedAt: draft.completedAt,
  };
}

async function startGenerationWorkflow(
  ctx: MutationCtx,
  draftId: Id<"contentDrafts">,
  runId: Id<"generationRuns">,
  stage: "text" | "image" | "all",
): Promise<string> {
  const workflowId = await workflows.start(
    ctx,
    internal.postGenerationWorkflow.generateDraft,
    { draftId, runId, stage },
    {
      onComplete: internal.postGeneration.handleWorkflowComplete,
      context: { draftId, runId, stage },
      startAsync: true,
    },
  );
  return workflowId as string;
}

export const enqueueFromEvent = internalMutation({
  args: { eventId: v.id("githubEvents") },
  returns: v.union(v.id("contentDrafts"), v.null()),
  handler: async (ctx, args): Promise<Id<"contentDrafts"> | null> => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      return null;
    }
    if (event.status === "processed" || event.draftId) {
      return event.draftId ?? null;
    }

    await ctx.db.patch(event._id, {
      status: "processing",
      error: undefined,
      skipReason: undefined,
    });

    const policy = event.repository
      ? await resolvePolicy(ctx, event.repository)
      : DEFAULT_GENERATION_POLICY;
    const normalized = normalizeGitHubEvent(event, policy);
    if (normalized.kind === "skip") {
      await ctx.db.patch(event._id, {
        status: "processed",
        processedAt: Date.now(),
        skipReason: normalized.reason,
      });
      return null;
    }

    const duplicate = await ctx.db
      .query("contentDrafts")
      .withIndex("by_change_key", (q) =>
        q.eq("changeKey", normalized.context.changeKey),
      )
      .first();
    if (duplicate) {
      await ctx.db.patch(event._id, {
        status: "processed",
        processedAt: Date.now(),
        draftId: duplicate._id,
        skipReason: "A draft already exists for this exact change.",
      });
      return duplicate._id;
    }

    const now = Date.now();
    const contextId = await ctx.db.insert("changeContexts", {
      githubEventId: event._id,
      ...normalized.context,
      createdAt: now,
    });
    const threadId = await createThread(ctx, components.agent, {
      title: `${normalized.context.repository}: ${normalized.context.title}`,
      summary: `Post generation for ${normalized.context.changeKey}`,
    });
    const draftId = await ctx.db.insert("contentDrafts", {
      githubEventId: event._id,
      changeContextId: contextId,
      changeKey: normalized.context.changeKey,
      repository: normalized.context.repository,
      trigger: normalized.context.trigger,
      status: "queued",
      tone: "technical",
      locale: detectContentLocale([
        normalized.context.title,
        normalized.context.releaseNotes ?? "",
        ...normalized.context.commitMessages,
      ]),
      imageMode: "none",
      imageStatus: "skipped",
      textModel: TEXT_MODEL,
      imageModel: IMAGE_MODEL,
      promptVersion: PROMPT_VERSION,
      agentThreadId: threadId,
      createdAt: now,
      updatedAt: now,
      ...(event.ownerTokenIdentifier !== undefined
        ? { ownerTokenIdentifier: event.ownerTokenIdentifier }
        : {}),
      ...(event.ownerGithubUserId !== undefined
        ? { ownerGithubUserId: event.ownerGithubUserId }
        : {}),
    });
    const runId = await ctx.db.insert("generationRuns", {
      draftId,
      stage: "text",
      status: "queued",
      model: TEXT_MODEL,
      promptVersion: PROMPT_VERSION,
      attempt: 1,
      startedAt: now,
    });

    const workflowId = await startGenerationWorkflow(
      ctx,
      draftId,
      runId,
      "text",
    );
    await Promise.all([
      ctx.db.patch(draftId, { workflowId }),
      ctx.db.patch(runId, { workflowId }),
      ctx.db.patch(event._id, { draftId }),
    ]);
    return draftId;
  },
});

export const requestGeneration = mutation({
  args: {
    draftId: v.id("contentDrafts"),
    stage: runStageValidator,
    imageMode: v.optional(imageModeValidator),
    tone: v.optional(toneValidator),
    locale: v.optional(v.string()),
    requestedPalette: v.optional(v.array(v.string())),
  },
  returns: v.object({
    draftId: v.id("contentDrafts"),
    workflowId: v.string(),
  }),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }
    if (isBusyStatus(draft.status)) {
      throw new Error("This draft is already being generated.");
    }

    const imageMode = args.imageMode ?? draft.imageMode;
    if (args.stage === "image" && imageMode === "none") {
      throw new Error("Choose abstract or reference image mode first.");
    }
    const palette = args.requestedPalette
      ? capStrings(args.requestedPalette, 8, 80)
      : draft.requestedPalette;
    const locale = capText(args.locale ?? draft.locale, 20) || "en";
    const localeLocked = args.locale !== undefined;
    const now = Date.now();
    const priorRuns = await ctx.db
      .query("generationRuns")
      .withIndex("by_draft_id", (q) => q.eq("draftId", draft._id))
      .take(100);
    const model = args.stage === "image" ? draft.imageModel : draft.textModel;
    const runId = await ctx.db.insert("generationRuns", {
      draftId: draft._id,
      stage: args.stage,
      status: "queued",
      model,
      promptVersion: draft.promptVersion,
      attempt: priorRuns.length + 1,
      startedAt: now,
    });
    await ctx.db.patch(draft._id, {
      tone: args.tone ?? draft.tone,
      locale,
      localeLocked,
      imageMode,
      requestedPalette: palette,
      imageStatus:
        args.stage === "text"
          ? draft.imageStatus
          : imageMode === "reference"
            ? "pending"
            : "generating",
      status: args.stage === "image" ? "generating_image" : "analyzing",
      error: undefined,
      updatedAt: now,
      completedAt: undefined,
    });

    const workflowId = await startGenerationWorkflow(
      ctx,
      draft._id,
      runId,
      args.stage,
    );
    await Promise.all([
      ctx.db.patch(draft._id, { workflowId }),
      ctx.db.patch(runId, { workflowId }),
    ]);
    return { draftId: draft._id, workflowId };
  },
});

export const updateEditedContent = mutation({
  args: {
    draftId: v.id("contentDrafts"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    xThread: v.optional(v.array(v.string())),
    linkedinPost: v.optional(v.string()),
    changelogMarkdown: v.optional(v.string()),
    technicalHighlights: v.optional(v.array(v.string())),
    breakingChanges: v.optional(v.array(v.string())),
    hashtags: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }
    if (isBusyStatus(draft.status)) {
      throw new Error("Wait until generation finishes before editing.");
    }
    const xThread = args.xThread
      ? capStrings(args.xThread, 6, 280)
      : draft.xThread;
    await ctx.db.patch(draft._id, {
      title:
        args.title !== undefined ? capText(args.title, 160) : draft.title,
      summary:
        args.summary !== undefined ? capText(args.summary, 1_200) : draft.summary,
      xThread,
      linkedinPost:
        args.linkedinPost !== undefined
          ? capText(args.linkedinPost, 3_000)
          : draft.linkedinPost,
      changelogMarkdown:
        args.changelogMarkdown !== undefined
          ? capText(args.changelogMarkdown, 12_000)
          : draft.changelogMarkdown,
      technicalHighlights:
        args.technicalHighlights !== undefined
          ? capStrings(args.technicalHighlights, 12, 600)
          : draft.technicalHighlights,
      breakingChanges:
        args.breakingChanges !== undefined
          ? capStrings(args.breakingChanges, 8, 600)
          : draft.breakingChanges,
      hashtags:
        args.hashtags !== undefined
          ? capStrings(args.hashtags, 8, 60)
          : draft.hashtags,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const list = query({
  args: {
    limit: v.optional(v.number()),
    ownerTokenIdentifier: v.optional(v.string()),
  },
  returns: v.array(draftViewValidator),
  handler: async (ctx, args) => {
    const ownerGithubUserId = await getGithubUserId(ctx);
    const limit = Math.max(1, Math.min(50, Math.floor(args.limit ?? 30)));

    if (ownerGithubUserId !== null) {
      const userDrafts = await ctx.db
        .query("contentDrafts")
        .withIndex("by_owner_github_user_id_and_updated_at", (q) =>
          q.eq("ownerGithubUserId", ownerGithubUserId)
        )
        .order("desc")
        .take(limit);

      if (userDrafts.length > 0) {
        return await Promise.all(userDrafts.map((draft) => toDraftView(ctx, draft)));
      }
    }

    const identity = await ctx.auth.getUserIdentity();
    const owner = ownerFromIdentity(identity, args.ownerTokenIdentifier);
    if (!owner) {
      return [];
    }
    const drafts = await ctx.db
      .query("contentDrafts")
      .withIndex("by_owner_and_updated_at", (q) =>
        q.eq("ownerTokenIdentifier", owner),
      )
      .order("desc")
      .take(limit);
    return await Promise.all(drafts.map((draft) => toDraftView(ctx, draft)));
  },
});

export const get = query({
  args: {
    draftId: v.id("contentDrafts"),
    ownerTokenIdentifier: v.optional(v.string()),
  },
  returns: v.union(
    v.null(),
    v.object({
      draft: draftViewValidator,
      references: v.array(referenceViewValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const ownerGithubUserId = await getGithubUserId(ctx);
    const draft = await ctx.db.get(args.draftId);
    if (!draft) return null;

    let isAuthorized = false;
    if (ownerGithubUserId !== null && draft.ownerGithubUserId === ownerGithubUserId) {
      isAuthorized = true;
    } else {
      const identity = await ctx.auth.getUserIdentity();
      const owner = ownerFromIdentity(identity, args.ownerTokenIdentifier);
      if (owner && draft.ownerTokenIdentifier === owner) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return null;
    }

    const references = await ctx.db
      .query("imageReferences")
      .withIndex("by_draft_id", (q) => q.eq("draftId", draft._id))
      .take(10);
    return {
      draft: await toDraftView(ctx, draft),
      references: await Promise.all(
        references.map(async (reference) => ({
          _id: reference._id,
          role: reference.role,
          filename: reference.filename,
          mimeType: reference.mimeType,
          url: (await ctx.storage.getUrl(reference.storageId)) ?? undefined,
        })),
      ),
    };
  },
});

export const forceGenerateForRepository = mutation({
  args: {
    repository: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tone: v.optional(toneValidator),
    locale: v.optional(v.string()),
  },
  returns: v.id("contentDrafts"),
  handler: async (ctx, args) => {
    const ownerGithubUserId = await getGithubUserId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const owner = identity?.tokenIdentifier;

    const repo = await ctx.db
      .query("githubRepositories")
      .withIndex("by_full_name", (q) => q.eq("fullName", args.repository))
      .first();

    const now = Date.now();
    const changeKey = `manual:${args.repository}:${now}`;

    // Look for recent event or create a synthetic event
    const event = await ctx.db
      .query("githubEvents")
      .filter((q) => q.eq(q.field("repository"), args.repository))
      .order("desc")
      .first();

    const fromEvent = contextFromRecentEvent(event);
    const title =
      args.title || fromEvent?.title || `Recent update in ${args.repository}`;
    const commitMessages = args.description
      ? [args.description]
      : fromEvent?.commitMessages.length
        ? fromEvent.commitMessages
        : [title];
    const releaseNotes = args.description ?? fromEvent?.releaseNotes;
    const locale =
      capText(args.locale ?? "", 20) ||
      detectContentLocale([
        title,
        releaseNotes ?? "",
        ...commitMessages,
      ]);

    let eventId: Id<"githubEvents">;
    if (!event) {
      eventId = await ctx.db.insert("githubEvents", {
        deliveryId: `manual-${now}`,
        event: "push",
        action: "manual_sync",
        repository: args.repository,
        payload: {
          repository: { full_name: args.repository },
          commits: [{ message: title }],
        },
        status: "processing",
        installationId: repo?.installationId,
        githubRepositoryId: repo?.githubRepositoryId,
        ownerTokenIdentifier: owner,
        ownerGithubUserId: ownerGithubUserId ?? repo?.ownerGithubUserId,
      });
    } else {
      eventId = event._id;
    }

    const contextId = await ctx.db.insert("changeContexts", {
      githubEventId: eventId,
      changeKey,
      repository: args.repository,
      trigger: fromEvent?.trigger ?? "push",
      title,
      commitMessages,
      createdAt: now,
      ...(releaseNotes !== undefined ? { releaseNotes } : {}),
      ...(fromEvent?.beforeSha !== undefined
        ? { beforeSha: fromEvent.beforeSha }
        : {}),
      ...(fromEvent?.afterSha !== undefined
        ? { afterSha: fromEvent.afterSha }
        : {}),
      ...(fromEvent?.ref !== undefined ? { ref: fromEvent.ref } : {}),
      ...(fromEvent?.tag !== undefined ? { tag: fromEvent.tag } : {}),
      ...(fromEvent?.prNumber !== undefined
        ? { prNumber: fromEvent.prNumber }
        : {}),
      ...(fromEvent?.compareUrl !== undefined
        ? { compareUrl: fromEvent.compareUrl }
        : {}),
    });

    const threadId = await createThread(ctx, components.agent, {
      title: `${args.repository}: ${title}`,
      summary: `Post generation for ${changeKey}`,
    });

    const draftId = await ctx.db.insert("contentDrafts", {
      githubEventId: eventId,
      changeContextId: contextId,
      changeKey,
      repository: args.repository,
      trigger: fromEvent?.trigger ?? "push",
      status: "queued",
      tone: args.tone ?? "technical",
      locale,
      ...(args.locale !== undefined ? { localeLocked: true } : {}),
      imageMode: "none",
      imageStatus: "skipped",
      textModel: TEXT_MODEL,
      imageModel: IMAGE_MODEL,
      promptVersion: PROMPT_VERSION,
      agentThreadId: threadId,
      createdAt: now,
      updatedAt: now,
      ownerTokenIdentifier: owner,
      ...(ownerGithubUserId !== null ? { ownerGithubUserId } : {}),
    });

    const runId = await ctx.db.insert("generationRuns", {
      draftId,
      stage: "text",
      status: "queued",
      model: TEXT_MODEL,
      promptVersion: PROMPT_VERSION,
      attempt: 1,
      startedAt: now,
    });

    const workflowId = await startGenerationWorkflow(
      ctx,
      draftId,
      runId,
      "text"
    );

    await Promise.all([
      ctx.db.patch(draftId, { workflowId }),
      ctx.db.patch(runId, { workflowId }),
      ctx.db.patch(eventId, { draftId, status: "processing" }),
    ]);

    return draftId;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const attachReference = mutation({
  args: {
    draftId: v.id("contentDrafts"),
    storageId: v.id("_storage"),
    role: referenceRoleValidator,
    filename: v.string(),
  },
  returns: v.id("imageReferences"),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }
    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) {
      throw new Error("Uploaded image not found.");
    }
    const mimeType = metadata.contentType ?? "";
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(mimeType)) {
      throw new Error("Only PNG, JPEG, and WebP references are supported.");
    }
    if (metadata.size > 8 * 1024 * 1024) {
      throw new Error("Reference images must be 8 MB or smaller.");
    }
    const references = await ctx.db
      .query("imageReferences")
      .withIndex("by_draft_id", (q) => q.eq("draftId", draft._id))
      .take(4);
    if (references.length >= 3) {
      throw new Error("A draft can have at most three image references.");
    }
    const referenceId = await ctx.db.insert("imageReferences", {
      draftId: draft._id,
      storageId: args.storageId,
      role: args.role,
      filename: capText(args.filename, 200) || "reference-image",
      mimeType,
      createdAt: Date.now(),
    });
    await ctx.db.patch(draft._id, {
      imageMode: "reference",
      imageStatus: "attached",
      imageStorageId: draft.imageStorageId ?? args.storageId,
      updatedAt: Date.now(),
    });
    return referenceId;
  },
});

export const getGenerationInput = internalQuery({
  args: { draftId: v.id("contentDrafts") },
  returns: generationInputValidator,
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }
    const change = await ctx.db.get(draft.changeContextId);
    if (!change) {
      throw new Error("Change context not found.");
    }
    if (!draft.agentThreadId) {
      throw new Error("Draft does not have an agent thread.");
    }
    return {
      draftId: draft._id,
      threadId: draft.agentThreadId,
      repository: draft.repository,
      trigger: draft.trigger,
      tone: draft.tone,
      locale: draft.locale,
      localeLocked: draft.localeLocked === true,
      imageMode: draft.imageMode,
      requestedPalette: draft.requestedPalette,
      title: change.title,
      beforeSha: change.beforeSha,
      afterSha: change.afterSha,
      ref: change.ref,
      tag: change.tag,
      prNumber: change.prNumber,
      commitMessages: change.commitMessages,
      releaseNotes: change.releaseNotes,
      compareUrl: change.compareUrl,
    };
  },
});

export const getImageReferences = internalQuery({
  args: { draftId: v.id("contentDrafts") },
  returns: v.array(
    v.object({
      storageId: v.id("_storage"),
      role: referenceRoleValidator,
      mimeType: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const references = await ctx.db
      .query("imageReferences")
      .withIndex("by_draft_id", (q) => q.eq("draftId", args.draftId))
      .take(3);
    return references.map((reference) => ({
      storageId: reference.storageId,
      role: reference.role,
      mimeType: reference.mimeType,
    }));
  },
});

export const getImagePlan = internalQuery({
  args: { draftId: v.id("contentDrafts") },
  returns: v.object({
    mode: imageModeValidator,
    prompt: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }
    if (draft.imageMode !== "abstract") {
      return { mode: draft.imageMode };
    }
    const brief = draft.visualBrief ?? {
      subject: "abstract software evolution and forward motion",
      mood: "precise, luminous, modern",
      palette: ["deep blue", "electric violet", "soft cyan"],
      avoid: [],
    };
    const palette = draft.requestedPalette?.length
      ? draft.requestedPalette
      : brief.palette;
    const prompt = [
      "Create a premium abstract editorial background for a software release.",
      `Visual subject: ${brief.subject}.`,
      `Mood: ${brief.mood}.`,
      `Palette: ${palette.join(", ")}.`,
      "Use soft luminous gradients, atmospheric depth, flowing translucent forms, and a polished 1:1 composition.",
      "No logos, no text, no letters, no numbers, no icons, no interface, no code screenshot, no watermark, and no brand marks.",
      brief.avoid.length > 0 ? `Also avoid: ${brief.avoid.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return { mode: draft.imageMode, prompt };
  },
});

export const markRunRunning = internalMutation({
  args: {
    draftId: v.id("contentDrafts"),
    runId: v.id("generationRuns"),
    stage: runStageValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.draftId !== args.draftId) {
      throw new Error("Generation run not found for draft.");
    }
    const draft = await ctx.db.get(args.draftId);
    await ctx.db.patch(run._id, { status: "running" });
    if (draft && (args.stage === "text" || args.stage === "all")) {
      await ctx.db.patch(draft._id, {
        status: "analyzing",
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const saveChangeEvidence = internalMutation({
  args: {
    draftId: v.id("contentDrafts"),
    fileStats: fileStatsValidator,
    filePaths: v.array(v.string()),
    truncated: v.boolean(),
    evidenceText: v.string(),
    locale: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }
    await ctx.db.patch(draft.changeContextId, {
      fileStats: args.fileStats,
      filePaths: args.filePaths.slice(0, 20),
      truncated: args.truncated,
      evidenceText: capText(args.evidenceText, 110_000),
    });
    await ctx.db.patch(draft._id, {
      status: "analyzing",
      ...(args.locale && draft.localeLocked !== true
        ? { locale: capText(args.locale, 20) }
        : {}),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markGeneratingText = internalMutation({
  args: { draftId: v.id("contentDrafts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }
    await ctx.db.patch(draft._id, {
      status: "generating_text",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const saveTextResult = internalMutation({
  args: {
    draftId: v.id("contentDrafts"),
    result: generatedDraftValidator,
    continueWithImage: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }
    const result = args.result;
    const xThread = capStrings(result.xThread, 6, 280);
    await ctx.db.patch(draft._id, {
      analysis: {
        ...result.analysis,
        category: capText(result.analysis.category, 100),
        before: capText(result.analysis.before, 1_500),
        after: capText(result.analysis.after, 1_500),
        impact: capText(result.analysis.impact, 1_500),
        architectureNotes: result.analysis.architectureNotes
          ? capText(result.analysis.architectureNotes, 1_500)
          : undefined,
        apiChanges: result.analysis.apiChanges
          ? capText(result.analysis.apiChanges, 1_500)
          : undefined,
        unknowns: result.analysis.unknowns
          ? capStrings(result.analysis.unknowns, 12, 400)
          : undefined,
        evidence: result.analysis.evidence.slice(0, 12),
        metrics: result.analysis.metrics.slice(0, 8),
      },
      title: capText(result.title, 160),
      summary: capText(result.summary, 1_200),
      xThread: xThread.length > 0 ? xThread : [capText(result.title, 280)],
      linkedinPost: capText(result.linkedinPost, 3_000),
      changelogMarkdown: capText(result.changelogMarkdown, 12_000),
      technicalHighlights: capStrings(result.technicalHighlights, 12, 600),
      breakingChanges: capStrings(result.breakingChanges, 8, 600),
      hashtags: capStrings(result.hashtags, 8, 60),
      visualBrief: {
        subject: capText(result.visualBrief.subject, 600),
        mood: capText(result.visualBrief.mood, 300),
        palette: capStrings(result.visualBrief.palette, 8, 80),
        avoid: capStrings(result.visualBrief.avoid, 12, 120),
      },
      status: args.continueWithImage ? "generating_image" : "ready",
      updatedAt: Date.now(),
      completedAt: args.continueWithImage ? undefined : Date.now(),
      error: undefined,
    });
    return null;
  },
});

export const saveImageResult = internalMutation({
  args: {
    draftId: v.id("contentDrafts"),
    storageId: v.id("_storage"),
    prompt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }
    await ctx.db.patch(draft._id, {
      imageStorageId: args.storageId,
      imagePrompt: capText(args.prompt, 4_000),
      imageStatus: "generated",
      status: draft.title ? "ready" : "partial",
      error: undefined,
      updatedAt: Date.now(),
      completedAt: Date.now(),
    });
    return null;
  },
});

export const finishReferenceImage = internalMutation({
  args: { draftId: v.id("contentDrafts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }
    const reference = await ctx.db
      .query("imageReferences")
      .withIndex("by_draft_id", (q) => q.eq("draftId", draft._id))
      .first();
    await ctx.db.patch(draft._id, {
      imageStorageId: draft.imageStorageId ?? reference?.storageId,
      imageStatus: reference ? "attached" : "failed",
      status: draft.title ? (reference ? "ready" : "partial") : "failed",
      error: reference ? undefined : "No reference image has been uploaded.",
      updatedAt: Date.now(),
      completedAt: Date.now(),
    });
    return null;
  },
});

export const finishWithoutImage = internalMutation({
  args: {
    draftId: v.id("contentDrafts"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found.");
    }
    await ctx.db.patch(draft._id, {
      imageStatus: args.reason ? "failed" : "skipped",
      status: draft.title ? "ready" : "partial",
      ...(args.reason ? { error: capText(args.reason, 2_000) } : {}),
      updatedAt: Date.now(),
      completedAt: Date.now(),
    });
    return null;
  },
});

export const handleWorkflowComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({
      draftId: v.id("contentDrafts"),
      runId: v.id("generationRuns"),
      stage: runStageValidator,
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const draft = await ctx.db.get(args.context.draftId);
    const run = await ctx.db.get(args.context.runId);
    if (args.result.kind === "success") {
      if (run) {
        await ctx.db.patch(run._id, {
          status: "succeeded",
          finishedAt: now,
          error: undefined,
        });
      }
      if (draft && draft.githubEventId) {
        await ctx.db.patch(draft.githubEventId, {
          status: "processed",
          processedAt: now,
          error: undefined,
        });
      }
      return null;
    }

    const error =
      args.result.kind === "failed"
        ? capText(args.result.error, 2_000)
        : "Generation workflow was canceled.";
    if (run) {
      await ctx.db.patch(run._id, {
        status: "failed",
        finishedAt: now,
        error,
      });
    }
    if (draft) {
      const failedDuringImage =
        args.context.stage === "image" ||
        (args.context.stage === "all" && Boolean(draft.title));
      await ctx.db.patch(draft._id, {
        status: draft.title ? "partial" : "failed",
        imageStatus: failedDuringImage ? "failed" : draft.imageStatus,
        error,
        updatedAt: now,
        completedAt: now,
      });
      await ctx.db.patch(draft.githubEventId, {
        status: "failed",
        error,
      });
    }
    return null;
  },
});

export const getGenerationPolicy = query({
  args: { repository: v.string() },
  returns: generationPolicyValidator,
  handler: async (ctx, args) => {
    const override = await ctx.db
      .query("generationPolicies")
      .withIndex("by_repository", (q) => q.eq("repository", args.repository))
      .first();
    if (override) {
      return {
        generateOnPush: override.generateOnPush,
        generateOnVersionTag: override.generateOnVersionTag,
        generateOnTagCreate: override.generateOnTagCreate,
      };
    }
    return DEFAULT_GENERATION_POLICY;
  },
});
