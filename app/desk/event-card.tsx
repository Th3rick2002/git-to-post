"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Doc } from "../../convex/_generated/dataModel";
import { hrefForDraft } from "../workspace/view";

export function EventCard({ event }: { event: Doc<"githubEvents"> }) {
  const inner = (
    <>
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
      {event.error ? <p className="mb-2 text-xs text-error">Error: {event.error}</p> : null}
      {event.skipReason && !event.draftId ? (
        <p className="mb-2 text-xs text-on-surface-variant">{event.skipReason}</p>
      ) : null}
      <div className="flex items-center justify-between text-xs text-on-surface-variant">
        <span>
          Enviado por: <strong>{event.sender || "GitHub"}</strong>
        </span>
        <BeatTime at={event._creationTime} />
      </div>
    </>
  );

  if (event.draftId) {
    return (
      <Link
        href={hrefForDraft(event.draftId)}
        className="glass-panel block rounded-xl p-4 transition hover:border-primary/30"
      >
        {inner}
      </Link>
    );
  }

  return <div className="glass-panel rounded-xl p-4">{inner}</div>;
}

function BeatTime({ at }: { at: number }) {
  const iso = new Date(at).toISOString();
  const [label, setLabel] = useState(iso);
  useEffect(() => {
    setLabel(new Date(at).toLocaleString());
  }, [at]);
  return <time dateTime={iso}>{label}</time>;
}
