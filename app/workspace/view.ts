import type { Id } from "../../convex/_generated/dataModel";
import type { ConnectedRepo } from "./types";

export type DeskView = {
  selected: ConnectedRepo | null;
};

export function hrefFor(fullName: string): string {
  const params = new URLSearchParams();
  params.set("repo", fullName);
  return `/?${params.toString()}`;
}

export function hrefForDraft(draftId: Id<"contentDrafts">): string {
  const params = new URLSearchParams();
  params.set("draft", draftId);
  return `/drafts?${params.toString()}`;
}

export function readView(repos: readonly ConnectedRepo[], repoParam: string | null): DeskView {
  if (repos.length === 0) {
    return { selected: null };
  }

  const match = repoParam ? repos.find((entry) => entry.fullName === repoParam) : undefined;
  return { selected: match ?? repos[0] ?? null };
}
