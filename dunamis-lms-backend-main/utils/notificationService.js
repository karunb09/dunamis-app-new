const AdminNotice = require("../model/adminNotice.model");
const User = require("../model/user.model");
const mailSender = require("./mailSender");
const { brandCard, brandAttachments } = require("../mail/emailLayout");
const { loadRoutingDirectory, resolveStaff } = require("../services/staffRouting");
const { COMMUNICATION_MATRIX, getRule } = require("./communicationMatrix");

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
