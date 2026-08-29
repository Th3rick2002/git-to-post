"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Info, Link as LinkIcon, Loader2, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { PRESET_REPOS } from "./presets";

export function StepSourceInitial({
  repoUrl,
  onChangeRepoUrl,
  onSubmit,
  isFetching,
  onSelectPreset,
}: {
  repoUrl: string;
  onChangeRepoUrl: (val: string) => void;
  onSubmit: () => void;
  isFetching: boolean;
  onSelectPreset: (url: string) => void;
}) {
  const [inputFocused, setInputFocused] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex h-full flex-col justify-between"
    >
      <div>
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-on-surface">Setup your first repo</h2>
        <p className="mb-8 text-sm leading-relaxed text-on-surface-variant">
          Connect your GitHub repository to begin generating automated artifacts. PublicaDev requires read
          access to your source code.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          autoComplete="off"
          data-form-type="other"
          noValidate
          className="glass-panel relative mb-6 overflow-hidden rounded-xl p-6"
        >
          <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <label
            htmlFor="github-repository-url"
            className="mb-2.5 flex items-center gap-2 text-sm font-medium text-on-surface"
          >
            <LinkIcon className="h-4 w-4 text-primary" />
            <span>Repository URL</span>
          </label>

          <div className="relative flex items-center">
            <span
              className={`pointer-events-none absolute left-4 font-mono text-sm transition-colors ${
                inputFocused ? "text-primary" : "text-on-surface-variant/60"
              }`}
            >
              &gt;
            </span>
            <input
              id="github-repository-url"
              name="github-repository-url"
              type="url"
              inputMode="url"
              value={repoUrl}
              onChange={(event) => onChangeRepoUrl(event.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="https://github.com/username/repository"
              autoComplete="url"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              data-bwignore="true"
              data-form-type="other"
              className="w-full rounded-lg border border-primary/20 bg-surface/60 py-3 pr-4 pl-9 font-mono text-sm text-on-surface transition-all placeholder:text-on-surface-variant/40 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/10 pt-3">
            <span className="flex items-center gap-1 text-[11px] font-medium tracking-wider text-on-surface-variant/70 uppercase">
              <Sparkles className="h-3 w-3 text-primary" /> Quick presets:
            </span>
            {Object.keys(PRESET_REPOS).map((presetKey) => (
              <button
                key={presetKey}
                type="button"
                onClick={() => onSelectPreset(`https://github.com/${presetKey}`)}
                className={`rounded-md px-2.5 py-1 font-mono text-xs transition-all ${
                  repoUrl.includes(presetKey)
                    ? "border border-primary/40 bg-primary/25 text-primary"
                    : "border border-primary/10 bg-surface-variant/80 text-on-surface-variant hover:bg-primary/10 hover:text-on-surface"
                }`}
              >
                {presetKey}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-on-surface-variant/80">
            <Info className="h-3.5 w-3.5 shrink-0 text-primary/80" />
            <span>Supports public and private repositories via OAuth.</span>
          </div>
        </form>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-primary/10 pt-6">
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant/70">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary/60" />
          <span>Screen 1: Interactive modal flow</span>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isFetching}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-primary/30 bg-primary/20 px-6 py-2.5 font-medium text-primary shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_10%,transparent)] transition-all duration-200 hover:bg-primary/30 hover:text-white active:scale-95 disabled:opacity-50"
        >
          {isFetching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Fetching repository...</span>
            </>
          ) : (
            <>
              <span>Next step</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
