"use client";

import { Suspense, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../convex/_generated/api";
import { signOut, useSession } from "@/lib/auth-client";
import { useGithubInstallCallback } from "./github/use-github-install-callback";
import { readOnboardingComplete } from "./onboarding/onboarding-storage";
import { Dashboard } from "./desk/dashboard";

function HomeContent() {
  const { data: session, isPending: authLoading } = useSession();
  const router = useRouter();

  const [connecting, setConnecting] = useState(false);

  const isSignedIn = Boolean(session?.user);
  const { errorMessage, isHandlingCallback, setErrorMessage, setSyncStatus, syncStatus } =
    useGithubInstallCallback(() => (readOnboardingComplete() ? "/" : "/onboarding"));

  const beginInstallation = useMutation(api.githubConnections.beginInstallation);
  const claimInstallations = useMutation(api.githubConnections.claimInstallationsForCurrentUser);

  useEffect(() => {
    if (!isSignedIn) return;
    claimInstallations().catch(() => {});
  }, [isSignedIn, claimInstallations]);

  useEffect(() => {
    if (authLoading || !isSignedIn || isHandlingCallback) {
      return;
    }
    if (!readOnboardingComplete()) {
      router.replace("/onboarding");
    }
  }, [authLoading, isHandlingCallback, isSignedIn, router]);

  const handleConnectGitHub = async () => {
    try {
      setConnecting(true);
      setErrorMessage(null);
      const { state } = await beginInstallation();
      router.push(`/api/github/install/start?state=${encodeURIComponent(state)}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error iniciando la conexión con GitHub.",
      );
      setConnecting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background p-4 lg:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-[-20%] left-[-10%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed right-[-10%] bottom-[-20%] h-[45%] w-[45%] rounded-full bg-tertiary/10 blur-[130px]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-on-surface">PublicaDev</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Conexión automática de repositorios con GitHub App y eventos en tiempo real.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
            <div suppressHydrationWarning>
              {authLoading ? (
                <span className="text-xs text-on-surface-variant">Verificando sesión...</span>
              ) : session?.user ? (
                <div className="glass-panel flex items-center gap-3 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-on-surface">
                    <span className="text-on-surface-variant">Sesión:</span>{" "}
                    <strong>{session.user.name || session.user.email}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="cursor-pointer text-xs font-medium text-error transition hover:text-white"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="rounded-xl border border-primary/30 bg-primary/20 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/30 hover:text-white"
                >
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>
        </header>

        {syncStatus ? (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
            <span>{syncStatus}</span>
            <button
              type="button"
              onClick={() => setSyncStatus(null)}
              className="text-xs font-bold hover:text-white"
            >
              ✕
            </button>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold hover:text-white"
            >
              ✕
            </button>
          </div>
        ) : null}

        {authLoading ? (
          <div className="mt-6 min-h-[320px] text-sm text-on-surface-variant">Verificando sesión...</div>
        ) : isSignedIn ? (
          <Dashboard
            connecting={connecting}
            onConnectGitHub={() => {
              void handleConnectGitHub();
            }}
          />
        ) : (
          <section className="glass-panel mt-6 rounded-2xl p-8">
            <h2 className="text-lg font-semibold text-on-surface">Inicia sesión para abrir tu desk</h2>
            <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
              Los repositorios, ajustes y eventos de GitHub quedan ligados a tu cuenta. Inicia sesión
              primero para conectar un repositorio.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-lg border border-primary/30 bg-primary/20 px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/30 hover:text-white"
            >
              Iniciar sesión
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-8 text-sm text-on-surface-variant">Cargando...</div>}>
      <HomeContent />
    </Suspense>
  );
}
