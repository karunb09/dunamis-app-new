const { z } = require("zod");
const { objectId } = require("./common");

// Public/optional-auth demo booking (POST /demoBookings). Reject malformed ids
// at the boundary (Slot.findById(badId) would otherwise throw a 500). lead and
// any other fields pass through to the unchanged controller.
const bookDemoSchema = z.looseObject({
  courseId: objectId("courseId"),
  slotId: objectId("slotId"),
  teacherId: objectId("teacherId").optional(),
  branchId: objectId("branchId").optional(),
  deliveryMode: z.string().trim().optional(),
  lead: z.object({}).loose().optional(),
});

module.exports = { bookDemoSchema };
