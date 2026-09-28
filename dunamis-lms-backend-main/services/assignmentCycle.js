const mongoose = require("mongoose");
const User = require("../model/user.model");
const Student = require("../model/student.model");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");
const Assignment = require("../model/assignment.model");
const ClassRoster = require("../model/classRoster.model");
const { notifyEvent } = require("../utils/notificationService");
const { enrollmentContext, loadRoutingDirectory } = require("../services/staffRouting");

const DAY_MS = 86400000;

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

// The learner's own instructor: whoever's roster they sit on for this course.
// Falls back to the course's first instructor for learners with no roster.
const findInstructor = async ({ studentId, course }) => {
  const roster = await ClassRoster.findOne({
    courseId: course._id,
    status: "active",
    students: { $elemMatch: { studentId, status: "active" } },
  }).select("teacherId");
  const teacherIds = roster ? [roster.teacherId] : course.teacher || [];
  return Teacher.findOne({ _id: { $in: teacherIds } });
};

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
  const directory = await loadRoutingDirectory();

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

      const course = await Course.findById(courseId).select("teacher name mode");
      if (!course) {
        console.log("Skipping — course not found", courseId);
        continue;
      }

      // Paused time is not teaching time: without this credit the month count
      // is inflated on resume and the next assignment fires that same day
      // instead of resuming the monthly rhythm.
      const joinedDate = new Date(
        (joinedAt || student.createdAt).getTime() +
          (enrollment.pausedDaysTotal || 0) * DAY_MS
      );
      const monthsSinceJoin =
        (today.getFullYear() - joinedDate.getFullYear()) * 12 +
        today.getMonth() -
        joinedDate.getMonth();

      console.log("Months since join (paused time credited):", monthsSinceJoin);

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

        // Monthly means monthly: a closed assignment must not open the next
        // one the following day.
        const last = await Assignment.findOne({
          "students.studentId": student._id,
          courseId,
        })
          .sort({ createdAt: -1 })
          .select("createdAt");
        if (!force && last && addMonths(last.createdAt, 1) > today) {
          console.log("Skipping — last assignment is less than a month old");
          continue;
        }

        const assignedTeacher = await findInstructor({ studentId: student._id, course });

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
          context: enrollmentContext({ student, course }),
          directory,
          instructorUser: assignedTeacher.userId
            ? await User.findById(assignedTeacher.userId).select("email").lean()
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

module.exports = { runAssignmentCycle };
