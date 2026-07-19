const { scheduleWithHeartbeat } = require("../utils/cronHeartbeat");
const mongoose = require("mongoose");
const Student = require("../model/student.model");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");
const Assignment = require("../model/assignment.model");
const { notifyEvent } = require("../utils/notificationService");

const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

async function runAssignmentCycle(force = false) {
  console.log("Running monthly assignment generation cycle...");
  if (force) console.log("FORCE_MODE ENABLED — skipping month check");

  const today = normalizeDate(new Date());

  const students = await Student.find({
    "enrolledCourses.status": "in-progress",
  }).populate("userId", "name email");

  console.log(`Found ${students.length} active students.`);

  for (const student of students) {
    for (const enrollment of student.enrolledCourses || []) {
      const { courseId, joinedAt, status } = enrollment;
      console.log(
        "Checking student:",
        student.userId?.email,
        "| courseId:",
        courseId,
        "| status:",
        status
      );

      if (!courseId || status !== "in-progress") {
        console.log("Skipping — no courseId or not in-progress");
        continue;
      }

      const course = await Course.findById(courseId).select("teacher name");
      if (!course) {
        console.log("Skipping — course not found", courseId);
        continue;
      }

      const joinedDate = joinedAt || student.createdAt;
      const monthsSinceJoin =
        (today.getFullYear() - joinedDate.getFullYear()) * 12 +
        today.getMonth() -
        joinedDate.getMonth();

      console.log("Months since join:", monthsSinceJoin);

      if (force || monthsSinceJoin > 0) {
        console.log("Eligible for assignment cycle");

        const existing = await Assignment.findOne({
          "students.studentId": student._id,
          courseId,
          $or: [
            { dueDate: null },
            { "students.status": { $in: ["reminder", "assigned", "pending"] } },
          ],
        });

        if (existing) {
          console.log("Skipping — active assignment already exists");
          continue;
        }

        const courseTeachers = course.teacher || [];
        console.log("Course teachers:", courseTeachers);

        const assignedTeacher = await Teacher.findOne({
          _id: { $in: courseTeachers },
        });

        if (!assignedTeacher) {
          console.log("Skipping — no teacher found for course");
          continue;
        }          

        const newAssignment = await Assignment.create({
          courseId: course._id,
          teacherId: assignedTeacher._id,
          userId: assignedTeacher.userId || null,
          title: "",
          description: "",
          dueDate: null,
          students: [
            {
              studentId: student._id,
              status: "reminder",
            },
          ],
        });

        console.log(
          `Created assignment for ${student.userId?.email} → ${course.name} | _id: ${newAssignment._id}`
        );

        const studentName = student.userId?.name
          ? `${student.userId.name.firstName} ${student.userId.name.lastName}`.trim()
          : "a student";
        await notifyEvent({
          event: "assignmentCycle",
          instructorUser: assignedTeacher.userId
            ? { _id: assignedTeacher.userId }
            : null,
          title: "Assignment due to be set",
          message: `Monthly assignment cycle: set an assignment for ${studentName} in ${course.name}.`,
        });
      } else {
        console.log("Skipping — no full month completed yet");
      }
    }
  }

  console.log("Assignment generation cycle completed.");
}

scheduleWithHeartbeat("assignmentCycle", "0 0 * * *", runAssignmentCycle);

exports.manualAssignmentCycle = async (req, res) => {
  try {
    const { force } = req.query;
    await runAssignmentCycle(force === "true");
    res.status(200).json({
      success: true,
      message: force
        ? "Assignment cycle executed manually (FORCE_MODE)"
        : "Assignment cycle executed manually",
    });
  } catch (error) {
    console.error("Manual assignment cycle error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
