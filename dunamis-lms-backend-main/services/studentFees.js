const PaymentTransaction = require("../model/paymentTransaction.model");
const { getCashfreeMode } = require("../utils/cashfreeClient");
const { getPayableInstallments, ACCESS_GRACE_DAYS } = require("./enrollmentService");

// Once inside this window the fee is treated as "due now" in the UI rather than
// a far-off upcoming payment. Matches the reminder cron's 7-day lookahead.
const DUE_SOON_DAYS = 7;

const serializeOrder = (transaction) => ({
  gateway: "cashfree",
  id: transaction.merchantOrderId,
  orderId: transaction.merchantOrderId,
  cashfreeOrderId: transaction.merchantOrderId,
  cfOrderId: transaction.cashfreeCfOrderId,
  paymentSessionId: transaction.paymentSessionId,
  amount: transaction.amount,
  currency: transaction.currency,
  mode: getCashfreeMode(),
  expiresAt: transaction.expiresAt,
});

const enrollmentKey = (courseId, slotId, sessionType) =>
  [courseId || "course", slotId || "slot", sessionType || "session"].join(":");

// Mirrors the admin badge in Dunamis_LMS_Dashboard-main/src/utils/feeStatus.js.
// "overdue" is the only state that actually costs the student class access.
const paymentStatusOf = (entry) => {
  if (entry.daysLate > ACCESS_GRACE_DAYS) return "overdue";
  if (entry.isOverdue) return "due";
  if (entry.daysUntilDue <= DUE_SOON_DAYS) return "due_soon";
  return "upcoming";
};

// One row per completed payment, newest first — the student's receipt list.
const buildHistory = (student) =>
  (student.payments || [])
    .filter((payment) => payment.PaymentStatus === "completed")
    .map((payment) => ({
      _id: payment._id,
      // Lets the receipt view pull the full lifecycle trail for this payment.
      transactionRef: payment.transactionRef || null,
      courseId: payment.courseId?._id || payment.courseId || null,
      courseName: payment.courseId?.name || "Course",
      courseCode: payment.courseId?.code || "",
      amount: payment.amount,
      paidAt: payment.paidAt || payment.createdAt,
      paymentType: payment.paymentType,
      planLabel: payment.planLabel || null,
      paymentMode: payment.paymentMode || "Online",
      installmentNo: payment.installmentNo,
      installmentTotal: payment.installmentTotal,
      courseType: payment.courseType || "fixed",
      transactionId: payment.transactionId || payment.cashfreePaymentId || null,
      orderId: payment.cashfreeOrderId || null,
      gateway: payment.paymentGateway || "cashfree",
      feeStatus: payment.feeStatus,
      sessionType: payment.sessionType,
    }))
    .sort((a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0));

// The student fees page (and the chatbot's "what do I owe?") in one shape.
// Expects payments.courseId and enrolledCourses.courseId populated.
async function buildFeesSummary(student, asOf = new Date()) {
  const payable = getPayableInstallments(student, asOf);

  // Any checkout the student already started, so the page can resume it instead
  // of creating a second order for the same installment.
  const openOrders = await PaymentTransaction.find({
    studentId: student._id,
    status: { $in: ["created", "pending"] },
    expiresAt: { $gt: asOf },
  })
    .select(
      "merchantOrderId cashfreeCfOrderId paymentSessionId amount currency expiresAt courseId slotId sessionType installmentNo status"
    )
    .sort({ createdAt: -1 })
    .lean();

  const openOrderByEnrollment = new Map();
  for (const order of openOrders) {
    const key = enrollmentKey(order.courseId, order.slotId, order.sessionType);
    if (!openOrderByEnrollment.has(key)) openOrderByEnrollment.set(key, order);
  }

  const dues = payable.map((entry) => {
    const payment = entry.payment;
    const courseId = payment.courseId?._id || payment.courseId || null;
    const key = enrollmentKey(courseId, payment.slotId, payment.sessionType);
    const openOrder = openOrderByEnrollment.get(key) || null;

    return {
      courseId,
      courseName: payment.courseId?.name || "Course",
      courseCode: payment.courseId?.code || "",
      slotId: payment.slotId || null,
      sessionType: payment.sessionType || null,
      deliveryMode: payment.deliveryMode || null,
      amount: entry.amountDue,
      dueDate: entry.dueDate,
      status: paymentStatusOf(entry),
      isOverdue: entry.isOverdue,
      daysLate: entry.daysLate,
      daysUntilDue: entry.daysUntilDue,
      // The installment the student is about to pay, not the one already paid.
      installmentNo: entry.nextInstallmentNo,
      installmentTotal: entry.installmentTotal,
      installmentsPaid: entry.installmentNo,
      courseType: entry.courseType || "fixed",
      termMonths: entry.termMonths || null,
      planMonths: entry.planMonths || entry.installmentTotal,
      activeOrder: openOrder
        ? { ...serializeOrder(openOrder), transactionId: openOrder._id }
        : null,
    };
  });

  // Late but inside the grace window keeps access; only "overdue" blocks.
  const blocking = dues.filter((due) => due.status === "overdue");
  const late = dues.filter((due) => due.isOverdue);
  const history = buildHistory(student);

  // Enrollments with nothing left to pay still belong on the page, so a student
  // who has cleared a course can see it as settled.
  const duesByCourse = new Set(dues.map((due) => String(due.courseId)));
  const settled = (student.enrolledCourses || [])
    .filter((enrollment) => enrollment.active !== false)
    .filter((enrollment) => {
      const courseId = enrollment.courseId?._id || enrollment.courseId;
      return courseId && !duesByCourse.has(String(courseId));
    })
    .map((enrollment) => ({
      courseId: enrollment.courseId?._id || enrollment.courseId,
      courseName: enrollment.courseId?.name || "Course",
      courseCode: enrollment.courseId?.code || "",
      joinedAt: enrollment.joinedAt,
      progress: enrollment.progress || 0,
    }));

  return {
    asOf,
    accessRestricted: blocking.length > 0,
    graceDays: ACCESS_GRACE_DAYS,
    message:
      blocking.length > 0
        ? "Course access is restricted until the overdue installment is paid."
        : "Course access is active.",
    totals: {
      outstanding: dues.reduce((sum, due) => sum + Number(due.amount || 0), 0),
      overdueAmount: late.reduce((sum, due) => sum + Number(due.amount || 0), 0),
      overdueCount: late.length,
      duesCount: dues.length,
      totalPaid: history.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      nextDueDate: dues[0]?.dueDate || null,
    },
    dues,
    settled,
    history,
  };
}

module.exports = { buildFeesSummary, serializeOrder };
