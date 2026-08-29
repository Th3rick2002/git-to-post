"use client";

import { ArrowRight, Hand, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export function StepIntegrations({
  onContinue,
  onBack,
}: {
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
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">Integration method</h2>
          <span className="flex items-center gap-1 rounded-full border border-tertiary/30 bg-tertiary/15 px-2.5 py-0.5 text-xs font-medium text-tertiary">
            <Sparkles className="h-3 w-3" /> Step 3: Dispatch channel
          </span>
        </div>
        <p className="mb-8 text-sm leading-relaxed text-on-surface-variant">
          Generated artifacts are published by you. Review a draft, then post it yourself.
        </p>

        <div className="glass-panel relative mb-6 overflow-hidden rounded-xl border-primary/50 p-6 ring-1 ring-primary/30 shadow-[0_0_30px_color-mix(in_srgb,var(--primary)_15%,transparent)]">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/15">
              <Hand className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-on-surface">Manual interaction</h3>
          </div>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            You review generated posts and publish them yourself.
          </p>
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
