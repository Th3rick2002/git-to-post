import type { ArtifactConfig } from "../onboarding/types";

export const ARTIFACT_AVAILABILITY = {
  releaseNotes: "coming_soon",
  changelog: "coming_soon",
  socialCard: "live",
  apiDocs: "coming_soon",
  execSummary: "coming_soon",
} as const satisfies Record<keyof ArtifactConfig, "live" | "coming_soon">;

export type LiveArtifactKey = {
  [K in keyof ArtifactConfig]: (typeof ARTIFACT_AVAILABILITY)[K] extends "live" ? K : never;
}[keyof ArtifactConfig];

export function isLiveArtifactKey(key: keyof ArtifactConfig): key is LiveArtifactKey {
  return ARTIFACT_AVAILABILITY[key] === "live";
}
