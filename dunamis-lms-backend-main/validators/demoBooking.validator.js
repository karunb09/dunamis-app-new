const { z } = require("zod");
const { objectId, meetingLink } = require("./common");

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

const updateBookingSchema = z.object({
  demoStatus: z
    .enum(["Booked", "Rescheduled", "Cancelled", "Attended", "Missed"])
    .nullish(),
  enrollmentStatus: z.enum(["Enrolled", "Not Enrolled"]).nullish(),
  followUp: z.enum(["Pending", "Contacted", "Closed"]).nullish(),
  response: z.string().nullish(),
  meetingLink: meetingLink.nullish(),
});

// Deliberately not an extension of updateBookingSchema: rescheduling moves the
// booking, it does not patch status fields, and mixing the two would let a
// caller set demoStatus by hand and skip the audit row.
const rescheduleBookingSchema = z.object({
  slotId: objectId("slotId"),
  teacherId: objectId("teacherId").nullish(),
  reason: z.string().trim().max(500).nullish(),
});

const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).nullish(),
});

module.exports = {
  bookDemoSchema,
  updateBookingSchema,
  rescheduleBookingSchema,
  cancelBookingSchema,
};
