const { z } = require("zod");
const { objectId, nonEmpty } = require("./common");

// looseObject: unknown keys pass through untouched so controllers that read
// extra/optional fields keep working — validation only enforces the declared
// money/identity fields at the boundary.

const createOrderSchema = z.looseObject({
  courseId: objectId("courseId"),
  teacherId: objectId("teacherId"),
  slotId: objectId("slotId"),
  sessionType: nonEmpty("sessionType"),
  planType: z.string().trim().optional(),
  planMonths: z.coerce.number().int().positive().optional(),
  deliveryMode: z.string().trim().optional(),
  branchId: objectId("branchId").optional(),
});

// Payment verification accepts any of the three order-id aliases the
// controller checks; require at least one.
const verifyPaymentSchema = z
  .looseObject({
    cashfree_order_id: z.string().trim().optional(),
    order_id: z.string().trim().optional(),
    merchantOrderId: z.string().trim().optional(),
  })
  .refine(
    (d) => d.cashfree_order_id || d.order_id || d.merchantOrderId,
    { message: "A Cashfree order ID is required.", path: ["cashfree_order_id"] }
  );

const nextInstallmentSchema = z.looseObject({
  courseId: objectId("courseId"),
  slotId: objectId("slotId").optional(),
  sessionType: z.string().trim().optional(),
});

module.exports = {
  createOrderSchema,
  verifyPaymentSchema,
  nextInstallmentSchema,
};
