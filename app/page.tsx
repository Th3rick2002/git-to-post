"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function Home() {
  const events = useQuery(api.githubEvents.list, { limit: 20 });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            🚀 Git-to-Post Webhooks
          </h1>
          <p className="text-slate-400 mt-1">
            Recepción y procesamiento en tiempo real de eventos de GitHub con Convex.
          </p>
        </header>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-200">
            📡 Configuración del Webhook en GitHub
          </h2>
          <div className="text-sm text-slate-300 space-y-2">
            <p>
              <strong>Payload URL:</strong>
            </p>
            <code className="block bg-slate-950 border border-slate-800 rounded p-2.5 text-emerald-400 text-xs font-mono select-all break-all">
              {process.env.NEXT_PUBLIC_CONVEX_SITE_URL
                ? `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/github-webhook`
                : "https://<tu-deployment>.convex.site/github-webhook"}
            </code>
            <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
              <li><strong>Content type:</strong> application/json</li>
              <li><strong>Secret:</strong> (Opcional) Debe coincidir con la variable GITHUB_WEBHOOK_SECRET en Convex</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              📥 Eventos Recibidos en Vivo
              {events && (
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                  {events.length}
                </span>
              )}
            </h2>
          </div>

          {!events ? (
            <div className="text-slate-500 text-sm">Cargando eventos...</div>
          ) : events.length === 0 ? (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <p>No se han recibido eventos de GitHub aún.</p>
              <p className="text-xs text-slate-500 mt-1">
                Envía un evento desde tu repositorio de GitHub para verlo aquí en tiempo real.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event._id}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-4 transition hover:border-slate-700"
                >
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs">
                        {event.event}
                      </span>
                      {event.action && (
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          {event.action}
                        </span>
                      )}
                      <span className="font-medium text-slate-200">
                        {event.repository || "Desconocido"}
                      </span>
                    </div>

                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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
                    <span>Enviado por: <strong>{event.sender || "N/A"}</strong></span>
                    <span>{new Date(event._creationTime).toLocaleString()}</span>
                  </div>

                  {event.error && (
                    <div className="mt-2 text-xs bg-rose-950/40 border border-rose-900/50 text-rose-300 p-2 rounded">
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
