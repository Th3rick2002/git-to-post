"use client";

import { ArrowRight, GitBranch, Sparkles } from "lucide-react";
import Link from "next/link";

export function WelcomeBack() {
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
