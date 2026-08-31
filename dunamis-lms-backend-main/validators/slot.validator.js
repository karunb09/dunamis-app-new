const { z } = require("zod");
const { objectId, nonEmpty, meetingLink } = require("./common");

// Mirrors the controller's own required-field + enum checks, enforced at the
// boundary. looseObject lets teacherId / batchLabel / recurringDays / isRecurring
// and any other fields flow through to the (unchanged) controller logic.
const createSlotSchema = z.looseObject({
  courseId: objectId("courseId"),
  date: nonEmpty("date"),
  startTime: nonEmpty("startTime"),
  endTime: nonEmpty("endTime"),
  slotType: z.enum(["demo", "enrolled"], {
    error: "slotType must be 'demo' or 'enrolled'.",
  }),
  sessionType: z.enum(["standard", "premium"], {
    error: "sessionType must be 'standard' or 'premium'.",
  }),
  branchId: objectId("branchId").optional(),
  teacherId: objectId("teacherId").optional(),
});

const meetingLinkSchema = z.object({ meetingLink });

const parentAvailabilityParam = z.object({
  parentAvailabilityId: objectId("parentAvailabilityId"),
});

module.exports = { createSlotSchema, meetingLinkSchema, parentAvailabilityParam };
