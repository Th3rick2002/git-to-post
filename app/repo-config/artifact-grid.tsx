"use client";

import type { ReactNode } from "react";
import { Check, Code2, FileText, Image as ImageIcon, ScrollText } from "lucide-react";
import type { ArtifactConfig } from "../onboarding/types";
import { ARTIFACT_AVAILABILITY, isLiveArtifactKey, type LiveArtifactKey } from "../workspace/artifacts";

const ARTIFACT_OPTIONS: Array<{
  key: keyof ArtifactConfig;
  title: string;
  description: string;
  icon: ReactNode;
  format: string;
}> = [
  {
    key: "releaseNotes",
    title: "Automated release notes",
    description: "Structured release highlights, feature breakdown, and migration steps.",
    icon: <FileText className="h-5 w-5 text-primary" />,
    format: "Markdown / HTML",
  },
  {
    key: "socialCard",
    title: "X.com / social announcement cards",
    description: "Engaging visual snippet and formatted summary for developer community broadcast.",
    icon: <ImageIcon className="h-5 w-5 text-tertiary" />,
    format: "PNG + Text Post",
  },
  {
    key: "changelog",
    title: "Keep-a-Changelog updates",
    description: "Auto-categorized commits (Added, Changed, Deprecated, Fixed, Security).",
    icon: <ScrollText className="h-5 w-5 text-primary" />,
    format: "CHANGELOG.md",
  },
  {
    key: "apiDocs",
    title: "API reference diffs",
    description: "Detects exported function signature additions or breaking type changes.",
    icon: <Code2 className="h-5 w-5 text-primary" />,
    format: "TypeScript AST",
  },
];

export function ArtifactGrid({
  artifacts,
  onToggleArtifact,
}: {
  artifacts: ArtifactConfig;
  onToggleArtifact: (key: LiveArtifactKey) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {ARTIFACT_OPTIONS.map((opt) => {
        const isAllowed = ARTIFACT_AVAILABILITY[opt.key] === "live";
        const isSelected = isAllowed && artifacts[opt.key];
        return (
          <button
            key={opt.key}
            type="button"
            disabled={!isAllowed}
            onClick={() => {
              if (!isLiveArtifactKey(opt.key)) {
                return;
              }
              onToggleArtifact(opt.key);
            }}
            className={`glass-panel flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
              isAllowed
                ? `cursor-pointer ${
                    isSelected
                      ? "border-primary/50 bg-surface-highlight/70 shadow-[0_0_20px_color-mix(in_srgb,var(--primary)_12%,transparent)]"
                      : "border-primary/10 hover:border-primary/25"
                  }`
                : "cursor-not-allowed border-primary/10 opacity-50"
            }`}
          >
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/15">
                  {opt.icon}
                </div>
                {isAllowed ? (
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                      isSelected ? "border-primary bg-primary text-on-primary" : "border-primary/30 bg-surface"
                    }`}
                  >
                    {isSelected ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : null}
                  </div>
                ) : (
                  <span className="rounded-full border border-outline-variant bg-surface-variant px-2 py-0.5 text-[10px] font-medium tracking-wide text-on-surface-variant uppercase">
                    Coming soon
                  </span>
                )}
              </div>
              <h3 className="mb-1 text-sm font-semibold text-on-surface">{opt.title}</h3>
              <p className="mb-3 text-xs leading-relaxed text-on-surface-variant">{opt.description}</p>
            </div>
            <span className="self-start rounded border border-primary/10 bg-background/60 px-2 py-0.5 font-mono text-[10px] font-medium text-primary/80">
              {opt.format}
            </span>
          </button>
        );
      })}
    </div>
  );
}
