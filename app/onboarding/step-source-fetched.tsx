"use client";

import { ArrowRight, CheckCircle2, Edit3, FolderOpen, Star } from "lucide-react";
import { motion } from "motion/react";
import type { RepoData } from "./types";

export function StepSourceFetched({
  repoData,
  onEditRepo,
  onContinue,
}: {
  repoData: RepoData;
  onEditRepo: () => void;
  onContinue: () => void;
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
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">Setup your first repo</h2>
          <span className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
            Repository connected
          </span>
        </div>
        <p className="mb-8 text-sm leading-relaxed text-on-surface-variant">
          Connect your GitHub repository to begin generating automated artifacts. PublicaDev requires read
          access to your source code.
        </p>

        <div className="glass-panel relative mb-6 overflow-hidden rounded-xl p-6">
          <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_15%,transparent)]">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-base font-semibold tracking-tight text-on-surface">
                    {repoData.fullName}
                  </h3>
                  {repoData.isPrivate ? (
                    <span className="rounded border border-primary/10 bg-surface-variant px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">
                      Private
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 max-w-lg text-xs leading-relaxed text-on-surface-variant">
                  {repoData.description}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:self-center">
              <div className="flex items-center gap-1 rounded-md border border-primary/10 bg-background/60 px-2.5 py-1.5 text-xs text-on-surface-variant">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                <span className="font-medium">{repoData.stars}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-primary/10 bg-background/60 px-2.5 py-1.5 text-xs text-on-surface-variant">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: repoData.languageColor }} />
                <span className="font-medium">{repoData.language}</span>
              </div>
              <button
                type="button"
                onClick={onEditRepo}
                title="Change repository"
                className="rounded-md border border-primary/10 bg-surface-variant p-1.5 text-on-surface-variant transition-colors hover:bg-primary/20 hover:text-primary"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-primary/10 pt-6">
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant/70">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary/80" />
          <span>Repository connected</span>
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-primary/30 bg-primary/20 px-6 py-2.5 font-medium text-primary shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_15%,transparent)] transition-all duration-200 hover:bg-primary/30 hover:text-white active:scale-95"
        >
          <span>Continue to artifacts</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}