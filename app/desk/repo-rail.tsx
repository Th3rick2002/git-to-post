"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { ConnectedRepo } from "../workspace/types";
import { hrefFor } from "../workspace/view";

export function RepoRail({
  repos,
  selectedFullName,
  onAdd,
  addDisabled,
}: {
  repos: ConnectedRepo[];
  selectedFullName: string | null;
  onAdd: () => void;
  addDisabled?: boolean;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col lg:flex">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Repositories</h2>
        <button
          type="button"
          onClick={onAdd}
          disabled={addDisabled}
          className="flex cursor-pointer items-center gap-1 rounded-md border border-primary/30 bg-primary/20 px-2 py-1 text-xs font-medium text-primary shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_10%,transparent)] transition-all hover:bg-primary/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      <nav aria-label="Repositories" className="flex flex-col gap-2">
        {repos.map((repo) => {
          const active = repo.fullName === selectedFullName;
          return (
            <Link
              key={repo._id}
              href={hrefFor(repo.fullName)}
              className={`rounded-xl px-3 py-2.5 transition-all ${
                active
                  ? "border border-primary/40 bg-primary/15 shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_12%,transparent)]"
                  : "glass-panel hover:border-primary/25"
              }`}
            >
              <span className="font-mono text-sm font-medium text-on-surface">{repo.fullName}</span>
              <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
                {repo.defaultBranch || "main"}
                {repo.isPrivate ? " · private" : ""}
              </p>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function RepoSelect({
  repos,
  selectedFullName,
  onAdd,
  onSelect,
  addDisabled,
}: {
  repos: ConnectedRepo[];
  selectedFullName: string | null;
  onAdd: () => void;
  onSelect: (fullName: string) => void;
  addDisabled?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center gap-2 lg:hidden">
      <label htmlFor="desk-repo-select" className="sr-only">
        Repository
      </label>
      <select
        id="desk-repo-select"
        value={selectedFullName ?? ""}
        onChange={(event) => {
          onSelect(event.target.value);
        }}
        className="glass-input min-w-0 flex-1 rounded-lg px-3 py-2 font-mono text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none"
      >
        {repos.map((repo) => (
          <option key={repo._id} value={repo.fullName}>
            {repo.fullName}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onAdd}
        disabled={addDisabled}
        className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-primary/30 bg-primary/20 px-3 py-2 text-xs font-medium text-primary shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_10%,transparent)] transition-all hover:bg-primary/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </button>
    </div>
  );
}
