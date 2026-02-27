const Razorpay = require("razorpay");
const crypto = require("crypto");
const Course = require("../model/course.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const mailSender = require("../utils/mailSender");
const mongoose = require("mongoose");
require("dotenv").config();
const updateTeacherStats = require("../utils/updateTeacherStats");

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

exports.createOrder = async (req, res) => {
  try {
    const { courseId, sessionType, teacherId, slotId } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const paymentType = "Full";

    if (!courseId || !sessionType || !teacherId || !slotId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Course, sessionType, teacherId, and slotId are required",
        });
    }

    // Fetch course and validate session type
    const course = await Course.findById(courseId).populate("teacher");
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });

    const selectedPrice = course.price.find(
      (p) => p.sessionType === sessionType
    );
    if (!selectedPrice)
      return res
        .status(400)
        .json({ success: false, message: "Invalid session type" });

    // Check if teacher teaches this course
    if (!course.teacher.some((t) => t._id.toString() === teacherId)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Teacher does not teach this course",
        });
    }

    // Fetch teacher and validate slot
    const teacher = await Teacher.findById(teacherId);
    if (!teacher)
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });

    const slot = teacher.weeklyAvailability.id(slotId);
    if (!slot)
      return res
        .status(404)
        .json({ success: false, message: "Slot not found" });
    
    const parentAvailabilityId = slot.parentAvailabilityId || slot._id;

    if (slot.courseId.toString() !== courseId) {
      return res
        .status(400)
        .json({ success: false, message: "Slot not for this course" });
    }

    if (slot.sessionType !== sessionType) {
      return res
        .status(400)
        .json({ success: false, message: "Slot sessionType mismatch" });
    }

    if (!slot.currentStudentCount) slot.currentStudentCount = 0;
    if (slot.currentStudentCount >= slot.maxStudents) {
      return res.status(400).json({ success: false, message: "Slot is full" });
    }

    // Fetch student
    const student = await Student.findOne({ userId }).populate("userId");
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    // Prevent duplicate active payments
    const existingPayment = student.payments.find(
      (p) =>
        p.courseId.toString() === courseId &&
        p.sessionType === sessionType &&
        p.paymentType === paymentType &&
        p.PaymentStatus !== "failed"
    );
    if (existingPayment) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "An active payment already exists for this course and session",
        });
    }

    // Create Razorpay order
    const amount = selectedPrice.fullPayment;
    if (!amount || amount <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Invalid course price" });

    const shortCourseId = courseId.slice(-6);
    const shortUserId = userId.toString().slice(-6);

    const order = await razorpayInstance.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `rcpt_${shortCourseId}_${shortUserId}_${sessionType}_${paymentType}`,
    });

    const paymentData = {
      courseId,
      razorpayOrderId: order.id,
      amount,
      PaymentStatus: "pending",
      sessionType,
      paymentType,
      teacherId,
      slotId,
      parentAvailabilityId,
    };

    if (paymentType === "Installment") paymentData.dueDate = new Date();

    student.payments.push(paymentData);
    await student.save({ validateModifiedOnly: true });

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res
      .status(500)
      .json({
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

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !courseId ||
      !sessionType ||
      !teacherId ||
      !slotId
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All payment details are required" });
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

    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res
      .status(404)
      .json({ success: false, message: "Teacher not found" });

    // Check teacher teaches the course
    if (!teacher.course.some((c) => c.toString() === courseId)) {
      return res
        .status(400)
        .json({ message: "Teacher does not teach the selected course" });
    }

    const parentSlot = teacher.weeklyAvailability.id(slotId);
    if (!parentSlot)
      return res.status(404).json({ message: "Slot not found" });

    if (parentSlot.courseId.toString() !== courseId)
      return res
        .status(400)
        .json({ message: "Slot not for selected course" });

    if (parentSlot.sessionType !== sessionType)
      return res.status(400).json({ message: "Slot sessionType mismatch" });

    const parentAvailabilityId =
      parentSlot.parentAvailabilityId || parentSlot._id;

    const recurringSlots = teacher.weeklyAvailability.filter(
      (s) =>
        s.parentAvailabilityId?.toString() ===
          parentAvailabilityId.toString() ||
        s._id.toString() === parentAvailabilityId.toString()
    );

    const existingPayment = student.payments.find(
      (p) =>
        p.razorpayOrderId === razorpay_order_id &&
        p.PaymentStatus === "completed"
    );
    if (existingPayment) {
      return res
        .status(400)
        .json({ success: false, message: "Payment already processed" });
    }

    const pendingPayment = student.payments.find(
      (p) =>
        p.razorpayOrderId === razorpay_order_id &&
        p.courseId.toString() === courseId &&
        p.sessionType === sessionType
    );
    if (!pendingPayment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment record not found" });
    }

    // FULL PAYMENT
    if (pendingPayment.paymentType === "Full") {
      pendingPayment.razorpayPaymentId = razorpay_payment_id;
      pendingPayment.razorpaySignature = razorpay_signature;
      pendingPayment.PaymentStatus = "completed";
      pendingPayment.feeStatus = "Paid";
      pendingPayment.paidAt = new Date();
      pendingPayment.monthlyPaymentStatus = "completed";
      pendingPayment.dueDate = null;
    }
    // INSTALLMENT PAYMENT FLOW
    else if (pendingPayment.paymentType === "Installment") {
      const sessionPrice = course.price.find(
        (p) => p.sessionType === sessionType
      );
      const totalInstallments = sessionPrice ? sessionPrice.installments : 1;
      const installmentAmount = sessionPrice ? sessionPrice.monthlyFee : 0;

      pendingPayment.razorpayPaymentId = razorpay_payment_id;
      pendingPayment.razorpaySignature = razorpay_signature;
      pendingPayment.PaymentStatus = "completed";
      pendingPayment.feeStatus = "Paid";
      pendingPayment.paidAt = new Date();
      pendingPayment.installmentNo = pendingPayment.installmentNo || 1;
      pendingPayment.installmentAmount = installmentAmount;
      pendingPayment.installmentTotal = totalInstallments;

      // Check if all installments paid
      pendingPayment.monthlyPaymentStatus =
        pendingPayment.installmentNo >= totalInstallments
          ? "completed"
          : "pending";

      // Set next due date if installments remain
      if (pendingPayment.monthlyPaymentStatus === "pending") {
        const nextDueDate = new Date();
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        pendingPayment.dueDate = nextDueDate;
      } else {
        pendingPayment.dueDate = null;
      }
    } else {
      pendingPayment.dueDate = null;
    }
    // Remove null courseId entries to avoid duplicates
    student.enrolledCourses = student.enrolledCourses.filter(
      (c) => c.courseId !== null
    );

    // Enroll student in course if not already
    if (
      !student.enrolledCourses.some((c) => c.courseId.toString() === courseId)
    ) {
      const enrollmentTime = new Date();
      student.enrolledCourses.push({
        courseId,
        progress: 0,
        status: "in-progress",
        completedAt: null,
        slotId,
        joinedAt: enrollmentTime,
      });
    }

    for (const recurringSlot of recurringSlots) {
      if (!recurringSlot.students) recurringSlot.students = [];

      if (recurringSlot.students.includes(student._id)) continue;

      if (recurringSlot.students.length >= recurringSlot.maxStudents) {
        return res.status(400).json({
          message: `Slot on ${recurringSlot.day || "some day"} is full`,
        });
      }

      recurringSlot.students.push(student._id);
    }
    
    await teacher.save();
    await student.save();

    await updateTeacherStats(courseId);

    await mailSender(
      student.userId.email,
      "Course Enrollment Confirmation",
      enrollmentEmailTemplate(student.userId, course)
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified and course enrolled successfully",
      course,
      sessionType,
      teacherId,
      slotId,
      recurringDays: parentSlot.recurringDays || [],
      paymentType: pendingPayment.paymentType,
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
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const courses = student.enrolledCourses
      .map((ec) => ec.courseId)
      .filter((c) => c !== null);

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
    const { courseId, sessionType, teacherId, slotId } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    if (!courseId || !sessionType || !teacherId || !slotId) {
      return res.status(400).json({
        success: false,
        message: "All enrollment details are required",
      });
    }

    const student = await Student.findOne({ userId });
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const course = await Course.findById(courseId);
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    if (!teacher.course.some((c) => c.toString() === courseId)) {
      return res
        .status(400)
        .json({ message: "This teacher does not teach the selected course" });
    }

    const slot = teacher.weeklyAvailability.find(s => s._id.toString() === slotId);
    if (!slot) return res.status(404).json({ message: "Slot not found" });

    const parentAvailabilityId = slot.parentAvailabilityId || slot._id;

    if (slot.courseId.toString() !== courseId) {
      return res
        .status(400)
        .json({ message: "This slot is not for the selected course" });
    }

    if (slot.sessionType !== sessionType)
      return res.status(400).json({ message: "Slot session type mismatch" });

    if (!slot.students) slot.students = [];
    if (slot.students.length >= slot.maxStudents)
      return res.status(400).json({ message: "Selected slot is already full" });

    // Find session price
    const sessionPrice = course.price.find(
      (p) => p.sessionType === sessionType
    );
    if (!sessionPrice)
      return res
        .status(400)
        .json({ success: false, message: "Session not found" });

    const installments = sessionPrice.installments || 1;
    const monthlyAmount = sessionPrice.monthlyFee;
    if (!monthlyAmount || monthlyAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid monthly fee amount" });
    }

    //  Check if all installments already exist
    const existingInstallments = student.payments.filter(
      (p) =>
        p.courseId.toString() === courseId &&
        p.sessionType === sessionType &&
        p.paymentType === "Installment"
    );
    if (existingInstallments.length >= installments) {
      return res.status(400).json({
        success: false,
        message: "All installment orders already exist for this course.",
      });
    }

    // Generate orders for installments not yet in payments array
    let paymentsToCreate = [];
    for (let i = 1; i <= installments; i++) {
      const alreadyExists = student.payments.some(
        (p) =>
          p.courseId.toString() === courseId &&
          p.sessionType === sessionType &&
          p.installmentNo === i
      );
      if (alreadyExists) continue;

      // Create Razorpay order
      const order = await razorpayInstance.orders.create({
        amount: monthlyAmount * 100, // in paise
        currency: "INR",
        receipt: `rcpt_${courseId.slice(-6)}_${userId
          .toString()
          .slice(-6)}_i${i}`,
        payment_capture: 1,
      });

      paymentsToCreate.push({
        courseId,
        razorpayOrderId: order.id,
        amount: monthlyAmount,
        PaymentStatus: "pending",
        sessionType,
        paymentType: "Installment",
        installmentNo: i,
        installmentTotal: installments,
        installmentAmount: monthlyAmount,
        dueDate: new Date(new Date().setMonth(new Date().getMonth() + i - 1)), // first installment now, next in future
        teacherId,
        slotId,
        parentAvailabilityId,
      });
    }

    if (!slot.students.includes(student._id)) {
      slot.students.push(student._id);
      await teacher.save();
    }

    if (paymentsToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All installment orders already generated for this course.",
      });
    }

    // Add payments to student
    student.payments.push(...paymentsToCreate);
    await student.save({ validateModifiedOnly: true });

    return res.status(200).json({
      success: true,
      message: "Installment orders generated successfully",
      installments: paymentsToCreate.length,
      orders: paymentsToCreate.map((p) => ({
        razorpayOrderId: p.razorpayOrderId,
        installmentNo: p.installmentNo,
        amount: p.amount,
        dueDate: p.dueDate,
      })),
    });
  } catch (error) {
    console.error("Error generating installment orders:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
