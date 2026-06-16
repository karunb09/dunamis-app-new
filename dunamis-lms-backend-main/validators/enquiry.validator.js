const { z } = require("zod");
const { email, nonEmpty } = require("./common");

// Public website contact form (POST /enquiry/create, no auth) — a prime
// external-input surface. Mirrors the controller's own field rules.
const createEnquirySchema = z.looseObject({
  name: nonEmpty("Name"),
  email,
  subject: z
    .string({ error: "Subject is required." })
    .trim()
    .min(3, "Subject must be at least 3 characters"),
  message: z
    .string({ error: "Message is required." })
    .trim()
    .min(10, "Message must be at least 10 characters"),
});

module.exports = { createEnquirySchema };
