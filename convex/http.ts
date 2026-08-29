import { httpRouter } from "convex/server";
import { env, httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Verifies HMAC-SHA256 signature from GitHub using Web Crypto API.
 */
async function verifyGitHubSignature(
  secret: string,
  signatureHeader: string | null,
  rawBody: string,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const signatureHex = signatureHeader.slice(7);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const calculatedSigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody),
  );
  const calculatedSigArray = Array.from(new Uint8Array(calculatedSigBuffer));
  const calculatedSigHex = calculatedSigArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  if (signatureHex.length !== calculatedSigHex.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < signatureHex.length; i++) {
    result |= signatureHex.charCodeAt(i) ^ calculatedSigHex.charCodeAt(i);
  }
  return result === 0;
}

function asRepoChange(value: unknown): {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
} | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.name !== "string" ||
    typeof value.full_name !== "string" ||
    typeof value.private !== "boolean"
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    full_name: value.full_name,
    private: value.private,
  };
}

function asRepoRemoval(value: unknown): {
  id: number;
  name: string;
  full_name: string;
} | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.name !== "string" ||
    typeof value.full_name !== "string"
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    full_name: value.full_name,
  };
}

http.route({
  path: "/github-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const event = req.headers.get("x-github-event");
    const deliveryId = req.headers.get("x-github-delivery");
    const webhookSecret = env.GITHUB_WEBHOOK_SECRET;

    if (webhookSecret) {
      const isValid = await verifyGitHubSignature(
        webhookSecret,
        signature,
        rawBody,
      );
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (!deliveryId || !event) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required GitHub headers (x-github-delivery or x-github-event)",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isRecord(payload)) {
      return new Response(
        JSON.stringify({ error: "Payload must be an object" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const action = readString(payload.action);
    const installation = isRecord(payload.installation)
      ? payload.installation
      : undefined;
    const repository = isRecord(payload.repository)
      ? payload.repository
      : undefined;
    const sender = isRecord(payload.sender) ? payload.sender : undefined;
    const installationId = readNumber(installation?.id);
    const githubRepositoryId = readNumber(repository?.id);
    const repositoryFullName = readString(repository?.full_name);
    const senderLogin = readString(sender?.login);

    if (event === "installation" && installationId) {
      if (action === "deleted") {
        await ctx.runMutation(internal.githubConnections.updateInstallationStatus, {
          installationId,
          status: "deleted",
        });
      } else if (action === "suspend") {
        await ctx.runMutation(internal.githubConnections.updateInstallationStatus, {
          installationId,
          status: "suspended",
        });
      } else if (action === "unsuspend") {
        await ctx.runMutation(internal.githubConnections.updateInstallationStatus, {
          installationId,
          status: "active",
        });
      }
    } else if (event === "installation_repositories" && installationId) {
      const added = Array.isArray(payload.repositories_added)
        ? payload.repositories_added.flatMap((item) => {
            const repo = asRepoChange(item);
            return repo ? [repo] : [];
          })
        : [];
      const removed = Array.isArray(payload.repositories_removed)
        ? payload.repositories_removed.flatMap((item) => {
            const repo = asRepoRemoval(item);
            return repo ? [repo] : [];
          })
        : [];
      await ctx.runMutation(
        internal.githubConnections.handleInstallationRepositoriesWebhook,
        {
          installationId,
          repositoriesAdded: added,
          repositoriesRemoved: removed,
        },
      );
    }

    const saved = await ctx.runMutation(internal.githubEvents.saveEvent, {
      deliveryId,
      event,
      action,
      repository: repositoryFullName,
      sender: senderLogin,
      payload,
      installationId,
      githubRepositoryId,
    });

    if (saved.status === "pending" || saved.status === "failed") {
      await ctx.scheduler.runAfter(0, internal.githubEvents.processEvent, {
        eventId: saved.eventId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: saved.isNew
          ? "Webhook received and scheduled for processing"
          : "Webhook delivery already recorded",
        eventId: saved.eventId,
        deliveryId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }),
});

export default http;
