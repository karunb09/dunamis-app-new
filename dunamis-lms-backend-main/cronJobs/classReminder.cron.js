const cron = require("node-cron");
const Slot = require("../model/slot.model");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model");
const {
  notifyEvent,
  createDashboardNotice,
} = require("../utils/notificationService");

const formatSlotDate = (date) =>
  date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });

async function sendClassReminders() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const slots = await Slot.find({
      slotType: "enrolled",
      date: { $gte: todayStart, $lte: todayEnd },
      classReminderSentAt: null,
      "students.0": { $exists: true },
    })
      .populate("courseId", "name")
      .lean();

    if (!slots.length) {
      console.log("[ClassReminder] No classes to remind today.");
      return;
    }

    await Promise.allSettled(
      slots.map(async (slot) => {
        try {
          const [teacher, students] = await Promise.all([
            Teacher.findById(slot.createdBy)
              .populate("userId", "name email _id")
              .lean(),
            Student.find({ _id: { $in: slot.students } })
              .select("userId")
              .lean(),
          ]);

          const teacherName = teacher?.userId?.name
            ? `${teacher.userId.name.firstName} ${teacher.userId.name.lastName}`.trim()
            : "The instructor";
          const courseName = slot.courseId?.name || "a course";
          const timeText = `${slot.startTime} – ${slot.endTime}`;

          await notifyEvent({
            event: "classReminder",
            instructorUser: teacher?.userId,
            title: "Class reminder",
            message: `${teacherName} has a ${courseName} class today (${formatSlotDate(slot.date)}) at ${timeText} with ${slot.students.length} student(s).`,
          });

          const studentUserIds = students.map((s) => s.userId).filter(Boolean);
          if (studentUserIds.length) {
            await createDashboardNotice({
              title: "Class reminder",
              message: `Your ${courseName} class is today at ${timeText}.`,
              userIds: studentUserIds,
              contentType: "Reminder",
            });
          }

          await Slot.findByIdAndUpdate(slot._id, {
            classReminderSentAt: new Date(),
          });
        } catch (err) {
          console.error(`[ClassReminder] Error processing slot ${slot._id}:`, err.message);
        }
      })
    );

    console.log(`[ClassReminder] Processed ${slots.length} slot(s).`);
  } catch (err) {
    console.error("[ClassReminder] Fatal error:", err.message);
  }
}

// 8:00 AM IST = 02:30 UTC
cron.schedule("30 2 * * *", sendClassReminders, {
  timezone: "UTC",
});

module.exports = { sendClassReminders };
