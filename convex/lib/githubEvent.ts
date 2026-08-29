export type GenerationTrigger = "push" | "pull_request" | "release" | "tag";

export type GenerationPolicy = {
  generateOnPush: boolean;
  generateOnVersionTag: boolean;
  generateOnTagCreate: boolean;
};

export const DEFAULT_GENERATION_POLICY: GenerationPolicy = {
  generateOnPush: true,
  generateOnVersionTag: true,
  generateOnTagCreate: true,
};

export type NormalizedGenerationContext = {
  changeKey: string;
  repository: string;
  trigger: GenerationTrigger;
  title: string;
  beforeSha?: string;
  afterSha?: string;
  ref?: string;
  tag?: string;
  prNumber?: number;
  commitMessages: string[];
  releaseNotes?: string;
  compareUrl?: string;
};

export type NormalizedEventResult =
  | { kind: "generate"; context: NormalizedGenerationContext }
  | { kind: "skip"; reason: string };

type EventInput = {
  deliveryId: string;
  event: string;
  action?: string;
  repository?: string;
  payload: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function firstLine(value: string | undefined): string | undefined {
  return value?.split(/\r?\n/, 1)[0]?.trim() || undefined;
}

function readRepository(input: EventInput, payload: Record<string, unknown>): string | undefined {
  const repository = readRecord(payload.repository);
  return input.repository ?? readString(repository?.full_name);
}

function readCommitMessages(payload: Record<string, unknown>): string[] {
  const commits = Array.isArray(payload.commits) ? payload.commits : [];
  const messages = commits
    .slice(0, 50)
    .map((commit) => readString(readRecord(commit)?.message))
    .filter((message): message is string => Boolean(message))
    .map((message) => message.slice(0, 500));

  const headCommit = readRecord(payload.head_commit);
  const headMessage = readString(headCommit?.message);
  if (headMessage && !messages.includes(headMessage)) {
    messages.unshift(headMessage.slice(0, 500));
  }

  return messages.slice(0, 50);
}

export function canonicalizeVersionTag(ref: string): string | undefined {
  const tag = ref.replace(/^refs\/tags\//, "");
  const match = /^v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/.exec(tag);
  return match?.[1];
}

function versionChangeKey(repository: string, version: string): string {
  return `version:${repository}:${version}`;
}

function normalizePush(
  input: EventInput,
  payload: Record<string, unknown>,
  repository: string,
  policy: GenerationPolicy,
): NormalizedEventResult {
  const ref = readString(payload.ref);
  const beforeSha = readString(payload.before);
  const afterSha = readString(payload.after);
  const deleted = payload.deleted === true || /^0+$/.test(afterSha ?? "");

  if (!ref || !afterSha || deleted) {
    return { kind: "skip", reason: "Push did not contain a live target ref." };
  }

  const commitMessages = readCommitMessages(payload);
  const compareUrl = readString(payload.compare);
  const version = canonicalizeVersionTag(ref);
  if (version) {
    if (!policy.generateOnVersionTag) {
      return { kind: "skip", reason: "Version tag push generation is disabled." };
    }
    return {
      kind: "generate",
      context: {
        changeKey: versionChangeKey(repository, version),
        repository,
        trigger: "tag",
        title: `Release v${version}`,
        beforeSha,
        afterSha,
        ref,
        tag: `v${version}`,
        commitMessages,
        compareUrl,
      },
    };
  }

  if (!ref.startsWith("refs/heads/")) {
    return { kind: "skip", reason: `Unsupported push ref: ${ref}` };
  }

  if (commitMessages.length === 0) {
    return { kind: "skip", reason: "Push contained no commits." };
  }

  if (!policy.generateOnPush) {
    return { kind: "skip", reason: "Branch push generation is disabled." };
  }

  const branch = ref.slice("refs/heads/".length);
  return {
    kind: "generate",
    context: {
      changeKey: `push:${repository}:${afterSha}`,
      repository,
      trigger: "push",
      title: firstLine(commitMessages[0]) ?? `Push to ${branch}`,
      beforeSha,
      afterSha,
      ref,
      commitMessages,
      compareUrl,
    },
  };
}

function normalizePullRequest(
  input: EventInput,
  payload: Record<string, unknown>,
  repository: string,
): NormalizedEventResult {
  const pullRequest = readRecord(payload.pull_request);
  if (!pullRequest) {
    return { kind: "skip", reason: "Pull request object not found in payload." };
  }

  if (input.action === "closed" && pullRequest.merged !== true) {
    return { kind: "skip", reason: "Pull request was not merged." };
  }

  const number = readNumber(payload.number) ?? readNumber(pullRequest.number);
  if (number === undefined) {
    return { kind: "skip", reason: "Pull request did not include a number." };
  }

  const base = readRecord(pullRequest.base);
  const head = readRecord(pullRequest.head);
  const baseSha = readString(base?.sha);
  const headSha = readString(head?.sha);
  const mergeSha = readString(pullRequest.merge_commit_sha) ?? headSha ?? input.deliveryId;
  const isMerged = pullRequest.merged === true;
  const title = readString(pullRequest.title) ?? (isMerged ? `Merged pull request #${number}` : `Pull request #${number}`);
  const body = readString(pullRequest.body);

  return {
    kind: "generate",
    context: {
      changeKey: `pr:${repository}:${number}:${mergeSha}`,
      repository,
      trigger: "pull_request",
      title,
      beforeSha: baseSha,
      afterSha: headSha,
      prNumber: number,
      commitMessages: [title],
      releaseNotes: body?.slice(0, 10_000),
      compareUrl:
        baseSha && headSha
          ? `https://github.com/${repository}/compare/${baseSha}...${headSha}`
          : undefined,
    },
  };
}

function normalizeRelease(
  input: EventInput,
  payload: Record<string, unknown>,
  repository: string,
): NormalizedEventResult {
  if (!new Set(["published", "released", "prereleased"]).has(input.action ?? "")) {
    return { kind: "skip", reason: `Release action ${input.action ?? "unknown"} is not publishable.` };
  }

  const release = readRecord(payload.release);
  const rawTag = readString(release?.tag_name);
  if (!rawTag) {
    return { kind: "skip", reason: "Release did not include a tag." };
  }

  const version = canonicalizeVersionTag(rawTag) ?? rawTag.replace(/^v/, "");
  const name = readString(release?.name);
  const body = readString(release?.body);
  return {
    kind: "generate",
    context: {
      changeKey: versionChangeKey(repository, version),
      repository,
      trigger: "release",
      title: name ?? `Release v${version}`,
      ref: readString(release?.target_commitish),
      tag: canonicalizeVersionTag(rawTag) ? `v${version}` : rawTag,
      commitMessages: [],
      releaseNotes: body?.slice(0, 20_000),
    },
  };
}

function normalizeCreate(
  payload: Record<string, unknown>,
  repository: string,
  policy: GenerationPolicy,
): NormalizedEventResult {
  if (readString(payload.ref_type) !== "tag") {
    return { kind: "skip", reason: "Branch creation does not generate a post." };
  }

  const ref = readString(payload.ref);
  const version = ref ? canonicalizeVersionTag(ref) : undefined;
  if (!version) {
    return { kind: "skip", reason: "Created tag was not a semantic version." };
  }

  if (!policy.generateOnTagCreate) {
    return { kind: "skip", reason: "Tag creation generation is disabled." };
  }

  return {
    kind: "generate",
    context: {
      changeKey: versionChangeKey(repository, version),
      repository,
      trigger: "tag",
      title: `Release v${version}`,
      ref,
      tag: `v${version}`,
      commitMessages: [],
    },
  };
}

export function normalizeGitHubEvent(
  input: EventInput,
  policy: GenerationPolicy = DEFAULT_GENERATION_POLICY,
): NormalizedEventResult {
  const payload = readRecord(input.payload);
  if (!payload) {
    return { kind: "skip", reason: "Webhook payload was not an object." };
  }

  const repository = readRepository(input, payload);
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    return { kind: "skip", reason: "Webhook did not include a valid repository." };
  }

  if (input.event === "push") {
    return normalizePush(input, payload, repository, policy);
  }
  if (input.event === "pull_request") {
    return normalizePullRequest(input, payload, repository);
  }
  if (input.event === "release") {
    return normalizeRelease(input, payload, repository);
  }
  if (input.event === "create") {
    return normalizeCreate(payload, repository, policy);
  }

  return { kind: "skip", reason: `Event ${input.event} is not a generation trigger.` };
}
