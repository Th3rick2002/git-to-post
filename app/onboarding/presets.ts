import type { RepoData } from "./types";

export const DEFAULT_REPO: RepoData = {
  owner: "username",
  name: "repository",
  fullName: "username/repository",
  description: "Automated documentation and artifact generation for modern web apps.",
  stars: "1.2k",
  language: "TypeScript",
  languageColor: "#3178c6",
  isPrivate: false,
  defaultBranch: "main",
  updatedAt: "Just now",
};

export const PRESET_REPOS: Record<string, RepoData> = {
  "username/repository": DEFAULT_REPO,
  "publicadev/core": {
    owner: "publicadev",
    name: "core",
    fullName: "publicadev/core",
    description: "Core runtime and agentic artifact dispatch engine for developer ecosystems.",
    stars: "3.4k",
    language: "TypeScript",
    languageColor: "#3178c6",
    isPrivate: false,
    defaultBranch: "main",
    updatedAt: "2 hours ago",
  },
  "shadcn/ui": {
    owner: "shadcn",
    name: "ui",
    fullName: "shadcn/ui",
    description: "Beautifully designed components that you can copy and paste into your apps.",
    stars: "74.8k",
    language: "TypeScript",
    languageColor: "#3178c6",
    isPrivate: false,
    defaultBranch: "main",
    updatedAt: "10 mins ago",
  },
  "facebook/react": {
    owner: "facebook",
    name: "react",
    fullName: "facebook/react",
    description: "The library for web and native user interfaces.",
    stars: "230k",
    language: "JavaScript",
    languageColor: "#f7df1e",
    isPrivate: false,
    defaultBranch: "main",
    updatedAt: "35 mins ago",
  },
  "vercel/next.js": {
    owner: "vercel",
    name: "next.js",
    fullName: "vercel/next.js",
    description: "The React Framework for the Web.",
    stars: "128k",
    language: "JavaScript",
    languageColor: "#f7df1e",
    isPrivate: false,
    defaultBranch: "canary",
    updatedAt: "5 mins ago",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function formatStarCount(count: unknown): string {
  if (typeof count !== "number" || !Number.isFinite(count)) {
    return "0";
  }
  if (count > 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return `${count}`;
}

function languageColor(language: string): string {
  if (language === "TypeScript") return "#3178c6";
  if (language === "Python") return "#3572A5";
  return "#7dd3fc";
}

function ownerFromRecord(owner: unknown, fallback: string): string {
  if (!isRecord(owner)) return fallback;
  return readString(owner.login, fallback);
}

function repoFromParts(owner: string, name: string): RepoData {
  return {
    owner,
    name,
    fullName: `${owner}/${name}`,
    description: "Connected repository configured for automated artifacts generation.",
    stars: "0",
    language: "TypeScript",
    languageColor: languageColor("TypeScript"),
    isPrivate: false,
    defaultBranch: "main",
    updatedAt: "Just now",
  };
}

function repoFromGithubJson(data: unknown, owner: string, name: string): RepoData | null {
  if (!isRecord(data)) return null;
  const language = readString(data.language, "TypeScript");
  return {
    owner: ownerFromRecord(data.owner, owner),
    name: readString(data.name, name),
    fullName: readString(data.full_name, `${owner}/${name}`),
    description: readString(
      data.description,
      "Repository connected to PublicaDev for automated artifact dispatch.",
    ),
    stars: formatStarCount(data.stargazers_count),
    language,
    languageColor: languageColor(language),
    isPrivate: data.private === true,
    defaultBranch: readString(data.default_branch, "main"),
    updatedAt: "Active now",
  };
}

export async function parseAndFetchRepo(input: string): Promise<RepoData> {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");

  if (!cleaned) {
    return DEFAULT_REPO;
  }

  const preset = PRESET_REPOS[cleaned];
  if (preset) {
    return preset;
  }

  const parts = cleaned.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ...DEFAULT_REPO, name: cleaned, fullName: `username/${cleaned}` };
  }

  const [owner, name] = parts;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const parsed: unknown = await res.json();
      const repo = repoFromGithubJson(parsed, owner, name);
      if (repo) return repo;
    }
  } catch {
    // Offline, rate limited, or timed out. Fall back to the path.
  }

  return repoFromParts(owner, name);
}
