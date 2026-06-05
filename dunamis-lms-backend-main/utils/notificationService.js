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
    "_id name email accountType"
  );

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
  notifyUsers,
  sendEmails,
};
