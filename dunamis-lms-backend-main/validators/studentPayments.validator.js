const { z } = require("zod");
const { objectId } = require("./common");

// .nullish() throughout: the portal sends explicit nulls for the optional
// enrollment discriminators, and .optional() alone rejects null.
const installmentOrderSchema = z.looseObject({
  courseId: objectId("courseId"),
  slotId: objectId("slotId").nullish(),
  sessionType: z.enum(["standard", "premium"]).nullish(),
});

const clientEventSchema = z.object({
  type: z.enum(["checkout_opened", "checkout_dismissed"]),
});

module.exports = { installmentOrderSchema, clientEventSchema };
