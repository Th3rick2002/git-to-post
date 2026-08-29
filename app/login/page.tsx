"use client";

import { useState } from "react";
import { signIn, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      setError(err instanceof Error ? err.message : "Error al iniciar sesión con GitHub");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            🚀 PublicaDev
          </h1>
          <p className="text-sm text-slate-400">
            Conecta tus repositorios y automatiza tus publicaciones desde tus commits y releases.
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/50 border border-rose-900 text-rose-300 text-xs p-3 rounded-lg text-center">
            {error}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            onClick={handleGitHubLogin}
            disabled={loading || isPending}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-medium py-3 px-4 rounded-xl hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed shadow"
          >
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            {loading || isPending ? "Conectando..." : "Continuar con GitHub"}
          </button>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-200 transition"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
