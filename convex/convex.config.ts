import agent from "@convex-dev/agent/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    GITHUB_APP_ID: v.optional(v.string()),
    GITHUB_APP_PRIVATE_KEY: v.optional(v.string()),
    GITHUB_TOKEN: v.optional(v.string()),
    GITHUB_WEBHOOK_SECRET: v.optional(v.string()),
    OPENROUTER_API_KEY: v.optional(v.string()),
    OPENROUTER_APP_NAME: v.optional(v.string()),
    OPENROUTER_IMAGE_MODEL: v.optional(v.string()),
    OPENROUTER_SITE_URL: v.optional(v.string()),
    OPENROUTER_TEXT_MODEL: v.optional(v.string()),
  },
});

app.use(agent);
app.use(workflow);

export default app;
