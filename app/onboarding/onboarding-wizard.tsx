"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Code2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { useGithubInstallCallback } from "../github/use-github-install-callback";
import { useSession } from "@/lib/auth-client";
import { readOnboardingComplete, writeOnboardingComplete } from "./onboarding-storage";
import { StepArtifacts } from "./step-artifacts";
import { StepEnd } from "./step-end";
import { StepIntegrations } from "./step-integrations";
import { StepSourceConnect } from "./step-source-connect";
import { Stepper } from "./stepper";
import type { ArtifactConfig, IntegrationMethod, OnboardingState, StepId } from "./types";

const INITIAL_STATE: Pick<OnboardingState, "currentStep" | "furthestStep" | "isComplete" | "artifacts" | "integrationMethod"> =
  {
    currentStep: 1,
    furthestStep: 1,
    isComplete: false,
    artifacts: {
      releaseNotes: false,
      changelog: false,
      socialCard: true,
      apiDocs: false,
      execSummary: false,
    },
    integrationMethod: "grok_bot",
  };

export function OnboardingWizard() {
  const router = useRouter();
  const { data: session, isPending: authLoading } = useSession();
  const [state, setState] = useState(INITIAL_STATE);
  const [notification, setNotification] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [gateReady, setGateReady] = useState(false);

  const isSignedIn = Boolean(session?.user);
  const { errorMessage, isHandlingCallback, setErrorMessage, syncStatus } =
    useGithubInstallCallback(() => (readOnboardingComplete() ? "/" : "/onboarding"));

  const beginInstallation = useMutation(api.githubConnections.beginInstallation);
  const claimInstallations = useMutation(api.githubConnections.claimInstallationsForCurrentUser);
  const repositories = useQuery(api.githubConnections.listRepositories, isSignedIn ? {} : "skip");

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isSignedIn) {
      router.replace("/login");
      return;
    }
    if (readOnboardingComplete() && !isHandlingCallback) {
      router.replace("/");
      return;
    }
    setGateReady(true);
  }, [authLoading, isHandlingCallback, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }
    void claimInstallations();
  }, [claimInstallations, isSignedIn]);

  function showToast(msg: string) {
    setNotification(msg);
    window.setTimeout(() => {
      setNotification(null);
    }, 2800);
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
    }));
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

  async function handleConnectGitHub() {
    try {
      setConnecting(true);
      setErrorMessage(null);
      const { state: installState } = await beginInstallation();
      router.push(`/api/github/install/start?state=${encodeURIComponent(installState)}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error iniciando la conexión con GitHub.",
      );
      setConnecting(false);
    }
  }

  if (authLoading || !gateReady) {
    return (
      <div className="min-h-screen bg-background p-8 text-sm text-on-surface-variant">Checking session...</div>
    );
  }

  const repos = repositories ?? [];

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
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_20%,transparent)]">
              <Code2 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">PublicaDev Onboarding</h1>
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
            {state.currentStep === 1 ? (
              <StepSourceConnect
                key="step-1-sources"
                repos={repos}
                reposLoading={repositories === undefined}
                connecting={connecting}
                syncStatus={syncStatus}
                errorMessage={errorMessage}
                onConnectGitHub={() => {
                  void handleConnectGitHub();
                }}
                onContinue={() => {
                  showToast(
                    repos.length === 1
                      ? `Connected ${repos[0].fullName}`
                      : `Connected ${repos.length} repositories`,
                  );
                  continueToStep(2);
                }}
              />
            ) : null}

            {state.currentStep === 2 ? (
              <StepArtifacts
                key="step-2-artifacts"
                artifacts={state.artifacts}
                onToggleArtifact={handleToggleArtifact}
                onContinue={() => continueToStep(3)}
                onBack={() => goToStep(1)}
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
