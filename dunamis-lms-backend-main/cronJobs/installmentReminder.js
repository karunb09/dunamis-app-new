const cron = require("node-cron");
const Student = require("../model/student.model");
const {
  createDashboardNotice,
  notifyEvent,
  sendEmails,
} = require("../utils/notificationService");

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const buildInstallmentEmail = ({ title, intro, courseName, amount, dueDate }) => `
  <div style="max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;">
    <div style="background:#fff;border-radius:16px;padding:28px;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f97316;">Dunamis LMS</p>
      <h1 style="margin:0 0 14px;color:#111827;font-size:24px;line-height:1.25;">${escapeHtml(title)}</h1>
      <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(intro)}</p>
      <div style="border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:18px 20px;">
        <p style="margin:0 0 8px;color:#334155;"><strong>Course:</strong> ${escapeHtml(courseName)}</p>
        <p style="margin:0 0 8px;color:#334155;"><strong>Amount:</strong> INR ${Number(amount || 0).toLocaleString("en-IN")}</p>
        <p style="margin:0;color:#334155;"><strong>Due date:</strong> ${formatDate(dueDate)}</p>
      </div>
    </div>
  </div>
`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getCourseName = (payment) => payment.courseId?.name || "your course";

const sendInstallmentReminder = async ({ student, payment, type }) => {
  const studentUser = student.userId;
  if (!studentUser?._id) return;

  const isOverdue = type === "overdue";
  const courseName = getCourseName(payment);
  const amount = payment.installmentAmount || payment.amount;
  const studentFirstName = studentUser.name?.firstName || "A student";
  const title = isOverdue ? "Installment overdue" : "Installment reminder";
  const message = isOverdue
    ? `Your installment for ${courseName} is overdue. Course access is paused until payment is completed.`
    : `Your next installment for ${courseName} is due on ${formatDate(payment.dueDate)}.`;

  // Notify student (dashboard notice + email)
  await Promise.allSettled([
    createDashboardNotice({
      title,
      message,
      userIds: [studentUser._id],
      creatorId: studentUser._id,
      contentType: "Reminder",
    }),
    sendEmails({
      recipients: [studentUser.email],
      subject: `${title}: ${courseName}`,
      html: buildInstallmentEmail({
        title,
        intro: message,
        courseName,
        amount,
        dueDate: payment.dueDate,
      }),
    }),
  ]);

  const staffTitle = isOverdue ? "Student installment overdue" : "Student fee due soon";
  const staffMessage = isOverdue
    ? `${studentFirstName} has an overdue installment for ${courseName}.`
    : `${studentFirstName}'s installment for ${courseName} is due on ${formatDate(payment.dueDate)}.`;

  await notifyEvent({
    event: "feeReminder",
    title: staffTitle,
    message: staffMessage,
    creatorId: studentUser._id,
  });
};

const checkInstallmentReminders = async () => {
  const now = new Date();
  const reminderWindow = new Date(now);
  reminderWindow.setDate(reminderWindow.getDate() + 7);

  try {
    const students = await Student.find({
      payments: {
        $elemMatch: {
          paymentType: "Installment",
          PaymentStatus: "completed",
          monthlyPaymentStatus: "pending",
          dueDate: { $lte: reminderWindow },
        },
      },
    })
      .populate("userId", "name email mobileNo")
      .populate("payments.courseId", "name code");

    for (const student of students) {
      const latestByEnrollment = new Map();

      (student.payments || [])
        .filter(
          (payment) =>
            payment.paymentType === "Installment" &&
            payment.PaymentStatus === "completed" &&
            payment.dueDate
        )
        .forEach((payment) => {
          const key = [
            payment.courseId?._id || payment.courseId || "course",
            payment.slotId || "slot",
            payment.sessionType || "session",
          ].join(":");
          const current = latestByEnrollment.get(key);
          if (!current || Number(payment.installmentNo || 0) > Number(current.installmentNo || 0)) {
            latestByEnrollment.set(key, payment);
          }
        });

      for (const payment of latestByEnrollment.values()) {
        if (payment.monthlyPaymentStatus !== "pending") continue;

        const dueDate = new Date(payment.dueDate);
        if (Number.isNaN(dueDate.getTime()) || dueDate > reminderWindow) continue;

        if (dueDate < now && !payment.overdueNoticeSentAt) {
          await sendInstallmentReminder({ student, payment, type: "overdue" });
          await Student.updateOne(
            { _id: student._id, "payments._id": payment._id },
            { $set: { "payments.$.overdueNoticeSentAt": new Date() } }
          );
        } else if (dueDate >= now && !payment.reminderSentAt) {
          await sendInstallmentReminder({ student, payment, type: "reminder" });
          await Student.updateOne(
            { _id: student._id, "payments._id": payment._id },
            { $set: { "payments.$.reminderSentAt": new Date() } }
          );
        }
      }
    }
  } catch (error) {
    console.error("Error checking installment reminders:", error.message);
  }
};

cron.schedule("0 8 * * *", checkInstallmentReminders);

module.exports = { checkInstallmentReminders };
