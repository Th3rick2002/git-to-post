import type { Metadata } from "next";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Connect a GitHub repository to start generating posts from your repo.",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
