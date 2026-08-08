const { z } = require("zod");
const { objectId, nonEmpty } = require("./common");

// looseObject: unknown keys pass through untouched so controllers that read
// extra/optional fields keep working — validation only enforces the declared
// money/identity fields at the boundary.

// Optional fields use .nullish(): the website sends explicit nulls
// (branchId: null on every online enrollment), and .optional() alone
// rejects null — which 400'd all online create-order calls.
const createOrderSchema = z.looseObject({
  courseId: objectId("courseId"),
  teacherId: objectId("teacherId"),
  slotId: objectId("slotId"),
  sessionType: nonEmpty("sessionType"),
  planType: z.string().trim().nullish(),
  planMonths: z.coerce.number().int().positive().nullish(),
  deliveryMode: z.string().trim().nullish(),
  branchId: objectId("branchId").nullish(),
  referralCode: z.string().trim().nullish(),
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

module.exports = {
  createOrderSchema,
  verifyPaymentSchema,
};
