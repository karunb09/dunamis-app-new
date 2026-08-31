// Admin controls over an enrollment's life: pause it, resume it, discontinue
// it, or push a due date out to compensate for missed classes.
//
// updateStudent deliberately refuses to write `payments`, so this is the only
// place a due date moves outside the fulfillment path — and every move here
// leaves a row in dueDateAdjustments.

const asyncHandler = require("../utils/asyncHandler");
const Student = require("../model/student.model");
const {
  setRosterMemberStatus,
  applyRostersToSlots,
  rollingRange,
} = require("../utils/classRoster");
const { recomputeStudentMode } = require("../services/enrollmentService");

const DAY_MS = 86400000;

const IT_SUPPORT_HINT = process.env.IT_SUPPORT_EMAIL
  ? `Contact IT support at ${process.env.IT_SUPPORT_EMAIL} if this issue persists.`
  : "Contact IT support if this issue persists.";

const idOf = (value) => String(value?._id || value || "");

const findEnrollment = (student, courseId) =>
  (student.enrolledCourses || []).find(
    (enrollment) => idOf(enrollment.courseId) === String(courseId) && enrollment.active !== false
  );

// The still-outstanding installment for one course, if any.
const findOpenPayment = (student, courseId) =>
  (student.payments || [])
    .filter(
      (payment) =>
        idOf(payment.courseId) === String(courseId) &&
        payment.monthlyPaymentStatus === "pending" &&
        !payment.writtenOffAt
    )
    .sort((a, b) => Number(b.installmentNo || 0) - Number(a.installmentNo || 0))[0] || null;

const loadStudentAndEnrollment = async (res, { id, courseId }) => {
  const student = await Student.findById(id);
  if (!student) {
    res.status(404).json({ success: false, message: "Student not found" });
    return null;
  }

  const enrollment = findEnrollment(student, courseId);
  if (!enrollment) {
    res.status(404).json({
      success: false,
      message: "This student has no active enrollment in that course",
      hint: IT_SUPPORT_HINT,
    });
    return null;
  }

  return { student, enrollment };
};

// Takes the student off future classes for this course. The roster seat is
// held, not released — they come back to the same batch.
exports.pauseEnrollment = asyncHandler(async (req, res) => {
  const { id, courseId } = req.params;
  const { reason, resumeOn } = req.body;

  const loaded = await loadStudentAndEnrollment(res, { id, courseId });
  if (!loaded) return;
  const { student, enrollment } = loaded;

  if (enrollment.status === "paused") {
    return res.status(400).json({ success: false, message: "This enrollment is already paused" });
  }
  if (enrollment.status === "discontinued") {
    return res
      .status(400)
      .json({ success: false, message: "A discontinued enrollment cannot be paused" });
  }

  enrollment.status = "paused";
  enrollment.pausedAt = new Date();
  enrollment.pausedUntil = resumeOn ? new Date(resumeOn) : null;
  enrollment.pauseReason = reason || "";
  enrollment.resumedAt = null;
  enrollment.lifecycleActorId = req.user.userId;
  await student.save();

  const payment = findOpenPayment(student, courseId);
  const roster = await setRosterMemberStatus({
    studentId: student._id,
    courseId,
    teacherId: payment?.teacherId,
    status: "paused",
  });
  if (roster) {
    await applyRostersToSlots({ teacherId: roster.teacherId, ...rollingRange() });
  }
  await recomputeStudentMode(student._id);

  res.status(200).json({
    success: true,
    message: "Enrollment paused. Billing is frozen and the seat is held.",
    enrollment,
  });
});

// Puts the student back in class and pushes the next due date out by however
// long they were away, so a pause never costs them a month they did not attend.
exports.resumeEnrollment = asyncHandler(async (req, res) => {
  const { id, courseId } = req.params;

  const loaded = await loadStudentAndEnrollment(res, { id, courseId });
  if (!loaded) return;
  const { student, enrollment } = loaded;

  if (enrollment.status !== "paused") {
    return res.status(400).json({ success: false, message: "This enrollment is not paused" });
  }

  const resumedAt = new Date();
  const pausedDays = enrollment.pausedAt
    ? Math.max(0, Math.round((resumedAt - enrollment.pausedAt) / DAY_MS))
    : 0;

  enrollment.status = "in-progress";
  enrollment.resumedAt = resumedAt;
  enrollment.pausedUntil = null;
  enrollment.lifecycleActorId = req.user.userId;

  const payment = findOpenPayment(student, courseId);
  if (payment && pausedDays > 0 && payment.dueDate) {
    const fromDate = new Date(payment.dueDate);
    const toDate = new Date(fromDate.getTime() + pausedDays * DAY_MS);
    payment.dueDate = toDate;
    payment.dueDateAdjustments.push({
      byUserId: req.user.userId,
      fromDate,
      toDate,
      days: pausedDays,
      reason: `Resumed after ${pausedDays} paused day${pausedDays === 1 ? "" : "s"}`,
    });
  }

  await student.save();

  const roster = await setRosterMemberStatus({
    studentId: student._id,
    courseId,
    teacherId: payment?.teacherId,
    status: "active",
    fromStatuses: ["paused"],
  });
  if (roster) {
    await applyRostersToSlots({ teacherId: roster.teacherId, ...rollingRange() });
  }
  await recomputeStudentMode(student._id);

  res.status(200).json({
    success: true,
    message: pausedDays
      ? `Enrollment resumed. The next due date moved out by ${pausedDays} day${
          pausedDays === 1 ? "" : "s"
        }.`
      : "Enrollment resumed.",
    enrollment,
  });
});

// Terminal. Releases the seat and closes any outstanding installment as written
// off, so the row leaves the dues queue without being recorded as paid.
exports.discontinueEnrollment = asyncHandler(async (req, res) => {
  const { id, courseId } = req.params;
  const { reason } = req.body;

  const loaded = await loadStudentAndEnrollment(res, { id, courseId });
  if (!loaded) return;
  const { student, enrollment } = loaded;

  if (enrollment.status === "discontinued") {
    return res
      .status(400)
      .json({ success: false, message: "This enrollment is already discontinued" });
  }

  enrollment.status = "discontinued";
  enrollment.discontinuedAt = new Date();
  enrollment.discontinuedReason = reason || "";
  enrollment.lifecycleActorId = req.user.userId;

  const payment = findOpenPayment(student, courseId);
  let writtenOff = 0;
  if (payment) {
    payment.writtenOffAt = new Date();
    payment.writtenOffReason = reason || "Enrollment discontinued";
    payment.monthlyPaymentStatus = "completed";
    writtenOff = Number(payment.installmentAmount || payment.amount || 0);
  }

  await student.save();

  const roster = await setRosterMemberStatus({
    studentId: student._id,
    courseId,
    teacherId: payment?.teacherId,
    status: "removed",
    fromStatuses: ["active", "paused"],
  });
  if (roster) {
    await applyRostersToSlots({ teacherId: roster.teacherId, ...rollingRange() });
  }
  await recomputeStudentMode(student._id);

  res.status(200).json({
    success: true,
    message: writtenOff
      ? `Enrollment discontinued. ₹${writtenOff.toLocaleString("en-IN")} of outstanding fees written off.`
      : "Enrollment discontinued.",
    enrollment,
    writtenOffAmount: writtenOff,
  });
});

// Compensation for missed classes: move one installment's due date out.
exports.extendDueDate = asyncHandler(async (req, res) => {
  const { id, paymentId } = req.params;
  const { days, newDueDate, reason } = req.body;

  const student = await Student.findById(id);
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  const payment = student.payments.id(paymentId);
  if (!payment) {
    return res.status(404).json({
      success: false,
      message: "Payment not found on this student",
      hint: IT_SUPPORT_HINT,
    });
  }

  if (!payment.dueDate) {
    return res
      .status(400)
      .json({ success: false, message: "This payment has no due date to extend" });
  }

  const fromDate = new Date(payment.dueDate);
  const toDate = newDueDate
    ? new Date(newDueDate)
    : new Date(fromDate.getTime() + Number(days) * DAY_MS);

  if (Number.isNaN(toDate.getTime())) {
    return res.status(400).json({ success: false, message: "Invalid due date" });
  }
  if (toDate <= fromDate) {
    return res.status(400).json({
      success: false,
      message: "The new due date must be later than the current one",
    });
  }

  const shiftedDays = Math.round((toDate - fromDate) / DAY_MS);
  payment.dueDate = toDate;
  // Cleared so the reminder crons treat the new date as a fresh cycle rather
  // than staying silent on the strength of a notice sent for the old one.
  payment.reminderSentAt = null;
  payment.overdueNoticeSentAt = null;
  payment.dueDateAdjustments.push({
    byUserId: req.user.userId,
    fromDate,
    toDate,
    days: shiftedDays,
    reason: reason || "",
  });

  await student.save();

  res.status(200).json({
    success: true,
    message: `Due date moved out by ${shiftedDays} day${shiftedDays === 1 ? "" : "s"}.`,
    dueDate: payment.dueDate,
  });
});
