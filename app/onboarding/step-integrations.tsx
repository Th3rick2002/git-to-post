"use client";

import { ArrowRight, Bot, Hand, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import type { IntegrationMethod } from "./types";

export function StepIntegrations({
  selectedMethod,
  onSelectMethod,
  onContinue,
  onBack,
}: {
  selectedMethod: IntegrationMethod;
  onSelectMethod: (method: IntegrationMethod) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex h-full flex-col justify-between"
    >
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">Choose your integration method</h2>
          <span className="flex items-center gap-1 rounded-full border border-tertiary/30 bg-tertiary/15 px-2.5 py-0.5 text-xs font-medium text-tertiary">
            <Sparkles className="h-3 w-3" /> Step 3: Dispatch channel
          </span>
        </div>
        <p className="mb-8 text-sm leading-relaxed text-on-surface-variant">
          Select how generated artifacts get published to X.com.
        </p>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div
            onClick={() => onSelectMethod("grok_bot")}
            className={`glass-panel relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl p-6 transition-all duration-300 ${
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
                When an update is done and a post is ready, your codebase pings a webhook. Grok Bot gets that ping
                and posts it.
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
          </div>

          <div
            onClick={() => onSelectMethod("manual")}
            className={`glass-panel relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl p-6 transition-all duration-300 ${
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
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-primary/10 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer rounded-md px-4 py-2 text-xs text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-primary/30 bg-primary/20 px-6 py-2.5 font-medium text-primary shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_15%,transparent)] transition-all duration-200 hover:bg-primary/30 hover:text-white active:scale-95"
        >
          <span>Continue</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
