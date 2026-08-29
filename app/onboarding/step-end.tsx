"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function StepEnd({
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
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-on-surface">Setup complete</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-on-surface-variant">
          Your GitHub repositories, artifacts, and integration method are ready. Open the desk to manage them.
        </p>
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
          <span>Go to home</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
