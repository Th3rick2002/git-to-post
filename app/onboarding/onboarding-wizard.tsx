"use client";

import { useState } from "react";
import { Code2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { writeOnboardingComplete } from "./onboarding-storage";
import { DEFAULT_REPO, parseAndFetchRepo } from "./presets";
import { StepArtifacts } from "./step-artifacts";
import { StepEnd } from "./step-end";
import { StepIntegrations } from "./step-integrations";
import { StepSourceFetched } from "./step-source-fetched";
import { StepSourceInitial } from "./step-source-initial";
import { Stepper } from "./stepper";
import type {
  ArtifactConfig,
  IntegrationMethod,
  OnboardingState,
  StepId,
  TriggersConfig,
} from "./types";

const INITIAL_STATE: OnboardingState = {
  currentStep: 1,
  furthestStep: 1,
  isComplete: false,
  sourceScreenMode: "initial",
  repoUrl: "https://github.com/username/repository",
  repoData: DEFAULT_REPO,
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
  integrationMethod: "grok_bot",
  grokBotAuthorized: true,
  manualEnabled: false,
  isFetching: false,
  fetchError: null,
};

export function OnboardingWizard() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [notification, setNotification] = useState<string | null>(null);

  function showToast(msg: string) {
    setNotification(msg);
    window.setTimeout(() => {
      setNotification(null);
    }, 2800);
  }

  async function handleFetchRepo() {
    setState((prev) => ({ ...prev, isFetching: true, fetchError: null }));
    try {
      const data = await parseAndFetchRepo(state.repoUrl);
      setState((prev) => ({
        ...prev,
        isFetching: false,
        repoData: data,
        sourceScreenMode: "fetched",
      }));
      showToast(`Connected repository: ${data.fullName}`);
    } catch {
      setState((prev) => ({
        ...prev,
        isFetching: false,
        sourceScreenMode: "fetched",
      }));
    }
  }

  async function handleSelectPreset(url: string) {
    setState((prev) => ({ ...prev, repoUrl: url, isFetching: true }));
    const data = await parseAndFetchRepo(url);
    setState((prev) => ({
      ...prev,
      repoUrl: url,
      repoData: data,
      isFetching: false,
      sourceScreenMode: "fetched",
    }));
    showToast(`Loaded preset: ${data.fullName}`);
  }

  function handleToggleTrigger(key: keyof TriggersConfig) {
    setState((prev) => ({
      ...prev,
      triggers: { ...prev.triggers, [key]: !prev.triggers[key] },
    }));
  }

  function handleToggleArtifact(key: keyof ArtifactConfig) {
    if (key !== "socialCard") {
      return;
    }
    setState((prev) => ({
      ...prev,
      artifacts: { ...prev.artifacts, socialCard: !prev.artifacts.socialCard },
    }));
  }

  function handleSelectMethod(method: IntegrationMethod) {
    setState((prev) => ({
      ...prev,
      integrationMethod: method,
      grokBotAuthorized: method === "grok_bot",
      manualEnabled: method === "manual",
    }));
  }

  function handleReset() {
    writeOnboardingComplete(false);
    setState(INITIAL_STATE);
    showToast("Onboarding state reset to initial screen");
  }

  function goToStep(step: StepId) {
    setState((prev) => {
      if (step > prev.furthestStep) {
        return prev;
      }
      return { ...prev, currentStep: step, isComplete: false };
    });
  }

  function continueToStep(step: StepId) {
    setState((prev) => ({
      ...prev,
      currentStep: step,
      furthestStep: step > prev.furthestStep ? step : prev.furthestStep,
      isComplete: false,
    }));
  }

  function finishOnboarding() {
    writeOnboardingComplete(true);
    router.replace("/");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4 lg:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-[-20%] left-[-10%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed right-[-10%] bottom-[-20%] h-[45%] w-[45%] rounded-full bg-tertiary/10 blur-[130px]"
      />

      <main className="glass-elevated relative z-10 flex min-h-[620px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-primary/15 shadow-[0_0_50px_color-mix(in_srgb,var(--primary)_6%,transparent)]">
        <header className="flex flex-col gap-6 border-b border-primary/10 bg-surface/40 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_20%,transparent)]">
                <Code2 className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">PublicaDev Onboarding</h1>
            </div>
            <button
              type="button"
              onClick={handleReset}
              title="Close modal"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <Stepper
            currentStep={state.currentStep}
            furthestStep={state.furthestStep}
            isComplete={state.isComplete}
            onSelectStep={goToStep}
          />
        </header>

        <div className="relative flex flex-grow flex-col p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {state.currentStep === 1 &&
              (state.sourceScreenMode === "initial" ? (
                <StepSourceInitial
                  key="screen-1-initial"
                  repoUrl={state.repoUrl}
                  onChangeRepoUrl={(val) =>
                    setState((prev) => ({ ...prev, repoUrl: val, fetchError: null }))
                  }
                  onSubmit={() => {
                    void handleFetchRepo();
                  }}
                  isFetching={state.isFetching}
                  onSelectPreset={(url) => {
                    void handleSelectPreset(url);
                  }}
                />
              ) : (
                <StepSourceFetched
                  key="screen-2-fetched"
                  repoData={state.repoData}
                  triggers={state.triggers}
                  onToggleTrigger={handleToggleTrigger}
                  onEditRepo={() => setState((prev) => ({ ...prev, sourceScreenMode: "initial" }))}
                  onContinue={() => continueToStep(2)}
                />
              ))}

            {state.currentStep === 2 ? (
              <StepArtifacts
                key="step-2-artifacts"
                artifacts={state.artifacts}
                onToggleArtifact={handleToggleArtifact}
                onContinue={() => continueToStep(3)}
                onBack={() =>
                  setState((prev) => ({ ...prev, currentStep: 1, sourceScreenMode: "fetched" }))
                }
              />
            ) : null}

            {state.currentStep === 3 ? (
              <StepIntegrations
                key="step-3-integrations"
                selectedMethod={state.integrationMethod}
                onSelectMethod={handleSelectMethod}
                onContinue={() => continueToStep(4)}
                onBack={() => goToStep(2)}
              />
            ) : null}

            {state.currentStep === 4 ? (
              <StepEnd key="step-4-end" onContinue={finishOnboarding} onBack={() => goToStep(3)} />
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {notification ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="absolute right-8 bottom-4 left-8 z-30 mx-auto flex max-w-md items-center gap-2 rounded-lg border border-primary/40 bg-surface/95 p-3 text-xs text-on-surface shadow-[0_0_20px_color-mix(in_srgb,var(--primary)_20%,transparent)] backdrop-blur-md"
              >
                <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />
                <span className="flex-1 font-medium">{notification}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
