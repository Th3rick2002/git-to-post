"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../convex/_generated/api";
import { useSession } from "@/lib/auth-client";
import { ownerTokenFromSession } from "@/lib/sessionOwner";

export default function EventsPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 font-sans text-slate-100">
        <div className="mx-auto max-w-4xl space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-white">Git-to-Post Webhooks</h1>
          <p className="text-slate-400">
            Convex is not configured. Set NEXT_PUBLIC_CONVEX_URL to load live GitHub events.
          </p>
        </div>
      </main>
    );
  }

  return <EventsFeed />;
}

function EventsFeed() {
  const { data: session, isPending } = useSession();
  const ownerTokenIdentifier = ownerTokenFromSession(session);
  const isSignedIn = Boolean(session?.user);

  const events = useQuery(
    api.githubEvents.list,
    isSignedIn ? { limit: 20, ownerTokenIdentifier } : "skip"
  );

  return (
    <main className="min-h-screen bg-slate-950 p-8 font-sans text-slate-100">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-white">
              Git-to-Post Webhooks
            </h1>
            <p className="mt-1 text-slate-400">
              Recepción y procesamiento en tiempo real de eventos de GitHub con Convex.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Dashboard
            </Link>
            <Link
              href="/drafts"
              className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 transition hover:bg-purple-500/20"
            >
              ✍️ Borradores IA
            </Link>
          </div>
        </header>

        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-200">
            Configuración del Webhook en GitHub
          </h2>
          <div className="space-y-2 text-sm text-slate-300">
            <p>
              <strong>Payload URL:</strong>
            </p>
            <code className="block select-all break-all rounded border border-slate-800 bg-slate-950 p-2.5 font-mono text-xs text-emerald-400">
              {process.env.NEXT_PUBLIC_CONVEX_SITE_URL
                ? `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/github-webhook`
                : "https://<tu-deployment>.convex.site/github-webhook"}
            </code>
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
              <li>
                <strong>Content type:</strong> application/json
              </li>
              <li>
                <strong>Secret:</strong> (Opcional) Debe coincidir con la variable
                GITHUB_WEBHOOK_SECRET en Convex
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              Eventos Recibidos en Vivo
              {events ? (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {events.length}
                </span>
              ) : null}
            </h2>
          </div>

          {isPending ? (
            <div className="text-sm text-slate-500">Cargando eventos...</div>
          ) : !isSignedIn ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
              <p>Inicia sesión para ver los eventos de tus repositorios.</p>
              <div className="mt-4">
                <Link
                  href="/login"
                  className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Continuar con GitHub
                </Link>
              </div>
            </div>
          ) : !events ? (
            <div className="text-sm text-slate-500">Cargando eventos...</div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
              <p>No se han recibido eventos de GitHub aún.</p>
              <p className="mt-1 text-xs text-slate-500">
                Envía un evento desde tu repositorio de GitHub para verlo aquí en tiempo real.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event._id}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700"
                >
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono text-xs text-blue-400">
                        {event.event}
                      </span>
                      {event.action ? (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                          {event.action}
                        </span>
                      ) : null}
                      <span className="font-medium text-slate-200">
                        {event.repository || "Desconocido"}
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        event.status === "processed"
                          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : event.status === "failed"
                            ? "border border-rose-500/20 bg-rose-500/10 text-rose-400"
                            : "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Enviado por: <strong>{event.sender || "N/A"}</strong>
                    </span>
                    <span>{new Date(event._creationTime).toLocaleString()}</span>
                  </div>

                  {event.error ? (
                    <div className="mt-2 rounded border border-rose-900/50 bg-rose-950/40 p-2 text-xs text-rose-300">
                      Error: {event.error}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
