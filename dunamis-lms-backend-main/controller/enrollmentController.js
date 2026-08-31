const crypto = require("crypto");
const mongoose = require("mongoose");
const Course = require("../model/course.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const PaymentTransaction = require("../model/paymentTransaction.model");
const {
  API_VERSION: CASHFREE_API_VERSION,
  getCashfreeMode,
  getCashfreeOrder,
  getCashfreePaymentsForOrder,
  verifyCashfreeWebhookSignature,
} = require("../utils/cashfreeClient");
const {
  resolvePlanType,
  buildPricingForPlan,
  loadValidatedEnrollmentContext,
  syncSlotStudentCount,
  buildPaymentAccessStatus,
  normalizeMode,
  reassignStudentEnrollment,
  recomputeStudentMode,
  hasLiveEnrollment,
} = require("../services/enrollmentService");
const { getStudentSchedules } = require("../utils/classRoster");
const { notifyEvent, notifyUsers } = require("../utils/notificationService");
const {
  getCashfreeErrorMessage,
  findActiveEnrollmentTransaction,
  createCashfreeEnrollmentTransaction,
  getSuccessfulPayment,
  getLatestPayment,
  confirmPaidCashfreeOrder,
  fulfillPaidTransaction,
  sendEnrollmentSideEffects,
  getDisplayName,
  normalizePhone,
  createMerchantOrderId,
  recordTransactionEvent,
  TRANSACTION_EVENTS,
} = require("../services/paymentService");
const asyncHandler = require("../utils/asyncHandler");
const { resolveReferralCode, normalizeCode, applyReferralDiscount } = require("../utils/referral");
require("dotenv").config();

const isStudentRequest = (req) => req.user?.accountType === "student";

const studentOnlyResponse = (res) =>
  res.status(403).json({
    success: false,
    message: "Only student accounts can enroll in courses",
  });

const formatMoney = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

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

const IT_SUPPORT_EMAIL = process.env.IT_SUPPORT_EMAIL || "";
const itHint = IT_SUPPORT_EMAIL
  ? `Contact IT support at ${IT_SUPPORT_EMAIL} if this issue persists.`
  : "Contact IT support if this issue persists.";

// ─── Route handlers ───────────────────────────────────────────────────────────

exports.createOrder = async (req, res) => {
  try {
    const {
      courseId,
      sessionType,
      teacherId,
      slotId,
      planType,
      planMonths,
      customPlanId,
      deliveryMode,
      branchId,
      referralCode,
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

    // The pending-order lookup below keys on slot/session/plan, so it cannot
    // catch a student re-buying the same course on a different slot or plan.
    if (hasLiveEnrollment(student, courseId)) {
      return res.status(409).json({
        success: false,
        message: "You are already enrolled in this course",
      });
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

    const basePricing = buildPricingForPlan(
      context.course,
      sessionType,
      resolvedPlanType,
      planMonths,
      customPlanId
    );
    if (basePricing.error) {
      return res.status(400).json({ success: false, message: basePricing.error });
    }

    // Invalid codes are dropped silently — a bad referral must never block payment.
    const resolvedReferral = await resolveReferralCode(referralCode);
    const resolvedReferralCode = resolvedReferral ? normalizeCode(referralCode) : null;
    // Freelancer discount applies to the first payment only.
    const pricing = applyReferralDiscount(basePricing, resolvedReferral);

    const activeTransaction = await findActiveEnrollmentTransaction({
      studentId: student._id,
      courseId,
      slotId,
      sessionType,
      paymentType: pricing.paymentType,
      installmentNo: 1,
    });

    if (activeTransaction) {
      const reusable =
        activeTransaction.status === "pending" && activeTransaction.paymentSessionId;

      // The lookup does not key on the chosen plan, so two custom offers at
      // the same price would otherwise reuse each other's order and carry the
      // wrong duration.
      const samePlan =
        String(activeTransaction.customPlanId || "") ===
        String(pricing.customPlan?._id || "");

      // Reuse only when the price is unchanged; otherwise the Cashfree order
      // holds a stale amount and must be superseded by a freshly priced one.
      if (reusable && activeTransaction.amount === pricing.amount && samePlan) {
        if (resolvedReferralCode && !activeTransaction.referralCode) {
          activeTransaction.referralCode = resolvedReferralCode;
          await activeTransaction.save();
        }
        await recordTransactionEvent(activeTransaction._id, {
          type: TRANSACTION_EVENTS.ORDER_REUSED,
          actor: "student",
          actorUserId: req.user.userId,
          status: activeTransaction.status,
          amount: activeTransaction.amount,
          detail: "Student re-opened checkout for this still-valid order",
        });
        return res.status(200).json({
          success: true,
          message: "Existing pending order returned",
          planType: activeTransaction.planType,
          paymentType: activeTransaction.paymentType,
          transactionId: activeTransaction._id,
          order: serializeOrderResponse(activeTransaction),
        });
      }

      if (!reusable) {
        return res.status(400).json({
          success: false,
          message: "An active payment already exists for this enrollment",
        });
      }

      activeTransaction.status = "expired";
      activeTransaction.lastError = "Superseded by repriced order";
      await activeTransaction.save();

      await recordTransactionEvent(activeTransaction._id, {
        type: TRANSACTION_EVENTS.ORDER_SUPERSEDED,
        actor: "student",
        actorUserId: req.user.userId,
        status: "expired",
        detail: `Price changed from ${formatMoney(activeTransaction.amount)} to ${formatMoney(
          pricing.amount
        )} — a new order replaced this one`,
      });
    }

    const transaction = await createCashfreeEnrollmentTransaction({
      student,
      context,
      pricing,
      planType: resolvedPlanType,
      installmentNo: 1,
      referralCode: resolvedReferralCode,
      initiatedBy: { actor: "student", actorUserId: req.user.userId },
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

    await recordTransactionEvent(transaction._id, {
      type: TRANSACTION_EVENTS.VERIFY_REQUESTED,
      actor: "student",
      actorUserId: req.user.userId,
      status: transaction.status,
      detail: "Student returned from checkout and asked us to verify the payment",
    });

    const order = await getCashfreeOrder(orderId);
    const payments = await getCashfreePaymentsForOrder(orderId).catch(() => []);
    const successfulPayment = getSuccessfulPayment(payments);

    const confirmed = await confirmPaidCashfreeOrder({
      transaction,
      order,
      payment: successfulPayment,
    });

    if (!confirmed.paid) {
      await recordTransactionEvent(transaction._id, {
        type: TRANSACTION_EVENTS.GATEWAY_NOT_PAID,
        actor: "gateway",
        status: confirmed.transaction?.status || transaction.status,
        detail: `Gateway reported the order as ${order.order_status} — nothing captured`,
        meta: { latestPaymentStatus: getLatestPayment(payments)?.payment_status || null },
      });

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

    if (webhookUpdate.modifiedCount > 0) {
      await recordTransactionEvent(transaction._id, {
        type: TRANSACTION_EVENTS.WEBHOOK_RECEIVED,
        actor: "gateway",
        status: transaction.status,
        detail: `Gateway webhook ${event.type} received`,
        meta: {
          webhookType: event.type,
          paymentStatus: payment?.payment_status || null,
          idempotencyKey: webhookKey,
        },
      });
    }

    if (webhookUpdate.modifiedCount === 0) {
      // Already recorded this exact event. Still re-run SUCCESS fulfillment when
      // the order isn't fulfilled yet — a prior delivery may have failed after
      // the event was persisted; fulfillment is idempotent. Everything else is a
      // true no-op duplicate.
      const current = await PaymentTransaction.findById(transaction._id);
      if (event.type !== "PAYMENT_SUCCESS_WEBHOOK" || current?.status === "fulfilled") {
        return res.status(200).json({ success: true, message: "Duplicate webhook ignored" });
      }
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
      const failureReason =
        event?.data?.error_details?.error_description ||
        payment?.payment_message ||
        "Payment failed";
      const failed = await PaymentTransaction.updateOne(
        { _id: transaction._id, status: { $in: ["created", "pending"] } },
        {
          $set: {
            status: "failed",
            failedAt: new Date(),
            cashfreePaymentId: payment?.cf_payment_id?.toString() || null,
            cashfreePaymentStatus: payment?.payment_status || "FAILED",
            paymentMode: payment?.payment_group || transaction.paymentMode,
            lastError: failureReason,
          },
        }
      );
      if (failed.modifiedCount > 0) {
        await recordTransactionEvent(transaction._id, {
          type: TRANSACTION_EVENTS.FAILED,
          actor: "gateway",
          status: "failed",
          detail: failureReason,
        });
      }
    } else if (event.type === "PAYMENT_USER_DROPPED_WEBHOOK") {
      const dropped = await PaymentTransaction.updateOne(
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
      if (dropped.modifiedCount > 0) {
        await recordTransactionEvent(transaction._id, {
          type: TRANSACTION_EVENTS.CHECKOUT_DISMISSED,
          actor: "student",
          status: "dropped",
          detail: payment?.payment_message || "Student left the checkout without paying",
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error processing Cashfree webhook:", getCashfreeErrorMessage(error));
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};

exports.getCourseEnrollmentStatus = asyncHandler(async (req, res) => {
  if (!isStudentRequest(req)) return studentOnlyResponse(res);

  const userId = new mongoose.Types.ObjectId(req.user.userId);
  const student = await Student.findOne({ userId }).select("enrolledCourses");
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  return res.status(200).json({
    success: true,
    enrolled: hasLiveEnrollment(student, req.params.courseId),
  });
});

exports.getEnrolledCourses = asyncHandler(async (req, res) => {
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
      .filter((course) => course.active !== false)
      .map((course) => course.courseId)
      .filter((course) => course !== null);

    return res.status(200).json({
      success: true,
      message: "Enrolled courses fetched successfully",
      courses,
    });
});

exports.getPaymentAccessStatus = asyncHandler(async (req, res) => {
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
});

exports.generateInstallmentOrders = async (req, res) => {
  try {
    const { courseId, sessionType, teacherId, slotId, deliveryMode, branchId, planMonths, referralCode } = req.body;
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

    // Freelancer discount applies to installment 1 only; renewals stay full price.
    const resolvedReferral = await resolveReferralCode(referralCode);
    const resolvedReferralCode = resolvedReferral ? normalizeCode(referralCode) : null;

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

      const isFirst = installmentNo === 1;
      const transaction = await createCashfreeEnrollmentTransaction({
        student,
        context,
        pricing: isFirst ? applyReferralDiscount(pricing, resolvedReferral) : pricing,
        planType: "monthly",
        installmentNo,
        dueDate,
        referralCode: isFirst ? resolvedReferralCode : null,
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

exports.adminEnrollStudent = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user?.accountType)) {
      return res.status(403).json({
        success: false,
        message: "Only admin accounts can manually enroll students.",
      });
    }

    const {
      studentId,
      lead,
      courseId,
      slotId,
      teacherId,
      branchId,
      sessionType,
      planType,
      planMonths,
      customPlanId,
      amount,
      discountType,
      discountValue,
      paymentDate,
      receiptRef,
      referralCode,
    } = req.body;

    if (!courseId || !slotId || !teacherId || !sessionType || !amount) {
      return res.status(400).json({
        success: false,
        message: "courseId, slotId, teacherId, sessionType, and amount are required.",
      });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "amount must be a positive number.",
      });
    }

    if (discountType && !["percent", "flat"].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: "discountType must be 'percent' or 'flat'.",
      });
    }

    const parsedDiscountValue = Number(discountValue) || 0;
    if (discountType && parsedDiscountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "discountValue must be greater than 0 when a discount type is set.",
      });
    }
    if (discountType === "percent" && parsedDiscountValue > 100) {
      return res.status(400).json({
        success: false,
        message: "A percent discount cannot exceed 100.",
      });
    }

    let student = null;

    if (studentId) {
      if (!mongoose.isValidObjectId(studentId)) {
        return res.status(400).json({ success: false, message: "Invalid studentId." });
      }
      student = await Student.findById(studentId).populate("userId");
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found for the given studentId.",
          hint: "Ask the student to register on the website first, then try again. " + itHint,
        });
      }
    } else if (lead?.email || lead?.phone) {
      const normalizedEmail = String(lead.email || "").trim().toLowerCase();
      const rawPhone = String(lead.phone || "").replace(/\D/g, "");
      const normalizedPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : null;

      const userQuery = [];
      if (normalizedEmail) userQuery.push({ email: normalizedEmail });
      if (normalizedPhone) {
        // mobileNo is a Number (double) — regex needs long → string conversion
        userQuery.push({
          $expr: {
            $regexMatch: {
              input: { $toString: { $convert: { input: "$mobileNo", to: "long", onError: 0, onNull: 0 } } },
              regex: normalizedPhone + "$",
            },
          },
        });
      }

      const user = userQuery.length ? await User.findOne({ $or: userQuery }) : null;
      if (user) {
        student = await Student.findOne({ userId: user._id }).populate("userId");
      }

      if (!student) {
        return res.status(404).json({
          success: false,
          message: `No student account found for ${normalizedEmail || normalizedPhone}.`,
          hint: "Ask the student to complete registration on the website, then enroll them here. " + itHint,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide either studentId or lead (email/phone) to identify the student.",
      });
    }

    const context = await loadValidatedEnrollmentContext({
      courseId,
      teacherId,
      slotId,
      sessionType,
      branchId,
      allowExistingStudentId: student._id,
    });

    if (context.error) {
      return res.status(context.error.status).json({
        success: false,
        message: context.error.message,
        hint: "Verify the course, instructor, batch, and branch details are correct. " + itHint,
      });
    }

    const resolvedPlanType = resolvePlanType(planType);
    const pricing = buildPricingForPlan(
      context.course,
      sessionType,
      resolvedPlanType,
      planMonths,
      customPlanId
    );
    if (pricing.error) {
      return res.status(400).json({
        success: false,
        message: pricing.error,
        hint: "Check that the course has pricing set up for this session type. " + itHint,
      });
    }

    // Admin-granted discount, priced off the plan's list price. `amount` stays
    // whatever cash was actually handed over — these two only record what the
    // student was due and how much was waived.
    const discounted = applyReferralDiscount(pricing, {
      discountType,
      discountValue: parsedDiscountValue,
    });

    const manualOrderId = `manual_${Date.now()}_${student._id.toString().slice(-6)}_${context.course._id.toString().slice(-6)}_${crypto.randomBytes(3).toString("hex")}`;

    const resolvedReferral = await resolveReferralCode(referralCode);

    const transaction = await PaymentTransaction.create({
      userId: student.userId._id || student.userId,
      studentId: student._id,
      courseId: context.course._id,
      teacherId: context.teacher._id,
      slotId: context.slot._id,
      parentAvailabilityId: context.slot.parentAvailabilityId || null,
      branchId: context.resolvedBranchId,
      deliveryMode: context.resolvedMode,
      sessionType,
      planType: resolvedPlanType,
      planMonths: pricing.planMonths ?? null,
      customPlanId: pricing.customPlan?._id ?? null,
      customPlanName: pricing.customPlan?.name ?? null,
      referralCode: resolvedReferral ? normalizeCode(referralCode) : null,
      paymentType: pricing.paymentType,
      installmentNo: 1,
      installmentTotal: pricing.installmentTotal,
      installmentAmount: pricing.installmentAmount,
      courseType: pricing.courseType || "fixed",
      termMonths: pricing.termMonths ?? null,
      amount: parsedAmount,
      originalAmount: discounted.originalAmount ?? null,
      discountAmount: discounted.discountAmount ?? 0,
      currency: "INR",
      gateway: "manual",
      merchantOrderId: manualOrderId,
      bankReference: receiptRef || null,
      status: "paid",
      feeStatus: "Paid",
      paidAt: paymentDate ? new Date(paymentDate) : new Date(),
    });

    const fulfillment = await fulfillPaidTransaction(transaction._id);

    if (!fulfillment.fulfilled) {
      return res.status(500).json({
        success: false,
        message: "Payment recorded but enrollment fulfillment failed. The payment entry has been saved.",
        error: fulfillment.error,
        transactionId: transaction._id,
        hint: itHint,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student enrolled successfully with manual payment.",
      student: {
        id: student._id,
        name: getDisplayName(student.userId),
        email: student.userId.email,
      },
      transaction: {
        id: fulfillment.transaction._id,
        merchantOrderId: manualOrderId,
        gateway: "manual",
        amount: parsedAmount,
        status: "fulfilled",
        receiptRef: receiptRef || null,
      },
    });
  } catch (error) {
    console.error("Error in adminEnrollStudent:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to enroll student. Please try again.",
      hint: itHint,
      error: error.message,
    });
  }
};

// ─── Reassignment ───────────────────────────────────────────────────────────

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const reassignmentEmailTemplate = ({ title, intro, studentName, courseName, scheduleText }) => `
  <div style="max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;">
    <div style="background:#ffffff;border-radius:16px;padding:28px;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f97316;">Dunamis LMS</p>
      <h1 style="margin:0 0 14px;color:#111827;font-size:24px;line-height:1.25;">${escapeHtml(title)}</h1>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(intro)}</p>
      <div style="border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:18px 20px;">
        <p style="margin:0 0 8px;color:#334155;"><strong>Student:</strong> ${escapeHtml(studentName)}</p>
        <p style="margin:0 0 8px;color:#334155;"><strong>Course:</strong> ${escapeHtml(courseName)}</p>
        <p style="margin:0;color:#334155;"><strong>New schedule:</strong> ${escapeHtml(scheduleText)}</p>
      </div>
    </div>
  </div>
`;

const sendReassignmentNotification = async ({ student, newCourse, newTeacher, newSlot }) => {
  const teacherWithUser = await Teacher.findById(newTeacher._id).populate("userId", "name email");
  const studentName = getDisplayName(student.userId);
  const days = (newSlot.recurringDays || []).join("/") || "TBD";
  const scheduleText = `${days}, ${newSlot.startTime || "TBD"}-${newSlot.endTime || "TBD"}`;

  const notificationHtml = reassignmentEmailTemplate({
    title: "Student reassigned",
    intro: `${studentName} has been moved into ${newCourse.name} with a new instructor/schedule.`,
    studentName,
    courseName: newCourse.name,
    scheduleText,
  });

  await Promise.allSettled([
    notifyEvent({
      event: "enrollmentReassigned",
      instructorUser: teacherWithUser?.userId,
      subject: `Student added to ${newCourse.name}`,
      html: notificationHtml,
      instructorSubject: `A student has been added to your ${newCourse.name} class`,
      instructorHtml: notificationHtml,
      creatorId: student.userId?._id,
    }),
    student.userId?.email
      ? notifyUsers({
          title: "Your class has changed",
          message: `You've been moved to a new class for ${newCourse.name}.`,
          users: [student.userId],
          subject: `Your ${newCourse.name} class has changed`,
          html: reassignmentEmailTemplate({
            title: "Your class has changed",
            intro: `You've been moved to a new class for ${newCourse.name}.`,
            studentName,
            courseName: newCourse.name,
            scheduleText,
          }),
          creatorId: student.userId._id,
        })
      : Promise.resolve(),
  ]);
};

exports.reassignEnrollment = async (req, res) => {
  try {
    const {
      studentId,
      enrollmentId,
      courseId,
      teacherId,
      slotId,
      sessionType,
      deliveryMode,
      branchId,
    } = req.body;

    const student = await Student.findById(studentId).populate("userId");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const enrollment = student.enrolledCourses.id(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found for this student.",
      });
    }

    // enrolledCourses carries no teacher field — ClassRoster is the live
    // source of truth for "who currently teaches this student this course".
    const schedules = await getStudentSchedules(studentId);
    const currentSchedule = schedules.find(
      (schedule) => String(schedule.courseId) === String(enrollment.courseId)
    );
    if (!currentSchedule) {
      return res.status(409).json({
        success: false,
        message: "No active class membership found for this enrollment — it may already be inactive.",
        hint: itHint,
      });
    }

    const oldCourseId = enrollment.courseId;
    const oldTeacherId = currentSchedule.teacherId;
    const oldSlotId = enrollment.slotId;

    if (
      String(courseId) === String(oldCourseId) &&
      String(teacherId) === String(oldTeacherId) &&
      String(slotId) === String(oldSlotId)
    ) {
      return res.status(400).json({
        success: false,
        message: "New course/instructor/slot is identical to the current enrollment.",
      });
    }

    const context = await loadValidatedEnrollmentContext({
      courseId,
      teacherId,
      slotId,
      sessionType,
      deliveryMode,
      branchId,
      allowExistingStudentId: studentId,
    });
    if (context.error) {
      return res.status(context.error.status).json({
        success: false,
        message: context.error.message,
        hint: "Verify the course, instructor, batch, and branch details are correct. " + itHint,
      });
    }

    try {
      await reassignStudentEnrollment({
        studentId,
        oldCourseId,
        oldTeacherId,
        newContext: context,
        sessionType,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Unable to reassign — the target class may be full.",
        hint: itHint,
      });
    }

    // No Mongo transactions in this codebase — the roster/slot move above has
    // already happened by this point. This filter only guards the enrolledCourses
    // write against a concurrent double-submit; it can't undo the roster move.
    // Deactivate + push are two separate calls because Mongo rejects an update
    // that combines a positional $set ("enrolledCourses.$...") with a $push on
    // the same array path in a single operation.
    const deactivate = await Student.updateOne(
      {
        _id: studentId,
        "enrolledCourses._id": enrollmentId,
        "enrolledCourses.slotId": oldSlotId,
        "enrolledCourses.active": { $ne: false },
      },
      { $set: { "enrolledCourses.$.active": false } }
    );

    if (deactivate.modifiedCount === 0) {
      return res.status(409).json({
        success: false,
        message: "This enrollment was already reassigned by someone else. Refresh and try again.",
      });
    }

    // A course change starts fresh progress; an instructor-only swap (same
    // course) carries the student's existing progress forward — it's still
    // the same course content, just a new teacher/schedule.
    const sameCourse = String(context.course._id) === String(oldCourseId);

    await Student.updateOne(
      { _id: studentId },
      {
        $push: {
          enrolledCourses: {
            courseId: context.course._id,
            slotId: context.slot._id,
            progress: sameCourse ? enrollment.progress : 0,
            status: "in-progress",
            completedAt: null,
            joinedAt: new Date(),
            active: true,
          },
          reassignmentHistory: {
            fromCourseId: oldCourseId,
            toCourseId: context.course._id,
            fromTeacherId: oldTeacherId,
            toTeacherId: context.teacher._id,
            fromSlotId: oldSlotId,
            toSlotId: context.slot._id,
            reassignedBy: req.user._id,
            reassignedAt: new Date(),
          },
        },
      }
    );

    await recomputeStudentMode(studentId);

    sendReassignmentNotification({
      student,
      newCourse: context.course,
      newTeacher: context.teacher,
      newSlot: context.slot,
    }).catch((error) => console.error("Reassignment notification failed:", error));

    return res.status(200).json({
      success: true,
      message: "Student reassigned successfully.",
      enrollment: {
        courseId: context.course._id,
        teacherId: context.teacher._id,
        slotId: context.slot._id,
      },
    });
  } catch (error) {
    console.error("Error in reassignEnrollment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reassign student. Please try again.",
      hint: itHint,
      error: error.message,
    });
  }
};
