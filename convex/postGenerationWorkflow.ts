import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { runStageValidator } from "./schema";

const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    defaultRetryBehavior: {
      maxAttempts: 3,
      initialBackoffMs: 500,
      base: 2,
    },
    retryActionsByDefault: true,
    maxParallelism: 5,
  },
});

export const generateDraft = workflow
  .define({
    args: {
      draftId: v.id("contentDrafts"),
      runId: v.id("generationRuns"),
      stage: runStageValidator,
    },
    returns: v.null(),
  })
  .handler(async (step, args): Promise<null> => {
    await step.runMutation(
      internal.postGeneration.markRunRunning,
      args,
      { inline: true },
    );

    if (args.stage === "text" || args.stage === "all") {
      const evidence = await step.runAction(
        internal.postGenerationActions.collectEvidence,
        { draftId: args.draftId },
        { retry: true },
      );
      await step.runMutation(
        internal.postGeneration.markGeneratingText,
        { draftId: args.draftId },
        { inline: true },
      );
      const result = await step.runAction(
        internal.agents.postWriter.generateStructuredDraft,
        {
          threadId: evidence.threadId,
          prompt: evidence.prompt,
        },
        { retry: true },
      );
      await step.runMutation(
        internal.postGeneration.saveTextResult,
        {
          draftId: args.draftId,
          result,
          continueWithImage: args.stage === "all",
        },
        { inline: true },
      );
    }

    if (args.stage === "image" || args.stage === "all") {
      const plan = await step.runQuery(
        internal.postGeneration.getImagePlan,
        { draftId: args.draftId },
        { inline: true },
      );
      if (plan.mode === "abstract" && plan.prompt) {
        const image = await step.runAction(
          internal.postGenerationActions.generateImage,
          { draftId: args.draftId, prompt: plan.prompt },
          { retry: true },
        );
        await step.runMutation(
          internal.postGeneration.saveImageResult,
          {
            draftId: args.draftId,
            storageId: image.storageId,
            prompt: plan.prompt,
          },
          { inline: true },
        );
      } else if (plan.mode === "reference") {
        await step.runMutation(
          internal.postGeneration.finishReferenceImage,
          { draftId: args.draftId },
          { inline: true },
        );
      } else {
        await step.runMutation(
          internal.postGeneration.finishWithoutImage,
          { draftId: args.draftId },
          { inline: true },
        );
      }
    }

    return null;
  });
