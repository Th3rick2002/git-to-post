import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth);

/**
 * Verifies HMAC-SHA256 signature from GitHub using Web Crypto API.
 */
async function verifyGitHubSignature(
  secret: string,
  signatureHeader: string | null,
  rawBody: string
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
    ["sign"]
  );
  const calculatedSigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody)
  );
  const calculatedSigArray = Array.from(new Uint8Array(calculatedSigBuffer));
  const calculatedSigHex = calculatedSigArray
    .map((b) => b.toString(16).padStart(2, "0"))
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

http.route({
  path: "/github-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const event = req.headers.get("x-github-event");
    const deliveryId = req.headers.get("x-github-delivery");

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    // Verify HMAC-SHA256 signature
    if (webhookSecret) {
      const isValid = await verifyGitHubSignature(webhookSecret, signature, rawBody);
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
          error: "Missing required GitHub headers (x-github-delivery or x-github-event)",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (typeof parsedBody !== "object" || parsedBody === null) {
      return new Response(JSON.stringify({ error: "Payload must be an object" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = parsedBody as Record<string, unknown>;
    const action = typeof payload.action === "string" ? payload.action : undefined;

    const installationObj =
      typeof payload.installation === "object" && payload.installation !== null
        ? (payload.installation as { id?: number })
        : undefined;
    const installationId = typeof installationObj?.id === "number" ? installationObj.id : undefined;

    const repositoryObj =
      typeof payload.repository === "object" && payload.repository !== null
        ? (payload.repository as { id?: number; full_name?: string })
        : undefined;
    const repositoryId = typeof repositoryObj?.id === "number" ? repositoryObj.id : undefined;
    const repositoryFullName = typeof repositoryObj?.full_name === "string" ? repositoryObj.full_name : undefined;

    const senderObj =
      typeof payload.sender === "object" && payload.sender !== null
        ? (payload.sender as { login?: string })
        : undefined;
    const senderLogin = typeof senderObj?.login === "string" ? senderObj.login : undefined;

    // Handle Lifecycle Events
    if (event === "installation" && installationId) {
      if (action === "created") {
        const account =
          typeof payload.account === "object" && payload.account !== null
            ? (payload.account as { id?: number; login?: string; type?: string })
            : undefined;
        const repos = Array.isArray(payload.repositories)
          ? (payload.repositories as Array<{ id: number; name: string; full_name: string; private: boolean }>)
          : [];
        await ctx.runMutation(internal.githubConnections.handleInstallationCreatedWebhook, {
          installationId,
          accountId: account?.id || 0,
          accountLogin: account?.login || senderLogin || "unknown",
          accountType: account?.type || "User",
          repositorySelection:
            typeof payload.repository_selection === "string"
              ? payload.repository_selection
              : "selected",
          repositories: repos,
        });
      } else if (action === "deleted") {
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
        ? (payload.repositories_added as Array<{ id: number; name: string; full_name: string; private: boolean }>)
        : [];
      const removed = Array.isArray(payload.repositories_removed)
        ? (payload.repositories_removed as Array<{ id: number; name: string; full_name: string }>)
        : [];

      await ctx.runMutation(internal.githubConnections.handleInstallationRepositoriesWebhook, {
        installationId,
        repositoriesAdded: added,
        repositoriesRemoved: removed,
      });
    }

    // Save and schedule general events (push, pull_request, release, issues, etc.)
    const eventId = await ctx.runMutation(internal.githubEvents.saveEvent, {
      deliveryId,
      event,
      action,
      repository: repositoryFullName,
      sender: senderLogin,
      payload,
      installationId,
      githubRepositoryId: repositoryId,
    });

    await ctx.scheduler.runAfter(0, internal.githubEvents.processEvent, {
      eventId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook received",
        eventId,
        deliveryId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

export default http;
