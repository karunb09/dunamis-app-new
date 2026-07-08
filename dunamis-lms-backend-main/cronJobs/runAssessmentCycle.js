const cron = require("node-cron");
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

async function runAssessmentCycle() {
  console.log("Running 3-month assessment cycle check...");

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
        nextDue = addMonths(lastAssessment.dueDate, 3);
      } else {
        const enrollment = student.enrolledCourses.find(
          (e) => e.courseId.toString() === course._id.toString()
        );
        const joinedDate = enrollment?.joinedAt || student.createdAt;
        nextDue = addMonths(joinedDate, 3);
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
        const { subject, html } = buildAssessmentDueEmail({
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

  await Assessment.updateMany(
    { status: "Pending", dueDate: { $lt: today } },
    { $set: { status: "Overdue" } }
  );

  console.log("Assessment cycle completed.");
}

cron.schedule("30 0 * * *", async () => {
  try {
    await runAssessmentCycle();
  } catch (error) {
    console.error("Error in assessment cron:", error);
  }
});

exports.manualAssessmentCycle = async (req, res) => {
  try {
    await runAssessmentCycle();
    res
      .status(200)
      .json({ success: true, message: "Assessment cycle executed manually" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Internal Error" });
  }
};
