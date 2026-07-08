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
  getOverdueInstallmentPayments,
  buildPaymentAccessStatus,
  normalizeMode,
} = require("../services/enrollmentService");
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
} = require("../services/paymentService");
const asyncHandler = require("../utils/asyncHandler");
const { resolveReferralCode, normalizeCode } = require("../utils/referral");
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

    // Invalid codes are dropped silently — a bad referral must never block payment.
    const resolvedReferral = await resolveReferralCode(referralCode);
    const resolvedReferralCode = resolvedReferral ? normalizeCode(referralCode) : null;

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
        if (resolvedReferralCode && !activeTransaction.referralCode) {
          activeTransaction.referralCode = resolvedReferralCode;
          await activeTransaction.save();
        }
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
      referralCode: resolvedReferralCode,
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
      amount,
      paymentDate,
      receiptRef,
      referralCode,
    } = req.body;

    if (!courseId || !slotId || !teacherId || !branchId || !sessionType || !amount) {
      return res.status(400).json({
        success: false,
        message: "courseId, slotId, teacherId, branchId, sessionType, and amount are required.",
      });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "amount must be a positive number.",
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
      if (normalizedPhone) userQuery.push({ mobileNo: { $regex: normalizedPhone + "$" } });

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
      deliveryMode: "offline",
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
    const pricing = buildPricingForPlan(context.course, sessionType, resolvedPlanType, planMonths);
    if (pricing.error) {
      return res.status(400).json({
        success: false,
        message: pricing.error,
        hint: "Check that the course has pricing set up for this session type. " + itHint,
      });
    }

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
      deliveryMode: "offline",
      sessionType,
      planType: resolvedPlanType,
      planMonths: pricing.planMonths ?? null,
      referralCode: resolvedReferral ? normalizeCode(referralCode) : null,
      paymentType: pricing.paymentType,
      installmentNo: 1,
      installmentTotal: pricing.installmentTotal,
      installmentAmount: pricing.installmentAmount,
      amount: parsedAmount,
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
