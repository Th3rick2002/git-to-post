/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents_postWriter from "../agents/postWriter.js";
import type * as auth from "../auth.js";
import type * as githubConnections from "../githubConnections.js";
import type * as githubEvents from "../githubEvents.js";
import type * as http from "../http.js";
import type * as lib_githubEvent from "../lib/githubEvent.js";
import type * as lib_githubIdentity from "../lib/githubIdentity.js";
import type * as lib_owner from "../lib/owner.js";
import type * as postGeneration from "../postGeneration.js";
import type * as postGenerationActions from "../postGenerationActions.js";
import type * as postGenerationWorkflow from "../postGenerationWorkflow.js";
import type * as repoSettings from "../repoSettings.js";
import type * as tasks from "../tasks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agents/postWriter": typeof agents_postWriter;
  auth: typeof auth;
  githubConnections: typeof githubConnections;
  githubEvents: typeof githubEvents;
  http: typeof http;
  "lib/githubEvent": typeof lib_githubEvent;
  "lib/githubIdentity": typeof lib_githubIdentity;
  "lib/owner": typeof lib_owner;
  postGeneration: typeof postGeneration;
  postGenerationActions: typeof postGenerationActions;
  postGenerationWorkflow: typeof postGenerationWorkflow;
  repoSettings: typeof repoSettings;
  tasks: typeof tasks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};
