"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { readOnboardingComplete } from "./onboarding/onboarding-storage";
import { WelcomeBack } from "./onboarding/welcome-back";

export default function Home() {
  const router = useRouter();
  const ready = useSyncExternalStore(
    () => () => undefined,
    readOnboardingComplete,
    () => false,
  );

  useEffect(() => {
    if (!readOnboardingComplete()) {
      router.replace("/onboarding");
    }
  }, [ready, router]);

  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }

  return <WelcomeBack />;
}
