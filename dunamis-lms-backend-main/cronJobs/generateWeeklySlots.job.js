const cron = require("node-cron");
const Teacher = require("../model/teacher.model");
const {
  syncTeacherAvailabilitySlots,
  startOfDay,
  endOfDay,
  addDays,
} = require("../utils/syncAvailabilitySlots");

// Run every Sunday at midnight
cron.schedule("0 0 * * 0", async () => {
  try {
    console.log("Generating recurring slots for next week...");

    const teachers = await Teacher.find().populate(
      "weeklyAvailability.courseId weeklyAvailability.branchId"
    );

    for (const teacher of teachers) {
      if (!teacher.weeklyAvailability?.length) continue;
      const today = new Date();
      const daysUntilNextMonday = ((8 - today.getDay()) % 7) || 7;
      const nextWeekStart = startOfDay(addDays(today, daysUntilNextMonday));
      const nextWeekEnd = endOfDay(addDays(nextWeekStart, 6));

      await syncTeacherAvailabilitySlots({
        teacher,
        rangeStart: nextWeekStart,
        rangeEnd: nextWeekEnd,
      });
    }

    console.log("Next week's recurring slots created successfully!");
  } catch (err) {
    console.error("Error generating recurring slots:", err.message);
  }
});
