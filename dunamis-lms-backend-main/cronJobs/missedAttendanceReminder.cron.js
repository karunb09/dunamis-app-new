const { scheduleWithHeartbeat } = require("../utils/cronHeartbeat");
const Slot = require("../model/slot.model");
const AttendanceHomework = require("../model/attendanceHomework.model");
const Teacher = require("../model/teacher.model");
const { notifyEvent } = require("../utils/notificationService");
const { loadRoutingDirectory } = require("../services/staffRouting");

async function checkMissedAttendance() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find enrolled slots from the past 7 days that haven't been notified yet
    // and have at least one enrolled student
    const slots = await Slot.find({
      slotType: "enrolled",
      date: { $gte: sevenDaysAgo, $lt: todayStart },
      attendanceNotifiedAt: null,
      "students.0": { $exists: true },
    })
      .populate("courseId", "name")
      .lean();

    if (!slots.length) {
      console.log("[MissedAttendance] No unnotified past slots found.");
      return;
    }

    const directory = await loadRoutingDirectory();

    await Promise.allSettled(
      slots.map(async (slot) => {
        try {
          // Check if any attendance was submitted for this slot
          const submittedCount = await AttendanceHomework.countDocuments({
            slotId: slot._id,
          });

          if (submittedCount > 0) {
            // Attendance exists — mark as notified so we don't recheck
            await Slot.findByIdAndUpdate(slot._id, {
              attendanceNotifiedAt: new Date(),
            });
            return;
          }

          // No attendance submitted — get the instructor's user details
          const teacher = await Teacher.findById(slot.createdBy)
            .populate("userId", "name email _id")
            .lean();

          const teacherName = teacher?.userId?.name
            ? `${teacher.userId.name.firstName} ${teacher.userId.name.lastName}`.trim()
            : "The instructor";
          const teacherUser = teacher?.userId
            ? { _id: teacher.userId._id, email: teacher.userId.email }
            : null;

          const courseName = slot.courseId?.name || "a course";
          const classDay = slot.date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
          const title = "Attendance & homework not marked";

          await notifyEvent({
            event: "missedAttendance",
            context: slot.branchId ? { branchId: slot.branchId } : { courseId: slot.courseId?._id },
            directory,
            instructorUser: teacherUser,
            title,
            message: `${teacherName} hasn't marked attendance or homework for ${courseName} on ${classDay} (${slot.startTime}–${slot.endTime}).`,
            instructorTitle: title,
            instructorMessage: `You haven't marked attendance and homework for ${courseName} on ${classDay}. Please update it on the dashboard.`,
          });

          // Mark slot as notified to prevent duplicate reminders
          await Slot.findByIdAndUpdate(slot._id, {
            attendanceNotifiedAt: new Date(),
          });

          console.log(
            `[MissedAttendance] Notified for slot ${slot._id} (${courseName} on ${slot.date.toISOString().slice(0, 10)})`
          );
        } catch (err) {
          console.error(`[MissedAttendance] Error processing slot ${slot._id}:`, err.message);
        }
      })
    );

    console.log(`[MissedAttendance] Processed ${slots.length} slot(s).`);
  } catch (err) {
    console.error("[MissedAttendance] Fatal error:", err.message);
  }
}

// 9:00 AM IST = 03:30 UTC
scheduleWithHeartbeat("missedAttendanceReminder", "30 3 * * *", checkMissedAttendance);

module.exports = { checkMissedAttendance };
