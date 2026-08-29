"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowRight, GitBranch, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { signOut, useSession } from "@/lib/auth-client";
import { ownerTokenFromSession } from "@/lib/sessionOwner";

export function WelcomeBack() {
  const { data: session, isPending: authLoading } = useSession();
  const convexReady = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-[-20%] left-[-10%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed right-[-10%] bottom-[-20%] h-[45%] w-[45%] rounded-full bg-tertiary/10 blur-[130px]"
      />
      <div className="glass-elevated relative z-10 w-full max-w-xl rounded-3xl p-8 text-center sm:p-10">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-on-primary">
          <Sparkles className="size-6" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-on-surface">
          Welcome back
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-on-surface-variant">
          Convierte cambios reales de GitHub en posts técnicos listos para revisar.
        </p>

        <div className="mt-6 text-xs text-on-surface-variant">
          {authLoading ? (
            <span>Verificando sesión...</span>
          ) : session?.user ? (
            <div className="flex items-center justify-center gap-3">
              <span>
                Sesión:{" "}
                <strong className="text-on-surface">
                  {session.user.name || session.user.email}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-rose-300 hover:text-rose-200"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <Link href="/login" className="font-medium text-on-surface">
              Iniciar sesión con GitHub
            </Link>
          )}
        </div>

        {convexReady ? <GitHubConnectPanel /> : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/drafts"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary"
          >
            Ver borradores <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/events"
            className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-3 text-sm text-on-surface hover:bg-white/5"
          >
            <GitBranch className="size-4" /> Webhooks
          </Link>
        </div>
      </div>
    </div>
  );
}

function GitHubConnectPanel() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ownerTokenIdentifier = ownerTokenFromSession(session);
  const [connecting, setConnecting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const installError = searchParams.get("error");
  const installationIdStr = searchParams.get("installation_id");
  const installState = searchParams.get("state");
  const isCompletingInstall =
    searchParams.get("installed") === "true" &&
    Boolean(installationIdStr) &&
    Boolean(installState);
  const startedInstallRef = useRef<string | null>(null);

  const beginInstallation = useMutation(api.githubConnections.beginInstallation);
  const completeInstallation = useAction(
    api.githubConnections.completeInstallation,
  );
  const repositories = useQuery(
    api.githubConnections.listRepositories,
    ownerTokenIdentifier ? { ownerTokenIdentifier } : "skip",
  );

  const processInstallationCallback = useCallback(
    async (installationId: number, state: string, code?: string) => {
      try {
        const result = await completeInstallation({
          state,
          code,
          installationId,
        });
        setSyncStatus(
          `Conexión lista. Sincronizados ${result.count} repositorios.`,
        );
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Error completando la conexión con GitHub.",
        );
      } finally {
        router.replace("/");
      }
    },
    [completeInstallation, router],
  );

  useEffect(() => {
    if (!isCompletingInstall || !installationIdStr || !installState) {
      return;
    }
    const installationId = Number.parseInt(installationIdStr, 10);
    if (Number.isNaN(installationId)) {
      return;
    }
    const key = `${installationId}:${installState}`;
    if (startedInstallRef.current === key) {
      return;
    }
    startedInstallRef.current = key;
    const code = searchParams.get("code") || undefined;
    void processInstallationCallback(installationId, installState, code);
  }, [
    installState,
    installationIdStr,
    isCompletingInstall,
    processInstallationCallback,
    searchParams,
  ]);

  const handleConnectGitHub = async () => {
    try {
      setConnecting(true);
      setErrorMessage(null);
      const { state } = await beginInstallation();
      router.push(
        `/api/github/install/start?state=${encodeURIComponent(state)}`,
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Error iniciando la conexión con GitHub.",
      );
      setConnecting(false);
    }
  };

  return (
    <>
      {isCompletingInstall || syncStatus ? (
        <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
          {syncStatus ?? "Sincronizando repositorios de GitHub..."}
        </p>
      ) : null}
      {installError ? (
        <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
          Error en la instalación de GitHub: {installError}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void handleConnectGitHub()}
        disabled={connecting || !session?.user}
        title={
          !session?.user
            ? "Inicia sesión primero para conectar repositorios"
            : undefined
        }
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-3 text-sm text-on-surface hover:bg-white/5 disabled:opacity-50"
      >
        <GitBranch className="size-4" />
        {connecting ? "Conectando..." : "Conectar GitHub App"}
      </button>
      {repositories && repositories.length > 0 ? (
        <ul className="mt-4 space-y-2 text-left text-xs text-on-surface-variant">
          {repositories.map((repo) => (
            <li
              key={repo._id}
              className="flex items-center justify-between rounded-xl border border-outline-variant px-3 py-2"
            >
              <a
                href={repo.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-on-surface hover:underline"
              >
                {repo.fullName}
              </a>
              <span>{repo.isPrivate ? "Privado" : "Público"}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
