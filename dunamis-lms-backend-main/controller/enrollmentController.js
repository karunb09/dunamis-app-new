const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Course = require("../model/course.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const mailSender = require("../utils/mailSender");
const updateTeacherStats = require("../utils/updateTeacherStats");
require("dotenv").config();

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const enrollmentEmailTemplate = (user, course) => `
  <h1>Course Enrollment Successful</h1>
  <p>Dear ${user.name.firstName},</p>
  <p>You have enrolled in: <strong>${course.name}</strong>.</p>
  <p>Course Code: ${course.code}</p>
  <p>Start Date: ${new Date(course.startDate).toLocaleDateString()}</p>
  <p>Happy learning!</p>
  <p>Regards,<br>Dunamis Music LMS</p>
`;

const normalizeMode = (value) => {
  const mode = String(value || "").trim().toLowerCase();
  return ["online", "offline"].includes(mode) ? mode : null;
};

const resolvePlanType = (value) =>
  String(value || "").trim().toLowerCase() === "monthly" ? "monthly" : "full";

const buildPricingForPlan = (course, sessionType, planType) => {
  const selectedPrice = course.price.find((p) => p.sessionType === sessionType);
  if (!selectedPrice) {
    return { error: "Invalid session type" };
  }

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
    installmentTotal: 1,
    installmentAmount: null,
  };
};

const getReceiptSuffix = (paymentType) =>
  paymentType === "Installment" ? "monthly" : "full";

const getPendingPaymentForOrder = (student, orderId) =>
  student.payments.find((payment) => payment.razorpayOrderId === orderId);

const loadValidatedEnrollmentContext = async ({
  courseId,
  teacherId,
  slotId,
  sessionType,
  deliveryMode,
  branchId,
}) => {
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

  const slot = await Slot.findById(slotId);
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
    return {
      error: { status: 400, message: "Slot sessionType mismatch" },
    };
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

  if ((slot.students || []).length >= slot.maxStudents) {
    return { error: { status: 400, message: "Selected slot is already full" } };
  }

  return {
    course,
    teacher,
    slot,
    resolvedMode,
    resolvedBranchId,
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
      deliveryMode,
      branchId,
    } = req.body;
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
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
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
      resolvedPlanType
    );
    if (pricing.error) {
      return res.status(400).json({ success: false, message: pricing.error });
    }

    const existingPayment = student.payments.find(
      (payment) =>
        payment.courseId?.toString() === courseId &&
        payment.sessionType === sessionType &&
        payment.slotId?.toString() === slotId &&
        payment.paymentType === pricing.paymentType &&
        payment.PaymentStatus !== "failed"
    );

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message:
          "An active payment already exists for this course, session, and slot",
      });
    }

    const shortCourseId = courseId.slice(-6);
    const shortUserId = userId.toString().slice(-6);
    const receiptSuffix = getReceiptSuffix(pricing.paymentType);

    const order = await razorpayInstance.orders.create({
      amount: pricing.amount * 100,
      currency: "INR",
      receipt: `rcpt_${shortCourseId}_${shortUserId}_${sessionType}_${receiptSuffix}`,
    });

    const paymentData = {
      courseId,
      razorpayOrderId: order.id,
      amount: pricing.amount,
      PaymentStatus: "pending",
      sessionType,
      paymentType: pricing.paymentType,
      planType: resolvedPlanType,
      teacherId,
      slotId,
      parentAvailabilityId: context.slot.parentAvailabilityId || null,
      branchId: context.resolvedBranchId,
      deliveryMode: context.resolvedMode,
      monthlyPaymentStatus:
        pricing.paymentType === "Installment" ? "pending" : null,
    };

    if (pricing.paymentType === "Installment") {
      paymentData.installmentNo = 1;
      paymentData.installmentTotal = pricing.installmentTotal;
      paymentData.installmentAmount = pricing.installmentAmount;
      paymentData.dueDate = new Date();
    }

    student.payments.push(paymentData);
    await student.save({ validateModifiedOnly: true });

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      planType: resolvedPlanType,
      paymentType: pricing.paymentType,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      sessionType,
      teacherId,
      slotId,
    } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "All payment details are required",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    const student = await Student.findOne({ userId }).populate("userId");
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const existingPayment = student.payments.find(
      (payment) =>
        payment.razorpayOrderId === razorpay_order_id &&
        payment.PaymentStatus === "completed"
    );
    if (existingPayment) {
      return res
        .status(400)
        .json({ success: false, message: "Payment already processed" });
    }

    const pendingPayment = getPendingPaymentForOrder(student, razorpay_order_id);
    if (!pendingPayment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment record not found" });
    }

    const resolvedCourseId = courseId || pendingPayment.courseId?.toString();
    const resolvedSessionType = sessionType || pendingPayment.sessionType;
    const resolvedTeacherId = teacherId || pendingPayment.teacherId?.toString();
    const resolvedSlotId = slotId || pendingPayment.slotId?.toString();

    if (
      !resolvedCourseId ||
      !resolvedSessionType ||
      !resolvedTeacherId ||
      !resolvedSlotId
    ) {
      return res.status(400).json({
        success: false,
        message: "Stored payment is missing enrollment linkage",
      });
    }

    const context = await loadValidatedEnrollmentContext({
      courseId: resolvedCourseId,
      teacherId: resolvedTeacherId,
      slotId: resolvedSlotId,
      sessionType: resolvedSessionType,
      deliveryMode: pendingPayment.deliveryMode,
      branchId: pendingPayment.branchId?.toString(),
    });

    if (context.error) {
      return res
        .status(context.error.status)
        .json({ success: false, message: context.error.message });
    }

    pendingPayment.razorpayPaymentId = razorpay_payment_id;
    pendingPayment.razorpaySignature = razorpay_signature;
    pendingPayment.PaymentStatus = "completed";
    pendingPayment.feeStatus = "Paid";
    pendingPayment.paidAt = new Date();

    if (pendingPayment.paymentType === "Full") {
      pendingPayment.monthlyPaymentStatus = "completed";
      pendingPayment.dueDate = null;
    } else {
      const totalInstallments = pendingPayment.installmentTotal || 1;
      pendingPayment.installmentNo = pendingPayment.installmentNo || 1;
      pendingPayment.monthlyPaymentStatus =
        pendingPayment.installmentNo >= totalInstallments
          ? "completed"
          : "pending";

      if (pendingPayment.monthlyPaymentStatus === "pending") {
        const nextDueDate = new Date();
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        pendingPayment.dueDate = nextDueDate;
      } else {
        pendingPayment.dueDate = null;
      }
    }

    student.enrolledCourses = student.enrolledCourses.filter(
      (course) => course.courseId !== null
    );

    const existingEnrollment = student.enrolledCourses.find(
      (course) => course.courseId.toString() === resolvedCourseId
    );

    if (!existingEnrollment) {
      student.enrolledCourses.push({
        courseId: resolvedCourseId,
        progress: 0,
        status: "in-progress",
        completedAt: null,
        slotId: context.slot._id,
        joinedAt: new Date(),
      });
    } else if (!existingEnrollment.slotId) {
      existingEnrollment.slotId = context.slot._id;
    }

    const alreadyInSlot = (context.slot.students || []).some(
      (studentId) => studentId.toString() === student._id.toString()
    );
    if (!alreadyInSlot) {
      if ((context.slot.students || []).length >= context.slot.maxStudents) {
        return res.status(400).json({
          success: false,
          message: "Selected slot is already full",
        });
      }

      context.slot.students.push(student._id);
    }

    if (context.resolvedMode) {
      student.mode = context.resolvedMode;
    }
    if (context.resolvedBranchId) {
      student.branch = context.resolvedBranchId;
    }

    await context.slot.save();
    await student.save();
    await updateTeacherStats(resolvedCourseId);

    await mailSender(
      student.userId.email,
      "Course Enrollment Confirmation",
      enrollmentEmailTemplate(student.userId, context.course)
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified and course enrolled successfully",
      course: context.course,
      sessionType: resolvedSessionType,
      teacherId: resolvedTeacherId,
      slotId: resolvedSlotId,
      paymentType: pendingPayment.paymentType,
      planType: pendingPayment.planType,
      installmentNo: pendingPayment.installmentNo,
      monthlyPaymentStatus: pendingPayment.monthlyPaymentStatus,
      nextDueDate:
        pendingPayment.monthlyPaymentStatus === "pending"
          ? pendingPayment.dueDate
          : null,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message,
    });
  }
};

exports.getEnrolledCourses = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const student = await Student.findOne({ userId }).populate({
      path: "enrolledCourses.courseId",
      populate: [
        { path: "category", select: "name" },
        { path: "subCategory", select: "name" },
        { path: "teacher", select: "name" },
      ],
    });

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
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

exports.generateInstallmentOrders = async (req, res) => {
  try {
    const {
      courseId,
      sessionType,
      teacherId,
      slotId,
      deliveryMode,
      branchId,
    } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    if (!courseId || !sessionType || !teacherId || !slotId) {
      return res.status(400).json({
        success: false,
        message: "All enrollment details are required",
      });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
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

    const pricing = buildPricingForPlan(context.course, sessionType, "monthly");
    if (pricing.error) {
      return res.status(400).json({ success: false, message: pricing.error });
    }

    const existingInstallments = student.payments.filter(
      (payment) =>
        payment.courseId?.toString() === courseId &&
        payment.sessionType === sessionType &&
        payment.slotId?.toString() === slotId &&
        payment.paymentType === "Installment"
    );

    if (existingInstallments.length >= pricing.installmentTotal) {
      return res.status(400).json({
        success: false,
        message: "All installment orders already exist for this course.",
      });
    }

    const paymentsToCreate = [];
    for (let installmentNo = 1; installmentNo <= pricing.installmentTotal; installmentNo += 1) {
      const alreadyExists = existingInstallments.some(
        (payment) => payment.installmentNo === installmentNo
      );
      if (alreadyExists) continue;

      const order = await razorpayInstance.orders.create({
        amount: pricing.amount * 100,
        currency: "INR",
        receipt: `rcpt_${courseId.slice(-6)}_${userId
          .toString()
          .slice(-6)}_i${installmentNo}`,
      });

      paymentsToCreate.push({
        courseId,
        razorpayOrderId: order.id,
        amount: pricing.amount,
        PaymentStatus: "pending",
        sessionType,
        paymentType: "Installment",
        planType: "monthly",
        installmentNo,
        installmentTotal: pricing.installmentTotal,
        installmentAmount: pricing.installmentAmount,
        dueDate: new Date(
          new Date().setMonth(new Date().getMonth() + installmentNo - 1)
        ),
        teacherId,
        slotId,
        parentAvailabilityId: context.slot.parentAvailabilityId || null,
        branchId: context.resolvedBranchId,
        deliveryMode: context.resolvedMode,
        monthlyPaymentStatus: "pending",
      });
    }

    if (paymentsToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All installment orders already generated for this course.",
      });
    }

    student.payments.push(...paymentsToCreate);
    await student.save({ validateModifiedOnly: true });

    return res.status(200).json({
      success: true,
      message: "Installment orders generated successfully",
      installments: paymentsToCreate.length,
      orders: paymentsToCreate.map((payment) => ({
        razorpayOrderId: payment.razorpayOrderId,
        installmentNo: payment.installmentNo,
        amount: payment.amount,
        dueDate: payment.dueDate,
      })),
    });
  } catch (error) {
    console.error("Error generating installment orders:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
