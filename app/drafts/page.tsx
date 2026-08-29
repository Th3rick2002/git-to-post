"use client";

/* eslint-disable @next/next/no-img-element */

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Check,
  Copy,
  FileCode2,
  GitBranch,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSession } from "@/lib/auth-client";
import { ownerTokenFromSession } from "@/lib/sessionOwner";

type OutputTab = "x" | "linkedin" | "markdown";
type ImageMode = "none" | "reference" | "abstract";
type Tone = "devrel" | "technical" | "executive";

function labelStatus(status: string): string {
  return status.replaceAll("_", " ");
}

function statusClasses(status: string): string {
  if (status === "ready") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }
  if (status === "failed" || status === "partial") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  }
  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

function shortSha(value: string | undefined): string | undefined {
  return value ? value.slice(0, 7) : undefined;
}

function isBusy(status: string): boolean {
  return (
    status === "queued" ||
    status === "analyzing" ||
    status === "generating_text" ||
    status === "generating_image"
  );
}

export default function DraftsPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <div className="glass-elevated max-w-lg rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-semibold">Convex no está configurado</h1>
          <p className="mt-3 text-sm text-on-surface-variant">
            Configura NEXT_PUBLIC_CONVEX_URL para cargar la cola de borradores.
          </p>
        </div>
      </main>
    );
  }
  return <DraftWorkspace />;
}

function DraftWorkspace() {
  const { data: session, isPending } = useSession();
  const ownerTokenIdentifier = ownerTokenFromSession(session);
  const isSignedIn = Boolean(session?.user);

  const drafts = useQuery(
    api.postGeneration.list,
    isSignedIn ? { limit: 30, ownerTokenIdentifier } : "skip",
  );
  const [selectedId, setSelectedId] = useState<Id<"contentDrafts"> | null>(null);

  const activeId =
    selectedId && drafts?.some((draft) => draft._id === selectedId)
      ? selectedId
      : drafts?.[0]?._id;
  const detail = useQuery(
    api.postGeneration.get,
    activeId && isSignedIn
      ? { draftId: activeId, ownerTokenIdentifier }
      : "skip",
  );

  if (!isPending && !isSignedIn) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-100">
        <div className="max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-white">Inicia sesión con GitHub</h1>
          <p className="mt-3 text-sm text-slate-400">
            Los borradores de IA se muestran para tu cuenta de GitHub conectada.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Continuar con GitHub
          </Link>
        </div>
      </main>
    );
  }
  const draft = detail?.draft ?? drafts?.find((item) => item._id === activeId);
  const references = detail?.references ?? [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-on-surface">
      <div aria-hidden className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-tertiary/10 blur-[140px]" />
      </div>

      <header className="glass-panel sticky top-0 z-20 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-on-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="font-semibold tracking-tight">PublicaDev</p>
              <p className="text-xs text-on-surface-variant">Generation studio</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link className="rounded-lg px-3 py-2 text-on-surface-variant hover:bg-white/5" href="/events">
              Webhooks
            </Link>
            <Link className="rounded-lg bg-white/5 px-3 py-2 text-on-surface" href="/drafts">
              Borradores
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-[1500px] gap-6 p-5 lg:grid-cols-[330px_minmax(0,1fr)] lg:p-8">
        <aside className="glass-panel h-fit rounded-2xl p-3 lg:sticky lg:top-24">
          <div className="flex items-center justify-between px-2 py-3">
            <div>
              <h1 className="font-semibold">Cola de contenido</h1>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {drafts?.length ?? 0} cambios detectados
              </p>
            </div>
            <GitBranch className="size-5 text-on-surface-variant" />
          </div>
          <div className="space-y-2">
            {!drafts ? (
              <div className="flex items-center gap-2 px-3 py-8 text-sm text-on-surface-variant">
                <LoaderCircle className="size-4 animate-spin" /> Cargando
              </div>
            ) : drafts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant p-5 text-sm text-on-surface-variant">
                El próximo PR mergeado o release publicado aparecerá aquí.
              </div>
            ) : (
              drafts.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => setSelectedId(item._id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    item._id === activeId
                      ? "border-primary/30 bg-primary/8"
                      : "border-transparent hover:border-outline-variant hover:bg-white/[0.025]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.repository}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusClasses(item.status)}`}>
                      {labelStatus(item.status)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-on-surface-variant">
                    {item.title ?? `${item.trigger} recibido`}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-primary/70">
                    {item.trigger}
                    {item.context?.tag ? ` · ${item.context.tag}` : ""}
                    {item.context?.prNumber ? ` · #${item.context.prNumber}` : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        {!draft ? (
          <section className="glass-elevated grid min-h-[520px] place-items-center rounded-3xl p-8 text-center">
            <div className="max-w-md">
              <FileCode2 className="mx-auto size-10 text-primary" />
              <h2 className="mt-5 text-xl font-semibold">Esperando un cambio real</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Un release publicado o un PR mergeado creará un borrador con análisis before/after.
              </p>
            </div>
          </section>
        ) : (
          <DraftEditor
            key={draft._id}
            draft={draft}
            references={references}
          />
        )}
      </div>
    </main>
  );
}

type DraftDetail = NonNullable<FunctionReturnType<typeof api.postGeneration.get>>;
type DraftView = DraftDetail["draft"];
type ReferenceView = DraftDetail["references"][number];

function DraftEditor({
  draft,
  references,
}: {
  draft: DraftView;
  references: ReferenceView[];
}) {
  const requestGeneration = useMutation(api.postGeneration.requestGeneration);
  const updateEditedContent = useMutation(api.postGeneration.updateEditedContent);
  const generateUploadUrl = useMutation(api.postGeneration.generateUploadUrl);
  const attachReference = useMutation(api.postGeneration.attachReference);
  const [tab, setTab] = useState<OutputTab>("x");
  const [working, setWorking] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageMode, setImageMode] = useState<ImageMode>(draft.imageMode);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [title, setTitle] = useState(draft.title ?? "");
  const [summary, setSummary] = useState(draft.summary ?? "");
  const [xThread, setXThread] = useState((draft.xThread ?? []).join("\n\n"));
  const [linkedinPost, setLinkedinPost] = useState(draft.linkedinPost ?? "");
  const [changelogMarkdown, setChangelogMarkdown] = useState(
    draft.changelogMarkdown ?? "",
  );

  const selectedOutput =
    tab === "x" ? xThread : tab === "linkedin" ? linkedinPost : changelogMarkdown;

  async function run<T>(key: string, work: () => Promise<T>) {
    setWorking(key);
    setNotice(null);
    try {
      return await work();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      return undefined;
    } finally {
      setWorking(null);
    }
  }

  async function regenerateText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run("text", () =>
      requestGeneration({
        draftId: draft._id,
        stage: "text",
        tone: data.get("tone") as Tone,
        locale: String(data.get("locale") || "en"),
      }),
    );
  }

  async function saveEdits() {
    await run("save", () =>
      updateEditedContent({
        draftId: draft._id,
        title,
        summary,
        xThread: xThread
          .split(/\n\s*\n/)
          .map((post) => post.trim())
          .filter(Boolean),
        linkedinPost,
        changelogMarkdown,
      }),
    );
    setNotice("Borrador guardado.");
  }

  async function generateImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const palette = String(data.get("palette") || "")
      .split(",")
      .map((color) => color.trim())
      .filter(Boolean);
    await run("image", () =>
      requestGeneration({
        draftId: draft._id,
        stage: "image",
        imageMode,
        requestedPalette: palette.length > 0 ? palette : undefined,
      }),
    );
  }

  async function uploadReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rightsConfirmed) {
      setNotice("Confirma que tienes derechos para usar la imagen.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const file = data.get("image");
    if (!(file instanceof File) || file.size === 0) {
      setNotice("Selecciona una imagen PNG, JPEG o WebP.");
      return;
    }
    await run("upload", async () => {
      const uploadUrl = await generateUploadUrl();
      const uploaded = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const payload: unknown = await uploaded.json();
      const storageId =
        typeof payload === "object" &&
        payload !== null &&
        "storageId" in payload &&
        typeof payload.storageId === "string"
          ? payload.storageId
          : undefined;
      if (!storageId) {
        throw new Error("La carga de la imagen no devolvió un storageId.");
      }
      await attachReference({
        draftId: draft._id,
        storageId: storageId as Id<"_storage">,
        role: String(data.get("role") || "related") as
          | "style"
          | "benchmark"
          | "metric"
          | "related",
        filename: file.name,
      });
      setImageMode("reference");
    });
  }

  async function copyOutput() {
    if (!selectedOutput) return;
    await navigator.clipboard.writeText(selectedOutput);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
            <section className="glass-elevated rounded-3xl p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-primary">{draft.repository}</span>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 uppercase text-on-surface-variant">{draft.trigger}</span>
                    <span className={`rounded-full border px-2.5 py-1 uppercase ${statusClasses(draft.status)}`}>
                      {labelStatus(draft.status)}
                    </span>
                  </div>
                  <h2 className="mt-4 max-w-4xl text-2xl font-semibold tracking-tight sm:text-3xl">
                    {draft.title ?? "Analizando el cambio…"}
                  </h2>
                  {draft.summary ? (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant">{draft.summary}</p>
                  ) : null}
                  <p className="mt-4 text-xs leading-6 text-on-surface-variant">
                    {draft.context?.tag ? `Versión ${draft.context.tag}. ` : ""}
                    {draft.context?.prNumber ? `PR #${draft.context.prNumber}. ` : ""}
                    {shortSha(draft.context?.beforeSha) && shortSha(draft.context?.afterSha)
                      ? `${shortSha(draft.context?.beforeSha)} → ${shortSha(draft.context?.afterSha)}. `
                      : ""}
                    {draft.context?.compareUrl ? (
                      <a className="text-primary underline-offset-2 hover:underline" href={draft.context.compareUrl} target="_blank" rel="noreferrer">
                        Comparar en GitHub
                      </a>
                    ) : null}
                  </p>
                </div>
                {isBusy(draft.status) && (
                  <LoaderCircle className="size-6 animate-spin text-primary" />
                )}
              </div>

              {draft.analysis ? (
                <div className="mt-7 grid gap-3 md:grid-cols-3">
                  {[
                    ["Antes", draft.analysis.before],
                    ["Después", draft.analysis.after],
                    ["Impacto", draft.analysis.impact],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-outline-variant bg-black/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {(draft.analysis?.evidence?.length || draft.context?.filePaths?.length) ? (
                <div className="mt-5 rounded-2xl border border-outline-variant bg-black/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Evidencia</p>
                  {draft.context?.fileStats ? (
                    <p className="mt-2 text-xs text-on-surface-variant">
                      +{draft.context.fileStats.additions} / -{draft.context.fileStats.deletions}
                      {draft.context.truncated ? " · diff truncado a 20 archivos" : ""}
                    </p>
                  ) : null}
                  <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                    {(draft.analysis?.evidence ?? []).map((item) => (
                      <li key={`${item.claim}-${item.source}`}>
                        <span className="text-on-surface">{item.claim}</span>
                        <span className="mt-0.5 block font-mono text-[11px] text-primary/80">
                          {item.file ?? item.source}
                          {item.lines ? `:${item.lines}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {draft.error ? (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">
                  <p>{draft.error}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={Boolean(working)}
                      onClick={() =>
                        run("retry-text", () =>
                          requestGeneration({ draftId: draft._id, stage: "text" }),
                        )
                      }
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-on-surface"
                    >
                      Reintentar texto
                    </button>
                    {draft.imageMode !== "none" ? (
                      <button
                        type="button"
                        disabled={Boolean(working)}
                        onClick={() =>
                          run("retry-image", () =>
                            requestGeneration({
                              draftId: draft._id,
                              stage: "image",
                              imageMode: draft.imageMode,
                            }),
                          )
                        }
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-on-surface"
                      >
                        Reintentar imagen
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {notice ? (
                <div className="mt-5 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-on-surface">
                  {notice}
                </div>
              ) : null}
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
              <section className="glass-panel rounded-3xl p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex rounded-xl bg-black/20 p-1">
                    {(["x", "linkedin", "markdown"] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setTab(item)}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                          tab === item ? "bg-surface-variant text-on-surface" : "text-on-surface-variant"
                        }`}
                      >
                        {item === "x" ? "X / Thread" : item === "linkedin" ? "LinkedIn" : "Changelog"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveEdits}
                      disabled={Boolean(working) || isBusy(draft.status)}
                      className="rounded-lg px-3 py-2 text-xs text-on-surface-variant hover:bg-white/5 disabled:opacity-40"
                    >
                      {working === "save" ? "Guardando…" : "Guardar edición"}
                    </button>
                    <button
                      type="button"
                      onClick={copyOutput}
                      disabled={!selectedOutput}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-on-surface-variant hover:bg-white/5 disabled:opacity-40"
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 min-h-80 rounded-2xl border border-outline-variant bg-surface-container-lowest/60 p-5">
                  {tab === "x" ? (
                    <div className="space-y-3">
                      <textarea
                        value={xThread}
                        onChange={(event) => setXThread(event.target.value)}
                        className="min-h-64 w-full resize-y bg-transparent text-sm leading-6 outline-none"
                      />
                      <div className="space-y-1">
                        {xThread
                          .split(/\n\s*\n/)
                          .map((post) => post.trim())
                          .filter(Boolean)
                          .map((post, index, posts) => (
                            <p
                              key={`${index}-${post.slice(0, 20)}`}
                              className={`text-right font-mono text-[10px] ${
                                post.length > 280 ? "text-rose-300" : "text-on-surface-variant"
                              }`}
                            >
                              {index + 1}/{posts.length} · {post.length}/280
                            </p>
                          ))}
                      </div>
                    </div>
                  ) : tab === "linkedin" ? (
                    <textarea
                      value={linkedinPost}
                      onChange={(event) => setLinkedinPost(event.target.value)}
                      className="min-h-64 w-full resize-y bg-transparent text-sm leading-7 outline-none"
                    />
                  ) : (
                    <textarea
                      value={changelogMarkdown}
                      onChange={(event) => setChangelogMarkdown(event.target.value)}
                      className="min-h-64 w-full resize-y bg-transparent font-mono text-sm leading-7 outline-none"
                    />
                  )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs text-on-surface-variant">
                    Título
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="glass-input rounded-lg px-3 py-2 text-sm text-on-surface"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs text-on-surface-variant">
                    Resumen
                    <input
                      value={summary}
                      onChange={(event) => setSummary(event.target.value)}
                      className="glass-input rounded-lg px-3 py-2 text-sm text-on-surface"
                    />
                  </label>
                </div>

                <form onSubmit={regenerateText} className="mt-5 flex flex-wrap items-end gap-3">
                  <label className="grid gap-1.5 text-xs text-on-surface-variant">
                    Tono
                    <select name="tone" defaultValue={draft.tone} key={`${draft._id}-${draft.tone}`} className="glass-input rounded-lg px-3 py-2 text-sm text-on-surface">
                      <option value="technical">Técnico</option>
                      <option value="devrel">DevRel / Hype</option>
                      <option value="executive">Ejecutivo</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs text-on-surface-variant">
                    Idioma
                    <input name="locale" defaultValue={draft.locale} className="glass-input w-24 rounded-lg px-3 py-2 text-sm text-on-surface" />
                  </label>
                  <button
                    type="submit"
                    disabled={Boolean(working) || isBusy(draft.status)}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
                  >
                    <RefreshCw className={`size-4 ${working === "text" ? "animate-spin" : ""}`} />
                    Regenerar texto
                  </button>
                </form>
              </section>

              <section className="glass-panel rounded-3xl p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <ImageIcon className="size-5 text-tertiary" />
                  <h3 className="font-semibold">Imagen opcional</h3>
                </div>
                <div className="mt-4 flex rounded-xl bg-black/20 p-1">
                  {(["none", "reference", "abstract"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setImageMode(mode)}
                      className={`flex-1 rounded-lg px-2 py-2 text-[11px] font-medium capitalize ${
                        imageMode === mode ? "bg-surface-variant text-on-surface" : "text-on-surface-variant"
                      }`}
                    >
                      {mode === "none" ? "Ninguna" : mode === "reference" ? "Referencia" : "Abstracta"}
                    </button>
                  ))}
                </div>

                <div className="mt-5 aspect-square overflow-hidden rounded-2xl border border-outline-variant bg-gradient-to-br from-blue-950 via-indigo-900/70 to-violet-900/60">
                  {draft.imageUrl ? (
                    <img src={draft.imageUrl} alt="Imagen del post" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center p-8 text-center text-sm text-white/60">
                      {draft.imageStatus === "generating" ? (
                        <LoaderCircle className="size-7 animate-spin" />
                      ) : (
                        "Sin imagen. El texto queda listo por su cuenta."
                      )}
                    </div>
                  )}
                </div>

                {references.length > 0 ? (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {references.map((reference) =>
                      reference.url ? (
                        <img
                          key={reference._id}
                          src={reference.url}
                          alt={reference.filename}
                          className="aspect-square rounded-lg object-cover"
                        />
                      ) : (
                        <div key={reference._id} className="aspect-square rounded-lg bg-white/5" />
                      ),
                    )}
                  </div>
                ) : null}

                <form onSubmit={generateImage} className="mt-5 space-y-3">
                  <label className="grid gap-1.5 text-xs text-on-surface-variant">
                    Paleta (separada por comas)
                    <input
                      name="palette"
                      placeholder="azul profundo, violeta, cyan"
                      defaultValue={draft.requestedPalette?.join(", ")}
                      className="glass-input rounded-lg px-3 py-2 text-sm text-on-surface"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={
                      Boolean(working) ||
                      !draft.title ||
                      isBusy(draft.status) ||
                      imageMode === "none"
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-tertiary px-4 py-2.5 text-sm font-semibold text-surface disabled:opacity-50"
                  >
                    <Sparkles className="size-4" />
                    {imageMode === "abstract" ? "Generar abstracta con Muse" : "Aplicar modo de imagen"}
                  </button>
                </form>

                <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-on-surface-variant">
                  <span className="h-px flex-1 bg-outline-variant" /> referencia <span className="h-px flex-1 bg-outline-variant" />
                </div>

                <form onSubmit={uploadReference} className="space-y-3">
                  <input
                    name="image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="block w-full text-xs text-on-surface-variant file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-on-surface"
                  />
                  <select name="role" defaultValue="related" className="glass-input w-full rounded-lg px-3 py-2 text-sm text-on-surface">
                    <option value="related">Imagen relacionada</option>
                    <option value="style">Referencia de estilo</option>
                    <option value="benchmark">Benchmark original</option>
                    <option value="metric">Gráfica / métrica original</option>
                  </select>
                  <label className="flex items-start gap-2 text-xs leading-5 text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={rightsConfirmed}
                      onChange={(event) => setRightsConfirmed(event.target.checked)}
                      className="mt-0.5"
                    />
                    Confirmo que tengo derechos para usar esta imagen.
                  </label>
                  <button
                    type="submit"
                    disabled={Boolean(working) || !rightsConfirmed}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-50"
                  >
                    <Upload className="size-4" />
                    Adjuntar referencia
                  </button>
                </form>
              </section>
            </div>
    </div>
  );
}
