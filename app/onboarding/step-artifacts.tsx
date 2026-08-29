"use client";

import type { ReactNode } from "react";
import { ArrowRight, Check, Code2, FileText, Image as ImageIcon, ScrollText, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import type { ArtifactConfig } from "./types";

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

export function StepArtifacts({
  artifacts,
  onToggleArtifact,
  onContinue,
  onBack,
}: {
  artifacts: ArtifactConfig;
  onToggleArtifact: (key: keyof ArtifactConfig) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex h-full flex-col justify-between"
    >
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">Select generated artifacts</h2>
          <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Step 2: Output types
          </span>
        </div>
        <p className="mb-6 text-sm leading-relaxed text-on-surface-variant">
          X.com announcement cards are available now. Other artifact types stay listed so you can see what is
          coming next.
        </p>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ARTIFACT_OPTIONS.map((opt) => {
            const isAllowed = opt.key === "socialCard";
            const isSelected = isAllowed && artifacts.socialCard;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={!isAllowed}
                onClick={() => {
                  if (!isAllowed) {
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
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-primary/10 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer rounded-md px-4 py-2 text-xs text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-primary/30 bg-primary/20 px-6 py-2.5 font-medium text-primary shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_15%,transparent)] transition-all duration-200 hover:bg-primary/30 hover:text-white active:scale-95"
        >
          <span>Continue to integrations</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
