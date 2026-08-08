const ClassRoster = require("../model/classRoster.model");
const Student = require("../model/student.model");

// Roster-aware "who is this teacher's student, for which courses" resolver.
// ClassRoster is authoritative once an enrollment has a roster row (created at
// fulfillment, kept current by admin reassignment); payments[].teacherId is
// only consulted as a fallback for enrollments that predate the ClassRoster
// rollout, and only for course pairs that have no roster row at all — a pair
// with an active roster row pointing at a DIFFERENT teacher means the student
// was reassigned away, and must not keep showing under the old instructor.
const resolveTeacherStudentContext = async (teacherId) => {
  const teacherIdStr = String(teacherId);

  const [paymentStudents, teacherRosters] = await Promise.all([
    Student.find({ "payments.teacherId": teacherId }).select("_id"),
    ClassRoster.find({ teacherId, status: "active" })
      .select("courseId sessionType deliveryMode students")
      .lean(),
  ]);

  const rosterStudentIds = new Set();
  const rosterCourseByStudent = new Map(); // studentId -> Map(courseId -> {sessionType, deliveryMode})
  teacherRosters.forEach((roster) => {
    (roster.students || [])
      .filter((member) => member.status === "active")
      .forEach((member) => {
        const sid = String(member.studentId);
        rosterStudentIds.add(sid);
        if (!rosterCourseByStudent.has(sid)) rosterCourseByStudent.set(sid, new Map());
        rosterCourseByStudent.get(sid).set(String(roster.courseId), {
          sessionType: roster.sessionType,
          deliveryMode: roster.deliveryMode,
        });
      });
  });

  const candidateIds = [
    ...new Set([...paymentStudents.map((s) => String(s._id)), ...rosterStudentIds]),
  ];

  // Any active roster row (any teacher) touching these students+courses, so
  // payments-fallback pairs that were reassigned elsewhere resolve correctly.
  const allRosters = candidateIds.length
    ? await ClassRoster.find({
        status: "active",
        "students.studentId": { $in: candidateIds },
      })
        .select("teacherId courseId students")
        .lean()
    : [];

  const currentTeacherByStudentCourse = new Map();
  allRosters.forEach((roster) => {
    (roster.students || [])
      .filter((member) => member.status === "active")
      .forEach((member) => {
        currentTeacherByStudentCourse.set(
          `${member.studentId}_${roster.courseId}`,
          String(roster.teacherId)
        );
      });
  });

  // Resolves whether (studentId, courseId) currently belongs to this teacher
  // and the sessionType/deliveryMode to display — roster-first, falling back
  // to the payment snapshot only when no roster row exists for the pair.
  const resolveCourse = (studentId, courseId, paymentFallback) => {
    const key = `${studentId}_${courseId}`;
    const rosterOwner = currentTeacherByStudentCourse.get(key);

    if (rosterOwner) {
      if (rosterOwner !== teacherIdStr) return null;
      const rosterInfo = rosterCourseByStudent.get(String(studentId))?.get(String(courseId));
      return {
        sessionType: rosterInfo?.sessionType || paymentFallback?.sessionType || null,
        deliveryMode: rosterInfo?.deliveryMode || paymentFallback?.deliveryMode || null,
      };
    }

    return paymentFallback || null;
  };

  return { candidateIds, resolveCourse };
};

module.exports = { resolveTeacherStudentContext };
