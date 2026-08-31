const { scheduleWithHeartbeat } = require("../utils/cronHeartbeat");
const Slot = require("../model/slot.model");
const ClassRoster = require("../model/classRoster.model");
const DemoBooking = require("../model/demoBooking.model");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model");
const mailSender = require("../utils/mailSender");
const { classJoinLinkEmailTemplate } = require("../mail/classJoinLinkEmail");
const { resolveSlotJoinLink } = require("../utils/meetingLink");
const { slotStartInstant, minutesUntilSlot } = require("../utils/slotTime");
const { notifyEvent, createDashboardNotice } = require("../utils/notificationService");

// The cron ticks every 5 minutes, so the window has to be at least one tick
// wide or a class would slip between runs. 15 is the promise; 20 the ceiling.
const LEAD_MINUTES = 15;
const WINDOW_MINUTES = 20;

// Slot.date is a midnight Date and startTime a string, so minute precision
// cannot be expressed in the Mongo query. Pull a generous day either side and
// let slotStartInstant do the exact filtering in JS.
const coarseDateWindow = (now) => ({
  $gte: new Date(now.getTime() - 36 * 60 * 60 * 1000),
  $lte: new Date(now.getTime() + 36 * 60 * 60 * 1000),
});

const isStartingSoon = (slot, now) => {
  const minutes = minutesUntilSlot(slot, now);
  return minutes >= 0 && minutes <= WINDOW_MINUTES;
};

const teacherName = (teacher) =>
  teacher?.userId?.name
    ? `${teacher.userId.name.firstName || ""} ${teacher.userId.name.lastName || ""}`.trim()
    : "Your instructor";

const studentName = (student) =>
  student?.userId?.name
    ? `${student.userId.name.firstName || ""} ${student.userId.name.lastName || ""}`.trim()
    : "there";

async function remindEnrolledClasses(now) {
  const candidates = await Slot.find({
    slotType: "enrolled",
    date: coarseDateWindow(now),
    joinLinkNotifiedAt: null,
    "students.0": { $exists: true },
  })
    .populate("courseId", "name")
    .lean();

  const slots = candidates.filter((slot) => isStartingSoon(slot, now));
  if (!slots.length) return 0;

  await Promise.allSettled(
    slots.map(async (slot) => {
      const roster = slot.parentAvailabilityId
        ? await ClassRoster.findOne({ parentAvailabilityId: slot.parentAvailabilityId })
            .select("meetingLink")
            .lean()
        : null;

      const link = resolveSlotJoinLink(slot, roster);
      const teacher = await Teacher.findById(slot.createdBy)
        .populate("userId", "name email _id")
        .lean();
      const courseName = slot.courseId?.name || "your course";

      // Stamped whether or not a link existed: a second nag five minutes later
      // helps nobody, and the instructor has already been told.
      const stamp = () =>
        Slot.findByIdAndUpdate(slot._id, { joinLinkNotifiedAt: new Date() });

      if (!link) {
        await notifyEvent({
          event: "classJoinLink",
          instructorUser: teacher?.userId,
          title: "No join link set",
          message: `Your ${courseName} class at ${slot.startTime} starts in ${LEAD_MINUTES} minutes and has no join link. Add one so the students can join.`,
        });
        await stamp();
        return;
      }

      const students = await Student.find({ _id: { $in: slot.students } })
        .populate("userId", "name email _id")
        .lean();

      await Promise.allSettled(
        students
          .filter((student) => student.userId?.email)
          .map((student) => {
            const { subject, html, attachments } = classJoinLinkEmailTemplate({
              studentName: studentName(student),
              courseName,
              instructorName: teacherName(teacher),
              slot,
              meetingLink: link,
            });
            return mailSender(student.userId.email, subject, html, attachments);
          })
      );

      await createDashboardNotice({
        title: "Your class starts in 15 minutes",
        message: `Join your ${courseName} class (${slot.startTime} – ${slot.endTime}) here: ${link}`,
        userIds: students.map((student) => student.userId?._id).filter(Boolean),
        contentType: "Reminder",
      });

      await stamp();
    })
  );

  return slots.length;
}

async function remindDemoClasses(now) {
  const bookings = await DemoBooking.find({
    demoStatus: { $in: ["Booked", "Rescheduled"] },
    meetingLink: { $nin: ["", null] },
    joinReminderSentAt: null,
  })
    .populate("slotId", "date startTime endTime sessionType")
    .populate("courseId", "name")
    .populate({ path: "teacherId", populate: { path: "userId", select: "name" } })
    .lean();

  const due = bookings.filter((b) => b.slotId && isStartingSoon(b.slotId, now));
  if (!due.length) return 0;

  await Promise.allSettled(
    due.map(async (booking) => {
      const email = booking.lead?.email;
      if (email) {
        const { subject, html, attachments } = classJoinLinkEmailTemplate({
          studentName: booking.lead?.firstName || "there",
          courseName: booking.courseId?.name || "your demo",
          instructorName: teacherName(booking.teacherId),
          slot: booking.slotId,
          meetingLink: booking.meetingLink,
        });
        await mailSender(email, subject, html, attachments);
      }
      await DemoBooking.findByIdAndUpdate(booking._id, { joinReminderSentAt: new Date() });
    })
  );

  return due.length;
}

async function sendJoinLinkReminders() {
  const now = new Date();
  const [classes, demos] = await Promise.all([
    remindEnrolledClasses(now),
    remindDemoClasses(now),
  ]);

  console.log(
    `[ClassJoinLink] Notified ${classes} class(es) and ${demos} demo(s) starting within ${WINDOW_MINUTES} minutes.`
  );
}

// Every 5 minutes. intervalHours is fractional so the ops page flags this as
// overdue in minutes, not a day like the nightly jobs.
scheduleWithHeartbeat("classJoinLinkReminder", "*/5 * * * *", sendJoinLinkReminders, {
  intervalHours: 0.25,
});

module.exports = { sendJoinLinkReminders, slotStartInstant };
