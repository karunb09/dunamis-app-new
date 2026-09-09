const mongoose = require("mongoose");
const { toWords } = require("number-to-words");

const AttendanceHomework = require("../model/attendanceHomework.model");
const Course = require("../model/course.model");
const DemoBooking = require("../model/demoBooking.model");
const InstructorPayConfig = require("../model/instructorPayConfig.model");
const InstructorRate = require("../model/instructorRate.model");
const Student = require("../model/student.model");
const { formatUserName } = require("../utils/formatName");
const { istDayStart, monthWindow, shiftMonth } = require("../utils/istMonth");

const toId = (value) => String(value?._id || value || "");

const rateKey = (categoryId, level, sessionType) =>
  `${toId(categoryId)}|${level || ""}|${sessionType}`;

// The 7th of the month after the cycle, per the instructor manual.
const payDueDateFor = (month, dayOfMonth) =>
  istDayStart(`${shiftMonth(month, 1)}-${String(dayOfMonth).padStart(2, "0")}`);

const amountInWords = (amount) => {
  const rounded = Math.round(amount);
  if (!Number.isFinite(rounded) || rounded === 0) return "Zero";
  return toWords(rounded).replace(/\b\w/g, (c) => c.toUpperCase());
};

const sumAdjustments = (adjustments = []) =>
  adjustments.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);

// Totals are recomputed rather than trusted so an edited adjustment can never
// leave `totalEarnings` disagreeing with the lines it is printed beside.
const summarise = ({ lines = [], demoAmount = 0, adjustments = [] }) => {
  const linesTotal = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const totalEarnings = Math.round(
    linesTotal + (Number(demoAmount) || 0) + sumAdjustments(adjustments)
  );

  return {
    linesTotal,
    adjustmentsTotal: sumAdjustments(adjustments),
    totalEarnings,
    totalEarningsInWords: amountInWords(totalEarnings),
  };
};

// What one instructor earned in one IST calendar month. Read-only: it backs
// both the admin preview and the persisted generate, which must not diverge.
const buildInstructorPayout = async ({ teacherId, month }) => {
  const { start, end } = monthWindow(month);
  const teacherObjectId = new mongoose.Types.ObjectId(String(teacherId));
  const config = await InstructorPayConfig.load();

  // One row per learner per class the instructor actually taught. sessionType
  // and category are denormalised onto attendance, so only the course level
  // needs looking up.
  const attended = await AttendanceHomework.aggregate([
    {
      $match: {
        teacherId: teacherObjectId,
        attendanceStatus: "Present",
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: {
          studentId: "$studentId",
          courseId: "$courseId",
          sessionType: "$sessionType",
        },
        categoryId: { $first: "$category" },
        sessionsAttended: { $sum: 1 },
      },
    },
  ]);

  const courseIds = [...new Set(attended.map((row) => toId(row._id.courseId)))];
  const studentIds = [...new Set(attended.map((row) => toId(row._id.studentId)))];

  const [courses, students, rates, demoConversions] = await Promise.all([
    Course.find({ _id: { $in: courseIds } })
      .select("name code level category")
      .populate("category", "name")
      .lean(),
    Student.find({ _id: { $in: studentIds } })
      .select("userId")
      .populate("userId", "name")
      .lean(),
    InstructorRate.find({ isActive: true }).lean(),
    DemoBooking.countDocuments({
      teacherId: teacherObjectId,
      enrollmentStatus: "Enrolled",
      convertedAt: { $gte: start, $lt: end },
    }),
  ]);

  const courseById = new Map(courses.map((course) => [toId(course._id), course]));
  const studentNameById = new Map(
    students.map((student) => [
      toId(student._id),
      formatUserName(student.userId?.name, "Student"),
    ])
  );
  const rateByKey = new Map(
    rates.map((rate) => [
      rateKey(rate.categoryId, rate.level, rate.sessionType),
      rate,
    ])
  );

  const lines = attended.map((row) => {
    const course = courseById.get(toId(row._id.courseId));
    const sessionType = row._id.sessionType;
    // The course is the authority on level and category; attendance only
    // denormalises the category, and a course can be recategorised.
    const categoryId = toId(course?.category) || toId(row.categoryId);
    const level = course?.level || "";
    const rate = rateByKey.get(rateKey(categoryId, level, sessionType));

    const sessionsPerMonth =
      Number(rate?.sessionsPerMonth) || config.defaultSessionsPerMonth;
    const sessionsAttended = Number(row.sessionsAttended) || 0;
    // Capped at one full month: a five-week month must not pay over 100%.
    const amount = rate
      ? Math.round(
          Number(rate.ratePerLearnerMonth) *
            Math.min(1, sessionsAttended / sessionsPerMonth)
        )
      : 0;

    return {
      studentId: row._id.studentId,
      studentName: studentNameById.get(toId(row._id.studentId)) || "Student",
      courseId: row._id.courseId,
      courseName: course?.name || "Course",
      categoryId: categoryId || null,
      categoryName: course?.category?.name || "",
      level,
      sessionType,
      sessionsAttended,
      sessionsPerMonth,
      rate: Number(rate?.ratePerLearnerMonth) || 0,
      amount,
      rateMissing: !rate,
    };
  });

  lines.sort(
    (a, b) =>
      a.courseName.localeCompare(b.courseName) ||
      a.studentName.localeCompare(b.studentName)
  );

  const distinct = (sessionType) =>
    new Set(
      lines
        .filter((line) => line.sessionType === sessionType)
        .map((line) => toId(line.studentId))
    ).size;

  const demoAmount = demoConversions * config.demoConversionAmount;

  return {
    teacherId: teacherObjectId,
    month,
    window: { start, end },
    lines,
    demoConversions,
    demoAmount,
    groupStudents: distinct("standard"),
    individualStudents: distinct("premium"),
    demoStudents: demoConversions,
    payDueDate: payDueDateFor(month, config.payDueDayOfMonth),
    rateMissingCount: lines.filter((line) => line.rateMissing).length,
    ...summarise({ lines, demoAmount, adjustments: [] }),
  };
};

module.exports = {
  buildInstructorPayout,
  summarise,
  sumAdjustments,
  amountInWords,
  payDueDateFor,
};
