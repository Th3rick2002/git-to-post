"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { EventCard } from "./event-card";

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
        <li key={event._id}>
          <EventCard event={event} />
        </li>
      ))}
    </ol>
  );
}
