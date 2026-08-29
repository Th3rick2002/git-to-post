import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.optional(v.boolean()),
  }),

  githubEvents: defineTable({
    deliveryId: v.string(),
    event: v.string(),
    action: v.optional(v.string()),
    repository: v.optional(v.string()),
    sender: v.optional(v.string()),
    payload: v.any(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    processedAt: v.optional(v.number()),
  })
    .index("by_delivery_id", ["deliveryId"])
    .index("by_status", ["status"])
    .index("by_event", ["event"]),
});
