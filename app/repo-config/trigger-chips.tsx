"use client";

import type { ReactNode } from "react";
import { CheckCircle2, GitCommit, Tag } from "lucide-react";
import type { TriggersConfig } from "../onboarding/types";

export function TriggerChips({
  triggers,
  defaultBranch,
  onToggleTrigger,
}: {
  triggers: TriggersConfig;
  defaultBranch: string;
  onToggleTrigger: (triggerKey: keyof TriggersConfig) => void;
}) {
  return (
    <div>
      <h4 className="mb-4 flex items-center justify-between text-sm font-semibold text-on-surface">
        <span>Configure triggers</span>
        <span className="text-[11px] font-normal text-on-surface-variant/70">
          Choose events that trigger automated artifact runs
        </span>
      </h4>
      <div className="flex flex-wrap gap-3">
        <TriggerChip
          active={triggers.newReleases}
          onClick={() => onToggleTrigger("newReleases")}
          icon={
            <CheckCircle2
              className={`h-4 w-4 ${triggers.newReleases ? "text-primary" : "text-on-surface-variant/40"}`}
            />
          }
          label="New Releases"
        />
        <TriggerChip
          active={triggers.tags}
          onClick={() => onToggleTrigger("tags")}
          icon={<Tag className={`h-3.5 w-3.5 ${triggers.tags ? "text-primary" : "text-on-surface-variant/70"}`} />}
          label="Tags"
        />
        <TriggerChip
          active={triggers.commitsOnMain}
          onClick={() => onToggleTrigger("commitsOnMain")}
          icon={
            <GitCommit
              className={`h-3.5 w-3.5 ${triggers.commitsOnMain ? "text-primary" : "text-on-surface-variant/70"}`}
            />
          }
          label={`Commits on ${defaultBranch || "main"}`}
        />
      </div>
    </div>
  );
}

function TriggerChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 ${
        active
          ? "border border-primary/40 bg-primary/20 text-primary shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_15%,transparent)]"
          : "border border-primary/10 bg-surface-variant text-on-surface-variant hover:bg-primary/10 hover:text-on-surface"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
