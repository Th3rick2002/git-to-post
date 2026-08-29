export type StepId = 1 | 2 | 3 | 4;

export type SourceScreenMode = "initial" | "fetched";

export type RepoData = {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  stars: string;
  language: string;
  languageColor: string;
  isPrivate: boolean;
  defaultBranch: string;
  updatedAt: string;
};

export type TriggersConfig = {
  newReleases: boolean;
  tags: boolean;
  commitsOnMain: boolean;
};

export type ArtifactConfig = {
  releaseNotes: boolean;
  changelog: boolean;
  socialCard: boolean;
  apiDocs: boolean;
  execSummary: boolean;
};

export type IntegrationMethod = "grok_bot" | "manual";

export type OnboardingState = {
  currentStep: StepId;
  furthestStep: StepId;
  isComplete: boolean;
  sourceScreenMode: SourceScreenMode;
  repoUrl: string;
  repoData: RepoData;
  triggers: TriggersConfig;
  artifacts: ArtifactConfig;
  integrationMethod: IntegrationMethod;
  grokBotAuthorized: boolean;
  manualEnabled: boolean;
  isFetching: boolean;
  fetchError: string | null;
};
