const CourseAssignmentLog = require("../model/courseAssignmentLog.model");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");

const teacherName = (teacher) =>
  [teacher?.teacherDetail?.name?.firstName, teacher?.teacherDetail?.name?.lastName].filter(Boolean).join(" ");

// pairs: [{ courseId, teacherId, courseName? }] — pass courseName when the course is already deleted.
const logCourseAssignments = async (req, { action, source, pairs }) => {
  if (!pairs?.length) return;
  // The assignment has already been written; a lost audit row must not turn it into a 500.
  try {
    const courseIds = [...new Set(pairs.map((p) => String(p.courseId)))];
    const teacherIds = [...new Set(pairs.map((p) => String(p.teacherId)))];
    const [courses, teachers] = await Promise.all([
      Course.find({ _id: { $in: courseIds } }).select("name").lean(),
      Teacher.find({ _id: { $in: teacherIds } })
        .select("teacherDetail")
        .populate({ path: "teacherDetail", select: "name" })
        .lean(),
    ]);
    const courseNames = new Map(courses.map((c) => [String(c._id), c.name]));
    const teacherNames = new Map(teachers.map((t) => [String(t._id), teacherName(t)]));

    await CourseAssignmentLog.insertMany(
      pairs.map((p) => ({
        courseId: p.courseId,
        teacherId: p.teacherId,
        action,
        source,
        courseName: p.courseName || courseNames.get(String(p.courseId)),
        teacherName: teacherNames.get(String(p.teacherId)),
        actorUserId: req.user?.userId || null,
        actorEmail: req.user?.email,
      }))
    );
  } catch (err) {
    console.error("Failed to write course assignment log:", err.message);
  }
};

module.exports = { logCourseAssignments };
