const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const Student = require("../model/student.model");
const PaymentTransaction = require("../model/paymentTransaction.model");
const { getCashfreeMode } = require("../utils/cashfreeClient");
const {
  buildPricingForPlan,
  loadValidatedEnrollmentContext,
  getPayableInstallments,
  ACCESS_GRACE_DAYS,
} = require("../services/enrollmentService");
const {
  findActiveEnrollmentTransaction,
  createCashfreeEnrollmentTransaction,
  getCashfreeErrorMessage,
  recordTransactionEvent,
  TRANSACTION_EVENTS,
} = require("../services/paymentService");

// Once inside this window the fee is treated as "due now" in the UI rather than
// a far-off upcoming payment. Matches the reminder cron's 7-day lookahead.
const DUE_SOON_DAYS = 7;

const CLIENT_EVENTS = {
  checkout_opened: TRANSACTION_EVENTS.CHECKOUT_OPENED,
  checkout_dismissed: TRANSACTION_EVENTS.CHECKOUT_DISMISSED,
};

// Events whose recorded detail is internal (subsystem names, stack messages).
const STUDENT_SAFE_DETAILS = {
  [TRANSACTION_EVENTS.FULFILLMENT_DEFERRED]:
    "Your payment is safe. Our team is finalising your class enrolment.",
  [TRANSACTION_EVENTS.FAILED]: "The payment did not go through.",
  [TRANSACTION_EVENTS.RECONCILED]: "We confirmed this payment with your bank.",
};

const studentOnly = (req, res) => {
  if (req.user?.accountType !== "student") {
    res.status(403).json({
      success: false,
      message: "Only student accounts can view their fees",
    });
    return false;
  }
  return true;
};

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
      transactionId: payment.transactionId || payment.cashfreePaymentId || null,
      orderId: payment.cashfreeOrderId || null,
      gateway: payment.paymentGateway || "cashfree",
      feeStatus: payment.feeStatus,
      sessionType: payment.sessionType,
    }))
    .sort((a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0));

exports.getFeesSummary = asyncHandler(async (req, res) => {
  if (!studentOnly(req, res)) return;

  const userId = new mongoose.Types.ObjectId(req.user.userId);
  const student = await Student.findOne({ userId })
    .populate("payments.courseId", "name code")
    .populate("enrolledCourses.courseId", "name code mode");

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  const asOf = new Date();
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
      planMonths: entry.installmentTotal,
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

  return res.status(200).json({
    success: true,
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
  });
});

exports.createInstallmentOrder = asyncHandler(async (req, res) => {
  if (!studentOnly(req, res)) return;

  const userId = new mongoose.Types.ObjectId(req.user.userId);
  const { courseId, slotId, sessionType } = req.validated?.body || req.body || {};

  const student = await Student.findOne({ userId }).populate("userId");
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  const payable = getPayableInstallments(student);
  const matches = payable.filter((entry) => {
    const entryCourseId = entry.payment.courseId?._id || entry.payment.courseId;
    if (String(entryCourseId) !== String(courseId)) return false;
    if (slotId && String(entry.payment.slotId) !== String(slotId)) return false;
    if (sessionType && entry.payment.sessionType !== sessionType) return false;
    return true;
  });

  if (matches.length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "There is no installment to pay for this course. Everything due has already been paid.",
    });
  }

  // A student enrolled in the same course twice (different batch/session type)
  // must say which one; paying the wrong enrollment is not recoverable in-app.
  if (matches.length > 1) {
    return res.status(409).json({
      success: false,
      message: "You have more than one enrollment for this course. Choose which one to pay.",
      options: matches.map((entry) => ({
        courseId: entry.payment.courseId?._id || entry.payment.courseId,
        slotId: entry.payment.slotId,
        sessionType: entry.payment.sessionType,
        amount: entry.amountDue,
        dueDate: entry.dueDate,
        installmentNo: entry.nextInstallmentNo,
        installmentTotal: entry.installmentTotal,
      })),
    });
  }

  const entry = matches[0];
  const payment = entry.payment;

  // Pre-tenure rows can be missing the instructor/batch the order must be built
  // against. Without this the ObjectId cast fails as an opaque 500.
  if (!payment.teacherId || !payment.slotId) {
    return res.status(409).json({
      success: false,
      message:
        "We could not start this payment online because your batch details are incomplete. Please pay at your centre or contact support.",
    });
  }

  const context = await loadValidatedEnrollmentContext({
    courseId: String(payment.courseId?._id || payment.courseId),
    teacherId: String(payment.teacherId),
    slotId: String(payment.slotId),
    sessionType: payment.sessionType,
    deliveryMode: payment.deliveryMode,
    branchId: payment.branchId?.toString(),
    allowExistingStudentId: student._id,
  });
  if (context.error) {
    return res
      .status(context.error.status)
      .json({ success: false, message: context.error.message });
  }

  const pricing = buildPricingForPlan(
    context.course,
    payment.sessionType,
    "monthly",
    payment.installmentTotal
  );
  if (pricing.error) {
    return res.status(400).json({ success: false, message: pricing.error });
  }

  const existing = await findActiveEnrollmentTransaction({
    studentId: student._id,
    courseId: payment.courseId?._id || payment.courseId,
    slotId: payment.slotId,
    sessionType: payment.sessionType,
    paymentType: "Installment",
    installmentNo: entry.nextInstallmentNo,
  });

  if (existing?.status === "pending" && existing.paymentSessionId) {
    await recordTransactionEvent(existing._id, {
      type: TRANSACTION_EVENTS.ORDER_REUSED,
      actor: "student",
      actorUserId: req.user.userId,
      status: existing.status,
      amount: existing.amount,
      detail: "Student re-opened checkout for this still-valid installment order",
    });

    return res.status(200).json({
      success: true,
      message: "Existing pending installment order returned",
      transactionId: existing._id,
      order: serializeOrder(existing),
    });
  }

  if (existing) {
    return res.status(409).json({
      success: false,
      message:
        existing.gateway === "manual"
          ? "This installment was already recorded as paid at the centre."
          : "This installment is already paid or awaiting confirmation.",
      transactionStatus: existing.status,
    });
  }

  let transaction;
  try {
    transaction = await createCashfreeEnrollmentTransaction({
      student,
      context,
      pricing,
      planType: "monthly",
      installmentNo: entry.nextInstallmentNo,
      dueDate: entry.dueDate,
      initiatedBy: { actor: "student", actorUserId: req.user.userId },
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "Could not start the payment. Please try again.",
      error: getCashfreeErrorMessage(error),
    });
  }

  return res.status(200).json({
    success: true,
    message: "Installment order created successfully",
    transactionId: transaction._id,
    paidEarly: !entry.isOverdue,
    order: serializeOrder(transaction),
  });
});

exports.getTransactionDetail = asyncHandler(async (req, res) => {
  if (!studentOnly(req, res)) return;

  const { id } = req.validated?.params || req.params;
  const transaction = await PaymentTransaction.findById(id)
    .populate("courseId", "name code")
    .lean();

  if (!transaction) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  if (String(transaction.userId) !== String(req.user.userId)) {
    return res
      .status(403)
      .json({ success: false, message: "You cannot view another student's payment" });
  }

  return res.status(200).json({
    success: true,
    transaction: {
      _id: transaction._id,
      orderId: transaction.merchantOrderId,
      paymentId: transaction.cashfreePaymentId,
      status: transaction.status,
      feeStatus: transaction.feeStatus,
      gateway: transaction.gateway,
      amount: transaction.amount,
      originalAmount: transaction.originalAmount,
      discountAmount: transaction.discountAmount,
      currency: transaction.currency,
      paymentType: transaction.paymentType,
      planType: transaction.planType,
      planMonths: transaction.planMonths,
      planLabel: transaction.customPlanName || null,
      installmentNo: transaction.installmentNo,
      installmentTotal: transaction.installmentTotal,
      paymentMode: transaction.paymentMode,
      course: transaction.courseId,
      createdAt: transaction.createdAt,
      paidAt: transaction.paidAt,
      fulfilledAt: transaction.fulfilledAt,
      // The student-visible audit trail. Internal failure text is replaced —
      // those details name our own subsystems and mean nothing to a student.
      events: (transaction.events || []).map((event) => ({
        type: event.type,
        at: event.at,
        actor: event.actor,
        detail: STUDENT_SAFE_DETAILS[event.type] ?? event.detail,
      })),
    },
  });
});

exports.recordClientEvent = asyncHandler(async (req, res) => {
  if (!studentOnly(req, res)) return;

  const { id } = req.validated?.params || req.params;
  const { type } = req.validated?.body || req.body || {};

  const eventType = CLIENT_EVENTS[type];
  if (!eventType) {
    return res.status(400).json({ success: false, message: "Unsupported event type" });
  }

  const transaction = await PaymentTransaction.findById(id).select("userId status").lean();
  if (!transaction) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }
  if (String(transaction.userId) !== String(req.user.userId)) {
    return res.status(403).json({ success: false, message: "Not your payment" });
  }

  // A payment that already settled cannot be abandoned. The gateway modal fires
  // its close callback after a successful checkout, so without this the trail
  // ends with a false "abandoned" entry stamped after "fulfilled".
  if (
    eventType === TRANSACTION_EVENTS.CHECKOUT_DISMISSED &&
    ["paid", "paid_pending_fulfillment", "fulfilled"].includes(transaction.status)
  ) {
    return res.status(200).json({ success: true, ignored: "payment already settled" });
  }

  await recordTransactionEvent(id, {
    type: eventType,
    actor: "student",
    actorUserId: req.user.userId,
    status: transaction.status,
    detail:
      eventType === TRANSACTION_EVENTS.CHECKOUT_OPENED
        ? "Student opened the gateway checkout"
        : "Student closed the checkout without completing payment",
  });

  return res.status(200).json({ success: true });
});
