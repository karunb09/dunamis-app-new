const { z } = require("zod");
const { objectId } = require("./common");

const monthKey = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM.");

const rateBodySchema = z.object({
  categoryId: objectId("categoryId"),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  sessionType: z.enum(["standard", "premium"]),
  ratePerLearnerMonth: z.coerce.number().min(0),
  sessionsPerMonth: z.coerce.number().int().min(1).nullish(),
  isActive: z.boolean().nullish(),
});

const rateUpdateSchema = rateBodySchema.partial();

const payConfigSchema = z.object({
  demoConversionAmount: z.coerce.number().min(0).nullish(),
  defaultSessionsPerMonth: z.coerce.number().int().min(1).nullish(),
  payDueDayOfMonth: z.coerce.number().int().min(1).max(28).nullish(),
});

const generatePayoutSchema = z.object({
  month: monthKey,
  teacherId: objectId("teacherId").nullish(),
});

const previewQuerySchema = z.object({
  month: monthKey,
  teacherId: objectId("teacherId"),
});

const payoutListQuerySchema = z.object({
  month: monthKey,
  // "draft" = generated but not yet approved.
  status: z.enum(["draft", "approved", "paid"]).nullish(),
});

const adjustmentsSchema = z.object({
  adjustments: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Adjustment label is required.").max(80),
        amount: z.coerce.number(),
      })
    )
    .max(20),
});

const payStatusSchema = z.object({
  payStatus: z.enum(["Due", "Paid"]),
  transactionId: z.string().trim().max(120).nullish(),
});

module.exports = {
  rateBodySchema,
  rateUpdateSchema,
  payConfigSchema,
  generatePayoutSchema,
  previewQuerySchema,
  payoutListQuerySchema,
  adjustmentsSchema,
  payStatusSchema,
};
