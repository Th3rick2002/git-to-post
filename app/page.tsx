"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readOnboardingComplete } from "./onboarding/onboarding-storage";
import { WelcomeBack } from "./onboarding/welcome-back";

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!readOnboardingComplete()) {
      router.replace("/onboarding");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }

  return <WelcomeBack />;
}
