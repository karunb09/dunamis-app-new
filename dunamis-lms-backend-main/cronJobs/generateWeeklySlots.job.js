const cron = require("node-cron");
const Slot = require("../model/slot.model");
const Teacher = require("../model/teacher.model");

// Run every Sunday at midnight
cron.schedule("0 0 * * 0", async () => {
  try {
    console.log("Generating recurring slots for next week...");

    const teachers = await Teacher.find().populate(
      "weeklyAvailability.courseId weeklyAvailability.branchId"
    );

    for (const teacher of teachers) {
      if (!teacher.weeklyAvailability?.length) continue;

      for (const avail of teacher.weeklyAvailability) {
        if (!Array.isArray(avail.days) || avail.days.length === 0) continue;

        const today = new Date();
        const baseNextWeekStart = new Date(today);
        // Set to next week’s Monday (week start)
        baseNextWeekStart.setDate(today.getDate() + 7 - today.getDay());
        baseNextWeekStart.setHours(0, 0, 0, 0);

        // Avoid duplicate slot creation for the same teacher & days
        const existing = await Slot.findOne({
          createdBy: teacher._id,
          parentAvailabilityId: avail._id,
          isRecurring: true,
          date: {
            $gte: baseNextWeekStart,
            $lt: new Date(baseNextWeekStart.getTime() + 7 * 86400000),
          },
        });

        if (existing) continue;

        // Create one slot document representing all recurring days
        await Slot.create({
          courseId: avail.courseId || null,
          branchId: avail.branchId || null,
          date: baseNextWeekStart,
          startTime: avail.startTime,
          endTime: avail.endTime,
          createdBy: teacher._id,
          slotType: avail.slotType,
          sessionType: avail.sessionType,
          recurringDays: avail.days,
          isRecurring: true,
          maxStudents:
            avail.maxStudents || (avail.sessionType === "standard" ? 4 : 1),
          parentAvailabilityId: avail._id,
        });
      }
    }

    console.log("Next week's recurring slots created successfully!");
  } catch (err) {
    console.error("Error generating recurring slots:", err.message);
  }
});
