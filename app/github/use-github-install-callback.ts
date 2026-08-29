"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../convex/_generated/api";

export function useGithubInstallCallback(afterPath: string | (() => string)) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completeInstallation = useAction(api.githubConnections.completeInstallation);
  const handled = useRef(false);

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isHandlingCallback =
    searchParams.get("installed") === "true" || Boolean(searchParams.get("error"));

  const resolveAfterPath = useCallback(() => {
    return typeof afterPath === "function" ? afterPath() : afterPath;
  }, [afterPath]);

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
          err instanceof Error ? err.message : "Error completando la conexión con GitHub.",
        );
      } finally {
        router.replace(resolveAfterPath());
      }
    },
    [completeInstallation, resolveAfterPath, router],
  );

  useEffect(() => {
    if (handled.current) {
      return;
    }

    const error = searchParams.get("error");
    if (error) {
      handled.current = true;
      setTimeout(() => {
        setErrorMessage(`Error en la instalación de GitHub: ${error}`);
      }, 0);
      router.replace(resolveAfterPath());
      return;
    }

    const isInstalled = searchParams.get("installed");
    const installationIdStr = searchParams.get("installation_id");
    const state = searchParams.get("state");
    const code = searchParams.get("code") || undefined;

    if (isInstalled === "true" && installationIdStr && state) {
      const installationId = parseInt(installationIdStr, 10);
      if (!Number.isNaN(installationId)) {
        handled.current = true;
        setTimeout(() => {
          void processInstallationCallback(installationId, state, code);
        }, 0);
      }
    }
  }, [processInstallationCallback, resolveAfterPath, router, searchParams]);

  return {
    errorMessage,
    isHandlingCallback,
    setErrorMessage,
    setSyncStatus,
    syncStatus,
  };
}
