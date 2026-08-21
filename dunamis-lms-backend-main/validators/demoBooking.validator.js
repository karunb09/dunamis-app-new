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

// Empty string clears a shared link; anything else must be an https URL so the
// value is safe to render as an anchor href in emails and dashboards.
const meetingLink = z
  .string()
  .trim()
  .max(500, "Meeting link must be 500 characters or fewer.")
  .refine(
    (value) => value === "" || /^https:\/\/\S+$/.test(value),
    "Meeting link must be a valid https:// URL."
  );

const updateBookingSchema = z.object({
  demoStatus: z
    .enum(["Booked", "Rescheduled", "Cancelled", "Attended", "Missed"])
    .nullish(),
  enrollmentStatus: z.enum(["Enrolled", "Not Enrolled"]).nullish(),
  followUp: z.enum(["Pending", "Contacted", "Closed"]).nullish(),
  response: z.string().nullish(),
  meetingLink: meetingLink.nullish(),
});

module.exports = { bookDemoSchema, updateBookingSchema };
