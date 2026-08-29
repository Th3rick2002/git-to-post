"use client";

import { ArtifactGrid } from "../repo-config/artifact-grid";
import { IntegrationPicker } from "../repo-config/integration-picker";
import { RepoIdentity } from "../repo-config/repo-identity";
import { TriggerChips } from "../repo-config/trigger-chips";
import type { LiveArtifactKey } from "../workspace/artifacts";
import type { ConnectedRepo, RepoSettingsValues } from "../workspace/types";
import type { IntegrationMethod, TriggersConfig } from "../onboarding/types";

export function RepoDetail({
  repo,
  settings,
  onChange,
}: {
  repo: ConnectedRepo;
  settings: RepoSettingsValues;
  onChange: (next: RepoSettingsValues) => void;
}) {
  function toggleTrigger(key: keyof TriggersConfig) {
    onChange({
      ...settings,
      triggers: { ...settings.triggers, [key]: !settings.triggers[key] },
    });
  }

  function toggleArtifact(key: LiveArtifactKey) {
    onChange({
      ...settings,
      artifacts: { ...settings.artifacts, [key]: !settings.artifacts[key] },
    });
  }

  function selectIntegration(method: IntegrationMethod) {
    onChange({
      ...settings,
      integrationMethod: method,
    });
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="glass-panel relative overflow-hidden rounded-xl p-6">
        <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <RepoIdentity repo={repo} />
        <div className="mt-6 border-t border-primary/10 pt-6">
          <TriggerChips
            triggers={settings.triggers}
            defaultBranch={repo.defaultBranch || "main"}
            onToggleTrigger={toggleTrigger}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-on-surface">Artifacts</h3>
        <ArtifactGrid artifacts={settings.artifacts} onToggleArtifact={toggleArtifact} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-on-surface">Integration</h3>
        <IntegrationPicker selectedMethod={settings.integrationMethod} onSelectMethod={selectIntegration} />
      </div>
    </section>
  );
}
