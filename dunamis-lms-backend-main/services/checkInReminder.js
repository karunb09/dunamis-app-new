// Called through the module object rather than destructured, so tests can stub
// notifyEvent (see services/attendanceDigest.js).
const notifications = require("../utils/notificationService");
const InstructorCheckIn = require("../model/instructorCheckIn.model");
const Slot = require("../model/slot.model");
const {
  LATE_CHECKOUT_AFTER_MS,
  checkInLiveSince,
  offlineClasses,
} = require("./instructorCheckIn");
const {
  buildMissingCheckInEmail,
  buildMissingCheckOutEmail,
} = require("../mail/checkInReminderEmail");
const { formatUserName } = require("../utils/formatName");
const { dayKeyFromDate } = require("../utils/istMonth");

const toId = (value) => String(value?._id || value || "");

const send = (instructor, { subject, html, attachments }) =>
  notifications.notifyEvent({
    event: "instructorCheckIn",
    instructorUser: instructor,
    title: subject,
    subject,
    html,
    attachments,
  });

// A class in progress that no visit covers. Classes starting together at one
// branch (a demo beside its group class) go out as one email.
async function remindMissingCheckIns(now) {
  // Nobody is chased until check-in is in use, so deploying the feature doesn't
  // email every offline instructor before the admin team has announced it.
  if (!(await checkInLiveSince())) return [];

  const dayKey = dayKeyFromDate(now);
  const [classes, visits] = await Promise.all([
    offlineClasses({ from: dayKey, to: dayKey }),
    InstructorCheckIn.find({ dayKey }).select("teacherId branchId status classes.slotId").lean(),
  ]);

  const covered = new Set(
    visits.flatMap((visit) => (visit.classes || []).map((cls) => toId(cls.slotId)))
  );
  const openAt = new Set(
    visits
      .filter((visit) => visit.status === "open")
      .map((visit) => `${toId(visit.teacherId)}|${toId(visit.branchId)}`)
  );

  const groups = new Map();
  for (const cls of classes) {
    const key = `${toId(cls.teacher._id)}|${toId(cls.branch._id)}`;
    const due =
      !cls.checkInReminderSentAt &&
      cls.startAt <= now &&
      now < cls.endAt &&
      !covered.has(toId(cls.slotId)) &&
      !openAt.has(key);
    if (!due) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(cls);
  }

  const results = await Promise.allSettled(
    [...groups.values()].map(async (group) => {
      // Claimed before sending so a slow SMTP call can't let the next tick send
      // it again.
      const claimed = await Slot.updateMany(
        { _id: { $in: group.map((cls) => cls.slotId) }, checkInReminderSentAt: null },
        { $set: { checkInReminderSentAt: now } }
      );
      if (!claimed.modifiedCount) return false;

      const { teacher, branch } = group[0];
      await send(
        { _id: teacher.userId, email: teacher.email },
        buildMissingCheckInEmail({
          teacherName: teacher.name,
          branchName: branch.branchName,
          classes: group,
        })
      );
      return true;
    })
  );

  return results;
}

async function remindMissingCheckOuts(now) {
  const visits = await InstructorCheckIn.find({
    status: "open",
    dayKey: dayKeyFromDate(now),
    checkoutReminderSentAt: null,
    expectedCheckOutAt: { $lte: new Date(now.getTime() - LATE_CHECKOUT_AFTER_MS) },
  })
    .populate("branchId", "branchName")
    .populate({ path: "teacherId", select: "userId", populate: { path: "userId", select: "name email" } })
    .lean();

  return Promise.allSettled(
    visits.map(async (visit) => {
      const claimed = await InstructorCheckIn.updateOne(
        { _id: visit._id, status: "open", checkoutReminderSentAt: null },
        { $set: { checkoutReminderSentAt: now } }
      );
      if (!claimed.modifiedCount) return false;

      const user = visit.teacherId?.userId;
      await send(
        { _id: user?._id, email: user?.email },
        buildMissingCheckOutEmail({
          teacherName: formatUserName(user?.name, "there"),
          branchName: visit.branchId?.branchName || "the branch",
          checkInAt: visit.checkIn.at,
          lastClassEndAt: visit.lastClassEndAt,
          expectedCheckOutAt: visit.expectedCheckOutAt,
        })
      );
      return true;
    })
  );
}

async function sendCheckInReminders(now = new Date()) {
  const [checkIns, checkOuts] = await Promise.all([
    remindMissingCheckIns(now),
    remindMissingCheckOuts(now),
  ]);

  const sent = (results) =>
    results.filter((result) => result.status === "fulfilled" && result.value).length;
  const failures = [...checkIns, ...checkOuts].filter((result) => result.status === "rejected");

  console.log(
    `[CheckInReminder] Sent ${sent(checkIns)} check-in and ${sent(checkOuts)} check-out reminder(s).`
  );

  // Thrown after the rest have gone out, so the heartbeat records the failure.
  if (failures.length) {
    throw new Error(
      `${failures.length} check-in reminder(s) failed: ${failures[0].reason?.message || failures[0].reason}`
    );
  }
}

module.exports = { sendCheckInReminders };
