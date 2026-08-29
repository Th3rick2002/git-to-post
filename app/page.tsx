"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useSession, signOut } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function DashboardContent() {
  const { data: session, isPending: authLoading } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [connecting, setConnecting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSignedIn = Boolean(session?.user);

  const [generatingRepo, setGeneratingRepo] = useState<string | null>(null);

  const beginInstallation = useMutation(api.githubConnections.beginInstallation);
  const completeInstallation = useAction(api.githubConnections.completeInstallation);
  const claimInstallations = useMutation(
    api.githubConnections.claimInstallationsForCurrentUser
  );
  const forceGenerate = useMutation(
    api.postGeneration.forceGenerateForRepository
  );

  const repositories = useQuery(
    api.githubConnections.listRepositories,
    isSignedIn ? {} : "skip"
  );
  const events = useQuery(
    api.githubEvents.list,
    isSignedIn ? { limit: 20 } : "skip"
  );

  useEffect(() => {
    if (!isSignedIn) return;
    claimInstallations().catch(() => {});
  }, [isSignedIn, claimInstallations]);

  const handleForceGenerate = async (repoFullName: string) => {
    try {
      setGeneratingRepo(repoFullName);
      setErrorMessage(null);
      setSyncStatus(`Iniciando redacción con IA para ${repoFullName}...`);
      await forceGenerate({
        repository: repoFullName,
        tone: "technical",
      });
      setSyncStatus(`¡Generación en proceso! Redirigiendo a tus borradores...`);
      setTimeout(() => {
        router.push("/drafts");
      }, 1000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error al iniciar la generación de contenido con IA."
      );
      setSyncStatus(null);
    } finally {
      setGeneratingRepo(null);
    }
  };

  const processInstallationCallback = useCallback(
    async (installationId: number, state: string, code?: string) => {
      setSyncStatus("Sincronizando repositorios de GitHub...");
      try {
        const res = await completeInstallation({
          state,
          code,
          installationId,
        });
        setSyncStatus(`¡Conexión exitosa! Sincronizados ${res.count} repositorios.`);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Error completando la conexión con GitHub."
        );
      } finally {
        router.replace("/");
      }
    },
    [completeInstallation, router]
  );

  // Handle return from GitHub App installation callback
  useEffect(() => {
    const isInstalled = searchParams.get("installed");
    const installationIdStr = searchParams.get("installation_id");
    const state = searchParams.get("state");
    const code = searchParams.get("code") || undefined;
    const error = searchParams.get("error");

    if (error) {
      setTimeout(() => {
        setErrorMessage(`Error en la instalación de GitHub: ${error}`);
      }, 0);
      router.replace("/");
      return;
    }

    if (isInstalled === "true" && installationIdStr && state) {
      const installationId = parseInt(installationIdStr, 10);
      if (!isNaN(installationId)) {
        setTimeout(() => {
          processInstallationCallback(installationId, state, code);
        }, 0);
      }
    }
  }, [searchParams, processInstallationCallback, router]);

  const handleConnectGitHub = async () => {
    try {
      setConnecting(true);
      setErrorMessage(null);
      const { state } = await beginInstallation();
      router.push(`/api/github/install/start?state=${encodeURIComponent(state)}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error iniciando la conexión con GitHub."
      );
      setConnecting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              🚀 PublicaDev
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Genera hilos de X, posts de LinkedIn y Changelogs con IA a partir de tus commits y releases.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/drafts"
              className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/20"
            >
              ✍️ Borradores IA
            </Link>
            <Link
              href="/events"
              className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
            >
              📥 Webhooks
            </Link>

            <div suppressHydrationWarning className="flex items-center gap-3">
              {session?.user ? (
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 py-1.5 px-3 rounded-xl">
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-500">Sesión:</span>{" "}
                    <strong>{session.user.name || session.user.email}</strong>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium ml-2 transition cursor-pointer"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {authLoading ? (
                    <span className="text-xs text-slate-500">Verificando...</span>
                  ) : null}
                  <Link
                    href="/login"
                    className="bg-white text-slate-950 font-semibold text-xs py-2 px-4 rounded-xl hover:bg-slate-100 transition shadow"
                  >
                    Iniciar sesión
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Notifications & Status alerts */}
        {syncStatus && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm p-4 rounded-xl flex items-center justify-between">
            <span>{syncStatus}</span>
            <button
              onClick={() => setSyncStatus(null)}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-300 text-sm p-4 rounded-xl flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-rose-400 hover:text-rose-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Panel: Connect Repositories & AI Features */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">
              📦 Repositorios de GitHub & Generación de Contenido
            </h2>
            <p className="text-sm text-slate-400 max-w-xl">
              Instala la GitHub App para que la IA escuche automáticamente tus pushes, pull requests y releases, generando publicaciones listas para compartir.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              suppressHydrationWarning
              onClick={handleConnectGitHub}
              disabled={connecting || !session?.user}
              title={!session?.user ? "Inicia sesión primero para conectar repositorios" : undefined}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 px-5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              {connecting ? "Conectando..." : "Conectar Repositorio con GitHub"}
            </button>
          </div>
        </section>

        {/* Connected Repositories Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            🔗 Repositorios Conectados
            {repositories && (
              <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-normal">
                {repositories.length}
              </span>
            )}
          </h2>

          {!isSignedIn ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <p className="text-sm">Inicia sesión para ver tus repositorios conectados.</p>
            </div>
          ) : !repositories ? (
            <div className="text-slate-500 text-sm">Cargando repositorios...</div>
          ) : repositories.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <p className="text-sm">No tienes repositorios conectados todavía.</p>
              <p className="text-xs text-slate-500 mt-1">
                Haz clic en &quot;Conectar Repositorio con GitHub&quot; para vincular tus proyectos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repositories.map((repo) => (
                <div
                  key={repo._id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="space-y-1 truncate pr-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-100 hover:text-indigo-400 transition text-sm truncate"
                      >
                        {repo.fullName}
                      </a>
                      {repo.isPrivate && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                          Privado
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      Rama: {repo.defaultBranch || "main"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleForceGenerate(repo.fullName)}
                      disabled={generatingRepo === repo.fullName}
                      className="flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/20 disabled:opacity-50 cursor-pointer"
                    >
                      {generatingRepo === repo.fullName ? "Generando..." : "⚡ Generar con IA"}
                    </button>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium shrink-0">
                      Activo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Live GitHub Webhook Events */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              📥 Eventos en Tiempo Real
              {events && (
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-normal">
                  {events.length}
                </span>
              )}
            </h2>
            <Link
              href="/drafts"
              className="text-xs text-purple-400 hover:text-purple-300 transition"
            >
              Ver publicaciones generadas →
            </Link>
          </div>

          {!isSignedIn ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <p className="text-sm">Inicia sesión para ver eventos en tiempo real.</p>
            </div>
          ) : !events ? (
            <div className="text-slate-500 text-sm">Cargando eventos...</div>
          ) : events.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <p className="text-sm">Aún no se han recibido eventos de tus repositorios.</p>
              <p className="text-xs text-slate-500 mt-1">
                Haz un commit, push o release en un repositorio conectado para verlo aparecer aquí al instante y generar contenido con IA.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event._id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs">
                        {event.event}
                      </span>
                      {event.action && (
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          {event.action}
                        </span>
                      )}
                      <span className="font-medium text-slate-200 text-sm">
                        {event.repository || "Repositorio"}
                      </span>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        event.status === "processed"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : event.status === "failed"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>
                      Enviado por: <strong>{event.sender || "GitHub"}</strong>
                    </span>
                    <span suppressHydrationWarning>
                      {new Date(event._creationTime).toLocaleString()}
                    </span>
                  </div>

                  {event.error && (
                    <div className="mt-2 text-xs bg-rose-950/40 border border-rose-900/50 text-rose-300 p-2.5 rounded-lg">
                      Error: {event.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 text-sm">Cargando...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
