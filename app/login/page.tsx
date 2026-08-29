"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readOnboardingComplete } from "../onboarding/onboarding-storage";

export default function LoginPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) {
      return;
    }
    router.replace(readOnboardingComplete() ? "/" : "/onboarding");
  }, [router, session?.user]);

  if (session?.user) {
    return null;
  }

  const handleGitHubLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signIn.social({
        provider: "github",
        callbackURL: "/onboarding",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión con GitHub");
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-[-20%] left-[-10%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed right-[-10%] bottom-[-20%] h-[45%] w-[45%] rounded-full bg-tertiary/10 blur-[130px]"
      />

      <div className="glass-elevated relative z-10 w-full max-w-md space-y-6 rounded-2xl p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">PublicaDev</h1>
          <p className="text-sm text-on-surface-variant">
            Conecta tus repositorios y automatiza tus publicaciones desde tus commits y releases.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-center text-xs text-error">
            {error}
          </div>
        ) : null}

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => void handleGitHubLogin()}
            disabled={loading || isPending}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-on-surface px-4 py-3 font-medium text-background transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            {loading || isPending ? "Conectando..." : "Continuar con GitHub"}
          </button>
        </div>

        <div className="pt-2 text-center">
          <Link href="/" className="text-xs text-on-surface-variant transition hover:text-on-surface">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
