"use client";

import { Suspense, useEffect, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readOnboardingComplete } from "./onboarding/onboarding-storage";
import { WelcomeBack } from "./onboarding/welcome-back";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ready = useSyncExternalStore(
    () => () => undefined,
    readOnboardingComplete,
    () => false,
  );
  const hasInstallCallback =
    searchParams.get("installed") === "true" ||
    Boolean(searchParams.get("error"));

  useEffect(() => {
    if (!readOnboardingComplete() && !hasInstallCallback) {
      router.replace("/onboarding");
    }
  }, [hasInstallCallback, ready, router]);

  if (!ready && !hasInstallCallback) {
    return <div className="min-h-screen bg-background" />;
  }

  return <WelcomeBack />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomeContent />
    </Suspense>
  );
}
