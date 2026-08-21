const { z } = require("zod");
const { objectId } = require("./common");

const dailyAttendanceQuerySchema = z.object({
  // Kept as YYYY-MM-DD, not coerced to a Date: this is an IST calendar day and
  // the service converts it. z.coerce.date() would parse it as UTC midnight and
  // shift the window by 5h30m.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD.")
    .nullish(),
  teacherId: objectId("teacherId").nullish(),
  courseId: objectId("courseId").nullish(),
});

module.exports = { dailyAttendanceQuerySchema };
