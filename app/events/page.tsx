"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "@/lib/auth-client";
import { ownerTokenFromSession } from "@/lib/sessionOwner";
import { EventCard } from "../desk/event-card";

export default function EventsPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-background p-4 lg:p-8">
        <PageGlow />
        <div className="relative z-10 mx-auto max-w-4xl space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-on-surface">Git-to-Post Webhooks</h1>
          <p className="text-on-surface-variant">
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
    isSignedIn ? { limit: 20, ownerTokenIdentifier } : "skip",
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-background p-4 lg:p-8">
      <PageGlow />
      <div className="relative z-10 mx-auto max-w-4xl space-y-8">
        <header className="flex flex-col gap-3 border-b border-primary/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-on-surface">Git-to-Post Webhooks</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Recepción y procesamiento en tiempo real de eventos de GitHub con Convex.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg border border-primary/20 bg-surface-variant px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:border-primary/40 hover:text-on-surface"
            >
              Dashboard
            </Link>
            <Link
              href="/drafts"
              className="rounded-lg border border-primary/30 bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/30 hover:text-white"
            >
              Borradores IA
            </Link>
          </div>
        </header>

        <section className="glass-panel space-y-3 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-on-surface">Configuración del Webhook en GitHub</h2>
          <div className="space-y-2 text-sm text-on-surface-variant">
            <p>
              <strong className="text-on-surface">Payload URL:</strong>
            </p>
            <code className="glass-input block select-all break-all rounded p-2.5 font-mono text-xs text-primary">
              {process.env.NEXT_PUBLIC_CONVEX_SITE_URL
                ? `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/github-webhook`
                : "https://<tu-deployment>.convex.site/github-webhook"}
            </code>
            <ul className="list-inside list-disc space-y-1 text-xs">
              <li>
                <strong className="text-on-surface">Content type:</strong> application/json
              </li>
              <li>
                <strong className="text-on-surface">Secret:</strong> (Opcional) Debe coincidir con la
                variable GITHUB_WEBHOOK_SECRET en Convex
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-on-surface">
              Eventos Recibidos en Vivo
              {events ? (
                <span className="rounded-full bg-surface-variant px-2 py-0.5 text-xs text-on-surface-variant">
                  {events.length}
                </span>
              ) : null}
            </h2>
          </div>

          {isPending ? (
            <div className="text-sm text-on-surface-variant">Cargando eventos...</div>
          ) : !isSignedIn ? (
            <div className="rounded-xl border border-dashed border-primary/15 bg-surface/40 p-8 text-center text-on-surface-variant">
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
            <div className="text-sm text-on-surface-variant">Cargando eventos...</div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-primary/15 bg-surface/40 p-8 text-center text-on-surface-variant">
              <p>No se han recibido eventos de GitHub aún.</p>
              <p className="mt-1 text-xs text-on-surface-variant/80">
                Envía un evento desde tu repositorio de GitHub para verlo aquí en tiempo real.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PageGlow() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-[-20%] left-[-10%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed right-[-10%] bottom-[-20%] h-[45%] w-[45%] rounded-full bg-tertiary/10 blur-[130px]"
      />
    </>
  );
}
