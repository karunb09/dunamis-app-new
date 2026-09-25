const { z } = require("zod");

const reviewScheduleChangeSchema = z.looseObject({
  status: z.enum(["approved", "rejected"], {
    error: "status must be 'approved' or 'rejected'.",
  }),
  adminNote: z
    .string()
    .trim()
    .max(1000, "Note must be 1000 characters or fewer.")
    .nullish(),
});

module.exports = { reviewScheduleChangeSchema };
