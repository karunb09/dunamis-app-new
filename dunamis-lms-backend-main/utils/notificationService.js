const AdminNotice = require("../model/adminNotice.model");
const User = require("../model/user.model");
const mailSender = require("./mailSender");

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
  User.find({ accountType: { $in: ["admin", "superadmin"] } }).select(
    "_id name email accountType employeeId"
  );

// Staff routing matrix for student-lifecycle communications. Channel is
// strict: "email" rows send email only, "notification" rows dashboard only.
// AA/BDE are resolved from the employeeId role letter (unit + A/B);
// superadmins receive every event.
const COMMUNICATION_MATRIX = {
  demoBooked: { instructor: true, aa: true, bde: true, channel: "email" },
  signUp: { instructor: false, aa: true, bde: true, channel: "notification" },
  courseEnrolled: { instructor: true, aa: true, bde: true, channel: "email" },
  classReminder: { instructor: true, aa: true, bde: false, channel: "notification", contentType: "Reminder" },
  // Fires 15 minutes before a class. AA/BDE excluded — nothing for them to act
  // on, and one row per class per day would bury every other notice.
  classJoinLink: { instructor: true, aa: false, bde: false, channel: "notification", contentType: "Reminder" },
  classAttendance: { instructor: true, aa: true, bde: true, channel: "notification" },
  feeReminder: { instructor: false, aa: true, bde: true, channel: "notification", contentType: "Reminder" },
  feeReceived: { instructor: false, aa: true, bde: true, channel: "notification" },
  homework: { instructor: true, aa: true, bde: false, channel: "notification" },
  assignmentCycle: { instructor: true, aa: true, bde: true, channel: "notification" },
  assessmentCycle: { instructor: true, aa: true, bde: true, channel: "email" },
  // AA/BDE excluded on purpose — the outgoing instructor may have resigned,
  // there's nothing for sales/coordination staff to act on here.
  enrollmentReassigned: { instructor: true, aa: false, bde: false, channel: "email" },
};

const AA_ID_PREFIX = /^(DSM|DSD|DCC)A/;
const BDE_ID_PREFIX = /^(DSM|DSD|DCC)B/;

const getStaffRecipients = async ({ aa, bde }) => {
  const admins = await getAdminUsers();
  const superadmins = admins.filter((user) => user.accountType === "superadmin");
  const roleMatched = admins.filter(
    (user) =>
      user.accountType === "admin" &&
      ((aa && AA_ID_PREFIX.test(user.employeeId || "")) ||
        (bde && BDE_ID_PREFIX.test(user.employeeId || "")))
  );

  if (!roleMatched.length && (aa || bde)) {
    console.warn("No AA/BDE staff matched by employeeId — falling back to all admins");
    return admins;
  }

  return [...superadmins, ...roleMatched];
};

const notifyEvent = async ({
  event,
  instructorUser,
  title,
  message,
  subject,
  html,
  instructorSubject,
  instructorHtml,
  attachments = [],
  creatorId,
}) => {
  const rule = COMMUNICATION_MATRIX[event];
  if (!rule) return;

  const staff = await getStaffRecipients(rule);
  const instructor = rule.instructor && instructorUser?._id ? instructorUser : null;

  if (rule.channel === "email") {
    await Promise.allSettled([
      staff.length
        ? sendEmails({
            recipients: staff.map((user) => user.email),
            subject: subject || title,
            html,
            attachments,
          })
        : Promise.resolve(),
      instructor?.email
        ? sendEmails({
            recipients: [instructor.email],
            subject: instructorSubject || subject || title,
            html: instructorHtml || html,
            attachments,
          })
        : Promise.resolve(),
    ]);
    return;
  }

  const userIds = [
    ...(instructor ? [instructor._id] : []),
    ...staff.map((user) => user._id),
  ];
  if (userIds.length) {
    await createDashboardNotice({
      title,
      message,
      userIds,
      creatorId,
      contentType: rule.contentType || "Transactional",
    });
  }
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
  createDashboardNotice,
  getAdminUsers,
  notifyEvent,
  notifyUsers,
  sendEmails,
};
