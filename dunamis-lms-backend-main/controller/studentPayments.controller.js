const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const Student = require("../model/student.model");
const PaymentTransaction = require("../model/paymentTransaction.model");
const {
  buildPricingForPlan,
  loadValidatedEnrollmentContext,
  getPayableInstallments,
} = require("../services/enrollmentService");
const { buildFeesSummary, serializeOrder } = require("../services/studentFees");
const {
  findActiveEnrollmentTransaction,
  createCashfreeEnrollmentTransaction,
  getCashfreeErrorMessage,
  recordTransactionEvent,
  TRANSACTION_EVENTS,
} = require("../services/paymentService");

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

exports.getFeesSummary = asyncHandler(async (req, res) => {
  if (!studentOnly(req, res)) return;

  const userId = new mongoose.Types.ObjectId(req.user.userId);
  const student = await Student.findOne({ userId })
    .populate("payments.courseId", "name code")
    .populate("enrolledCourses.courseId", "name code mode");

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  return res.status(200).json({ success: true, ...(await buildFeesSummary(student)) });
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

  // The tenure the learner signed up on, not the installment count — past the
  // tenure of a running course those diverge, and installmentTotal would no
  // longer resolve to a real plan.
  const pricing = buildPricingForPlan(
    context.course,
    payment.sessionType,
    "monthly",
    payment.planMonths || payment.installmentTotal
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
      courseType: transaction.courseType || "fixed",
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
