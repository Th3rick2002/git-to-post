import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

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

  // Constant-time comparison to prevent timing attacks
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

    // If a secret is set in Convex environment variables, verify the signature
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
        JSON.stringify({ error: "Missing required GitHub headers (x-github-delivery or x-github-event)" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Save event in database
    const eventId = await ctx.runMutation(internal.githubEvents.saveEvent, {
      deliveryId,
      event,
      action: payload.action,
      repository: payload.repository?.full_name,
      sender: payload.sender?.login,
      payload,
    });

    // Schedule background processing
    await ctx.scheduler.runAfter(0, internal.githubEvents.processEvent, {
      eventId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook received and scheduled for processing",
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
