"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { RepoIdentity } from "../repo-config/repo-identity";
import { hrefForDraft } from "../workspace/view";
import type { ConnectedRepo } from "../workspace/types";

export function RepoDetail({ repo }: { repo: ConnectedRepo }) {
  const router = useRouter();
  const forceGenerate = useMutation(api.postGeneration.forceGenerateForRepository);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  async function handleForceGenerate() {
    try {
      setGenerating(true);
      setGenerateError(null);
      const draftId = await forceGenerate({
        repository: repo.fullName,
        locale: "es",
        tone: "technical",
      });
      router.push(hrefForDraft(draftId));
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Error al iniciar la generación de contenido con IA.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="glass-panel relative overflow-hidden rounded-xl p-6">
        <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <RepoIdentity repo={repo} />
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center rounded-lg border border-primary/20 px-3 text-xs font-semibold text-on-surface-variant transition hover:border-primary/40 hover:text-on-surface"
            >
              Open on GitHub
            </a>
            <button
              type="button"
              onClick={() => {
                void handleForceGenerate();
              }}
              disabled={generating}
              className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-primary/30 bg-primary/20 px-3 text-xs font-semibold text-primary transition hover:bg-primary/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate changelogs"}
            </button>
          </div>
        </div>
        {generateError ? <p className="mt-3 text-xs text-error">{generateError}</p> : null}
      </div>
    </section>
  );
}
