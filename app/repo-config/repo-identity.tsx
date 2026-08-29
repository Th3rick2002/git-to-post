"use client";

import { FolderOpen } from "lucide-react";
import type { ConnectedRepo } from "../workspace/types";

export function RepoIdentity({ repo }: { repo: ConnectedRepo }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_15%,transparent)]">
          <FolderOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-base font-semibold tracking-tight text-on-surface">{repo.fullName}</h3>
            {repo.isPrivate ? (
              <span className="rounded border border-primary/10 bg-surface-variant px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">
                Private
              </span>
            ) : null}
            <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-primary uppercase">
              Connected
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
            Default branch {repo.defaultBranch || "main"}
          </p>
        </div>
      </div>

      <a
        href={repo.htmlUrl}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 text-xs font-medium text-primary transition-colors hover:text-white"
      >
        Open on GitHub
      </a>
    </div>
  );
}
