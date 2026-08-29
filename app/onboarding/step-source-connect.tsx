"use client";

import { ArrowRight, FolderOpen, GitBranch, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import type { ConnectedRepo } from "../workspace/types";

export function StepSourceConnect({
  repos,
  reposLoading,
  connecting,
  syncStatus,
  errorMessage,
  onConnectGitHub,
  onContinue,
}: {
  repos: ConnectedRepo[];
  reposLoading: boolean;
  connecting: boolean;
  syncStatus: string | null;
  errorMessage: string | null;
  onConnectGitHub: () => void;
  onContinue: () => void;
}) {
  const canContinue = repos.length > 0 && !connecting && !reposLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex h-full flex-col justify-between"
    >
      <div>
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-on-surface">Connect GitHub repositories</h2>
        <p className="mb-8 text-sm leading-relaxed text-on-surface-variant">
          Install the GitHub App on your account or organization. PublicaDev will sync the repositories you
          grant and listen for pushes, pull requests, and releases.
        </p>

        {syncStatus ? (
          <p className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{syncStatus}</p>
        ) : null}

        {errorMessage ? (
          <p className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">{errorMessage}</p>
        ) : null}

        <div className="glass-panel relative mb-6 overflow-hidden rounded-xl p-6">
          <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          {reposLoading ? (
            <p className="text-sm text-on-surface-variant">Loading repositories...</p>
          ) : repos.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No repositories connected yet. Install the GitHub App to choose which repos PublicaDev can read.
            </p>
          ) : (
            <ul className="space-y-2">
              {repos.map((repo) => (
                <li
                  key={repo._id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-primary/10 bg-background/40 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                      <FolderOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium text-on-surface">{repo.fullName}</p>
                      <p className="truncate text-[11px] text-on-surface-variant">
                        {repo.defaultBranch || "main"}
                        {repo.isPrivate ? " · private" : ""}
                      </p>
                    </div>
                  </div>
                  <a
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs font-medium text-primary transition-colors hover:text-white"
                  >
                    GitHub
                  </a>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={onConnectGitHub}
            disabled={connecting}
            className="mt-5 flex cursor-pointer items-center gap-2 rounded-lg border border-primary/30 bg-primary/20 px-4 py-2.5 text-sm font-medium text-primary shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_10%,transparent)] transition-all hover:bg-primary/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
            <span>{connecting ? "Connecting..." : repos.length > 0 ? "Add more repositories" : "Connect GitHub"}</span>
          </button>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-end border-t border-primary/10 pt-6">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-primary/30 bg-primary/20 px-6 py-2.5 font-medium text-primary shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_15%,transparent)] transition-all duration-200 hover:bg-primary/30 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>Continue to artifacts</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
