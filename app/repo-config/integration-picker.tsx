"use client";

import { Bot, Hand } from "lucide-react";
import type { IntegrationMethod } from "../onboarding/types";

export function IntegrationPicker({
  selectedMethod,
  onSelectMethod,
}: {
  selectedMethod: IntegrationMethod;
  onSelectMethod: (method: IntegrationMethod) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <button
        type="button"
        onClick={() => onSelectMethod("grok_bot")}
        aria-pressed={selectedMethod === "grok_bot"}
        className={`glass-panel relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl p-6 text-left transition-all duration-300 ${
          selectedMethod === "grok_bot"
            ? "border-primary/50 shadow-[0_0_30px_color-mix(in_srgb,var(--primary)_15%,transparent)] ring-1 ring-primary/30"
            : "border-primary/15 hover:border-primary/30"
        }`}
      >
        {selectedMethod === "grok_bot" ? (
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        ) : null}

        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/15">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-on-surface">Automated via Grok Bot</h3>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-on-surface-variant">
            When an update is done and a post is ready, your codebase pings a webhook. Grok Bot gets that ping and
            posts it.
          </p>
          <div className="rounded-lg border border-outline-variant bg-background/70 p-4">
            <h4 className="mb-2.5 text-xs font-bold tracking-wider text-primary uppercase">How it posts</h4>
            <ol className="space-y-1.5 font-mono text-xs leading-relaxed text-on-surface-variant/90">
              <li className="flex items-start gap-1.5">
                <span className="text-primary">1.</span>
                <span>Codebase webhook fires when a post is ready.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary">2.</span>
                <span>Grok Bot is notified.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary">3.</span>
                <span>Grok Bot posts.</span>
              </li>
            </ol>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectMethod("manual")}
        aria-pressed={selectedMethod === "manual"}
        className={`glass-panel relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl p-6 text-left transition-all duration-300 ${
          selectedMethod === "manual"
            ? "border-primary/50 shadow-[0_0_30px_color-mix(in_srgb,var(--primary)_15%,transparent)] ring-1 ring-primary/30"
            : "border-outline-variant hover:border-primary/20"
        }`}
      >
        {selectedMethod === "manual" ? (
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        ) : null}

        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/10 bg-surface-variant">
              <Hand className="h-5 w-5 text-on-surface-variant" />
            </div>
            <h3 className="text-lg font-semibold text-on-surface">Manual interaction</h3>
          </div>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            You review generated posts and publish them yourself.
          </p>
        </div>
      </button>
    </div>
  );
}
