import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Connect a GitHub repository to start generating posts from your repo.",
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-8 text-sm text-on-surface-variant">Loading...</div>}>
      <OnboardingWizard />
    </Suspense>
  );
}
