import type { ArtifactConfig, IntegrationMethod, TriggersConfig } from "../onboarding/types";
import type { Doc } from "../../convex/_generated/dataModel";

export type ConnectedRepo = Doc<"githubRepositories">;

export type RepoSettingsValues = {
  integrationMethod: IntegrationMethod;
  triggers: TriggersConfig;
  artifacts: ArtifactConfig;
};

export const DEFAULT_REPO_SETTINGS: RepoSettingsValues = {
  integrationMethod: "grok_bot",
  triggers: {
    newReleases: true,
    tags: false,
    commitsOnMain: false,
  },
  artifacts: {
    releaseNotes: false,
    changelog: false,
    socialCard: true,
    apiDocs: false,
    execSummary: false,
  },
};

export function settingsFromDoc(
  doc: Pick<Doc<"repoSettings">, "integrationMethod" | "triggers" | "artifacts"> | null | undefined,
): RepoSettingsValues {
  if (!doc) {
    return {
      integrationMethod: DEFAULT_REPO_SETTINGS.integrationMethod,
      triggers: { ...DEFAULT_REPO_SETTINGS.triggers },
      artifacts: { ...DEFAULT_REPO_SETTINGS.artifacts },
    };
  }

  return {
    integrationMethod: doc.integrationMethod,
    triggers: { ...doc.triggers },
    artifacts: { ...doc.artifacts },
  };
}
