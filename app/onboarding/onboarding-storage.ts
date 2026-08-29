const ONBOARDING_COMPLETE_KEY = "publicadev-onboarding-complete";

export function readOnboardingComplete(): boolean {
  return window.localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";
}

export function writeOnboardingComplete(complete: boolean): void {
  window.localStorage.setItem(ONBOARDING_COMPLETE_KEY, complete ? "true" : "false");
}
