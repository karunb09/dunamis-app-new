const { z } = require("zod");
const { objectId } = require("./common");

const resolveConversationSchema = z.object({
  courseId: objectId("courseId"),
  // Whichever side the caller is not — the controller fills in their own id.
  studentId: objectId("studentId").nullish(),
  teacherId: objectId("teacherId").nullish(),
});

const sendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Type a message first.")
    .max(2000, "Messages are limited to 2000 characters."),
});

const listMessagesQuerySchema = z.object({
  before: z.coerce.date().nullish(),
  limit: z.coerce.number().int().min(1).max(100).nullish(),
});

module.exports = {
  resolveConversationSchema,
  sendMessageSchema,
  listMessagesQuerySchema,
};
