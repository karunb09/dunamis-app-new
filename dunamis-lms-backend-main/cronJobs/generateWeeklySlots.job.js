const cron = require("node-cron");
const Teacher = require("../model/teacher.model");
const { syncTeacherAvailabilitySlots } = require("../utils/syncAvailabilitySlots");
const { rollingRange } = require("../utils/classRoster");

// Every Sunday at midnight: keep a rolling window of recurring slots generated
// ahead of today. syncTeacherAvailabilitySlots also populates each generated
// slot's students from the class roster, so enrolled students carry forward.
cron.schedule("0 0 * * 0", async () => {
  try {
    console.log("Generating rolling-window recurring slots...");

    const teachers = await Teacher.find().populate(
      "weeklyAvailability.courseId weeklyAvailability.branchId"
    );

    const { rangeStart, rangeEnd } = rollingRange();

    for (const teacher of teachers) {
      if (!teacher.weeklyAvailability?.length) continue;
      await syncTeacherAvailabilitySlots({ teacher, rangeStart, rangeEnd });
    }

    console.log("Rolling-window recurring slots generated successfully!");
  } catch (err) {
    console.error("Error generating recurring slots:", err.message);
  }
});
