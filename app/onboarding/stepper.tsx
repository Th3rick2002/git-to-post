"use client";

import { motion } from "motion/react";
import type { StepId } from "./types";

const STEPS = [
  { id: 1, label: "Source" },
  { id: 2, label: "Artifacts" },
  { id: 3, label: "Integrations" },
  { id: 4, label: "End" },
] as const satisfies ReadonlyArray<{ id: StepId; label: string }>;

export function Stepper({
  currentStep,
  furthestStep,
  isComplete,
  onSelectStep,
}: {
  currentStep: StepId;
  furthestStep: StepId;
  isComplete: boolean;
  onSelectStep?: (step: StepId) => void;
}) {
  return (
    <nav aria-label="Onboarding progress" className="relative flex justify-between px-2 py-1">
      <div
        className="absolute top-4 right-4 left-4 -z-0 h-0.5 -translate-y-1/2 bg-surface-variant"
        aria-hidden="true"
      />
      <motion.div
        className="absolute top-4 left-4 -z-0 h-0.5 -translate-y-1/2 bg-gradient-to-r from-primary to-primary/80"
        initial={false}
        animate={{
          width: isComplete
            ? "100%"
            : `${Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100)}%`,
        }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />

      {STEPS.map((step) => {
        const isActive = !isComplete && step.id === currentStep;
        const isPassed = isComplete || step.id < currentStep;
        const isLocked = !isComplete && step.id > furthestStep;

        return (
          <button
            key={step.id}
            type="button"
            disabled={isLocked || isActive}
            onClick={() => {
              if (isLocked || isActive) {
                return;
              }
              onSelectStep?.(step.id);
            }}
            className={`group z-10 flex flex-col items-center gap-2 focus:outline-none ${
              isLocked || isActive ? "cursor-default" : "cursor-pointer"
            }`}
            aria-current={isActive ? "step" : undefined}
            aria-disabled={isLocked || isActive}
            aria-label={`${step.label}, step ${step.id} of ${STEPS.length}${isLocked ? ", locked" : ""}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-sm font-bold transition-all duration-300 ${
                isActive
                  ? "scale-110 bg-primary text-on-primary shadow-step-active"
                  : isPassed
                    ? "border-primary/40 bg-surface-highlight text-primary"
                    : "bg-surface-variant text-on-surface-variant"
              }`}
            >
              {step.id}
            </div>
            <span
              className={`hidden text-xs tracking-tight transition-colors duration-200 sm:block ${
                isActive
                  ? "font-semibold text-primary"
                  : isPassed
                    ? "font-medium text-on-surface"
                    : "font-medium text-on-surface-variant"
              }`}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
