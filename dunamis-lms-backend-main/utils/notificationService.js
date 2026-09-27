const AdminNotice = require("../model/adminNotice.model");
const User = require("../model/user.model");
const mailSender = require("./mailSender");
const { brandCard, brandAttachments } = require("../mail/emailLayout");
const { loadRoutingDirectory, resolveStaff } = require("../services/staffRouting");

const normalizeUserId = (value) => {
  if (!value) return null;
  return String(value._id || value.id || value);
};

const getSystemCreatorId = async (preferredUserId) => {
  if (preferredUserId) return preferredUserId;

  const systemUser = await User.findOne({
    accountType: { $in: ["superadmin", "admin"] },
  }).select("_id");

  return systemUser?._id || null;
};

const getAdminUsers = async () =>
  User.find({ accountType: { $in: ["admin", "superadmin"] }, accountStatus: "active" }).select(
    "_id name email accountType employeeId"
  );

// Who hears about what (CEO communication sheet, Sep 2026). One channel per
// row: "email" rows send email only, "notification" rows a dashboard notice
// only. AA / BDE are the people responsible for the learner's branch or course
// (services/staffRouting.js). Receipts, the welcome email, OTPs, passwords and
// join links are always sent and are not rows here.
const COMMUNICATION_MATRIX = {
  // Learners record
  demoBooked: { learner: true, instructor: true, aa: true, bde: true, channel: "email" },
  signUp: { learner: true, instructor: false, aa: true, bde: true, channel: "notification" },
  courseEnrolled: { learner: true, instructor: true, aa: true, bde: true, channel: "email" },
  classReminder: { learner: true, instructor: true, aa: true, bde: false, channel: "notification", contentType: "Reminder" },
  classAttendance: { learner: true, instructor: true, aa: true, bde: true, channel: "notification" },
  homework: { learner: true, instructor: true, aa: true, bde: false, channel: "notification" },
  feeReminder: { learner: true, instructor: false, aa: true, bde: true, channel: "email", contentType: "Reminder" },
  feeReceived: { learner: false, instructor: false, aa: true, bde: true, channel: "notification" },
  assignmentCycle: { learner: true, instructor: true, aa: true, bde: true, channel: "notification" },
  assessmentCycle: { learner: true, instructor: true, aa: true, bde: true, channel: "email" },
  // Instructors record
  demoRescheduled: { learner: true, instructor: true, aa: true, bde: true, channel: "email" },
  classRescheduled: { learner: true, instructor: true, aa: true, bde: true, channel: "email" },
  missedAttendance: { learner: false, instructor: true, aa: true, bde: true, channel: "notification" },
  dailyAttendanceReport: { learner: false, instructor: false, aa: true, bde: true, channel: "email" },
  // Not on the sheet.
  // Fires 15 minutes before a class. AA/BDE excluded — nothing for them to act
  // on, and one row per class per day would bury every other notice.
  classJoinLink: { learner: false, instructor: true, aa: false, bde: false, channel: "notification", contentType: "Reminder" },
  // AA/BDE excluded on purpose — the outgoing instructor may have resigned,
  // there's nothing for sales/coordination staff to act on here.
  enrollmentReassigned: { learner: false, instructor: true, aa: false, bde: false, channel: "email" },
  // Missing branch check-in / check-out nudges. Admins read the same gaps off the
  // Instructor Check-ins page, so AA/BDE copies would only be noise.
  instructorCheckIn: { learner: false, instructor: true, aa: false, bde: false, channel: "email" },
};

const getRule = async (event) => COMMUNICATION_MATRIX[event] || null;

// Email rows without their own html get the standard branded card, so any row
// can switch channel without every call site owning two templates.
const deliver = async ({ channel, users, title, message, subject, html, attachments, contentType, creatorId }) => {
  if (channel === "email") {
    return sendEmails({
      recipients: users.map((user) => user.email),
      subject: subject || title,
      html: html || brandCard({ title: title || subject, intro: message }),
      // Attachments (inline logos) belong to the caller's html.
      attachments: html ? attachments : brandAttachments(),
    });
  }
  return createDashboardNotice({
    title: title || subject,
    message: message || "",
    userIds: users.map((user) => user._id),
    creatorId,
    contentType,
  });
};

// Sends one sheet event. An audience receives it only when the matrix ticks
// it AND the call supplies content for it: staff read the shared
// title/message (+ subject/html for email), the instructor its own fields or
// the shared ones, learners only their own learner* fields. So a call can
// send one audience alone — createAssignment sends just the learner part.
//
// context: { branchId } for something happening at a branch, { courseId } for
// an online course, {} when there is no location (a sign-up). Crons sending
// many events pass one `directory` from loadRoutingDirectory().
const notifyEvent = async ({
  event,
  context = {},
  directory,
  instructorUser,
  learners = [],
  title,
  message,
  subject,
  html,
  instructorTitle,
  instructorMessage,
  instructorSubject,
  instructorHtml,
  learnerTitle,
  learnerMessage,
  learnerSubject,
  learnerHtml,
  attachments = [],
  // Learner templates often differ from the staff one; defaults to `attachments`.
  learnerAttachments,
  creatorId,
}) => {
  const rule = await getRule(event);
  if (!rule) return;

  const shared = { title, message, subject, html };
  const hasShared = Boolean(title || subject);
  const deliveries = [];

  if (hasShared && (rule.aa || rule.bde)) {
    const { recipients, fellBack } = resolveStaff({
      columns: rule,
      context,
      directory: directory || (await loadRoutingDirectory()),
    });
    if (fellBack) {
      console.warn(`[notifyEvent] ${event}: nobody placed covers it — sent to every active admin`);
    }
    deliveries.push({ users: recipients, ...shared, attachments });
  }

  if (rule.instructor && instructorUser?._id && (hasShared || instructorTitle || instructorSubject)) {
    deliveries.push({
      users: [instructorUser],
      title: instructorTitle || title,
      message: instructorMessage || message,
      subject: instructorSubject || subject,
      html: instructorHtml || html,
      attachments,
    });
  }

  const learnerUsers = learners.filter(Boolean);
  if (rule.learner && learnerUsers.length && (learnerTitle || learnerSubject)) {
    deliveries.push({
      users: learnerUsers,
      title: learnerTitle,
      message: learnerMessage,
      subject: learnerSubject,
      html: learnerHtml,
      attachments: learnerAttachments ?? attachments,
    });
  }

  await Promise.allSettled(
    deliveries.map((delivery) =>
      deliver({
        ...delivery,
        channel: rule.channel,
        contentType: rule.contentType || "Transactional",
        creatorId,
      })
    )
  );
};

const createDashboardNotice = async ({
  title,
  message,
  userIds,
  creatorId,
  contentType = "Transactional",
}) => {
  const specificUsers = [...new Set((userIds || []).map(normalizeUserId).filter(Boolean))];
  if (!specificUsers.length) return null;

  const creator = await getSystemCreatorId(creatorId || specificUsers[0]);
  if (!creator) return null;

  return AdminNotice.create({
    title,
    message,
    creator,
    targetUsers: "Specific Users",
    specificUsers,
    notificationType: "Notification bars",
    contentType,
    modeOfUpdate: "Both",
    status: "Sent",
  });
};

const sendEmails = async ({ recipients, subject, html, attachments = [] }) => {
  const uniqueRecipients = [
    ...new Set((recipients || []).map((recipient) => String(recipient || "").trim()).filter(Boolean)),
  ];

  if (!uniqueRecipients.length || !subject || !html) return [];

  const results = await Promise.allSettled(
    uniqueRecipients.map((recipient) => mailSender(recipient, subject, html, attachments))
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("Notification email failed", {
        recipient: uniqueRecipients[index],
        error: result.reason?.message || result.reason || "Unknown email error",
      });
    }
  });

  return results;
};

const notifyUsers = async ({
  title,
  message,
  users,
  subject,
  html,
  attachments = [],
  creatorId,
}) => {
  const normalizedUsers = (users || []).filter(Boolean);
  const userIds = normalizedUsers.map((user) => user._id || user.id || user).filter(Boolean);
  const emails = normalizedUsers.map((user) => user.email).filter(Boolean);

  const [notice] = await Promise.all([
    createDashboardNotice({ title, message, userIds, creatorId }),
    sendEmails({ recipients: emails, subject: subject || title, html, attachments }),
  ]);

  return notice;
};

module.exports = {
  COMMUNICATION_MATRIX,
  createDashboardNotice,
  getAdminUsers,
  getRule,
  notifyEvent,
  notifyUsers,
  sendEmails,
};
