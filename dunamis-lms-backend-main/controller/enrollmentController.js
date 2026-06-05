const crypto = require("crypto");
const mongoose = require("mongoose");
const Course = require("../model/course.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const PaymentTransaction = require("../model/paymentTransaction.model");
const updateTeacherStats = require("../utils/updateTeacherStats");
const {
  getAdminUsers,
  notifyUsers,
} = require("../utils/notificationService");
const {
  API_VERSION: CASHFREE_API_VERSION,
  getCashfreeMode,
  createCashfreeOrder,
  getCashfreeOrder,
  getCashfreePaymentsForOrder,
  verifyCashfreeWebhookSignature,
} = require("../utils/cashfreeClient");
require("dotenv").config();

const ACTIVE_TRANSACTION_STATUSES = [
  "created",
  "pending",
  "paid",
  "paid_pending_fulfillment",
  "fulfilled",
];

const ENROLLMENT_RETURN_URL =
  process.env.CASHFREE_RETURN_URL ||
  "https://dunamisindia.co.in/payment-confirmation?order_id={order_id}";

const formatMoney = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

const normalizeMode = (value) => {
  const mode = String(value || "").trim().toLowerCase();
  return ["online", "offline"].includes(mode) ? mode : null;
};

const resolvePlanType = (value) =>
  String(value || "").trim().toLowerCase() === "monthly" ? "monthly" : "full";

const findTenurePlan = (selectedPrice, planMonths) => {
  const months = Number(planMonths);
  if (!Number.isFinite(months) || months <= 0) return null;
  const plans = Array.isArray(selectedPrice.tenurePlans)
    ? selectedPrice.tenurePlans
    : [];
  return (
    plans.find(
      (p) => Number(p.months) === months && (p.isActive ?? true)
    ) || null
  );
};

// planMonths: optional chosen fixed-duration plan (3 / 6 / 12). When present
// and the course has a matching active tenure plan, pricing is taken from that
// plan. Otherwise we fall back to the legacy top-level pricing fields so older
// courses and existing flows keep working unchanged.
const buildPricingForPlan = (course, sessionType, planType, planMonths = null) => {
  const selectedPrice = course.price.find((p) => p.sessionType === sessionType);
  if (!selectedPrice) {
    return { error: "Invalid session type" };
  }

  const tenurePlan = findTenurePlan(selectedPrice, planMonths);

  // ---- Fixed-duration tenure plan selected ----
  if (tenurePlan) {
    const months = Number(tenurePlan.months) || 1;

    if (planType === "monthly") {
      const monthly = Number(tenurePlan.monthlyFee);
      if (!monthly || monthly <= 0) {
        return { error: "Invalid monthly fee for the selected plan" };
      }
      return {
        selectedPrice,
        amount: monthly,
        paymentType: "Installment",
        planMonths: months,
        installmentTotal: months,
        installmentAmount: monthly,
      };
    }

    const full = Number(tenurePlan.fullPayment);
    if (!full || full <= 0) {
      return { error: "Invalid full payment for the selected plan" };
    }
    return {
      selectedPrice,
      amount: full,
      paymentType: "Full",
      planMonths: months,
      installmentTotal: 1,
      installmentAmount: null,
    };
  }

  // ---- Legacy fallback (no tenure plan chosen / available) ----
  if (planType === "monthly") {
    const installments = Number(selectedPrice.installments) || 1;
    const amount = Number(selectedPrice.monthlyFee);

    if (!amount || amount <= 0) {
      return { error: "Invalid monthly fee amount" };
    }

    return {
      selectedPrice,
      amount,
      paymentType: "Installment",
      planMonths: null,
      installmentTotal: installments,
      installmentAmount: amount,
    };
  }

  const amount = Number(selectedPrice.fullPayment);
  if (!amount || amount <= 0) {
    return { error: "Invalid course price" };
  }

  return {
    selectedPrice,
    amount,
    paymentType: "Full",
    planMonths: null,
    installmentTotal: 1,
    installmentAmount: null,
  };
};

const isStudentRequest = (req) => req.user?.accountType === "student";

const studentOnlyResponse = (res) =>
  res.status(403).json({
    success: false,
    message: "Only student accounts can enroll in courses",
  });

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

const amountMatches = (left, right) =>
  Math.abs(Number(left || 0) - Number(right || 0)) < 0.01;

const getCashfreeErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.code || error.message;

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

const syncSlotStudentCount = async (slot) => {
  if (!slot) return null;

  const actualCount = Array.isArray(slot.students) ? slot.students.length : 0;
  if (Number(slot.currentStudentsCount || 0) !== actualCount) {
    await Slot.updateOne(
      { _id: slot._id },
      { $set: { currentStudentsCount: actualCount } }
    );
    slot.currentStudentsCount = actualCount;
  }

  return slot;
};

const loadValidatedEnrollmentContext = async ({
  courseId,
  teacherId,
  slotId,
  sessionType,
  deliveryMode,
  branchId,
  allowExistingStudentId,
}) => {
  if (
    !mongoose.isValidObjectId(courseId) ||
    !mongoose.isValidObjectId(teacherId) ||
    !mongoose.isValidObjectId(slotId) ||
    (branchId && !mongoose.isValidObjectId(branchId))
  ) {
    return { error: { status: 400, message: "Invalid enrollment identifier" } };
  }

  const course = await Course.findById(courseId).populate("teacher");
  if (!course) {
    return { error: { status: 404, message: "Course not found" } };
  }

  if (!course.teacher.some((teacher) => teacher._id.toString() === teacherId)) {
    return {
      error: { status: 400, message: "Teacher does not teach this course" },
    };
  }

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    return { error: { status: 404, message: "Teacher not found" } };
  }

  const slot = await syncSlotStudentCount(await Slot.findById(slotId));
  if (!slot) {
    return { error: { status: 404, message: "Slot not found" } };
  }

  if (slot.courseId?.toString() !== courseId) {
    return {
      error: { status: 400, message: "Selected slot is not for this course" },
    };
  }

  if (slot.createdBy?.toString() !== teacherId) {
    return {
      error: {
        status: 400,
        message: "Selected slot does not belong to the chosen teacher",
      },
    };
  }

  if (slot.slotType !== "enrolled") {
    return {
      error: {
        status: 400,
        message: "This slot is not available for enrollment",
      },
    };
  }

  if (slot.sessionType !== sessionType) {
    return { error: { status: 400, message: "Slot sessionType mismatch" } };
  }

  const resolvedMode = normalizeMode(deliveryMode) || course.mode || "online";
  if (course.mode && resolvedMode !== course.mode) {
    return {
      error: { status: 400, message: "Delivery mode does not match this course" },
    };
  }

  const resolvedBranchId = branchId || slot.branchId?.toString() || null;
  if (resolvedMode === "offline") {
    if (!resolvedBranchId) {
      return {
        error: { status: 400, message: "branchId is required for offline enrollment" },
      };
    }

    if (!slot.branchId || slot.branchId.toString() !== resolvedBranchId) {
      return {
        error: {
          status: 400,
          message: "Selected slot does not belong to the chosen branch",
        },
      };
    }
  }

  const alreadyAssignedToSlot = (slot.students || []).some(
    (studentId) => String(studentId) === String(allowExistingStudentId || "")
  );

  if (
    !alreadyAssignedToSlot &&
    Number(slot.currentStudentsCount || 0) >= Number(slot.maxStudents || 0)
  ) {
    return { error: { status: 400, message: "Selected slot is already full" } };
  }

  return { course, teacher, slot, resolvedMode, resolvedBranchId };
};

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

const buildCashfreeOrderPayload = ({ transaction, user, course }) => {
  const customerPhone = normalizePhone(user.mobileNo || user.phone);
  if (!customerPhone) {
    throw new Error("A valid 10 digit mobile number is required for payment");
  }

  return {
    order_id: transaction.merchantOrderId,
    order_amount: transaction.amount,
    order_currency: transaction.currency,
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

const serializeOrderResponse = (transaction) => ({
  gateway: "cashfree",
  id: transaction.merchantOrderId,
  orderId: transaction.merchantOrderId,
  cashfreeOrderId: transaction.merchantOrderId,
  cfOrderId: transaction.cashfreeCfOrderId,
  paymentSessionId: transaction.paymentSessionId,
  amount: transaction.amount,
  currency: transaction.currency,
  mode: getCashfreeMode(),
});

const createCashfreeEnrollmentTransaction = async ({
  student,
  context,
  pricing,
  planType,
  installmentNo = 1,
  dueDate = new Date(),
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

const mapStudentPaymentMode = (paymentGroup) => {
  const group = String(paymentGroup || "").toLowerCase();
  if (group.includes("upi")) return "UPI";
  if (group.includes("debit")) return "Debit Card";
  if (group.includes("credit")) return "Credit Card";
  if (group.includes("net")) return "Net Banking";
  return "Other";
};

const getNextInstallmentDueDate = (transaction) => {
  if (
    transaction.paymentType !== "Installment" ||
    transaction.installmentNo >= transaction.installmentTotal
  ) {
    return null;
  }

  const baseDate = transaction.paidAt || new Date();
  const nextDueDate = new Date(baseDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  return nextDueDate;
};

const getOverdueInstallmentPayments = (student) => {
  const now = new Date();
  const latestByEnrollment = new Map();

  (student?.payments || [])
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

  return [...latestByEnrollment.values()].filter(
    (payment) =>
      payment.monthlyPaymentStatus === "pending" && new Date(payment.dueDate) < now
  );
};

const buildPaymentAccessStatus = (student) => {
  const overduePayments = getOverdueInstallmentPayments(student).map((payment) => ({
    courseId: payment.courseId?._id || payment.courseId || null,
    courseName: payment.courseId?.name || "Course",
    courseCode: payment.courseId?.code || "",
    amount: payment.installmentAmount || payment.amount,
    dueDate: payment.dueDate,
    installmentNo: payment.installmentNo,
    installmentTotal: payment.installmentTotal,
  }));

  return {
    accessRestricted: overduePayments.length > 0,
    reason: overduePayments.length > 0 ? "installment_overdue" : null,
    message:
      overduePayments.length > 0
        ? "Course access is restricted until the overdue installment is paid."
        : "Course access is active.",
    overduePayments,
  };
};

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

const addStudentToSlot = async (transaction) => {
  const slot = await syncSlotStudentCount(await Slot.findById(transaction.slotId));
  if (!slot) throw new Error("Selected slot no longer exists");

  const alreadyInSlot = (slot.students || []).some(
    (studentId) => studentId.toString() === transaction.studentId.toString()
  );
  if (alreadyInSlot) return true;

  const result = await Slot.updateOne(
    {
      _id: transaction.slotId,
      students: { $ne: transaction.studentId },
      currentStudentsCount: { $lt: slot.maxStudents },
    },
    {
      $addToSet: { students: transaction.studentId },
      $inc: { currentStudentsCount: 1 },
    }
  );

  if (result.modifiedCount === 1) return true;

  const freshSlot = await syncSlotStudentCount(await Slot.findById(transaction.slotId));
  const studentWasAdded = (freshSlot?.students || []).some(
    (studentId) => studentId.toString() === transaction.studentId.toString()
  );

  if (studentWasAdded) return true;
  throw new Error("Selected slot is full. Payment requires manual fulfillment.");
};

const applyStudentFulfillment = async (transaction) => {
  const nextInstallmentDueDate = getNextInstallmentDueDate(transaction);
  const paymentSnapshot = {
    courseId: transaction.courseId,
    amount: transaction.amount,
    PaymentStatus: "completed",
    sessionType: transaction.sessionType,
    teacherId: transaction.teacherId,
    slotId: transaction.slotId,
    parentAvailabilityId: transaction.parentAvailabilityId || null,
    branchId: transaction.branchId || null,
    deliveryMode: transaction.deliveryMode,
    planType: transaction.planType,
    paymentType: transaction.paymentType,
    installmentNo: transaction.installmentNo,
    installmentTotal: transaction.installmentTotal,
    installmentAmount: transaction.installmentAmount,
    dueDate: nextInstallmentDueDate,
    paymentMode: mapStudentPaymentMode(transaction.paymentMode),
    transactionId: transaction.cashfreePaymentId || transaction.merchantOrderId,
    paidAt: transaction.paidAt || new Date(),
    feeStatus: "Paid",
    monthlyPaymentStatus:
      transaction.paymentType === "Installment" &&
      transaction.installmentNo < transaction.installmentTotal
        ? "pending"
        : "completed",
    paymentGateway: "cashfree",
    transactionRef: transaction._id,
    cashfreeOrderId: transaction.merchantOrderId,
    cashfreeCfOrderId: transaction.cashfreeCfOrderId,
    cashfreePaymentSessionId: transaction.paymentSessionId,
    cashfreePaymentId: transaction.cashfreePaymentId,
    cashfreeOrderStatus: transaction.cashfreeOrderStatus,
    cashfreePaymentStatus: transaction.cashfreePaymentStatus,
  };

  await Student.updateOne(
    {
      _id: transaction.studentId,
      "payments.transactionRef": { $ne: transaction._id },
      "payments.cashfreeOrderId": { $ne: transaction.merchantOrderId },
    },
    { $push: { payments: paymentSnapshot } }
  );

  await Student.updateOne(
    {
      _id: transaction.studentId,
      "enrolledCourses.courseId": { $ne: transaction.courseId },
    },
    {
      $push: {
        enrolledCourses: {
          courseId: transaction.courseId,
          progress: 0,
          status: "in-progress",
          completedAt: null,
          slotId: transaction.slotId,
          joinedAt: new Date(),
        },
      },
    }
  );

  await Student.updateOne(
    {
      _id: transaction.studentId,
      enrolledCourses: {
        $elemMatch: {
          courseId: transaction.courseId,
          $or: [{ slotId: null }, { slotId: { $exists: false } }],
        },
      },
    },
    {
      $set: {
        "enrolledCourses.$.slotId": transaction.slotId,
        "enrolledCourses.$.joinedAt": new Date(),
      },
    }
  );

  const studentSet = {};
  if (transaction.deliveryMode) studentSet.mode = transaction.deliveryMode;
  if (transaction.branchId) studentSet.branch = transaction.branchId;
  if (Object.keys(studentSet).length > 0) {
    await Student.updateOne({ _id: transaction.studentId }, { $set: studentSet });
  }
};

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
    const [student, course, teacher, admins] = await Promise.all([
      Student.findById(transaction.studentId).populate("userId"),
      Course.findById(transaction.courseId),
      Teacher.findById(transaction.teacherId).populate("userId"),
      getAdminUsers(),
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
      teacher?.userId
        ? notifyUsers({
            title: "New paid enrollment",
            message: `${studentName} has completed payment for ${course.name}.`,
            users: [teacher.userId],
            subject: `New paid enrollment: ${course.name}`,
            html: paymentReceiptEmailTemplate({
              ...commonContext,
              title: "New paid enrollment",
              intro: "A student has completed payment for a course assigned to you.",
            }),
            creatorId: student.userId._id,
          })
        : Promise.resolve(),
      notifyUsers({
        title:
          transaction.status === "paid_pending_fulfillment"
            ? "Payment needs fulfillment review"
            : "New payment received",
        message: `${studentName} paid ${formatMoney(transaction.amount)} for ${course.name}.`,
        users: admins,
        subject: `Cashfree payment received: ${course.name}`,
        html: paymentReceiptEmailTemplate({
          ...commonContext,
          title: "Cashfree payment received",
          intro:
            transaction.status === "paid_pending_fulfillment"
              ? "Payment is verified, but the enrollment needs manual fulfillment review."
              : "A course payment has been verified and fulfilled.",
        }),
        creatorId: student.userId._id,
      }),
    ]);
  } catch (error) {
    console.error("Failed to send enrollment notifications:", error.message);
  }
};

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

exports.createOrder = async (req, res) => {
  try {
    const {
      courseId,
      sessionType,
      teacherId,
      slotId,
      planType,
      planMonths,
      deliveryMode,
      branchId,
    } = req.body;
    if (!isStudentRequest(req)) return studentOnlyResponse(res);

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const resolvedPlanType = resolvePlanType(planType);

    if (!courseId || !sessionType || !teacherId || !slotId) {
      return res.status(400).json({
        success: false,
        message: "Course, sessionType, teacherId, and slotId are required",
      });
    }

    const student = await Student.findOne({ userId }).populate("userId");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const context = await loadValidatedEnrollmentContext({
      courseId,
      teacherId,
      slotId,
      sessionType,
      deliveryMode,
      branchId,
    });
    if (context.error) {
      return res
        .status(context.error.status)
        .json({ success: false, message: context.error.message });
    }

    const pricing = buildPricingForPlan(
      context.course,
      sessionType,
      resolvedPlanType,
      planMonths
    );
    if (pricing.error) {
      return res.status(400).json({ success: false, message: pricing.error });
    }

    const activeTransaction = await findActiveEnrollmentTransaction({
      studentId: student._id,
      courseId,
      slotId,
      sessionType,
      paymentType: pricing.paymentType,
      installmentNo: 1,
    });

    if (activeTransaction) {
      if (activeTransaction.status === "pending" && activeTransaction.paymentSessionId) {
        return res.status(200).json({
          success: true,
          message: "Existing pending order returned",
          planType: activeTransaction.planType,
          paymentType: activeTransaction.paymentType,
          transactionId: activeTransaction._id,
          order: serializeOrderResponse(activeTransaction),
        });
      }

      return res.status(400).json({
        success: false,
        message: "An active payment already exists for this enrollment",
      });
    }

    const transaction = await createCashfreeEnrollmentTransaction({
      student,
      context,
      pricing,
      planType: resolvedPlanType,
      installmentNo: 1,
    });

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      planType: resolvedPlanType,
      paymentType: pricing.paymentType,
      transactionId: transaction._id,
      order: serializeOrderResponse(transaction),
    });
  } catch (error) {
    console.error("Error creating Cashfree order:", getCashfreeErrorMessage(error));
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: getCashfreeErrorMessage(error),
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    if (!isStudentRequest(req)) return studentOnlyResponse(res);

    const orderId =
      req.body.cashfree_order_id || req.body.order_id || req.body.merchantOrderId;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Cashfree order ID is required",
      });
    }

    const transaction = await PaymentTransaction.findOne({ merchantOrderId: orderId });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Payment transaction not found",
      });
    }

    if (transaction.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You cannot verify another student's payment",
      });
    }

    if (transaction.status === "fulfilled") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified and course enrolled",
        transactionStatus: transaction.status,
      });
    }

    const order = await getCashfreeOrder(orderId);
    const payments = await getCashfreePaymentsForOrder(orderId).catch(() => []);
    const successfulPayment = getSuccessfulPayment(payments);

    const confirmed = await confirmPaidCashfreeOrder({
      transaction,
      order,
      payment: successfulPayment,
    });

    if (!confirmed.paid) {
      return res.status(400).json({
        success: false,
        message: "Payment is not completed yet",
        cashfreeOrderStatus: order.order_status,
        latestPaymentStatus: getLatestPayment(payments)?.payment_status || null,
      });
    }

    if (!confirmed.fulfillment.fulfilled) {
      const courseAccessGranted = Boolean(confirmed.fulfillment.coreFulfilled);
      return res.status(courseAccessGranted ? 200 : 202).json({
        success: true,
        message:
          courseAccessGranted
            ? "Payment verified and course access enabled. Slot assignment needs manual review."
            : "Payment verified, but enrollment needs manual fulfillment. Support has been notified.",
        transactionStatus: confirmed.transaction.status,
        fulfillmentError: confirmed.fulfillment.error,
        courseAccessGranted,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and course enrolled successfully",
      transactionStatus: confirmed.transaction.status,
      orderId: confirmed.transaction.merchantOrderId,
      paymentId: confirmed.transaction.cashfreePaymentId,
      planType: confirmed.transaction.planType,
      paymentType: confirmed.transaction.paymentType,
      installmentNo: confirmed.transaction.installmentNo,
      monthlyPaymentStatus:
        confirmed.transaction.paymentType === "Installment" &&
        confirmed.transaction.installmentNo < confirmed.transaction.installmentTotal
          ? "pending"
          : "completed",
    });
  } catch (error) {
    console.error("Error verifying Cashfree payment:", getCashfreeErrorMessage(error));
    return res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: getCashfreeErrorMessage(error),
    });
  }
};

exports.handleCashfreeWebhook = async (req, res) => {
  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : typeof req.body === "string"
      ? req.body
      : null;

    if (!rawBody) {
      return res.status(400).json({ success: false, message: "Raw body required" });
    }

    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    const webhookVersion = req.headers["x-webhook-version"];
    const idempotencyKey = req.headers["x-idempotency-key"];

    if (webhookVersion && webhookVersion !== CASHFREE_API_VERSION) {
      return res.status(400).json({ success: false, message: "Invalid webhook version" });
    }

    const signatureValid = verifyCashfreeWebhookSignature({
      signature,
      timestamp,
      rawBody,
    });
    if (!signatureValid) {
      return res.status(401).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = JSON.parse(rawBody);
    const orderId = event?.data?.order?.order_id;
    const payment = event?.data?.payment || null;
    const webhookKey =
      idempotencyKey ||
      `${event?.type || "cashfree"}:${orderId || "unknown"}:${payment?.cf_payment_id || timestamp}`;

    if (!orderId) {
      return res.status(200).json({ success: true, message: "Webhook has no order ID" });
    }

    const transaction = await PaymentTransaction.findOne({ merchantOrderId: orderId });
    if (!transaction) {
      return res.status(200).json({ success: true, message: "Order not found locally" });
    }

    const webhookUpdate = await PaymentTransaction.updateOne(
      { _id: transaction._id, webhookEventKeys: { $ne: webhookKey } },
      {
        $addToSet: { webhookEventKeys: webhookKey },
        $push: {
          webhookEvents: {
            idempotencyKey: webhookKey,
            type: event.type,
            eventTime: event.event_time ? new Date(event.event_time) : new Date(),
            paymentStatus: payment?.payment_status || null,
            receivedAt: new Date(),
          },
        },
      }
    );

    if (webhookUpdate.modifiedCount === 0) {
      return res.status(200).json({ success: true, message: "Duplicate webhook ignored" });
    }

    if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {
      const order = await getCashfreeOrder(orderId);
      const payments = await getCashfreePaymentsForOrder(orderId).catch(() => []);
      const successfulPayment = getSuccessfulPayment(payments) || payment;
      const latestTransaction = await PaymentTransaction.findById(transaction._id);
      await confirmPaidCashfreeOrder({
        transaction: latestTransaction,
        order,
        payment: successfulPayment,
      });
    } else if (event.type === "PAYMENT_FAILED_WEBHOOK") {
      await PaymentTransaction.updateOne(
        { _id: transaction._id, status: { $in: ["created", "pending"] } },
        {
          $set: {
            status: "failed",
            failedAt: new Date(),
            cashfreePaymentId: payment?.cf_payment_id?.toString() || null,
            cashfreePaymentStatus: payment?.payment_status || "FAILED",
            paymentMode: payment?.payment_group || transaction.paymentMode,
            lastError:
              event?.data?.error_details?.error_description ||
              payment?.payment_message ||
              "Payment failed",
          },
        }
      );
    } else if (event.type === "PAYMENT_USER_DROPPED_WEBHOOK") {
      await PaymentTransaction.updateOne(
        { _id: transaction._id, status: { $in: ["created", "pending"] } },
        {
          $set: {
            status: "dropped",
            failedAt: new Date(),
            cashfreePaymentId: payment?.cf_payment_id?.toString() || null,
            cashfreePaymentStatus: payment?.payment_status || "USER_DROPPED",
            paymentMode: payment?.payment_group || transaction.paymentMode,
            lastError: payment?.payment_message || "User dropped payment",
          },
        }
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error processing Cashfree webhook:", getCashfreeErrorMessage(error));
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};

exports.getEnrolledCourses = async (req, res) => {
  try {
    if (!isStudentRequest(req)) return studentOnlyResponse(res);

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const student = await Student.findOne({ userId }).populate({
      path: "enrolledCourses.courseId",
      populate: [
        { path: "category", select: "name" },
        { path: "subCategory", select: "name" },
        { path: "teacher", select: "name" },
      ],
    }).populate("payments.courseId", "name code");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const accessStatus = buildPaymentAccessStatus(student);
    if (accessStatus.accessRestricted) {
      return res.status(402).json({
        success: false,
        ...accessStatus,
      });
    }

    const courses = student.enrolledCourses
      .map((course) => course.courseId)
      .filter((course) => course !== null);

    return res.status(200).json({
      success: true,
      message: "Enrolled courses fetched successfully",
      courses,
    });
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrolled courses",
      error: error.message,
    });
  }
};

exports.getPaymentAccessStatus = async (req, res) => {
  try {
    if (!isStudentRequest(req)) return studentOnlyResponse(res);

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const student = await Student.findOne({ userId }).populate(
      "payments.courseId",
      "name code"
    );

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    return res.status(200).json({
      success: true,
      ...buildPaymentAccessStatus(student),
    });
  } catch (error) {
    console.error("Error fetching payment access status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment access status",
      error: error.message,
    });
  }
};

exports.createNextInstallmentOrder = async (req, res) => {
  try {
    if (!isStudentRequest(req)) return studentOnlyResponse(res);

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const { courseId, slotId, sessionType } = req.body || {};

    const student = await Student.findOne({ userId }).populate("userId");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const overduePayments = getOverdueInstallmentPayments(student);
    const overduePayment = overduePayments.find((payment) => {
      if (courseId && String(payment.courseId) !== String(courseId)) return false;
      if (slotId && String(payment.slotId) !== String(slotId)) return false;
      if (sessionType && payment.sessionType !== sessionType) return false;
      return true;
    });

    if (!overduePayment) {
      return res.status(400).json({
        success: false,
        message: "No overdue installment was found for this student",
      });
    }

    const nextInstallmentNo = Number(overduePayment.installmentNo || 0) + 1;
    const installmentTotal = Number(overduePayment.installmentTotal || 1);
    if (nextInstallmentNo > installmentTotal) {
      return res.status(400).json({
        success: false,
        message: "All installments are already paid for this course",
      });
    }

    const context = await loadValidatedEnrollmentContext({
      courseId: overduePayment.courseId.toString(),
      teacherId: overduePayment.teacherId.toString(),
      slotId: overduePayment.slotId.toString(),
      sessionType: overduePayment.sessionType,
      deliveryMode: overduePayment.deliveryMode,
      branchId: overduePayment.branchId?.toString(),
      allowExistingStudentId: student._id,
    });
    if (context.error) {
      return res
        .status(context.error.status)
        .json({ success: false, message: context.error.message });
    }

    const pricing = buildPricingForPlan(context.course, overduePayment.sessionType, "monthly");
    if (pricing.error) {
      return res.status(400).json({ success: false, message: pricing.error });
    }

    const existingTransaction = await findActiveEnrollmentTransaction({
      studentId: student._id,
      courseId: overduePayment.courseId,
      slotId: overduePayment.slotId,
      sessionType: overduePayment.sessionType,
      paymentType: "Installment",
      installmentNo: nextInstallmentNo,
    });

    if (existingTransaction?.status === "pending" && existingTransaction.paymentSessionId) {
      return res.status(200).json({
        success: true,
        message: "Existing pending installment order returned",
        transactionId: existingTransaction._id,
        order: serializeOrderResponse(existingTransaction),
      });
    }

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: "An active installment payment already exists",
      });
    }

    const transaction = await createCashfreeEnrollmentTransaction({
      student,
      context,
      pricing,
      planType: "monthly",
      installmentNo: nextInstallmentNo,
      dueDate: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Installment order created successfully",
      transactionId: transaction._id,
      order: serializeOrderResponse(transaction),
    });
  } catch (error) {
    console.error("Error creating next installment order:", getCashfreeErrorMessage(error));
    return res.status(500).json({
      success: false,
      message: "Failed to create installment order",
      error: getCashfreeErrorMessage(error),
    });
  }
};

exports.generateInstallmentOrders = async (req, res) => {
  try {
    const { courseId, sessionType, teacherId, slotId, deliveryMode, branchId, planMonths } = req.body;
    if (!isStudentRequest(req)) return studentOnlyResponse(res);

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    if (!courseId || !sessionType || !teacherId || !slotId) {
      return res.status(400).json({
        success: false,
        message: "All enrollment details are required",
      });
    }

    const student = await Student.findOne({ userId }).populate("userId");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const context = await loadValidatedEnrollmentContext({
      courseId,
      teacherId,
      slotId,
      sessionType,
      deliveryMode,
      branchId,
    });
    if (context.error) {
      return res
        .status(context.error.status)
        .json({ success: false, message: context.error.message });
    }

    const pricing = buildPricingForPlan(context.course, sessionType, "monthly", planMonths);
    if (pricing.error) {
      return res.status(400).json({ success: false, message: pricing.error });
    }

    const createdTransactions = [];
    for (let installmentNo = 1; installmentNo <= pricing.installmentTotal; installmentNo += 1) {
      const existing = await findActiveEnrollmentTransaction({
        studentId: student._id,
        courseId,
        slotId,
        sessionType,
        paymentType: "Installment",
        installmentNo,
      });
      if (existing) continue;

      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + installmentNo - 1);

      const transaction = await createCashfreeEnrollmentTransaction({
        student,
        context,
        pricing,
        planType: "monthly",
        installmentNo,
        dueDate,
      });
      createdTransactions.push(transaction);
    }

    if (createdTransactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All installment orders already generated for this course.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Installment orders generated successfully",
      installments: createdTransactions.length,
      orders: createdTransactions.map((transaction) => ({
        cashfreeOrderId: transaction.merchantOrderId,
        paymentSessionId: transaction.paymentSessionId,
        installmentNo: transaction.installmentNo,
        amount: transaction.amount,
        dueDate: transaction.dueDate,
      })),
    });
  } catch (error) {
    console.error("Error generating Cashfree installment orders:", getCashfreeErrorMessage(error));
    return res.status(500).json({ success: false, message: getCashfreeErrorMessage(error) });
  }
};
