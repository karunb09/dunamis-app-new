const Student = require("../model/student.model");
const DemoBooking = require("../model/demoBooking.model");

// Mongo filters limiting a list to the caller's scope (req.scope from
// middleware/auth.js → getScope: { branchIds, courseIds }). A null scope means
// the caller sees everything, so callers skip the filter.

// Records at a branch are offline and belong to that branch; records without
// one belong to their (online) course.
const placeFilter = (scope, { branchField = "branchId", courseField = "courseId" } = {}) => ({
  $or: [
    { [branchField]: { $in: scope.branchIds } },
    { [branchField]: null, [courseField]: { $in: scope.courseIds } },
  ],
});

// Sign-ups with no course, demo or payment yet are visible to every AA: they
// are the leads tele-callers follow up. Everyone else is visible when any of
// their payments, enrollments or demo bookings falls in scope.
const REGISTERED_ONLY = {
  "enrolledCourses.0": { $exists: false },
  "demoCourse.0": { $exists: false },
  "payments.0": { $exists: false },
};

const studentFilter = async (scope) => {
  const demoStudentIds = await DemoBooking.find(placeFilter(scope)).distinct("studentId");
  return {
    $or: [
      REGISTERED_ONLY,
      { "payments.branchId": { $in: scope.branchIds } },
      { branch: { $in: scope.branchIds } },
      { "enrolledCourses.courseId": { $in: scope.courseIds } },
      { "payments.courseId": { $in: scope.courseIds } },
      { _id: { $in: demoStudentIds } },
    ],
  };
};

const isInScope = (scope, { branchId, courseId }) => {
  if (!scope) return true;
  const has = (list, id) => list.some((entry) => String(entry) === String(id?._id || id));
  return branchId ? has(scope.branchIds, branchId) : has(scope.courseIds, courseId);
};

const studentInScope = async (scope, studentId) =>
  !scope || Boolean(await Student.exists({ _id: studentId, ...(await studentFilter(scope)) }));

// Detail and write endpoints answer 404, not 403, for records outside the
// caller's scope: nothing about another branch's learner should leak.
const notFound = (res, what = "Record") =>
  res.status(404).json({ success: false, message: `${what} not found.` });

module.exports = { isInScope, notFound, placeFilter, studentFilter, studentInScope };
