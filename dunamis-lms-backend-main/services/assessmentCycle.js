const mongoose = require("mongoose");
const Student = require("../model/student.model");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");
const Assessment = require("../model/assessment.model");
const {
  notifyEvent,
  createDashboardNotice,
} = require("../utils/notificationService");
const { buildAssessmentDueEmail } = require("../mail/assessmentEmail");

const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const DAY_MS = 86400000;

// Every level runs six months (Course.termMonths), so the assessment that
// decides a level upgrade falls at the end of one.
const ASSESSMENT_INTERVAL_MONTHS = 6;

const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS);

async function runAssessmentCycle() {
  console.log("Running 6-month assessment cycle check...");

  const today = normalizeDate(new Date());

  const students = await Student.find({
    "enrolledCourses.status": "in-progress",
  }).populate("userId", "name email");

  for (const student of students) {
    for (const enrollment of student.enrolledCourses) {
      const { courseId, status } = enrollment;
      if (!courseId || status !== "in-progress") continue;

      const course = await Course.findById(courseId).select("teacher name");
      if (!course) continue;

      let teacherId = null;

      const possibleTeachers = course.teacher.map(String);
      const assignedTeacher = await Teacher.findOne({
        _id: { $in: possibleTeachers },
        "students.id": student._id,
      });

      if (assignedTeacher) {
        teacherId = assignedTeacher._id;
      } else if (possibleTeachers.length > 0) {
        teacherId = possibleTeachers[0];
      }

      if (!teacherId) continue;

      const lastAssessment = await Assessment.findOne({
        studentId: student._id,
        courseId,
      }).sort({ dueDate: -1 });

      let nextDue;

      if (lastAssessment) {
        // The previous due date has already been pushed out by any pause the
        // learner took (see the resume handler), so the chain needs no further
        // credit here.
        nextDue = addMonths(lastAssessment.dueDate, ASSESSMENT_INTERVAL_MONTHS);
      } else {
        const enrolled = student.enrolledCourses.find(
          (e) => e.courseId.toString() === course._id.toString()
        );
        const joinedDate = enrolled?.joinedAt || student.createdAt;
        // A learner who paused before their first assessment has not had six
        // months of teaching yet.
        nextDue = addDays(
          addMonths(joinedDate, ASSESSMENT_INTERVAL_MONTHS),
          enrolled?.pausedDaysTotal || 0
        );
      }

      const normalizedNextDue = normalizeDate(nextDue);

      if (today.getTime() >= normalizedNextDue.getTime()) {
        const existing = await Assessment.findOne({
          studentId: student._id,
          courseId,
          dueDate: normalizedNextDue,
        });
        if (existing) continue;

        await Assessment.create({
          studentId: student._id,
          courseId,
          teacherId,
          dueDate: normalizedNextDue,
          status: "Pending",
        });

        console.log(
          `Created assessment → Student: ${
            student.userId?.name?.firstName || "Unknown"
          } | Course: ${
            course.name
          } | Teacher: ${teacherId} | Due: ${normalizedNextDue.toDateString()}`
        );

        const teacher = await Teacher.findById(teacherId)
          .populate("userId", "name email _id")
          .lean();
        const studentName = student.userId?.name
          ? `${student.userId.name.firstName} ${student.userId.name.lastName}`.trim()
          : "A student";
        const { subject, html, attachments } = buildAssessmentDueEmail({
          studentName,
          courseName: course.name,
          dueDate: normalizedNextDue,
        });

        await Promise.allSettled([
          notifyEvent({
            event: "assessmentCycle",
            instructorUser: teacher?.userId,
            subject,
            html,
            attachments,
          }),
          student.userId?._id
            ? createDashboardNotice({
                title: "Assessment scheduled",
                message: `Your ${course.name} assessment is due on ${normalizedNextDue.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
                userIds: [student.userId._id],
                contentType: "Reminder",
              })
            : Promise.resolve(),
        ]);
      }
    }
  }

  // A paused learner's assessment is not late — they are frozen, not ignoring
  // it. The resume handler pushes its due date out; until then, leave it alone.
  const pausedStudents = await Student.find({ "enrolledCourses.status": "paused" })
    .select("enrolledCourses.courseId enrolledCourses.status")
    .lean();
  const frozenPairs = pausedStudents.flatMap((s) =>
    (s.enrolledCourses || [])
      .filter((e) => e.status === "paused")
      .map((e) => ({ studentId: s._id, courseId: e.courseId }))
  );

  await Assessment.updateMany(
    {
      status: "Pending",
      dueDate: { $lt: today },
      ...(frozenPairs.length ? { $nor: frozenPairs } : {}),
    },
    { $set: { status: "Overdue" } }
  );

  console.log("Assessment cycle completed.");
}

module.exports = { runAssessmentCycle };
