const { z } = require("zod");
const { objectId } = require("./common");

const optionalId = (label) => objectId(label).nullish();

const chatContextSchema = z.object({
  courseId: optionalId("courseId"),
  cityId: optionalId("cityId"),
  branchId: optionalId("branchId"),
  instructorId: optionalId("instructorId"),
  categoryId: optionalId("categoryId"),
});

const chatActionSchema = chatContextSchema.extend({
  intent: z.string().trim().min(1).max(60),
  label: z.string().trim().max(80).nullish(),
  language: z.string().trim().max(30).nullish(),
  followIntent: z.string().trim().max(60).nullish(),
  reason: z.enum(["visitor", "completed", "restarted"]).nullish(),
  outcome: z.enum(["demo", "callback"]).nullish(),
});

const chatMessageSchema = z
  .object({
    conversationId: z.uuid().nullish(),
    text: z.string().trim().max(300, "Keep your message under 300 characters.").nullish(),
    action: chatActionSchema.nullish(),
    context: chatContextSchema.nullish(),
    pagePath: z.string().trim().max(200).nullish(),
  })
  .refine((data) => Boolean(data.text) || Boolean(data.action), {
    message: "Type a message.",
    path: ["text"],
  });

const chatFeedbackSchema = z.object({
  conversationId: z.uuid("Conversation not found."),
  turnId: objectId("turnId"),
  rating: z.enum(["up", "down"]),
  reason: z.enum(["wrong", "notUnderstood", "missingInfo", "other"]).nullish(),
  comment: z.string().trim().max(300, "Keep your comment under 300 characters.").nullish(),
});

const days = z.coerce.number().int().min(1).max(365).default(30);

const chatSummaryQuerySchema = z.object({ days });

const chatGroupsQuerySchema = z.object({
  kind: z.enum(["unanswered", "thumbsDown", "resolved"]).default("unanswered"),
  days,
  q: z.string().trim().max(100).nullish(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const chatResolveSchema = z.object({
  normalizedText: z.string().trim().min(1).max(300),
  kind: z.enum(["unanswered", "thumbsDown"]),
  status: z.enum(["resolved", "ignored"]),
  teachIntent: z.string().trim().max(60).nullish(),
  faqId: optionalId("faqId"),
  note: z.string().trim().max(300).nullish(),
});

module.exports = {
  chatMessageSchema,
  chatFeedbackSchema,
  chatSummaryQuerySchema,
  chatGroupsQuerySchema,
  chatResolveSchema,
};
