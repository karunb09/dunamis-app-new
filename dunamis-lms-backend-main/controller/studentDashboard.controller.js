const Assessment = require("../model/assessment.model");
const Assignment = require("../model/assignment.model");
const AttendanceHomework = require("../model/attendanceHomework.model");
const Certificate = require("../model/certificate.model");
const ClassRoster = require("../model/classRoster.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const asyncHandler = require("../utils/asyncHandler");
const { formatUserName } = require("../utils/formatName");
const { resolveSlotJoinLink } = require("../utils/meetingLink");
const { currentDayKey, dayKeyFromDate, istDayStart } = require("../utils/istMonth");

const round1 = (n) => Math.round(n * 10) / 10;

// Everything the student Overview and Performance pages show, in one round
// trip rather than five from the browser.
exports.getMyDashboard = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user.userId }).select("_id");
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  // IST calendar day, not server-local midnight — the server's clock zone is
  // not the learner's, and a class from yesterday must never show as "next".
  const todayKey = currentDayKey();
  const todayStart = istDayStart(todayKey);
  const nowHHMM = new Date()
    .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

  const [upcomingSlots, assignments, assessments, attendance, certificateCount] = await Promise.all([
    Slot.find({
      slotType: "enrolled",
      students: student._id,
      date: { $gte: todayStart },
    })
      .select("date startTime endTime courseId createdBy parentAvailabilityId meetingLinkOverride")
      .populate("courseId", "name")
      .populate({ path: "createdBy", select: "userId", populate: { path: "userId", select: "name" } })
      .sort({ date: 1, startTime: 1 })
      .limit(6)
      .lean(),
    Assignment.find({ "students.studentId": student._id })
      .select("title dueDate courseId students")
      .populate("courseId", "name")
      .lean(),
    Assessment.find({ studentId: student._id })
      .select("courseId dueDate assessmentDate status homework practice learningSpeed performanceSkills totalScore sentAt questionnaire.title")
      .populate("courseId", "name")
      .sort({ dueDate: 1 })
      .lean(),
    AttendanceHomework.find({ studentId: student._id })
      .select("courseId attendanceStatus homework date")
      .populate("courseId", "name")
      .sort({ date: -1 })
      .lean(),
    Certificate.countDocuments({ studentId: student._id }),
  ]);

  // Today's classes that have already finished are not "next".
  const slot =
    upcomingSlots.find(
      (s) => dayKeyFromDate(new Date(s.date)) !== todayKey || (s.endTime || "") > nowHHMM
    ) || null;

  let nextClass = null;
  if (slot) {
    const roster = slot.parentAvailabilityId
      ? await ClassRoster.findOne({ parentAvailabilityId: slot.parentAvailabilityId })
          .select("meetingLink")
          .lean()
      : null;
    nextClass = {
      courseName: slot.courseId?.name || "Class",
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      instructorName: formatUserName(slot.createdBy?.userId?.name, "Instructor"),
      meetingLink: resolveSlotJoinLink(slot, roster),
    };
  }

  const mine = (assignment) =>
    (assignment.students || []).find((s) => String(s.studentId) === String(student._id));

  // "reminder" is the cycle's placeholder before the instructor has set it.
  const openAssignment =
    assignments
      .filter((a) => ["assigned", "pending", "overdue"].includes(mine(a)?.status) && !mine(a)?.submissionUrl)
      .sort((a, b) => new Date(a.dueDate || 8.64e15) - new Date(b.dueDate || 8.64e15))
      .map((a) => ({
        _id: a._id,
        title: a.title || "Assignment",
        courseName: a.courseId?.name || "",
        dueDate: a.dueDate,
      }))[0] || null;

  const openAssessment =
    assessments
      .filter((a) => a.status === "Sent")
      .map((a) => ({
        _id: a._id,
        courseName: a.courseId?.name || "",
        dueDate: a.dueDate,
        title: a.questionnaire?.title || "Assessment",
      }))[0] || null;

  const latestHomework = attendance.find((r) => r.homework) || null;

  const present = attendance.filter((r) => r.attendanceStatus === "Present").length;
  const byCourse = new Map();
  attendance.forEach((r) => {
    const name = r.courseId?.name || "Course";
    const row = byCourse.get(name) || { courseName: name, present: 0, total: 0 };
    row.total += 1;
    if (r.attendanceStatus === "Present") row.present += 1;
    byCourse.set(name, row);
  });

  const reviewed = assignments
    .map((a) => ({ assignment: a, entry: mine(a) }))
    .filter(({ entry }) => entry?.rating != null);

  res.status(200).json({
    success: true,
    nextClass,
    openAssignment,
    openAssessment,
    latestHomework: latestHomework
      ? {
          courseName: latestHomework.courseId?.name || "",
          homework: latestHomework.homework,
          date: latestHomework.date,
        }
      : null,
    certificateCount,
    performance: {
      attendance: {
        present,
        total: attendance.length,
        rate: attendance.length ? round1((present / attendance.length) * 100) : null,
        byCourse: [...byCourse.values()].map((row) => ({
          ...row,
          rate: row.total ? round1((row.present / row.total) * 100) : null,
        })),
      },
      assessments: assessments
        .filter((a) => a.status === "Completed")
        .map((a) => ({
          _id: a._id,
          courseName: a.courseId?.name || "",
          assessedOn: a.assessmentDate || a.dueDate,
          homework: a.homework,
          practice: a.practice,
          learningSpeed: a.learningSpeed,
          performanceSkills: a.performanceSkills,
          totalScore: a.totalScore,
        })),
      assignments: {
        reviewed: reviewed.length,
        averageRating: reviewed.length
          ? round1(reviewed.reduce((sum, { entry }) => sum + entry.rating, 0) / reviewed.length)
          : null,
      },
    },
  });
});
