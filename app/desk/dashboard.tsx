"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "@/lib/auth-client";
import { ownerTokenFromSession } from "@/lib/sessionOwner";
import { hrefFor, readView } from "../workspace/view";
import { ActivityFeed } from "./activity-feed";
import { RepoDetail } from "./repo-detail";
import { RepoRail, RepoSelect } from "./repo-rail";

export function Dashboard({
  connecting,
  onConnectGitHub,
}: {
  connecting: boolean;
  onConnectGitHub: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const ownerTokenIdentifier = ownerTokenFromSession(session);

  const repositories = useQuery(api.githubConnections.listRepositories, {
    ownerTokenIdentifier,
  });

  const repos = repositories ?? [];
  const { selected } = readView(repos, searchParams.get("repo"));

  function selectRepo(fullName: string) {
    router.replace(hrefFor(fullName));
  }

  if (repositories === undefined) {
    return <div className="mt-6 min-h-[480px] text-sm text-on-surface-variant">Cargando workspace...</div>;
  }

  if (repos.length === 0) {
    return (
      <section className="glass-panel mt-6 rounded-2xl p-8">
        <h2 className="text-lg font-semibold text-on-surface">No tienes repositorios conectados</h2>
        <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
          Instala la GitHub App en tu cuenta u organización para recibir pushes, pull requests y releases.
        </p>
        <button
          type="button"
          onClick={onConnectGitHub}
          disabled={connecting}
          className="mt-6 cursor-pointer rounded-lg border border-primary/30 bg-primary/20 px-5 py-2.5 text-sm font-medium text-primary shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_10%,transparent)] transition-all hover:bg-primary/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {connecting ? "Conectando..." : "Conectar repositorio con GitHub"}
        </button>
      </section>
    );
  }

  return (
    <div className="mt-6 flex flex-1 flex-col gap-6 lg:flex-row">
      <RepoRail
        repos={repos}
        selectedFullName={selected?.fullName ?? null}
        onAdd={onConnectGitHub}
        addDisabled={connecting}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <RepoSelect
          repos={repos}
          selectedFullName={selected?.fullName ?? null}
          onAdd={onConnectGitHub}
          onSelect={selectRepo}
          addDisabled={connecting}
        />
        {selected ? (
          <RepoDetail repo={selected} />
        ) : (
          <p className="text-sm text-on-surface-variant">Selecciona un repositorio para configurarlo.</p>
        )}
      </div>
      <aside className="w-full shrink-0 lg:w-80">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
            Eventos en tiempo real
          </h2>
        </div>
        <ActivityFeed repoFullName={selected?.fullName} />
      </aside>
    </div>
  );
}
