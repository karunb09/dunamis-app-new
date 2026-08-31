const crypto = require("crypto");
const mongoose = require("mongoose");
const Course = require("../model/course.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const { syncTeacherAvailabilitySlots } = require("../utils/syncAvailabilitySlots");
const {
  registerRosterMembership,
  removeRosterMembership,
  applyRostersToSlots,
  rollingRange,
  hasSlotStarted,
  startOfDay,
} = require("../utils/classRoster");

// ─── Pricing ─────────────────────────────────────────────────────────────────

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

const findCustomPlan = (selectedPrice, customPlanId) => {
  if (!customPlanId) return null;
  const plans = Array.isArray(selectedPrice.customPlans)
    ? selectedPrice.customPlans
    : [];
  return (
    plans.find(
      (p) => String(p._id) === String(customPlanId) && (p.isActive ?? true)
    ) || null
  );
};

const buildPricingForPlan = (
  course,
  sessionType,
  planType,
  planMonths = null,
  customPlanId = null
) => {
  const selectedPrice = course.price.find((p) => p.sessionType === sessionType);
  if (!selectedPrice) {
    return { error: "Invalid session type" };
  }

  // Snapshotted onto the transaction so the dues engine never has to look the
  // course up again. termMonths is one level's length (6 by default) and is
  // deliberately independent of the billing cycle: a quarterly payer is still
  // inside a six-month term.
  const courseShape = {
    courseType: course.courseType === "running" ? "running" : "fixed",
    termMonths: Number(course.termMonths) || null,
  };

  // Custom offers are full payment only, so they never enter the installment
  // chain — installmentTotal 1 stops getNextInstallmentDueDate at its guard.
  if (customPlanId) {
    const customPlan = findCustomPlan(selectedPrice, customPlanId);
    if (!customPlan) {
      return { error: "This plan is no longer available" };
    }
    const full = Number(customPlan.fullPayment);
    if (!full || full <= 0) {
      return { error: "Invalid price for the selected plan" };
    }
    return {
      selectedPrice,
      amount: full,
      paymentType: "Full",
      planMonths: Number(customPlan.durationMonths) || null,
      installmentTotal: 1,
      installmentAmount: null,
      customPlan,
      ...courseShape,
    };
  }

  const tenurePlan = findTenurePlan(selectedPrice, planMonths);

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
        ...courseShape,
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
      ...courseShape,
    };
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
      planMonths: null,
      installmentTotal: installments,
      installmentAmount: amount,
      ...courseShape,
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
    ...courseShape,
  };
};

// ─── Slot helpers ─────────────────────────────────────────────────────────────

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

const normalizeMode = (value) => {
  const mode = String(value || "").trim().toLowerCase();
  return ["online", "offline"].includes(mode) ? mode : null;
};

// ─── Context validation ───────────────────────────────────────────────────────

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

// ─── Student fulfillment ──────────────────────────────────────────────────────

const mapStudentPaymentMode = (paymentGroup) => {
  const group = String(paymentGroup || "").toLowerCase();
  if (group.includes("cash")) return "Cash";
  if (group.includes("upi")) return "UPI";
  if (group.includes("debit")) return "Debit Card";
  if (group.includes("credit")) return "Credit Card";
  if (group.includes("net")) return "Net Banking";
  return "Other";
};

const isRunningCourse = (record) => record?.courseType === "running";

// A running course has no finish line: once a 3- or 6-month tenure is paid off
// the learner rolls onto month-to-month. Capping at installmentTotal there ends
// billing permanently and tells the student the course is over.
const getNextInstallmentDueDate = (transaction) => {
  if (transaction.paymentType !== "Installment") return null;

  if (
    !isRunningCourse(transaction) &&
    transaction.installmentNo >= transaction.installmentTotal
  ) {
    return null;
  }

  const baseDate = transaction.paidAt || new Date();
  const nextDueDate = new Date(baseDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  return nextDueDate;
};

// An enrollment only blocks re-enrolling while it is live. "completed" and
// "discontinued" are terminal, and active:false rows were reassigned away —
// all three are history, so the student may buy the course again.
const LIVE_ENROLLMENT_STATUSES = ["in-progress", "paused"];

const liveEnrollmentMatch = (courseId) => ({
  courseId,
  active: { $ne: false },
  status: { $in: LIVE_ENROLLMENT_STATUSES },
});

const hasLiveEnrollment = (student, courseId) =>
  (student?.enrolledCourses || []).some(
    (enrollment) =>
      String(enrollment.courseId?._id || enrollment.courseId) === String(courseId) &&
      enrollment.active !== false &&
      LIVE_ENROLLMENT_STATUSES.includes(enrollment.status)
  );

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
    planLabel: transaction.customPlanName || null,
    paymentType: transaction.paymentType,
    installmentNo: transaction.installmentNo,
    installmentTotal: transaction.installmentTotal,
    installmentAmount: transaction.installmentAmount,
    planMonths: transaction.planMonths ?? null,
    courseType: transaction.courseType || "fixed",
    termMonths: transaction.termMonths || null,
    dueDate: nextInstallmentDueDate,
    paymentMode: mapStudentPaymentMode(transaction.paymentMode),
    transactionId: transaction.cashfreePaymentId || transaction.merchantOrderId,
    paidAt: transaction.paidAt || new Date(),
    feeStatus: "Paid",
    // Running courses never reach "completed" on their own — the enrollment is
    // only closed by an admin discontinuing it.
    monthlyPaymentStatus:
      transaction.paymentType === "Installment" &&
      (isRunningCourse(transaction) ||
        transaction.installmentNo < transaction.installmentTotal)
        ? "pending"
        : "completed",
    paymentGateway: transaction.gateway || "cashfree",
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
      enrolledCourses: {
        $not: { $elemMatch: liveEnrollmentMatch(transaction.courseId) },
      },
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
          ...liveEnrollmentMatch(transaction.courseId),
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

const addStudentToSlot = async (transaction) => {
  // Durable membership in the recurring class is the source of truth; capacity
  // is enforced here (throws → payment routed to manual fulfillment).
  const roster = await registerRosterMembership(transaction);

  // Generate/refresh a rolling window of dated slots so the student appears in
  // the current and upcoming occurrences (not just the one they picked).
  if (transaction.teacherId) {
    const { rangeStart, rangeEnd } = rollingRange();
    await syncTeacherAvailabilitySlots({
      teacherId: transaction.teacherId,
      rangeStart,
      rangeEnd,
    });
  }

  // Ensure the specific occurrence they picked carries them too. It may be in
  // the past (e.g. recovered orders), which the rolling window won't touch.
  const slot = await syncSlotStudentCount(await Slot.findById(transaction.slotId));
  if (!slot) {
    if (roster) return true;
    throw new Error("Selected slot no longer exists");
  }

  // A class that already started must not gain a just-enrolled student; the
  // roster covers all future occurrences instead.
  if (roster && hasSlotStarted(slot)) return true;

  const alreadyInSlot = (slot.students || []).some(
    (studentId) => studentId.toString() === transaction.studentId.toString()
  );
  if (alreadyInSlot) return true;

  await Slot.updateOne(
    { _id: transaction.slotId, students: { $ne: transaction.studentId } },
    {
      $addToSet: { students: transaction.studentId },
      $inc: { currentStudentsCount: 1 },
    }
  );
  return true;
};

// ─── Reassignment ─────────────────────────────────────────────────────────────

// Direct fallback for enrollments that predate ClassRoster (no roster row to
// remove from) — pulls the student out of the old teacher's future "enrolled"
// slots for that course. Started/past slots are left alone.
const removeStudentFromSlotFallback = async ({ studentId, courseId, teacherId }) => {
  const now = new Date();
  const slots = await Slot.find({
    createdBy: teacherId,
    courseId,
    slotType: "enrolled",
    students: studentId,
    date: { $gte: startOfDay(now) },
  });

  const ops = slots
    .filter((slot) => !hasSlotStarted(slot, now))
    .map((slot) => ({
      updateOne: {
        filter: { _id: slot._id },
        update: { $pull: { students: studentId }, $inc: { currentStudentsCount: -1 } },
      },
    }));

  if (ops.length) await Slot.bulkWrite(ops, { ordered: false });
};

// Moves a student's durable class membership from (oldCourseId, oldTeacherId)
// to newContext (already validated by loadValidatedEnrollmentContext). Adds to
// the new class BEFORE removing from the old one — if the new class is full,
// registerRosterMembership throws and the old membership is left untouched, so
// a capacity failure is always safe to retry. Never touches past/started slots
// or payment history.
const reassignStudentEnrollment = async ({
  studentId,
  oldCourseId,
  oldTeacherId,
  newContext,
  sessionType,
}) => {
  await addStudentToSlot({
    _id: null,
    studentId,
    teacherId: newContext.teacher._id,
    courseId: newContext.course._id,
    slotId: newContext.slot._id,
    sessionType,
    branchId: newContext.resolvedBranchId,
    deliveryMode: newContext.resolvedMode,
    parentAvailabilityId: newContext.slot.parentAvailabilityId || null,
  });

  const oldRoster = await removeRosterMembership({
    studentId,
    courseId: oldCourseId,
    teacherId: oldTeacherId,
  });

  if (oldRoster) {
    const { rangeStart, rangeEnd } = rollingRange();
    await applyRostersToSlots({ teacherId: oldTeacherId, rangeStart, rangeEnd });
  } else {
    await removeStudentFromSlotFallback({
      studentId,
      courseId: oldCourseId,
      teacherId: oldTeacherId,
    });
  }

  return { oldRosterFound: Boolean(oldRoster) };
};

// Recomputes mode from the student's current enrolled courses — "hybrid" when
// they span both online and offline, otherwise the single shared mode. Only
// reassignment can cross modes today, so this only needs calling from there.
const recomputeStudentMode = async (studentId) => {
  const student = await Student.findById(studentId)
    .select("enrolledCourses mode")
    .populate({ path: "enrolledCourses.courseId", select: "mode" });
  if (!student || !student.enrolledCourses.length) return;

  const modes = new Set(
    student.enrolledCourses
      .filter((ec) => ec.active !== false)
      // A paused or discontinued enrollment must not keep the student flagged
      // as hybrid for a course they are no longer attending.
      .filter((ec) => !["paused", "discontinued"].includes(ec.status))
      .map((ec) => ec.courseId?.mode)
      .filter(Boolean)
  );
  if (!modes.size) return;

  const nextMode = modes.size > 1 ? "hybrid" : [...modes][0];
  if (nextMode !== student.mode) {
    await Student.updateOne({ _id: studentId }, { $set: { mode: nextMode } });
  }
};

// ─── Overdue / access ─────────────────────────────────────────────────────────

// The newest completed installment per enrollment group. Only this row carries
// the live dueDate, so every "does this student owe money" question starts here.
// Shared by getOverdueInstallmentPayments, the installment reminder cron, and
// the dues aggregation — keep the grouping in one place.
// Deliberately does NOT require a dueDate. The final installment of a fixed
// course is written with dueDate null, so filtering on it here skipped that row
// and made installment N-1 the "latest" — which reported the already-paid final
// installment as still owed. The monthlyPaymentStatus check below is what
// decides whether anything is outstanding.
const getLatestInstallmentPerEnrollment = (student) => {
  const latestByEnrollment = new Map();

  (student?.payments || [])
    .filter(
      (payment) =>
        payment.paymentType === "Installment" &&
        payment.PaymentStatus === "completed"
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

  return [...latestByEnrollment.values()];
};

const DAY_MS = 86400000;

// Pending rows decorated with their timing. Deliberately does NOT cap on
// installmentTotal: aggregateOutstandingInstallments doesn't either, and
// tests/dues.aggregation.integration.test.js asserts the two agree exactly.
// Enrollments an admin has taken out of billing. A paused student keeps their
// seat but stops accruing; a discontinued one is closed entirely.
const FROZEN_ENROLLMENT_STATUSES = ["paused", "discontinued"];

const frozenCourseIds = (student) =>
  new Set(
    (student?.enrolledCourses || [])
      .filter((enrollment) => FROZEN_ENROLLMENT_STATUSES.includes(enrollment.status))
      .map((enrollment) => String(enrollment.courseId?._id || enrollment.courseId))
  );

const getPendingInstallmentEntries = (student, asOf = new Date()) => {
  const frozen = frozenCourseIds(student);

  return getLatestInstallmentPerEnrollment(student)
    .filter(
      (payment) =>
        payment.monthlyPaymentStatus === "pending" &&
        payment.dueDate &&
        !payment.writtenOffAt &&
        !frozen.has(String(payment.courseId?._id || payment.courseId))
    )
    .map((payment) => {
      const dueDate = new Date(payment.dueDate);
      const dayDelta = Math.floor((asOf - dueDate) / DAY_MS);

      return {
        payment,
        dueDate,
        isOverdue: dueDate < asOf,
        daysLate: dayDelta > 0 ? dayDelta : 0,
        daysUntilDue: dayDelta < 0 ? Math.abs(dayDelta) : 0,
        installmentNo: Number(payment.installmentNo || 0),
        nextInstallmentNo: Number(payment.installmentNo || 0) + 1,
        installmentTotal: Number(payment.installmentTotal || 1),
        planMonths: payment.planMonths ?? null,
        courseType: payment.courseType || "fixed",
        termMonths: payment.termMonths || null,
        amountDue: payment.installmentAmount || payment.amount,
      };
    })
    .sort((a, b) => a.dueDate - b.dueDate);
};

// Every installment the student may pay right now. The previous one is settled,
// so the next is payable whether or not its due date has passed — paying early
// used to be impossible, which made the 7-day reminder email ask for something
// the portal then refused to accept.
const getPayableInstallments = (student, asOf = new Date()) =>
  getPendingInstallmentEntries(student, asOf).filter(
    (entry) => isRunningCourse(entry) || entry.nextInstallmentNo <= entry.installmentTotal
  );

const getOverdueInstallmentPayments = (student, asOf = new Date()) =>
  getPendingInstallmentEntries(student, asOf)
    .filter((entry) => entry.isOverdue)
    .map((entry) => entry.payment);

// Days an installment may run late before class access is cut. Deliberately
// separate from getOverdueInstallmentPayments: that one feeds the dues
// aggregation and the reminder cron, which must keep chasing from day 1 — only
// the access gate gets the grace period.
const ACCESS_GRACE_DAYS = 7;

const isAccessBlocking = (entry, graceDays = ACCESS_GRACE_DAYS) =>
  entry.daysLate > graceDays;

// Installments late enough to pause the student's course access.
const getAccessBlockingInstallments = (student, asOf = new Date()) =>
  getPendingInstallmentEntries(student, asOf).filter((entry) => isAccessBlocking(entry));

// The Mongo mirror of getLatestInstallmentPerEnrollment + the overdue filter,
// run across every student. Cross-checked against the JS version in
// tests/dues.aggregation.integration.test.js.
const aggregateOutstandingInstallments = async ({
  asOf = new Date(),
  page = 1,
  limit = 50,
  branchId = null,
  courseId = null,
  studentId = null,
  minDaysLate = null,
  bucket = null,
  withRows = true,
} = {}) => {
  const [result] = await Student.aggregate(
    [
      // Cheap candidate narrowing only. Without $elemMatch this matches across
      // different array elements; correctness is enforced after $unwind.
      {
        $match: {
          "payments.paymentType": "Installment",
          "payments.monthlyPaymentStatus": "pending",
          ...(studentId ? { _id: studentId } : {}),
          ...(branchId ? { branch: branchId } : {}),
        },
      },
      { $unwind: "$payments" },
      // Course ids the admin has paused or discontinued for this student. The
      // JS path does the same via frozenCourseIds — the two must agree, which
      // tests/dues.aggregation.integration.test.js enforces.
      {
        $addFields: {
          frozenCourseIds: {
            $map: {
              input: {
                $filter: {
                  input: { $ifNull: ["$enrolledCourses", []] },
                  as: "ec",
                  cond: { $in: ["$$ec.status", FROZEN_ENROLLMENT_STATUSES] },
                },
              },
              as: "ec",
              in: "$$ec.courseId",
            },
          },
        },
      },
      {
        // No dueDate filter — see getLatestInstallmentPerEnrollment. The
        // "latest.dueDate < asOf" match after the $group excludes nulls anyway.
        $match: {
          "payments.paymentType": "Installment",
          "payments.PaymentStatus": "completed",
          "payments.writtenOffAt": null,
          $expr: { $not: [{ $in: ["$payments.courseId", "$frozenCourseIds"] }] },
          ...(courseId ? { "payments.courseId": courseId } : {}),
        },
      },
      { $sort: { "payments.installmentNo": 1 } },
      {
        $group: {
          _id: {
            studentId: "$_id",
            courseId: "$payments.courseId",
            slotId: "$payments.slotId",
            sessionType: "$payments.sessionType",
          },
          latest: { $last: "$payments" },
          userId: { $first: "$userId" },
          branch: { $first: "$branch" },
        },
      },
      {
        $match: {
          "latest.monthlyPaymentStatus": "pending",
          "latest.dueDate": { $lt: asOf },
        },
      },
      {
        $addFields: {
          amountDue: { $ifNull: ["$latest.installmentAmount", "$latest.amount"] },
          daysLate: {
            $floor: {
              $divide: [{ $subtract: [asOf, "$latest.dueDate"] }, 86400000],
            },
          },
        },
      },
      {
        $addFields: {
          bucket: {
            $switch: {
              branches: [
                { case: { $lte: ["$daysLate", 7] }, then: "0-7" },
                { case: { $lte: ["$daysLate", 30] }, then: "8-30" },
              ],
              default: "30+",
            },
          },
        },
      },
      ...(bucket ? [{ $match: { bucket } }] : []),
      ...(minDaysLate != null ? [{ $match: { daysLate: { $gte: minDaysLate } } }] : []),
      {
        // An empty $facet sub-pipeline is a passthrough, not a filter, so the
        // rows branch is omitted entirely rather than set to [] when not wanted.
        $facet: {
          ...(withRows
            ? {
                rows: [
                  { $sort: { daysLate: -1, amountDue: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit },
                {
                  $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    pipeline: [{ $project: { name: 1, email: 1, mobileNo: 1 } }],
                    as: "user",
                  },
                },
                {
                  $lookup: {
                    from: "courses",
                    localField: "_id.courseId",
                    foreignField: "_id",
                    pipeline: [{ $project: { name: 1, code: 1 } }],
                    as: "course",
                  },
                },
                {
                  $lookup: {
                    from: "branches",
                    localField: "branch",
                    foreignField: "_id",
                    pipeline: [{ $project: { branchName: 1 } }],
                    as: "branchDoc",
                  },
                },
                {
                  $project: {
                    _id: 0,
                    studentId: "$_id.studentId",
                    courseId: "$_id.courseId",
                    slotId: "$_id.slotId",
                    paymentId: "$latest._id",
                    amountDue: 1,
                    daysLate: 1,
                    bucket: 1,
                    dueDate: "$latest.dueDate",
                    installmentNo: "$latest.installmentNo",
                    installmentTotal: "$latest.installmentTotal",
                    courseType: { $ifNull: ["$latest.courseType", "fixed"] },
                    termMonths: "$latest.termMonths",
                    sessionType: "$_id.sessionType",
                    lastRemindedAt: {
                      $ifNull: ["$latest.overdueNoticeSentAt", "$latest.reminderSentAt"],
                    },
                    student: {
                      $let: {
                        vars: { u: { $first: "$user" } },
                        in: {
                          name: {
                            $trim: {
                              input: {
                                $concat: [
                                  { $ifNull: ["$$u.name.firstName", ""] },
                                  " ",
                                  { $ifNull: ["$$u.name.lastName", ""] },
                                ],
                              },
                            },
                          },
                          email: "$$u.email",
                          phone: "$$u.mobileNo",
                        },
                      },
                    },
                    course: { $first: "$course" },
                    branch: { $first: "$branchDoc" },
                  },
                },
                ],
              }
            : {}),
          total: [{ $count: "count" }],
          totals: [
            {
              $group: {
                _id: null,
                amount: { $sum: "$amountDue" },
                count: { $sum: 1 },
                students: { $addToSet: "$_id.studentId" },
                maxDaysLate: { $max: "$daysLate" },
              },
            },
            {
              $project: {
                _id: 0,
                amount: 1,
                count: 1,
                maxDaysLate: 1,
                students: { $size: "$students" },
              },
            },
          ],
          aging: [
            { $group: { _id: "$bucket", amount: { $sum: "$amountDue" }, count: { $sum: 1 } } },
            { $project: { _id: 0, bucket: "$_id", amount: 1, count: 1 } },
          ],
        },
      },
    ],
    { allowDiskUse: true }
  );

  return { rows: [], total: [], totals: [], aging: [], ...result };
};

const buildPaymentAccessStatus = (student, asOf = new Date()) => {
  const blocking = getAccessBlockingInstallments(student, asOf).map((entry) => ({
    courseId: entry.payment.courseId?._id || entry.payment.courseId || null,
    courseName: entry.payment.courseId?.name || "Course",
    courseCode: entry.payment.courseId?.code || "",
    amount: entry.amountDue,
    dueDate: entry.dueDate,
    daysLate: entry.daysLate,
    installmentNo: entry.installmentNo,
    installmentTotal: entry.installmentTotal,
  }));

  const restricted = blocking.length > 0;

  return {
    accessRestricted: restricted,
    reason: restricted ? "installment_overdue" : null,
    message: restricted
      ? "Course access is restricted until the overdue installment is paid."
      : "Course access is active.",
    graceDays: ACCESS_GRACE_DAYS,
    // Name kept for the existing website consumers (StudentGuard, profile).
    overduePayments: blocking,
  };
};

module.exports = {
  resolvePlanType,
  buildPricingForPlan,
  syncSlotStudentCount,
  normalizeMode,
  loadValidatedEnrollmentContext,
  mapStudentPaymentMode,
  getNextInstallmentDueDate,
  applyStudentFulfillment,
  hasLiveEnrollment,
  addStudentToSlot,
  reassignStudentEnrollment,
  recomputeStudentMode,
  getLatestInstallmentPerEnrollment,
  getPendingInstallmentEntries,
  getPayableInstallments,
  getOverdueInstallmentPayments,
  getAccessBlockingInstallments,
  ACCESS_GRACE_DAYS,
  aggregateOutstandingInstallments,
  buildPaymentAccessStatus,
};
