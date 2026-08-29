import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  DEFAULT_GENERATION_POLICY,
  normalizeGitHubEvent,
} from "../convex/lib/githubEvent";

const enabledPushPolicy = {
  ...DEFAULT_GENERATION_POLICY,
  generateOnPush: true,
};

const enabledTagCreatePolicy = {
  ...DEFAULT_GENERATION_POLICY,
  generateOnTagCreate: true,
};

describe("normalizeGitHubEvent", () => {
  test("skips a branch push when generateOnPush is off", () => {
    const result = normalizeGitHubEvent(
      {
        deliveryId: "delivery-push",
        event: "push",
        repository: "publicadev/demo",
        payload: {
          ref: "refs/heads/main",
          before: "a".repeat(40),
          after: "b".repeat(40),
          commits: [{ message: "Improve diff parser" }],
        },
      },
      { ...DEFAULT_GENERATION_POLICY, generateOnPush: false },
    );
    assert.equal(result.kind, "skip");
    if (result.kind === "skip") {
      assert.equal(result.reason, "Branch push generation is disabled.");
    }
  });

  test("turns a branch push into a unique generation context when enabled", () => {
    const result = normalizeGitHubEvent(
      {
        deliveryId: "delivery-push",
        event: "push",
        repository: "publicadev/demo",
        payload: {
          ref: "refs/heads/main",
          before: "a".repeat(40),
          after: "b".repeat(40),
          commits: [{ message: "Improve diff parser" }],
        },
      },
      enabledPushPolicy,
    );
    assert.equal(result.kind, "generate");
    if (result.kind === "generate") {
      assert.equal(result.context.trigger, "push");
      assert.equal(
        result.context.changeKey,
        `push:publicadev/demo:${"b".repeat(40)}`,
      );
    }
  });

  test("accepts merged pull requests and ignores unmerged ones", () => {
    const merged = normalizeGitHubEvent({
      deliveryId: "delivery-pr",
      event: "pull_request",
      action: "closed",
      repository: "publicadev/demo",
      payload: {
        number: 42,
        pull_request: {
          merged: true,
          title: "Ship structured generation",
          merge_commit_sha: "c".repeat(40),
          base: { sha: "a".repeat(40) },
          head: { sha: "b".repeat(40) },
        },
      },
    });
    assert.equal(merged.kind, "generate");

    const unmerged = normalizeGitHubEvent({
      deliveryId: "delivery-pr-2",
      event: "pull_request",
      action: "closed",
      repository: "publicadev/demo",
      payload: { number: 43, pull_request: { merged: false } },
    });
    assert.deepEqual(unmerged, {
      kind: "skip",
      reason: "Pull request was not merged.",
    });
  });

  test("deduplicates release and tag events through the same change key", () => {
    const release = normalizeGitHubEvent({
      deliveryId: "delivery-release",
      event: "release",
      action: "published",
      repository: "publicadev/demo",
      payload: { release: { tag_name: "v1.2.0", name: "Version 1.2" } },
    });
    const tag = normalizeGitHubEvent(
      {
        deliveryId: "delivery-tag",
        event: "create",
        repository: "publicadev/demo",
        payload: { ref_type: "tag", ref: "v1.2.0" },
      },
      enabledTagCreatePolicy,
    );
    assert.equal(release.kind, "generate");
    assert.equal(tag.kind, "generate");
    if (release.kind === "generate" && tag.kind === "generate") {
      assert.equal(release.context.changeKey, tag.context.changeKey);
      assert.equal(release.context.changeKey, "version:publicadev/demo:1.2.0");
    }
  });

  test("uses the same change key for 1.2.0 and v1.2.0", () => {
    const release = normalizeGitHubEvent({
      deliveryId: "delivery-release-plain",
      event: "release",
      action: "published",
      repository: "publicadev/demo",
      payload: { release: { tag_name: "1.2.0" } },
    });
    const tagPush = normalizeGitHubEvent({
      deliveryId: "delivery-tag-push",
      event: "push",
      repository: "publicadev/demo",
      payload: {
        ref: "refs/tags/v1.2.0",
        before: "a".repeat(40),
        after: "b".repeat(40),
        commits: [{ message: "Release v1.2.0" }],
      },
    });
    assert.equal(release.kind, "generate");
    assert.equal(tagPush.kind, "generate");
    if (release.kind === "generate" && tagPush.kind === "generate") {
      assert.equal(release.context.changeKey, tagPush.context.changeKey);
    }
  });

  test("skips tag creation when generateOnTagCreate is off", () => {
    const result = normalizeGitHubEvent(
      {
        deliveryId: "delivery-tag-off",
        event: "create",
        repository: "publicadev/demo",
        payload: { ref_type: "tag", ref: "v1.2.0" },
      },
      { ...DEFAULT_GENERATION_POLICY, generateOnTagCreate: false },
    );
    assert.equal(result.kind, "skip");
    if (result.kind === "skip") {
      assert.equal(result.reason, "Tag creation generation is disabled.");
    }
  });

  test("does not generate a post for branch creation", () => {
    const result = normalizeGitHubEvent({
      deliveryId: "delivery-branch",
      event: "create",
      repository: "publicadev/demo",
      payload: { ref_type: "branch", ref: "feature/demo" },
    });
    assert.equal(result.kind, "skip");
  });
});
