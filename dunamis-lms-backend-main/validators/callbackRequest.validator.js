const { z } = require("zod");
const { objectId, nonEmpty } = require("./common");

// Public website "Request a Callback" form (POST /callback-request/create, no auth).
const createCallbackRequestSchema = z.looseObject({
  courseId: objectId("courseId"),
  name: nonEmpty("Name"),
  phone: z
    .string({ error: "Phone number is required." })
    .trim()
    .min(6, "Enter a valid phone number."),
  preferredTime: z.string().trim().optional(),
});

const updateCallbackRequestSchema = z.object({
  status: z.enum(["new", "contacted", "closed"]),
});

module.exports = { createCallbackRequestSchema, updateCallbackRequestSchema };
