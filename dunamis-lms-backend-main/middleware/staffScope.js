const { getScope, loadStaff } = require("./auth");
const { isInScope, notFound, studentInScope } = require("../utils/scopeFilters");

// For routes about one learner (`:id` by default): a scoped admin gets a 404
// for anyone outside their branches and courses. Teachers and students have no
// scope and pass; their own ownership checks still apply.
exports.studentParamInScope = (param = "id") => async (req, res, next) => {
  if (!(await studentInScope(await getScope(req), req.params[param]))) return notFound(res, "Student");
  next();
};

// For admin actions that put a learner into a class (manual enrollment,
// reassignment): the learner and the target branch / course must both be in
// the caller's area.
exports.bodyPlaceInScope = () => async (req, res, next) => {
  const area = await getScope(req);
  if (!area) return next();
  const { studentId, branchId, courseId } = req.body || {};
  const placeOk = isInScope(area, { branchId: branchId || null, courseId });
  if (!placeOk || (studentId && !(await studentInScope(area, studentId)))) {
    return res.status(403).json({
      success: false,
      message: "That learner or class is outside the branches and courses you look after.",
      hint: "Ask the AA or BDE responsible for it, or an admin with All Access.",
    });
  }
  next();
};

const TARGET_PERMISSION = {
  admin: "adminManagement",
  superadmin: "adminManagement",
  teacher: "instructorManagement",
  student: "studentManagement",
};

// For /user/:id routes, which reach every kind of account: the permission
// needed depends on whose account it is. Your own account is always yours;
// learners must also be in the caller's area.
exports.targetUserPermission = () => async (req, res, next) => {
  const staff = await loadStaff(req);
  if (staff === null) return next();
  if (staff.invalid) {
    return res.status(401).json({ success: false, message: "Your account is no longer active." });
  }
  if (String(req.user.userId) === String(req.params.id)) return next();

  const User = require("../model/user.model");
  const target = await User.findById(req.params.id).select("accountType roleId").lean();
  if (!target) return next();

  const key = TARGET_PERMISSION[target.accountType];
  if (!staff.unrestricted && !staff.permissions.includes(key)) {
    return res.status(403).json({
      success: false,
      message: "You don't have permission for this.",
      hint: "Ask an admin with Admin Management to grant it.",
    });
  }
  if (target.accountType === "student" && !(await studentInScope(await getScope(req), target.roleId))) {
    return notFound(res, "User");
  }
  next();
};
