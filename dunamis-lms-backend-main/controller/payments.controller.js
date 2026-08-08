const crypto = require("crypto");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const PaymentTransaction = require("../model/paymentTransaction.model");
const Student = require("../model/student.model");
const User = require("../model/user.model");
// Required as a module object, not destructured: the tests patch these exports
// after load, which only works if the lookup happens at call time.
const cashfree = require("../utils/cashfreeClient");
const {
  getSuccessfulPayment,
  confirmPaidCashfreeOrder,
  getCashfreeErrorMessage,
  findActiveEnrollmentTransaction,
  fulfillPaidTransaction,
  amountMatches,
  formatMoney,
  recordTransactionEvent,
  TRANSACTION_EVENTS,
} = require("../services/paymentService");
const {
  aggregateOutstandingInstallments,
  getPayableInstallments,
} = require("../services/enrollmentService");
const { istDayStart, istDayEndExclusive } = require("../utils/istMonth");

const PAID_GRACE_MS = 15 * 60 * 1000;
const STALE_PENDING_MS = 2 * 60 * 60 * 1000;
const CRITICAL_REASONS = ["unfulfilled_after_payment", "paid_never_fulfilled"];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// `dropped`/`failed` are deliberately absent — every genuinely-failed payment
// would land here and drown the signal. The reconciler scans those instead and
// promotes any that Cashfree reports as PAID.
const buildNeedsAttentionMatch = (now) => ({
  $or: [
    { status: "paid_pending_fulfillment" },
    { status: "paid", fulfilledAt: null, paidAt: { $lt: new Date(now.getTime() - PAID_GRACE_MS) } },
    { status: { $in: ["created", "pending"] }, expiresAt: { $lte: now } },
    { status: { $in: ["created", "pending"] }, createdAt: { $lt: new Date(now.getTime() - STALE_PENDING_MS) } },
  ],
});

const reasonExpr = (now) => ({
  $switch: {
    branches: [
      { case: { $eq: ["$status", "paid_pending_fulfillment"] }, then: "unfulfilled_after_payment" },
      { case: { $eq: ["$status", "paid"] }, then: "paid_never_fulfilled" },
      {
        case: { $and: [{ $ne: ["$expiresAt", null] }, { $lte: ["$expiresAt", now] }] },
        then: "expired_unpaid",
      },
    ],
    default: "stale_pending",
  },
});

const decorateStages = (now) => [
  { $addFields: { reason: reasonExpr(now) } },
  {
    $addFields: {
      severity: { $cond: [{ $in: ["$reason", CRITICAL_REASONS] }, "critical", "low"] },
      ageMs: { $subtract: [now, { $ifNull: ["$paidAt", "$createdAt"] }] },
    },
  },
];

// Shared row projection for the ledger and the attention queue.
const studentProjection = {
  $let: {
    vars: { s: { $first: "$student" } },
    in: {
      _id: "$$s._id",
      name: {
        $trim: {
          input: {
            $concat: [
              { $ifNull: ["$$s.u.name.firstName", ""] },
              " ",
              { $ifNull: ["$$s.u.name.lastName", ""] },
            ],
          },
        },
      },
      email: "$$s.u.email",
      phone: "$$s.u.mobileNo",
    },
  },
};

const studentLookup = {
  $lookup: {
    from: "students",
    localField: "studentId",
    foreignField: "_id",
    pipeline: [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, email: 1, mobileNo: 1 } }],
          as: "u",
        },
      },
      { $project: { u: { $first: "$u" } } },
    ],
    as: "student",
  },
};

const courseLookup = {
  $lookup: {
    from: "courses",
    localField: "courseId",
    foreignField: "_id",
    pipeline: [{ $project: { name: 1, code: 1 } }],
    as: "course",
  },
};

const branchLookup = {
  $lookup: {
    from: "branches",
    localField: "branchId",
    foreignField: "_id",
    pipeline: [{ $project: { branchName: 1 } }],
    as: "branch",
  },
};

// Resolved BEFORE the aggregation on purpose. A post-$lookup $match on student
// name cannot use an index and forces the lookup to run on every candidate row;
// resolving to studentIds first keeps the main $match index-eligible.
const buildSearchMatch = async (raw) => {
  const term = String(raw).trim();

  // Order/payment ids are exact and indexed — never fan out to a person lookup.
  if (/^(dnm_|manual_)/i.test(term)) return { merchantOrderId: term };
  if (/^\d{6,}$/.test(term)) return { cashfreePaymentId: term };

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "i");

  const users = await User.find({
    $or: [{ "name.firstName": re }, { "name.lastName": re }, { email: re }],
  })
    .select("_id")
    .limit(500)
    .lean();

  if (!users.length) return { _id: null }; // guaranteed-empty, skips the scan

  const students = await Student.find({ userId: { $in: users.map((u) => u._id) } })
    .select("_id")
    .limit(2000)
    .lean();

  if (!students.length) return { _id: null };
  return { studentId: { $in: students.map((s) => s._id) } };
};

exports.listPayments = asyncHandler(async (req, res) => {
  const q = req.validated?.query || {};
  const page = q.page || 1;
  const limit = Math.min(MAX_LIMIT, q.limit || DEFAULT_LIMIT);
  const dateField = q.dateField || "createdAt";
  const sortField = q.sort || (dateField === "paidAt" ? "paidAt" : "createdAt");
  const dir = q.dir === "asc" ? 1 : -1;

  const match = {};
  if (q.status?.length) match.status = { $in: q.status };
  if (q.gateway) match.gateway = q.gateway;
  if (q.deliveryMode) match.deliveryMode = q.deliveryMode;
  if (q.paymentType) match.paymentType = q.paymentType;
  if (q.courseId) match.courseId = q.courseId;
  if (q.branchId) match.branchId = q.branchId;
  if (q.studentId) match.studentId = q.studentId;
  if (q.teacherId) match.teacherId = q.teacherId;

  // Date filters are IST calendar days. dateTo is inclusive of the day the
  // admin picked, so it becomes an exclusive bound at the start of the next.
  const range = {};
  if (q.dateFrom) range.$gte = istDayStart(q.dateFrom);
  if (q.dateTo) range.$lt = istDayEndExclusive(q.dateTo);
  const hasRange = Object.keys(range).length > 0;

  // `recognized` needs an index-eligible $or pre-match before the exact filter,
  // the same trick buildRevenueFacet uses.
  if (hasRange && dateField === "recognized") {
    match.$or = [{ paidAt: range }, { createdAt: range }];
  } else if (hasRange) {
    match[dateField] = range;
  }

  if (q.search) Object.assign(match, await buildSearchMatch(q.search));

  const recognizedStages =
    hasRange && dateField === "recognized"
      ? [
          { $addFields: { recognizedAt: { $ifNull: ["$paidAt", "$createdAt"] } } },
          { $match: { recognizedAt: range } },
        ]
      : [];

  const [result] = await PaymentTransaction.aggregate([
    { $match: match },
    ...recognizedStages,
    { $sort: { [sortField]: dir, _id: -1 } }, // _id tiebreak keeps paging stable
    {
      $facet: {
        // $skip/$limit inside the facet so the lookups run on <=100 docs.
        rows: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          studentLookup,
          courseLookup,
          branchLookup,
          {
            $project: {
              merchantOrderId: 1,
              cashfreePaymentId: 1,
              status: 1,
              feeStatus: 1,
              gateway: 1,
              amount: 1,
              gatewayCapturedAmount: 1,
              gatewayOfferDiscount: 1,
              discountAmount: 1,
              referralCode: 1,
              paymentType: 1,
              installmentNo: 1,
              installmentTotal: 1,
              planType: 1,
              planMonths: 1,
              sessionType: 1,
              deliveryMode: 1,
              paymentMode: 1,
              createdAt: 1,
              paidAt: 1,
              coreFulfilledAt: 1,
              fulfilledAt: 1,
              lastError: 1,
              student: studentProjection,
              course: { $first: "$course" },
              branch: { $first: "$branch" },
            },
          },
        ],
        total: [{ $count: "count" }],
        totals: [
          {
            $group: {
              _id: null,
              gross: { $sum: "$amount" },
              captured: { $sum: { $ifNull: ["$gatewayCapturedAmount", "$amount"] } },
              discount: { $sum: { $ifNull: ["$discountAmount", 0] } },
            },
          },
        ],
      },
    },
  ]);

  const total = result?.total?.[0]?.count || 0;
  const totals = result?.totals?.[0] || { gross: 0, captured: 0, discount: 0 };

  res.status(200).json({
    success: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
    totals: { gross: totals.gross, captured: totals.captured, discount: totals.discount },
    rows: result?.rows || [],
  });
});

exports.listDues = asyncHandler(async (req, res) => {
  const q = req.validated?.query || {};
  const page = q.page || 1;
  const limit = Math.min(MAX_LIMIT, q.limit || DEFAULT_LIMIT);
  const asOf = new Date();

  const result = await aggregateOutstandingInstallments({
    asOf,
    page,
    limit,
    bucket: q.bucket || null,
    branchId: q.branchId ? new mongoose.Types.ObjectId(q.branchId) : null,
    courseId: q.courseId ? new mongoose.Types.ObjectId(q.courseId) : null,
    studentId: q.studentId ? new mongoose.Types.ObjectId(q.studentId) : null,
    minDaysLate: q.minDaysLate ?? null,
  });

  const total = result.total?.[0]?.count || 0;
  const totals = result.totals?.[0] || { amount: 0, count: 0, students: 0, maxDaysLate: 0 };

  res.status(200).json({
    success: true,
    asOf,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
    totals,
    aging: result.aging || [],
    rows: result.rows || [],
  });
});

exports.listNeedsAttention = asyncHandler(async (req, res) => {
  const query = req.validated?.query || {};
  const page = query.page || 1;
  const limit = Math.min(MAX_LIMIT, query.limit || DEFAULT_LIMIT);
  const now = new Date();

  const [result] = await PaymentTransaction.aggregate([
    { $match: buildNeedsAttentionMatch(now) },
    ...decorateStages(now),
    ...(query.includeAbandoned ? [] : [{ $match: { severity: "critical" } }]),
    { $addFields: { severityRank: { $cond: [{ $eq: ["$severity", "critical"] }, 0, 1] } } },
    { $sort: { severityRank: 1, ageMs: -1, _id: -1 } },
    {
      $facet: {
        rows: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          studentLookup,
          courseLookup,
          {
            $project: {
              merchantOrderId: 1,
              cashfreePaymentId: 1,
              status: 1,
              gateway: 1,
              amount: 1,
              paymentType: 1,
              installmentNo: 1,
              installmentTotal: 1,
              createdAt: 1,
              paidAt: 1,
              coreFulfilledAt: 1,
              fulfilledAt: 1,
              expiresAt: 1,
              cashfreeOrderStatus: 1,
              reconciledAt: 1,
              reconcileLastStatus: 1,
              lastError: 1,
              reason: 1,
              severity: 1,
              ageMs: 1,
              student: studentProjection,
              course: { $first: "$course" },
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const total = result?.total?.[0]?.count || 0;

  res.status(200).json({
    success: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
    rows: result?.rows || [],
  });
});

exports.getNeedsAttentionCount = asyncHandler(async (req, res) => {
  const now = new Date();

  const rows = await PaymentTransaction.aggregate([
    { $match: buildNeedsAttentionMatch(now) },
    ...decorateStages(now),
    { $group: { _id: "$severity", count: { $sum: 1 } } },
  ]);

  const bySeverity = Object.fromEntries(rows.map((r) => [r._id, r.count]));

  res.status(200).json({
    success: true,
    critical: bySeverity.critical || 0,
    total: (bySeverity.critical || 0) + (bySeverity.low || 0),
  });
});

exports.reverifyPayment = asyncHandler(async (req, res) => {
  const { id } = req.validated?.params || req.params;

  const transaction = await PaymentTransaction.findById(id);
  if (!transaction) {
    return res.status(404).json({ success: false, message: "Payment transaction not found." });
  }
  if (transaction.gateway !== "cashfree") {
    return res.status(400).json({
      success: false,
      message: "Manual transactions have no gateway record to re-verify.",
    });
  }
  if (transaction.status === "refunded") {
    return res.status(409).json({ success: false, message: "This payment has been refunded." });
  }
  if (transaction.status === "fulfilled") {
    return res.status(200).json({
      success: true,
      alreadyFulfilled: true,
      paid: true,
      fulfilled: true,
      status: transaction.status,
    });
  }

  let order;
  let payments;
  try {
    order = await cashfree.getCashfreeOrder(transaction.merchantOrderId);
    payments = await cashfree.getCashfreePaymentsForOrder(transaction.merchantOrderId).catch(() => []);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: getCashfreeErrorMessage(error),
    });
  }

  const result = await confirmPaidCashfreeOrder({
    transaction,
    order,
    payment: getSuccessfulPayment(payments),
  });

  const updated = result.transaction || transaction;

  res.status(200).json({
    success: true,
    paid: result.paid,
    fulfilled: Boolean(result.fulfillment?.fulfilled),
    coreFulfilled: Boolean(updated.coreFulfilledAt),
    status: updated.status,
    cashfreeOrderStatus: order?.order_status || null,
    capturedAmount: updated.gatewayCapturedAmount ?? null,
    gatewayOfferDiscount: updated.gatewayOfferDiscount || 0,
    error: result.fulfillment?.error || null,
  });
});

const IT_SUPPORT_HINT = process.env.IT_SUPPORT_EMAIL
  ? `Contact IT support at ${process.env.IT_SUPPORT_EMAIL} if this issue persists.`
  : "Contact IT support if this issue persists.";

// Cash collected at a centre for an installment the student already owes.
// Deliberately narrower than adminEnrollStudent, which only ever creates
// installment 1 and cannot record a later collection.
exports.recordCashInstallment = asyncHandler(async (req, res) => {
  const { studentId, courseId, slotId, sessionType, amount, paymentDate, receiptRef, note } =
    req.body;

  const student = await Student.findById(studentId).populate("userId");
  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found.",
      hint: IT_SUPPORT_HINT,
    });
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
        "This student has no installment outstanding for that course. Nothing is due to collect.",
    });
  }

  if (matches.length > 1) {
    return res.status(409).json({
      success: false,
      message:
        "This student has more than one enrollment for this course. Pass slotId and sessionType to say which one the cash is for.",
      options: matches.map((entry) => ({
        slotId: entry.payment.slotId,
        sessionType: entry.payment.sessionType,
        amount: entry.amountDue,
        dueDate: entry.dueDate,
        installmentNo: entry.nextInstallmentNo,
      })),
    });
  }

  const entry = matches[0];
  const payment = entry.payment;
  const resolvedCourseId = payment.courseId?._id || payment.courseId;

  // teacherId/slotId are required on PaymentTransaction. Pre-tenure rows can be
  // missing them, which would otherwise surface as an opaque 500.
  if (!payment.teacherId || !payment.slotId) {
    return res.status(409).json({
      success: false,
      message:
        "This enrollment is missing its instructor or batch, so a payment cannot be attached to it.",
      hint: IT_SUPPORT_HINT,
    });
  }

  // Full installment only: a short cash collection must not silently close the
  // installment and roll the due date forward.
  if (!amountMatches(amount, entry.amountDue)) {
    return res.status(400).json({
      success: false,
      message: `The amount due for installment ${entry.nextInstallmentNo} is ${formatMoney(
        entry.amountDue
      )}. Partial cash collections are not supported — record the full installment.`,
      amountDue: entry.amountDue,
    });
  }

  // A live gateway order for the same installment means the student may be
  // paying online right now; collecting cash too would double-charge them.
  const existing = await findActiveEnrollmentTransaction({
    studentId: student._id,
    courseId: resolvedCourseId,
    slotId: payment.slotId,
    sessionType: payment.sessionType,
    paymentType: "Installment",
    installmentNo: entry.nextInstallmentNo,
  });

  if (existing) {
    const alreadyPaid = ["paid", "paid_pending_fulfillment", "fulfilled"].includes(
      existing.status
    );
    return res.status(409).json({
      success: false,
      message: alreadyPaid
        ? `Installment ${entry.nextInstallmentNo} is already recorded as paid (${existing.merchantOrderId}).`
        : `The student has an online payment in progress for installment ${entry.nextInstallmentNo}. Wait for it to settle or cancel it before recording cash.`,
      transactionStatus: existing.status,
      merchantOrderId: existing.merchantOrderId,
    });
  }

  const paidAt = paymentDate ? new Date(paymentDate) : new Date();
  const merchantOrderId = `cash_${Date.now()}_${student._id
    .toString()
    .slice(-6)}_${String(resolvedCourseId).slice(-6)}_i${entry.nextInstallmentNo}_${crypto
    .randomBytes(3)
    .toString("hex")}`;

  const transaction = await PaymentTransaction.create({
    userId: student.userId._id || student.userId,
    studentId: student._id,
    courseId: resolvedCourseId,
    teacherId: payment.teacherId,
    slotId: payment.slotId,
    parentAvailabilityId: payment.parentAvailabilityId || null,
    branchId: payment.branchId || null,
    deliveryMode: payment.deliveryMode || null,
    sessionType: payment.sessionType,
    planType: "monthly",
    planMonths: entry.installmentTotal,
    paymentType: "Installment",
    installmentNo: entry.nextInstallmentNo,
    installmentTotal: entry.installmentTotal,
    installmentAmount: entry.amountDue,
    dueDate: entry.dueDate,
    amount,
    currency: "INR",
    gateway: "manual",
    paymentMode: "Cash",
    merchantOrderId,
    bankReference: receiptRef || null,
    collectedByUserId: req.user.userId,
    recordNote: note || null,
    status: "paid",
    feeStatus: "Paid",
    paidAt,
    verifiedAt: new Date(),
    events: [
      {
        type: TRANSACTION_EVENTS.CASH_RECORDED,
        actor: "admin",
        actorUserId: req.user.userId,
        status: "paid",
        amount,
        detail: `Cash of ${formatMoney(amount)} collected at the centre for installment ${
          entry.nextInstallmentNo
        } of ${entry.installmentTotal}`,
        meta: { receiptRef: receiptRef || null, note: note || null, paidAt },
      },
    ],
  });

  const fulfillment = await fulfillPaidTransaction(transaction._id);

  if (!fulfillment.fulfilled) {
    return res.status(202).json({
      success: true,
      message:
        "Cash payment recorded, but the enrollment update needs review. The payment itself is safe.",
      hint: IT_SUPPORT_HINT,
      transactionId: transaction._id,
      merchantOrderId,
      courseAccessGranted: Boolean(fulfillment.coreFulfilled),
      error: fulfillment.error,
    });
  }

  return res.status(201).json({
    success: true,
    message: `Installment ${entry.nextInstallmentNo} of ${entry.installmentTotal} recorded as paid in cash.`,
    transactionId: transaction._id,
    merchantOrderId,
    amount,
    installmentNo: entry.nextInstallmentNo,
    installmentTotal: entry.installmentTotal,
  });
});

// Full audit view of one payment, including the lifecycle trail.
exports.getPaymentDetail = asyncHandler(async (req, res) => {
  const { id } = req.validated?.params || req.params;

  const transaction = await PaymentTransaction.findById(id)
    .populate("courseId", "name code")
    .populate("branchId", "branchName")
    .populate("collectedByUserId", "name email employeeId")
    .lean();

  if (!transaction) {
    return res.status(404).json({ success: false, message: "Payment transaction not found." });
  }

  const student = await Student.findById(transaction.studentId)
    .populate("userId", "name email mobileNo")
    .select("userId")
    .lean();

  res.status(200).json({
    success: true,
    transaction: {
      ...transaction,
      // Raw gateway payloads are large and only ever needed for deep debugging.
      gatewayResponse: undefined,
      student: student
        ? {
            _id: student._id,
            name: `${student.userId?.name?.firstName || ""} ${
              student.userId?.name?.lastName || ""
            }`.trim(),
            email: student.userId?.email,
            phone: student.userId?.mobileNo,
          }
        : null,
      events: [...(transaction.events || [])].sort((a, b) => new Date(a.at) - new Date(b.at)),
    },
  });
});

exports.buildNeedsAttentionMatch = buildNeedsAttentionMatch;
