"use client";

import { GitBranch } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn, useSession } from "@/lib/auth-client";

export default function LoginPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session?.user) {
    router.push("/");
    return null;
  }

  const handleGitHubLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al iniciar sesión con GitHub",
      );
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none fixed top-[-20%] left-[-10%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed right-[-10%] bottom-[-20%] h-[45%] w-[45%] rounded-full bg-tertiary/10 blur-[130px]"
      />
      <div className="glass-elevated relative z-10 w-full max-w-md rounded-3xl p-8 text-center sm:p-10">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          PublicaDev
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-on-surface-variant">
          Entra con GitHub para conectar repositorios e instalar la GitHub App.
        </p>
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleGitHubLogin}
          disabled={loading || isPending}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-on-surface px-4 py-3 text-sm font-semibold text-background disabled:opacity-50"
        >
          <GitBranch className="size-4" />
          {loading || isPending ? "Conectando..." : "Continuar con GitHub"}
        </button>
        <Link
          href="/"
          className="mt-6 inline-block text-xs text-on-surface-variant hover:text-on-surface"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
