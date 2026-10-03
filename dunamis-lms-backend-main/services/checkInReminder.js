// Called through the module object rather than destructured, so tests can stub
// notifyEvent and sendEmails (see services/attendanceDigest.js).
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
  buildStaffMissingCheckInEmail,
  buildStaffMissingCheckOutEmail,
} = require("../mail/checkInReminderEmail");
const StaffCheckIn = require("../model/staffCheckIn.model");
const StaffCheckInReminder = require("../model/staffCheckInReminder.model");
const Branch = require("../model/branch.model");
const User = require("../model/user.model");
const {
  branchHoursFor,
  branchIdsFor,
  isStaffRole,
  staffLiveSince,
} = require("./staffCheckIn");
const { loadScopeCatalog } = require("../utils/orgScope");
const { formatUserName } = require("../utils/formatName");
const { dayKeyFromDate } = require("../utils/istMonth");

const toId = (value) => String(value?._id || value || "");

// The email is written to the instructor; staff (if the matrix ever ticks
// them) get a short note about that instructor instead.
const send = (instructor, { subject, html, attachments }, { branchId, staffMessage }) =>
  notifications.notifyEvent({
    event: "instructorCheckIn",
    context: { branchId },
    instructorUser: instructor,
    title: "Branch check-in missing",
    message: staffMessage,
    instructorTitle: subject,
    instructorSubject: subject,
    instructorHtml: html,
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
        }),
        {
          branchId: branch._id,
          staffMessage: `${teacher.name} has a class at ${branch.branchName} in progress without checking in.`,
        }
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
      const branchName = visit.branchId?.branchName || "the branch";
      await send(
        { _id: user?._id, email: user?.email },
        buildMissingCheckOutEmail({
          teacherName: formatUserName(user?.name, "there"),
          branchName,
          checkInAt: visit.checkIn.at,
          lastClassEndAt: visit.lastClassEndAt,
          expectedCheckOutAt: visit.expectedCheckOutAt,
        }),
        {
          branchId: visit.branchId?._id,
          staffMessage: `${formatUserName(user?.name, "An instructor")} hasn't checked out of ${branchName}.`,
        }
      );
      return true;
    })
  );
}

// Staff reminders go straight to the person: the matrix's AA/BDE columns route
// by area, not to the one AA who forgot.
const emailStaff = (user, { subject, html, attachments }) =>
  notifications.sendEmails({ recipients: [user.email], subject, html, attachments });

// One email per person per day, once the earliest of their branches open today
// has opened, while any of them is still open, if they have checked in nowhere.
async function remindStaffMissingCheckIns(now) {
  if (!(await staffLiveSince())) return [];

  const dayKey = dayKeyFromDate(now);
  const [people, branches, visited, catalog] = await Promise.all([
    User.find({
      accountType: "admin",
      accountStatus: "active",
      "org.designation": { $in: ["aa", "bde"] },
    })
      .select("name email accountType accountStatus org")
      .lean(),
    Branch.find({ status: "active" }).select("branchName branchTimings branchOpenDays").lean(),
    StaffCheckIn.find({ dayKey }).distinct("userId"),
    loadScopeCatalog(),
  ]);
  const checkedIn = new Set(visited.map(toId));
  const branchById = new Map(branches.map((branch) => [toId(branch._id), branch]));

  return Promise.allSettled(
    people
      .filter((person) => isStaffRole(person) && person.email && !checkedIn.has(toId(person._id)))
      .map(async (person) => {
        const openToday = branchIdsFor(person, catalog)
          .map((id) => branchById.get(id))
          .filter(Boolean)
          .map((branch) => ({ branchName: branch.branchName, ...branchHoursFor(branch, dayKey) }))
          .filter((branch) => !branch.closedToday && branch.opensAt)
          .sort((a, b) => a.opensAt - b.opensAt);
        if (!openToday.length || now < openToday[0].opensAt) return false;
        const lastClose = Math.max(...openToday.map((branch) => branch.closesAt?.getTime() ?? 0));
        if (lastClose && now >= lastClose) return false;

        // Claimed before sending; the unique index turns a second tick (or a
        // second process) into a duplicate-key no-op.
        try {
          await StaffCheckInReminder.create({ userId: person._id, dayKey });
        } catch (err) {
          if (err?.code === 11000) return false;
          throw err;
        }
        await emailStaff(
          person,
          buildStaffMissingCheckInEmail({
            name: formatUserName(person.name, "there"),
            branches: openToday,
          })
        );
        return true;
      })
  );
}

async function remindStaffMissingCheckOuts(now) {
  const visits = await StaffCheckIn.find({
    status: "open",
    dayKey: dayKeyFromDate(now),
    checkoutReminderSentAt: null,
    expectedCheckOutAt: { $lte: new Date(now.getTime() - LATE_CHECKOUT_AFTER_MS) },
  })
    .populate("branchId", "branchName")
    .populate("userId", "name email")
    .lean();

  return Promise.allSettled(
    visits.map(async (visit) => {
      const claimed = await StaffCheckIn.updateOne(
        { _id: visit._id, status: "open", checkoutReminderSentAt: null },
        { $set: { checkoutReminderSentAt: now } }
      );
      if (!claimed.modifiedCount || !visit.userId?.email) return false;

      await emailStaff(
        visit.userId,
        buildStaffMissingCheckOutEmail({
          name: formatUserName(visit.userId.name, "there"),
          branchName: visit.branchId?.branchName || "the branch",
          checkInAt: visit.checkIn.at,
          expectedCheckOutAt: visit.expectedCheckOutAt,
        })
      );
      return true;
    })
  );
}

async function sendCheckInReminders(now = new Date()) {
  const [checkIns, checkOuts, staffCheckIns, staffCheckOuts] = await Promise.all([
    remindMissingCheckIns(now),
    remindMissingCheckOuts(now),
    remindStaffMissingCheckIns(now),
    remindStaffMissingCheckOuts(now),
  ]);

  const sent = (results) =>
    results.filter((result) => result.status === "fulfilled" && result.value).length;
  const failures = [...checkIns, ...checkOuts, ...staffCheckIns, ...staffCheckOuts].filter(
    (result) => result.status === "rejected"
  );

  console.log(
    `[CheckInReminder] Sent ${sent(checkIns)} check-in and ${sent(checkOuts)} check-out reminder(s) to instructors, ${sent(staffCheckIns)} and ${sent(staffCheckOuts)} to staff.`
  );

  // Thrown after the rest have gone out, so the heartbeat records the failure.
  if (failures.length) {
    throw new Error(
      `${failures.length} check-in reminder(s) failed: ${failures[0].reason?.message || failures[0].reason}`
    );
  }
}

module.exports = { sendCheckInReminders };
