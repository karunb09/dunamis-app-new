const { z } = require("zod");
const { objectId } = require("./common");

const PAYMENT_STATUSES = [
  "created",
  "pending",
  "paid",
  "paid_pending_fulfillment",
  "fulfilled",
  "failed",
  "dropped",
  "expired",
  "refunded",
];

const boolish = z
  .union([z.boolean(), z.string()])
  .transform((v) => v === true || v === "true")
  .nullish();

// Comma-separated enum list, e.g. ?status=paid,fulfilled
const csvEnum = (values, label) =>
  z
    .string()
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .refine((arr) => arr.every((s) => values.includes(s)), `Invalid ${label}.`)
    .nullish();

const needsAttentionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).nullish(),
  limit: z.coerce.number().int().min(1).nullish(),
  // When false (default) only money-at-risk rows are returned; abandoned
  // checkouts would otherwise drown the signal.
  includeAbandoned: boolish,
});

const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).nullish(),
  limit: z.coerce.number().int().min(1).nullish(),
  status: csvEnum(PAYMENT_STATUSES, "status"),
  gateway: z.enum(["cashfree", "manual"]).nullish(),
  deliveryMode: z.enum(["online", "offline"]).nullish(),
  paymentType: z.enum(["Full", "Installment"]).nullish(),
  courseId: objectId("courseId").nullish(),
  branchId: objectId("branchId").nullish(),
  studentId: objectId("studentId").nullish(),
  teacherId: objectId("teacherId").nullish(),
  // Kept as YYYY-MM-DD, not coerced to a Date: these are IST calendar days and
  // the controller converts them to the correct UTC instants. z.coerce.date()
  // would parse them as UTC midnight and shift the window by 5h30m.
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateFrom must be YYYY-MM-DD.")
    .nullish(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateTo must be YYYY-MM-DD.")
    .nullish(),
  // `recognized` = paidAt with a createdAt fallback, matching how the insights
  // report buckets revenue.
  dateField: z.enum(["createdAt", "paidAt", "recognized"]).nullish(),
  search: z.string().trim().min(1).nullish(),
  sort: z.enum(["createdAt", "paidAt", "amount"]).nullish(),
  dir: z.enum(["asc", "desc"]).nullish(),
});

const duesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).nullish(),
  limit: z.coerce.number().int().min(1).nullish(),
  bucket: z.enum(["0-7", "8-30", "30+"]).nullish(),
  branchId: objectId("branchId").nullish(),
  courseId: objectId("courseId").nullish(),
  studentId: objectId("studentId").nullish(),
  minDaysLate: z.coerce.number().int().min(0).nullish(),
});

module.exports = {
  PAYMENT_STATUSES,
  needsAttentionQuerySchema,
  listPaymentsQuerySchema,
  duesQuerySchema,
};
