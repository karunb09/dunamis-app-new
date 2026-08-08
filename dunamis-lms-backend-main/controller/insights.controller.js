const asyncHandler = require("../utils/asyncHandler");
const { aggregateOutstandingInstallments } = require("../services/enrollmentService");
const {
  monthWindow,
  currentMonthKey,
  monthKeyFromDate,
  monthKeysEndingAt,
  monthLabel,
  isValidMonthKey,
  IST_TZ_OFFSET,
} = require("../utils/istMonth");

const User = require("../model/user.model");
const Teacher = require("../model/teacher.model");
const Course = require("../model/course.model");
const Category = require("../model/category.model");
const Branch = require("../model/branch.model");
const ClassRoster = require("../model/classRoster.model");
const PaymentTransaction = require("../model/paymentTransaction.model");
const Referral = require("../model/referral.model");
const DemoBooking = require("../model/demoBooking.model");
const Enquiry = require("../model/enquiry.model");
const CallbackRequest = require("../model/callbackRequest.model");
const TeacherApplication = require("../model/teacherApplication.model");
const CourseRequest = require("../model/courseRequest.model");
const Slot = require("../model/slot.model");
const AttendanceHomework = require("../model/attendanceHomework.model");
const Student = require("../model/student.model");
const Feedback = require("../model/feedback.model");
const Assessment = require("../model/assessment.model");
const Assignment = require("../model/assignment.model");

const PAID_STATUSES = ["paid", "paid_pending_fulfillment", "fulfilled"];
const DEFAULT_TRAILING = 12;
const MIN_TRAILING = 3;
const MAX_TRAILING = 24;

const monthExpr = (field) => ({
  $dateToString: { format: "%Y-%m", date: field, timezone: IST_TZ_OFFSET },
});

const round1 = (n) => Math.round(n * 10) / 10;

// Pads a sparse {month -> value} map into an ordered series over monthKeys
// and derives current/previous/delta from the two newest entries.
const toMetric = (valueByMonth, monthKeys) => {
  const series = monthKeys.map((month) => ({
    month,
    value: valueByMonth.get(month) || 0,
  }));
  const current = series[series.length - 1]?.value || 0;
  const previous = series[series.length - 2]?.value || 0;
  const delta = current - previous;
  const deltaPct = previous === 0 ? null : round1((delta / previous) * 100);
  return { current, previous, delta, deltaPct, series };
};

const emptyMetric = (monthKeys) => toMetric(new Map(), monthKeys);

const rateFrom = (value, base) => (base ? round1((value / base) * 100) : null);

const monthlyCountMap = async (Model, { dateField = "createdAt", match = {}, trendStart, monthEnd }) => {
  const rows = await Model.aggregate([
    { $match: { ...match, [dateField]: { $gte: trendStart, $lt: monthEnd } } },
    { $group: { _id: monthExpr(`$${dateField}`), count: { $sum: 1 } } },
  ]);
  const map = new Map();
  for (const row of rows) map.set(row._id, row.count);
  return map;
};

const groupCounts = (rows, keyFn = (r) => r._id) =>
  rows.map((r) => ({ key: keyFn(r) ?? "unspecified", count: r.count, amount: r.amount }));

/**
 * Builds the full monthly insights payload for `monthKey` (e.g. "2026-07"),
 * with a `trailing`-month series (default 12) for sparklines and deltas.
 * Every section degrades to a safe fallback on failure rather than throwing,
 * so a bug in one collection never blanks the whole report.
 */
async function buildMonthlyInsights({ monthKey, trailing = DEFAULT_TRAILING } = {}) {
  const key = isValidMonthKey(monthKey) ? monthKey : currentMonthKey();
  const clampedTrailing = Math.min(MAX_TRAILING, Math.max(MIN_TRAILING, Number(trailing) || DEFAULT_TRAILING));

  const { start: monthStart, end: monthEnd } = monthWindow(key);
  const monthKeys = monthKeysEndingAt(key, clampedTrailing);
  const trendStart = monthWindow(monthKeys[0]).start;
  const ctx = { monthStart, monthEnd, trendStart, monthKeys };

  const failed = [];
  const section = async (name, fn, fallback) => {
    try {
      return await fn();
    } catch (err) {
      console.error(`[Insights] section "${name}" failed:`, err.message);
      failed.push(name);
      return fallback;
    }
  };

  // ---- Wave A: heavy facets -------------------------------------------------
  const [revenueFacet, funnelFacet, attendanceFacet, enrollmentMap, sessionRows] = await Promise.all([
    section("revenue", () => buildRevenueFacet(ctx), null),
    section("funnel", () => buildFunnelFacet(ctx), null),
    section("attendance", () => buildAttendanceFacet(ctx), null),
    section("enrollments", () => buildEnrollmentMap(ctx), new Map()),
    section(
      "sessions",
      () =>
        Slot.aggregate([
          { $match: { date: { $gte: trendStart, $lt: monthEnd } } },
          { $group: { _id: { m: monthExpr("$date"), slotType: "$slotType" }, count: { $sum: 1 } } },
        ]),
      []
    ),
  ]);

  // ---- Wave B: medium ---------------------------------------------------
  const [userRoleRows, courseCreatedMap, coursePublishedMap, completionMap, referralFacet, outstanding] =
    await Promise.all([
      section(
        "users",
        () =>
          User.aggregate([
            {
              $match: {
                createdAt: { $gte: trendStart, $lt: monthEnd },
                accountType: { $in: ["student", "teacher", "admin", "superadmin"] },
              },
            },
            { $group: { _id: { m: monthExpr("$createdAt"), type: "$accountType" }, count: { $sum: 1 } } },
          ]),
        []
      ),
      section("coursesCreated", () => monthlyCountMap(Course, { dateField: "createdAt", ...ctx }), new Map()),
      section("coursesPublished", () => monthlyCountMap(Course, { dateField: "publishedAt", ...ctx }), new Map()),
      section("completions", () => buildCompletionMap(ctx), new Map()),
      section("referrals", () => buildReferralFacet(ctx), null),
      // Receivables live on student.payments[] — future installments are never
      // pre-created as PaymentTransaction rows (the website calls create-order
      // once, then next-installment-order on demand), so querying transactions
      // here read near-zero regardless of what was actually owed.
      //
      // Always as of NOW, never monthEnd: monthlyPaymentStatus carries no
      // history, so the pending set is today's set no matter which month is
      // being viewed. Measuring daysLate to a month boundary would age today's
      // rows against an unrelated date. Surfaced as `asOfNow` for the UI.
      section(
        "outstanding",
        () => aggregateOutstandingInstallments({ asOf: new Date(), withRows: false }),
        null
      ),
    ]);

  // ---- Wave C: light ------------------------------------------------------
  const [
    instructorsMap,
    branchesMap,
    categoriesMap,
    enquiryRows,
    callbackRows,
    applicationRows,
    courseRequestRows,
    feedbackRows,
    assessmentRows,
    assignmentMap,
    cumulativeStudents,
    cumulativeCourses,
    cumulativeInstructors,
    cumulativeActiveBranches,
  ] = await Promise.all([
    section("instructors", () => monthlyCountMap(Teacher, { dateField: "createdAt", ...ctx }), new Map()),
    section("branches", () => monthlyCountMap(Branch, { dateField: "createdAt", ...ctx }), new Map()),
    section("categories", () => monthlyCountMap(Category, { dateField: "createdAt", ...ctx }), new Map()),
    section(
      "enquiries",
      () =>
        Enquiry.aggregate([
          { $match: { createdAt: { $gte: trendStart, $lt: monthEnd } } },
          { $group: { _id: { m: monthExpr("$createdAt"), status: "$status" }, count: { $sum: 1 } } },
        ]),
      []
    ),
    section(
      "callbackRequests",
      () =>
        CallbackRequest.aggregate([
          { $match: { createdAt: { $gte: trendStart, $lt: monthEnd } } },
          { $group: { _id: { m: monthExpr("$createdAt"), status: "$status" }, count: { $sum: 1 } } },
        ]),
      []
    ),
    section(
      "teacherApplications",
      () =>
        TeacherApplication.aggregate([
          { $match: { createdAt: { $gte: trendStart, $lt: monthEnd } } },
          {
            $group: {
              _id: { m: monthExpr("$createdAt"), status: "$status", source: "$source" },
              count: { $sum: 1 },
            },
          },
        ]),
      []
    ),
    section(
      "courseRequests",
      () =>
        CourseRequest.aggregate([
          { $match: { createdAt: { $gte: trendStart, $lt: monthEnd } } },
          { $group: { _id: { m: monthExpr("$createdAt"), status: "$status" }, count: { $sum: 1 } } },
        ]),
      []
    ),
    section(
      "feedback",
      () =>
        Feedback.aggregate([
          { $match: { createdAt: { $gte: monthStart, $lt: monthEnd } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              avgCourseRating: { $avg: "$courseRating" },
              avgInstructorRating: { $avg: "$instructorRating" },
            },
          },
        ]),
      []
    ),
    section(
      "assessments",
      () =>
        Assessment.aggregate([
          { $match: { createdAt: { $gte: trendStart, $lt: monthEnd } } },
          { $group: { _id: { m: monthExpr("$createdAt"), status: "$status" }, count: { $sum: 1 } } },
        ]),
      []
    ),
    section("assignments", () => monthlyCountMap(Assignment, { dateField: "createdAt", ...ctx }), new Map()),
    section("cumulativeStudents", () => User.countDocuments({ accountType: "student", createdAt: { $lt: monthEnd } }), 0),
    section("cumulativeCourses", () => Course.countDocuments({ createdAt: { $lt: monthEnd } }), 0),
    section("cumulativeInstructors", () => Teacher.countDocuments({ createdAt: { $lt: monthEnd } }), 0),
    section("cumulativeActiveBranches", () => Branch.countDocuments({ status: "active", createdAt: { $lt: monthEnd } }), 0),
  ]);

  // ---- Assemble: growth -----------------------------------------------------
  const roleMaps = { student: new Map(), teacher: new Map(), admin: new Map() };
  for (const row of userRoleRows) {
    const type = row._id.type === "superadmin" ? "admin" : row._id.type;
    if (!roleMaps[type]) continue;
    roleMaps[type].set(row._id.m, (roleMaps[type].get(row._id.m) || 0) + row.count);
  }

  const growth = {
    studentsRegistered: toMetric(roleMaps.student, monthKeys),
    studentsEnrolled: toMetric(enrollmentMap, monthKeys),
    instructorsAdded: toMetric(instructorsMap, monthKeys),
    adminsAdded: toMetric(roleMaps.admin, monthKeys),
    coursesCreated: toMetric(courseCreatedMap, monthKeys),
    coursesPublished: toMetric(coursePublishedMap, monthKeys),
    branchesAdded: toMetric(branchesMap, monthKeys),
    categoriesAdded: toMetric(categoriesMap, monthKeys),
    cumulative: {
      students: cumulativeStudents,
      courses: cumulativeCourses,
      instructors: cumulativeInstructors,
      activeBranches: cumulativeActiveBranches,
    },
  };

  // ---- Assemble: revenue ------------------------------------------------
  const revenue = buildRevenueSection({ revenueFacet, referralFacet, outstanding, monthKeys });

  // ---- Assemble: funnel ---------------------------------------------------
  const funnel = buildFunnelSection({
    funnelFacet,
    enquiryRows,
    callbackRows,
    applicationRows,
    courseRequestRows,
    monthKeys,
    monthKey: key,
  });

  // ---- Assemble: delivery -------------------------------------------------
  const delivery = buildDeliverySection({
    attendanceFacet,
    sessionRows,
    completionMap,
    feedbackRows,
    assessmentRows,
    assignmentMap,
    monthKeys,
  });

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    partial: failed.length > 0,
    failedSections: failed,
    month: { key, label: monthLabel(key), start: monthStart, end: monthEnd, isCurrent: key === currentMonthKey() },
    trailingMonths: monthKeys,
    growth,
    revenue,
    funnel,
    delivery,
  };
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

async function buildEnrollmentMap({ trendStart, monthEnd }) {
  const rows = await ClassRoster.aggregate([
    { $unwind: "$students" },
    {
      $match: {
        "students.status": "active",
        "students.enrolledAt": { $gte: trendStart, $lt: monthEnd },
      },
    },
    { $group: { _id: monthExpr("$students.enrolledAt"), ids: { $addToSet: "$students.studentId" } } },
    { $project: { count: { $size: "$ids" } } },
  ]);
  const map = new Map();
  for (const row of rows) map.set(row._id, row.count);
  return map;
}

async function buildCompletionMap({ trendStart, monthEnd }) {
  const rows = await Student.aggregate([
    { $unwind: "$enrolledCourses" },
    { $match: { "enrolledCourses.completedAt": { $gte: trendStart, $lt: monthEnd } } },
    { $group: { _id: monthExpr("$enrolledCourses.completedAt"), count: { $sum: 1 } } },
  ]);
  const map = new Map();
  for (const row of rows) map.set(row._id, row.count);
  return map;
}

async function buildRevenueFacet({ trendStart, monthStart, monthEnd }) {
  const [result] = await PaymentTransaction.aggregate([
    // An order created 31-Jan can be paid 01-Feb; matching createdAt alone
    // would drop it from February's revenue, so widen the outer match. The
    // refundedAt leg matters too: a June payment refunded in July is outside
    // both other legs, and without it July's refunded facet reads zero.
    {
      $match: {
        $or: [
          { paidAt: { $gte: trendStart, $lt: monthEnd } },
          { createdAt: { $gte: trendStart, $lt: monthEnd } },
          { refundedAt: { $gte: trendStart, $lt: monthEnd } },
        ],
      },
    },
    { $addFields: { recognizedAt: { $ifNull: ["$paidAt", "$createdAt"] } } },
    {
      $facet: {
        revenueByMonth: [
          { $match: { status: { $in: PAID_STATUSES }, recognizedAt: { $gte: trendStart, $lt: monthEnd } } },
          {
            $group: {
              _id: monthExpr("$recognizedAt"),
              gross: { $sum: "$amount" },
              captured: { $sum: { $ifNull: ["$gatewayCapturedAmount", "$amount"] } },
              discount: { $sum: { $ifNull: ["$discountAmount", 0] } },
              txns: { $sum: 1 },
              students: { $addToSet: "$studentId" },
            },
          },
          { $project: { gross: 1, captured: 1, discount: 1, txns: 1, payingStudents: { $size: "$students" } } },
        ],
        statusMix: [
          { $match: { createdAt: { $gte: monthStart, $lt: monthEnd } } },
          { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
        ],
        breakdowns: [
          { $match: { status: { $in: PAID_STATUSES }, recognizedAt: { $gte: monthStart, $lt: monthEnd } } },
          {
            $group: {
              _id: {
                gateway: "$gateway",
                planType: "$planType",
                paymentType: "$paymentType",
                deliveryMode: { $ifNull: ["$deliveryMode", "unspecified"] },
                sessionType: "$sessionType",
              },
              count: { $sum: 1 },
              amount: { $sum: "$amount" },
            },
          },
        ],
        topCourses: [
          { $match: { status: { $in: PAID_STATUSES }, recognizedAt: { $gte: monthStart, $lt: monthEnd } } },
          {
            $group: {
              _id: "$courseId",
              revenue: { $sum: "$amount" },
              txns: { $sum: 1 },
              students: { $addToSet: "$studentId" },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
          { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "c" } },
          {
            $project: {
              revenue: 1,
              txns: 1,
              students: { $size: "$students" },
              name: { $first: "$c.name" },
              code: { $first: "$c.code" },
            },
          },
        ],
        byBranch: [
          {
            $match: {
              status: { $in: PAID_STATUSES },
              recognizedAt: { $gte: monthStart, $lt: monthEnd },
              branchId: { $ne: null },
            },
          },
          { $group: { _id: "$branchId", revenue: { $sum: "$amount" }, txns: { $sum: 1 } } },
          { $sort: { revenue: -1 } },
          { $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "b" } },
          { $lookup: { from: "cities", localField: "b.city", foreignField: "_id", as: "city" } },
          {
            $project: {
              revenue: 1,
              txns: 1,
              branchName: { $first: "$b.branchName" },
              cityName: { $first: "$city.cityName" },
            },
          },
        ],
        // Keyed on refundedAt (not updatedAt, which any unrelated edit bumps),
        // and summing refundAmount so partial refunds don't over-report.
        refunded: [
          { $match: { status: "refunded", refundedAt: { $gte: monthStart, $lt: monthEnd } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              amount: { $sum: { $ifNull: ["$refundAmount", "$amount"] } },
            },
          },
        ],
      },
    },
  ]);
  return result;
}

async function buildReferralFacet({ trendStart, monthStart, monthEnd }) {
  const [result] = await Referral.aggregate([
    { $match: { createdAt: { $gte: trendStart, $lt: monthEnd } } },
    {
      $facet: {
        byMonth: [
          {
            $group: {
              _id: monthExpr("$createdAt"),
              count: { $sum: 1 },
              revenue: { $sum: "$amount" },
              discountGiven: { $sum: { $ifNull: ["$discountAmount", 0] } },
            },
          },
        ],
        byType: [
          { $match: { createdAt: { $gte: monthStart, $lt: monthEnd } } },
          { $group: { _id: "$referrerType", count: { $sum: 1 } } },
        ],
        pendingRewards: [{ $match: { rewardStatus: "pending" } }, { $count: "count" }],
      },
    },
  ]);
  return result;
}

async function buildFunnelFacet({ trendStart, monthStart, monthEnd }) {
  const [result] = await DemoBooking.aggregate([
    { $match: { createdAt: { $gte: trendStart, $lt: monthEnd } } },
    {
      $facet: {
        byMonth: [
          {
            $group: {
              _id: monthExpr("$createdAt"),
              booked: { $sum: 1 },
              attended: { $sum: { $cond: [{ $eq: ["$demoStatus", "Attended"] }, 1, 0] } },
              missed: { $sum: { $cond: [{ $eq: ["$demoStatus", "Missed"] }, 1, 0] } },
              cancelled: { $sum: { $cond: [{ $eq: ["$demoStatus", "Cancelled"] }, 1, 0] } },
              enrolled: { $sum: { $cond: [{ $eq: ["$enrollmentStatus", "Enrolled"] }, 1, 0] } },
            },
          },
        ],
        byMode: [
          { $match: { createdAt: { $gte: monthStart, $lt: monthEnd } } },
          { $group: { _id: "$deliveryMode", count: { $sum: 1 } } },
        ],
        byCourse: [
          { $match: { createdAt: { $gte: monthStart, $lt: monthEnd } } },
          { $group: { _id: "$courseId", booked: { $sum: 1 } } },
          { $sort: { booked: -1 } },
          { $limit: 10 },
          { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "c" } },
          { $project: { booked: 1, name: { $first: "$c.name" }, code: { $first: "$c.code" } } },
        ],
        followUp: [
          { $match: { createdAt: { $gte: monthStart, $lt: monthEnd } } },
          { $group: { _id: "$followUp", count: { $sum: 1 } } },
        ],
      },
    },
  ]);
  return result;
}

async function buildAttendanceFacet({ trendStart, monthStart, monthEnd }) {
  const [result] = await AttendanceHomework.aggregate([
    { $match: { date: { $gte: trendStart, $lt: monthEnd } } },
    {
      $facet: {
        byMonth: [
          {
            $group: {
              _id: monthExpr("$date"),
              records: { $sum: 1 },
              present: { $sum: { $cond: [{ $eq: ["$attendanceStatus", "Present"] }, 1, 0] } },
              absent: { $sum: { $cond: [{ $eq: ["$attendanceStatus", "Absent"] }, 1, 0] } },
            },
          },
        ],
        monthActivity: [
          { $match: { date: { $gte: monthStart, $lt: monthEnd } } },
          {
            $group: {
              _id: null,
              students: { $addToSet: "$studentId" },
              teachers: { $addToSet: "$teacherId" },
              slots: { $addToSet: "$slotId" },
              homeworkSet: {
                $sum: { $cond: [{ $and: [{ $ne: ["$homework", null] }, { $ne: ["$homework", ""] }] }, 1, 0] },
              },
            },
          },
          {
            $project: {
              activeStudents: { $size: "$students" },
              activeInstructors: { $size: "$teachers" },
              sessionsWithAttendance: { $size: "$slots" },
              homeworkSet: 1,
            },
          },
        ],
      },
    },
  ]);
  return result;
}

// ---------------------------------------------------------------------------
// Assemblers — turn raw facet output into the response shape
// ---------------------------------------------------------------------------

function buildRevenueSection({ revenueFacet, referralFacet, outstanding, monthKeys }) {
  if (!revenueFacet) {
    return {
      gross: emptyMetric(monthKeys),
      captured: emptyMetric(monthKeys),
      discount: emptyMetric(monthKeys),
      transactions: emptyMetric(monthKeys),
      payingStudents: emptyMetric(monthKeys),
      avgTransaction: 0,
      statusMix: [],
      byGateway: [],
      byPlanType: [],
      byPaymentType: [],
      byDeliveryMode: [],
      bySessionType: [],
      topCourses: [],
      byBranch: [],
      refunded: { count: 0, amount: 0 },
      outstanding: { count: 0, amount: 0, aging: [], asOfNow: true },
      referrals: { count: emptyMetric(monthKeys), revenue: emptyMetric(monthKeys), discountGiven: 0, byReferrerType: [], pendingRewards: 0 },
    };
  }

  const grossMap = new Map();
  const capturedMap = new Map();
  const discountMap = new Map();
  const txnsMap = new Map();
  const studentsMap = new Map();
  for (const row of revenueFacet.revenueByMonth) {
    grossMap.set(row._id, row.gross);
    capturedMap.set(row._id, row.captured);
    discountMap.set(row._id, row.discount);
    txnsMap.set(row._id, row.txns);
    studentsMap.set(row._id, row.payingStudents);
  }

  const gross = toMetric(grossMap, monthKeys);
  const transactions = toMetric(txnsMap, monthKeys);

  const breakdownBy = (dimension) => {
    const map = new Map();
    for (const row of revenueFacet.breakdowns) {
      const key = row._id[dimension] ?? "unspecified";
      const entry = map.get(key) || { key, count: 0, amount: 0 };
      entry.count += row.count;
      entry.amount += row.amount;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  };

  const refundedRow = revenueFacet.refunded?.[0] || { count: 0, amount: 0 };
  const outstandingRow = outstanding?.totals?.[0] || { count: 0, amount: 0 };
  const outstandingAging = outstanding?.aging || [];

  const referralByMonth = new Map();
  const referralRevenueByMonth = new Map();
  let discountGiven = 0;
  let byReferrerType = [];
  let pendingRewards = 0;
  if (referralFacet) {
    for (const row of referralFacet.byMonth) {
      referralByMonth.set(row._id, row.count);
      referralRevenueByMonth.set(row._id, row.revenue);
      discountGiven += row.discountGiven || 0;
    }
    byReferrerType = groupCounts(referralFacet.byType);
    pendingRewards = referralFacet.pendingRewards?.[0]?.count || 0;
  }

  return {
    gross,
    captured: toMetric(capturedMap, monthKeys),
    discount: toMetric(discountMap, monthKeys),
    transactions,
    payingStudents: toMetric(studentsMap, monthKeys),
    avgTransaction: transactions.current ? Math.round(gross.current / transactions.current) : 0,
    statusMix: groupCounts(revenueFacet.statusMix),
    byGateway: breakdownBy("gateway"),
    byPlanType: breakdownBy("planType"),
    byPaymentType: breakdownBy("paymentType"),
    byDeliveryMode: breakdownBy("deliveryMode"),
    bySessionType: breakdownBy("sessionType"),
    topCourses: (revenueFacet.topCourses || []).map((c) => ({
      courseId: c._id,
      name: c.name || "Unknown course",
      code: c.code || "",
      revenue: c.revenue,
      transactions: c.txns,
      students: c.students,
    })),
    byBranch: (revenueFacet.byBranch || []).map((b) => ({
      branchId: b._id,
      branchName: b.branchName || "Unknown branch",
      cityName: b.cityName || "",
      revenue: b.revenue,
      transactions: b.txns,
    })),
    refunded: { count: refundedRow.count || 0, amount: refundedRow.amount || 0 },
    // monthlyPaymentStatus carries no history, so a July-overdue installment
    // paid in August reads as settled when you view July today. This is
    // receivables as of now, not as of month end — the UI must say so.
    outstanding: {
      count: outstandingRow.count || 0,
      amount: outstandingRow.amount || 0,
      aging: outstandingAging,
      asOfNow: true,
    },
    referrals: {
      count: toMetric(referralByMonth, monthKeys),
      revenue: toMetric(referralRevenueByMonth, monthKeys),
      discountGiven,
      byReferrerType,
      pendingRewards,
    },
  };
}

function buildFunnelSection({ funnelFacet, enquiryRows, callbackRows, applicationRows, courseRequestRows, monthKeys }) {
  const enquiryByMonth = new Map();
  const enquiryByStatus = new Map();
  for (const row of enquiryRows) {
    enquiryByMonth.set(row._id.m, (enquiryByMonth.get(row._id.m) || 0) + row.count);
    enquiryByStatus.set(row._id.status, (enquiryByStatus.get(row._id.status) || 0) + row.count);
  }

  const callbackByMonth = new Map();
  const callbackByStatus = new Map();
  for (const row of callbackRows) {
    callbackByMonth.set(row._id.m, (callbackByMonth.get(row._id.m) || 0) + row.count);
    callbackByStatus.set(row._id.status, (callbackByStatus.get(row._id.status) || 0) + row.count);
  }

  const applicationByMonth = new Map();
  const applicationByStatus = new Map();
  const applicationBySource = new Map();
  for (const row of applicationRows) {
    applicationByMonth.set(row._id.m, (applicationByMonth.get(row._id.m) || 0) + row.count);
    applicationByStatus.set(row._id.status, (applicationByStatus.get(row._id.status) || 0) + row.count);
    applicationBySource.set(row._id.source, (applicationBySource.get(row._id.source) || 0) + row.count);
  }

  const courseRequestByMonth = new Map();
  const courseRequestByStatus = new Map();
  for (const row of courseRequestRows) {
    courseRequestByMonth.set(row._id.m, (courseRequestByMonth.get(row._id.m) || 0) + row.count);
    courseRequestByStatus.set(row._id.status, (courseRequestByStatus.get(row._id.status) || 0) + row.count);
  }

  const demoByMonth = new Map();
  const attendedByMonth = new Map();
  const missedByMonth = new Map();
  const cancelledByMonth = new Map();
  const enrolledByMonth = new Map();
  if (funnelFacet) {
    for (const row of funnelFacet.byMonth) {
      demoByMonth.set(row._id, row.booked);
      attendedByMonth.set(row._id, row.attended);
      missedByMonth.set(row._id, row.missed);
      cancelledByMonth.set(row._id, row.cancelled);
      enrolledByMonth.set(row._id, row.enrolled);
    }
  }

  const booked = toMetric(demoByMonth, monthKeys);
  const attended = toMetric(attendedByMonth, monthKeys);
  const enrolled = toMetric(enrolledByMonth, monthKeys);
  const enquiriesTotal = toMetric(enquiryByMonth, monthKeys);
  const callbacksTotal = toMetric(callbackByMonth, monthKeys);
  const leadsCurrent = enquiriesTotal.current + callbacksTotal.current;
  const leadsPrevious = enquiriesTotal.previous + callbacksTotal.previous;

  const stages = [
    { key: "leads", label: "Enquiries + callbacks", value: leadsCurrent, previous: leadsPrevious, rateFromPrev: null },
    { key: "demosBooked", label: "Demos booked", value: booked.current, previous: booked.previous, rateFromPrev: rateFrom(booked.current, leadsCurrent) },
    { key: "demosAttended", label: "Demos attended", value: attended.current, previous: attended.previous, rateFromPrev: rateFrom(attended.current, booked.current) },
    { key: "demosEnrolled", label: "Converted to enrollment", value: enrolled.current, previous: enrolled.previous, rateFromPrev: rateFrom(enrolled.current, attended.current) },
  ];

  return {
    stages,
    enquiries: { total: enquiriesTotal, byStatus: groupCounts(Array.from(enquiryByStatus, ([key, count]) => ({ _id: key, count }))) },
    callbackRequests: { total: callbacksTotal, byStatus: groupCounts(Array.from(callbackByStatus, ([key, count]) => ({ _id: key, count }))) },
    demos: {
      booked,
      attended,
      missed: toMetric(missedByMonth, monthKeys),
      cancelled: toMetric(cancelledByMonth, monthKeys),
      enrolled,
      attendRate: rateFrom(attended.current, booked.current),
      conversionRate: rateFrom(enrolled.current, booked.current),
      byDeliveryMode: funnelFacet ? groupCounts(funnelFacet.byMode) : [],
      topCourses: funnelFacet ? (funnelFacet.byCourse || []).map((c) => ({ courseId: c._id, name: c.name || "Unknown course", code: c.code || "", booked: c.booked })) : [],
      followUp: funnelFacet ? groupCounts(funnelFacet.followUp) : [],
    },
    teacherApplications: {
      total: toMetric(applicationByMonth, monthKeys),
      byStatus: groupCounts(Array.from(applicationByStatus, ([key, count]) => ({ _id: key, count }))),
      bySource: groupCounts(Array.from(applicationBySource, ([key, count]) => ({ _id: key, count }))),
    },
    courseRequests: {
      total: toMetric(courseRequestByMonth, monthKeys),
      byStatus: groupCounts(Array.from(courseRequestByStatus, ([key, count]) => ({ _id: key, count }))),
    },
  };
}

function buildDeliverySection({ attendanceFacet, sessionRows, completionMap, feedbackRows, assessmentRows, assignmentMap, monthKeys }) {
  const sessionByMonth = new Map();
  const sessionByType = new Map();
  for (const row of sessionRows) {
    sessionByMonth.set(row._id.m, (sessionByMonth.get(row._id.m) || 0) + row.count);
    sessionByType.set(row._id.slotType, (sessionByType.get(row._id.slotType) || 0) + row.count);
  }
  const enrolledSessionCount = sessionByType.get("enrolled") || 0;

  const recordsByMonth = new Map();
  const presentByMonth = new Map();
  const absentByMonth = new Map();
  if (attendanceFacet) {
    for (const row of attendanceFacet.byMonth) {
      recordsByMonth.set(row._id, row.records);
      presentByMonth.set(row._id, row.present);
      absentByMonth.set(row._id, row.absent);
    }
  }

  const activity = attendanceFacet?.monthActivity?.[0] || {
    activeStudents: 0,
    activeInstructors: 0,
    sessionsWithAttendance: 0,
    homeworkSet: 0,
  };

  const records = toMetric(recordsByMonth, monthKeys);
  const presentCurrent = presentByMonth.get(monthKeys[monthKeys.length - 1]) || 0;
  const absentCurrent = absentByMonth.get(monthKeys[monthKeys.length - 1]) || 0;

  const assessmentByMonth = new Map();
  const assessmentByStatus = new Map();
  for (const row of assessmentRows) {
    assessmentByMonth.set(row._id.m, (assessmentByMonth.get(row._id.m) || 0) + row.count);
    assessmentByStatus.set(row._id.status, (assessmentByStatus.get(row._id.status) || 0) + row.count);
  }

  const feedbackRow = feedbackRows?.[0] || { count: 0, avgCourseRating: null, avgInstructorRating: null };

  return {
    sessions: { total: toMetric(sessionByMonth, monthKeys), byType: groupCounts(Array.from(sessionByType, ([key, count]) => ({ _id: key, count }))) },
    attendance: {
      records,
      present: presentCurrent,
      absent: absentCurrent,
      rate: rateFrom(presentCurrent, presentCurrent + absentCurrent),
      activeStudents: activity.activeStudents || 0,
      activeInstructors: activity.activeInstructors || 0,
      sessionsWithAttendance: activity.sessionsWithAttendance || 0,
      // Numerator (attendance-row dates) and denominator (slot dates) aren't
      // strictly nested — a teacher can log attendance on a different day
      // than the slot date — so this can exceed 100%; clamp for display.
      submissionRate:
        enrolledSessionCount > 0
          ? Math.min(100, rateFrom(activity.sessionsWithAttendance || 0, enrolledSessionCount))
          : null,
      homeworkSet: activity.homeworkSet || 0,
    },
    completions: toMetric(completionMap, monthKeys),
    assessments: {
      created: toMetric(assessmentByMonth, monthKeys),
      byStatus: groupCounts(Array.from(assessmentByStatus, ([key, count]) => ({ _id: key, count }))),
    },
    assignments: toMetric(assignmentMap, monthKeys),
    feedback: {
      count: feedbackRow.count || 0,
      avgCourseRating: feedbackRow.avgCourseRating != null ? round1(feedbackRow.avgCourseRating) : null,
      avgInstructorRating: feedbackRow.avgInstructorRating != null ? round1(feedbackRow.avgInstructorRating) : null,
    },
  };
}

// ---------------------------------------------------------------------------
// HTTP handlers
// ---------------------------------------------------------------------------

exports.buildMonthlyInsights = buildMonthlyInsights;

exports.getMonthlyInsights = asyncHandler(async (req, res) => {
  const { month, trailing } = req.query;

  if (month !== undefined && !isValidMonthKey(month)) {
    return res.status(400).json({ success: false, message: "Invalid month — expected format YYYY-MM." });
  }

  const insights = await buildMonthlyInsights({
    monthKey: month || currentMonthKey(),
    trailing: trailing !== undefined ? Number(trailing) : DEFAULT_TRAILING,
  });

  res.status(200).json(insights);
});

exports.getInsightMonths = asyncHandler(async (req, res) => {
  const earliestUser = await User.findOne().sort({ createdAt: 1 }).select("createdAt").lean();
  const earliest = earliestUser ? monthKeyFromDate(new Date(earliestUser.createdAt)) : currentMonthKey();
  res.status(200).json({ success: true, earliest, latest: currentMonthKey() });
});
