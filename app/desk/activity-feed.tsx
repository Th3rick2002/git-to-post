"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ActivityFeed({ repoFullName }: { repoFullName?: string }) {
  const events = useQuery(api.githubEvents.list, { limit: 20 });

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <p className="rounded-xl border border-dashed border-primary/15 bg-surface/40 px-4 py-8 text-center text-sm text-on-surface-variant">
        Convex no está configurado.
      </p>
    );
  }

  if (events === undefined) {
    return <p className="text-sm text-on-surface-variant">Cargando eventos...</p>;
  }

  const visible = repoFullName
    ? events.filter((event) => event.repository === repoFullName)
    : events;

  if (visible.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-primary/15 bg-surface/40 px-4 py-8 text-center text-sm text-on-surface-variant">
        Aún no se han recibido eventos
        {repoFullName ? " de este repositorio" : " de tus repositorios"}.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {visible.map((event) => (
        <li key={event._id} className="glass-panel rounded-xl p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                {event.event}
              </span>
              {event.action ? (
                <span className="rounded bg-surface-variant px-2 py-0.5 text-xs text-on-surface-variant">
                  {event.action}
                </span>
              ) : null}
              <span className="font-mono text-sm font-medium text-on-surface">
                {event.repository || "Repositorio"}
              </span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                event.status === "processed"
                  ? "border border-primary/20 bg-primary/10 text-primary"
                  : event.status === "failed"
                    ? "border border-error/30 bg-error/10 text-error"
                    : "border border-primary/15 bg-surface-variant text-on-surface-variant"
              }`}
            >
              {event.status}
            </span>
          </div>
          {event.error ? (
            <p className="mb-2 text-xs text-error">Error: {event.error}</p>
          ) : null}
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>
              Enviado por: <strong>{event.sender || "GitHub"}</strong>
            </span>
            <BeatTime at={event._creationTime} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function BeatTime({ at }: { at: number }) {
  const iso = new Date(at).toISOString();
  const [label, setLabel] = useState(iso);
  useEffect(() => {
    setLabel(new Date(at).toLocaleString());
  }, [at]);
  return <time dateTime={iso}>{label}</time>;
}
