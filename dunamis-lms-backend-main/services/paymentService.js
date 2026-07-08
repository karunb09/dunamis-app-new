const crypto = require("crypto");
const PaymentTransaction = require("../model/paymentTransaction.model");
const Course = require("../model/course.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const {
  createCashfreeOrder,
  getCashfreeOrder,
  getCashfreePaymentsForOrder,
} = require("../utils/cashfreeClient");
const {
  applyStudentFulfillment,
  addStudentToSlot,
} = require("./enrollmentService");
const {
  notifyEvent,
  notifyUsers,
} = require("../utils/notificationService");
const { recordReferralIfAny } = require("../utils/referral");
require("dotenv").config();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ENROLLMENT_RETURN_URL =
  process.env.CASHFREE_RETURN_URL ||
  "https://dunamisindia.co.in/payment-confirmation?order_id={order_id}";

const ACTIVE_TRANSACTION_STATUSES = [
  "created",
  "pending",
  "paid",
  "paid_pending_fulfillment",
  "fulfilled",
];

const formatMoney = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const amountMatches = (left, right) =>
  Math.abs(Number(left || 0) - Number(right || 0)) < 0.01;

const getDisplayName = (user = {}) => {
  const firstName = user.name?.firstName || user.firstName || "";
  const lastName = user.name?.lastName || user.lastName || "";
  return `${firstName} ${lastName}`.trim() || "Dunamis Student";
};

const normalizePhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
};

const toId = (value) => value?.toString();

const buildRequestFingerprint = (payload) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

const createMerchantOrderId = ({ studentId, courseId, installmentNo = 1 }) =>
  `dnm_${Date.now()}_${toId(studentId).slice(-6)}_${toId(courseId).slice(
    -6
  )}_i${installmentNo}_${crypto.randomBytes(3).toString("hex")}`;

const getTransactionExpiry = () => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 30);
  return expiry;
};

const getCashfreeErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.code || error.message;

// ─── Transaction queries ──────────────────────────────────────────────────────

const expireStaleTransactions = async (query) => {
  await PaymentTransaction.updateMany(
    {
      ...query,
      status: { $in: ["created", "pending"] },
      expiresAt: { $lte: new Date() },
    },
    { $set: { status: "expired", lastError: "Payment session expired" } }
  );
};

const findActiveEnrollmentTransaction = async (query) => {
  await expireStaleTransactions(query);
  return PaymentTransaction.findOne({
    ...query,
    status: { $in: ACTIVE_TRANSACTION_STATUSES },
  }).sort({ createdAt: -1 });
};

// ─── Cashfree order creation ──────────────────────────────────────────────────

const buildCashfreeOrderPayload = ({ transaction, user, course }) => {
  const customerPhone = normalizePhone(user.mobileNo || user.phone);
  if (!customerPhone) {
    throw new Error("A valid 10 digit mobile number is required for payment");
  }

  return {
    order_id: transaction.merchantOrderId,
    order_amount: transaction.amount,
    order_currency: transaction.currency,
    order_expiry_time: transaction.expiresAt.toISOString(),
    customer_details: {
      customer_id: transaction.studentId.toString(),
      customer_name: getDisplayName(user),
      customer_email: user.email,
      customer_phone: customerPhone,
    },
    order_meta: {
      return_url: ENROLLMENT_RETURN_URL,
      ...(process.env.CASHFREE_NOTIFY_URL
        ? { notify_url: process.env.CASHFREE_NOTIFY_URL }
        : {}),
    },
    order_note: `Enrollment for ${course.code || course.name}`.slice(0, 200),
    order_tags: {
      courseId: transaction.courseId.toString(),
      studentId: transaction.studentId.toString(),
      planType: transaction.planType,
      sessionType: transaction.sessionType,
    },
  };
};

const createCashfreeEnrollmentTransaction = async ({
  student,
  context,
  pricing,
  planType,
  installmentNo = 1,
  dueDate = new Date(),
  referralCode = null,
}) => {
  const fingerprintPayload = {
    studentId: student._id.toString(),
    courseId: context.course._id.toString(),
    teacherId: context.teacher._id.toString(),
    slotId: context.slot._id.toString(),
    sessionType: context.slot.sessionType,
    planType,
    installmentNo,
    amount: pricing.amount,
  };

  const transaction = await PaymentTransaction.create({
    userId: student.userId._id || student.userId,
    studentId: student._id,
    courseId: context.course._id,
    teacherId: context.teacher._id,
    slotId: context.slot._id,
    parentAvailabilityId: context.slot.parentAvailabilityId || null,
    branchId: context.resolvedBranchId,
    deliveryMode: context.resolvedMode,
    sessionType: context.slot.sessionType,
    planType,
    planMonths: pricing.planMonths ?? null,
    referralCode,
    paymentType: pricing.paymentType,
    installmentNo,
    installmentTotal: pricing.installmentTotal,
    installmentAmount: pricing.installmentAmount,
    dueDate,
    amount: pricing.amount,
    currency: "INR",
    merchantOrderId: createMerchantOrderId({
      studentId: student._id,
      courseId: context.course._id,
      installmentNo,
    }),
    idempotencyKey: crypto.randomUUID(),
    requestFingerprint: buildRequestFingerprint(fingerprintPayload),
    expiresAt: getTransactionExpiry(),
    gateway: "cashfree",
    status: "created",
  });

  const cashfreeOrder = await createCashfreeOrder(
    buildCashfreeOrderPayload({
      transaction,
      user: student.userId,
      course: context.course,
    }),
    transaction.idempotencyKey
  );

  transaction.cashfreeCfOrderId = cashfreeOrder.cf_order_id?.toString() || null;
  transaction.paymentSessionId = cashfreeOrder.payment_session_id;
  transaction.cashfreeOrderStatus = cashfreeOrder.order_status;
  transaction.gatewayResponse = { createOrder: cashfreeOrder };
  transaction.status = "pending";
  transaction.expiresAt = cashfreeOrder.order_expiry_time
    ? new Date(cashfreeOrder.order_expiry_time)
    : transaction.expiresAt;
  await transaction.save();

  return transaction;
};

// ─── Payment confirmation ─────────────────────────────────────────────────────

const getSuccessfulPayment = (payments = []) =>
  [...payments]
    .filter((payment) => payment.payment_status === "SUCCESS")
    .sort(
      (a, b) =>
        new Date(b.payment_completion_time || b.payment_time || 0) -
        new Date(a.payment_completion_time || a.payment_time || 0)
    )[0] || null;

const getLatestPayment = (payments = []) =>
  [...payments].sort(
    (a, b) =>
      new Date(b.payment_completion_time || b.payment_time || 0) -
      new Date(a.payment_completion_time || a.payment_time || 0)
  )[0] || null;

const validateCashfreePaidOrder = ({ transaction, order, payment }) => {
  if (!order || order.order_id !== transaction.merchantOrderId) {
    throw new Error("Cashfree order mismatch");
  }

  if (order.order_status !== "PAID") {
    return false;
  }

  if (!amountMatches(order.order_amount, transaction.amount)) {
    throw new Error("Cashfree order amount mismatch");
  }

  if (order.order_currency !== transaction.currency) {
    throw new Error("Cashfree order currency mismatch");
  }

  if (payment) {
    if (!amountMatches(payment.payment_amount, transaction.amount)) {
      throw new Error("Cashfree payment amount mismatch");
    }
    if (payment.payment_currency !== transaction.currency) {
      throw new Error("Cashfree payment currency mismatch");
    }
  }

  return true;
};

const markTransactionPaid = async ({ transaction, order, payment }) => {
  const paidAt = payment?.payment_completion_time
    ? new Date(payment.payment_completion_time)
    : new Date();

  const update = {
    status: "paid",
    feeStatus: "Paid",
    cashfreeCfOrderId: order.cf_order_id?.toString() || transaction.cashfreeCfOrderId,
    cashfreeOrderStatus: order.order_status,
    cashfreePaymentId: payment?.cf_payment_id?.toString() || transaction.cashfreePaymentId,
    cashfreePaymentStatus: payment?.payment_status || transaction.cashfreePaymentStatus,
    paymentMode: payment?.payment_group || transaction.paymentMode || "cashfree",
    bankReference: payment?.bank_reference || transaction.bankReference,
    verifiedAt: new Date(),
    paidAt,
    lastError: null,
    gatewayResponse: {
      ...(transaction.gatewayResponse || {}),
      fetchOrder: order,
      successfulPayment: payment || null,
    },
  };

  const updated = await PaymentTransaction.findOneAndUpdate(
    {
      _id: transaction._id,
      status: { $nin: ["fulfilled", "refunded"] },
    },
    { $set: update },
    { new: true }
  );

  return updated || PaymentTransaction.findById(transaction._id);
};

// ─── Notifications ────────────────────────────────────────────────────────────

const paymentReceiptEmailTemplate = ({
  title,
  intro,
  studentName,
  courseName,
  instructorName,
  amount,
  orderId,
  paymentId,
  planType,
  installmentText,
}) => `
  <div style="max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;">
    <div style="background:#ffffff;border-radius:16px;padding:28px;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f97316;">Dunamis LMS</p>
      <h1 style="margin:0 0 14px;color:#111827;font-size:24px;line-height:1.25;">${escapeHtml(title)}</h1>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(intro)}</p>
      <div style="border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:18px 20px;">
        <p style="margin:0 0 8px;color:#334155;"><strong>Student:</strong> ${escapeHtml(studentName)}</p>
        <p style="margin:0 0 8px;color:#334155;"><strong>Course:</strong> ${escapeHtml(courseName)}</p>
        <p style="margin:0 0 8px;color:#334155;"><strong>Instructor:</strong> ${escapeHtml(instructorName || "N/A")}</p>
        <p style="margin:0 0 8px;color:#334155;"><strong>Amount:</strong> ${formatMoney(amount)}</p>
        <p style="margin:0 0 8px;color:#334155;"><strong>Plan:</strong> ${escapeHtml(planType)}</p>
        <p style="margin:0 0 8px;color:#334155;"><strong>Installment:</strong> ${escapeHtml(installmentText)}</p>
        <p style="margin:0 0 8px;color:#334155;"><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
        <p style="margin:0;color:#334155;"><strong>Payment ID:</strong> ${escapeHtml(paymentId || "N/A")}</p>
      </div>
    </div>
  </div>
`;

const updateTeacherStats = require("../utils/updateTeacherStats");

const sendEnrollmentSideEffects = async (transaction) => {
  try {
    await updateTeacherStats(transaction.courseId);
  } catch (error) {
    console.error("Failed to update teacher stats after enrollment:", error.message);
  }

  const notificationLock = await PaymentTransaction.updateOne(
    { _id: transaction._id, notificationsSentAt: null },
    { $set: { notificationsSentAt: new Date() } }
  );

  if (notificationLock.modifiedCount === 0) {
    return;
  }

  try {
    const [student, course, teacher] = await Promise.all([
      Student.findById(transaction.studentId).populate("userId"),
      Course.findById(transaction.courseId),
      Teacher.findById(transaction.teacherId).populate("userId"),
    ]);

    if (!student?.userId || !course) return;

    const studentName = getDisplayName(student.userId);
    const instructorName = getDisplayName(teacher?.userId || {});
    const installmentText =
      transaction.paymentType === "Installment"
        ? `${transaction.installmentNo} of ${transaction.installmentTotal}`
        : "Full payment";
    const commonContext = {
      studentName,
      courseName: course.name,
      instructorName,
      amount: transaction.amount,
      orderId: transaction.merchantOrderId,
      paymentId: transaction.cashfreePaymentId,
      planType: transaction.planType,
      installmentText,
    };

    const isFirstPayment =
      transaction.paymentType !== "Installment" ||
      Number(transaction.installmentNo || 1) <= 1;

    await Promise.allSettled([
      notifyUsers({
        title: "Payment received",
        message: `Your payment for ${course.name} has been received.`,
        users: [student.userId],
        subject: `Payment received for ${course.name}`,
        html: paymentReceiptEmailTemplate({
          ...commonContext,
          title: "Payment received",
          intro: "Your course payment has been verified successfully.",
        }),
        creatorId: student.userId._id,
      }),
      isFirstPayment
        ? notifyEvent({
            event: "courseEnrolled",
            instructorUser: teacher?.userId,
            subject: `Payment received: ${course.name}`,
            html: paymentReceiptEmailTemplate({
              ...commonContext,
              title: "New payment received",
              intro:
                transaction.status === "paid_pending_fulfillment"
                  ? "Payment is verified, but the enrollment needs manual fulfillment review."
                  : "A course payment has been verified and fulfilled.",
            }),
            instructorSubject: `New paid enrollment: ${course.name}`,
            instructorHtml: paymentReceiptEmailTemplate({
              ...commonContext,
              title: "New paid enrollment",
              intro: "A student has completed payment for a course assigned to you.",
            }),
            creatorId: student.userId._id,
          })
        : notifyEvent({
            event: "feeReceived",
            title:
              transaction.status === "paid_pending_fulfillment"
                ? "Payment needs fulfillment review"
                : "Installment received",
            message: `${studentName} paid ${formatMoney(transaction.amount)} for ${course.name} (installment ${transaction.installmentNo} of ${transaction.installmentTotal}).`,
            creatorId: student.userId._id,
          }),
    ]);
  } catch (error) {
    console.error("Failed to send enrollment notifications:", error.message);
  }
};

// ─── Fulfillment orchestration ────────────────────────────────────────────────

const fulfillPaidTransaction = async (transactionId) => {
  const transaction = await PaymentTransaction.findById(transactionId);
  if (!transaction) {
    return { fulfilled: false, error: "Payment transaction not found" };
  }

  if (transaction.status === "fulfilled") {
    return { fulfilled: true, alreadyFulfilled: true, transaction };
  }

  if (!["paid", "paid_pending_fulfillment"].includes(transaction.status)) {
    return { fulfilled: false, error: "Payment is not ready for fulfillment" };
  }

  try {
    await recordReferralIfAny(transaction);
  } catch (error) {
    console.error("Failed to record referral attribution:", error.message);
  }

  let coreFulfilled = false;

  try {
    await applyStudentFulfillment(transaction);
    coreFulfilled = true;
    await addStudentToSlot(transaction);

    const fulfilledTransaction = await PaymentTransaction.findOneAndUpdate(
      {
        _id: transaction._id,
        status: { $in: ["paid", "paid_pending_fulfillment"] },
      },
      {
        $set: {
          status: "fulfilled",
          fulfilledAt: new Date(),
          lastError: null,
        },
      },
      { new: true }
    );

    if (fulfilledTransaction) {
      sendEnrollmentSideEffects(fulfilledTransaction);
    }

    return {
      fulfilled: true,
      transaction: fulfilledTransaction || transaction,
    };
  } catch (error) {
    const pendingTransaction = await PaymentTransaction.findByIdAndUpdate(
      transaction._id,
      {
        $set: {
          status: "paid_pending_fulfillment",
          lastError: error.message,
        },
      },
      { new: true }
    );

    if (pendingTransaction) {
      sendEnrollmentSideEffects(pendingTransaction);
    }

    return {
      fulfilled: false,
      coreFulfilled,
      error: error.message,
      transaction: pendingTransaction,
    };
  }
};

const confirmPaidCashfreeOrder = async ({ transaction, order, payment }) => {
  const isPaid = validateCashfreePaidOrder({ transaction, order, payment });
  if (!isPaid) return { paid: false, transaction };

  const paidTransaction = await markTransactionPaid({ transaction, order, payment });
  const fulfillment = await fulfillPaidTransaction(paidTransaction._id);

  return {
    paid: true,
    transaction: fulfillment.transaction || paidTransaction,
    fulfillment,
  };
};

module.exports = {
  ACTIVE_TRANSACTION_STATUSES,
  ENROLLMENT_RETURN_URL,
  formatMoney,
  getDisplayName,
  normalizePhone,
  buildRequestFingerprint,
  createMerchantOrderId,
  getTransactionExpiry,
  getCashfreeErrorMessage,
  expireStaleTransactions,
  findActiveEnrollmentTransaction,
  buildCashfreeOrderPayload,
  createCashfreeEnrollmentTransaction,
  getSuccessfulPayment,
  getLatestPayment,
  validateCashfreePaidOrder,
  markTransactionPaid,
  sendEnrollmentSideEffects,
  fulfillPaidTransaction,
  confirmPaidCashfreeOrder,
};
