const jwt = require("jsonwebtoken");

exports.isAuth = async (req, res, next) => {
  try {
    const headerToken = req.headers.authorization
      ?.replace(/^\s*\w+\s+/, "")
      .trim();
    const token = headerToken || req.body?.token || req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.exp * 1000 < Date.now()) {
      res.clearCookie("token");
      return res.status(401).json({
        success: false,
        message: "Access token has expired",
      });
    }

    req.token = token;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

exports.accessToRole = (roles = []) => {
  return async (req, res, next) => {
    if (!req.user || !roles.includes(req.user.accountType)) {
      return res.status(403).json({
        success: false,
        error: `Access denied, Only user with ${roles.join(" or ")} role is allowed`,
      });
    }
    next();
  };
};

// ── Staff permissions and scope ─────────────────────────────────────────────
// Permissions and org placement are read from the database on each request,
// never the JWT: a revoked permission or a disabled account must stop working
// at once, not when the token expires.

const staffModels = () => ({
  User: require("../model/user.model"),
  Admin: require("../model/admin.model"),
});

// { user, permissions, unrestricted } for admins/superadmins, { invalid: true }
// for a disabled or changed account, null for teachers and students.
exports.loadStaff = async (req) => {
  if (req.staff !== undefined) return req.staff;
  if (!["admin", "superadmin"].includes(req.user?.accountType)) {
    req.staff = null;
    return req.staff;
  }
  const { User, Admin } = staffModels();
  const user = await User.findById(req.user.userId).select("accountType accountStatus org").lean();
  if (!user || user.accountStatus !== "active" || user.accountType !== req.user.accountType) {
    req.staff = { invalid: true };
    return req.staff;
  }
  const admin =
    user.accountType === "admin"
      ? await Admin.findOne({ userId: user._id }).select("permission").lean()
      : null;
  const permissions = admin?.permission || [];
  req.staff = {
    user,
    permissions,
    unrestricted: user.accountType === "superadmin" || permissions.includes("allAccess"),
  };
  return req.staff;
};

// Passes staff holding any of `keys` (or All Access). Teachers and students
// pass straight through: the routes they share keep their own ownership checks.
exports.requirePermission = (...keys) => async (req, res, next) => {
  const staff = await exports.loadStaff(req);
  if (staff === null) return next();
  if (staff.invalid) {
    return res.status(401).json({ success: false, message: "Your account is no longer active." });
  }
  if (staff.unrestricted || keys.some((key) => staff.permissions.includes(key))) return next();
  return res.status(403).json({
    success: false,
    message: "You don't have permission for this.",
    hint: "Ask an admin with Admin Management to grant it.",
  });
};

// For admin pages every active staff member may open (home, system status,
// their own area): a disabled admin's token stops working here too.
exports.requireActiveStaff = async (req, res, next) => {
  const staff = await exports.loadStaff(req);
  if (staff?.invalid) {
    return res.status(401).json({ success: false, message: "Your account is no longer active." });
  }
  return next();
};

// The caller's resolved scope ({ offline, online }, see utils/orgScope.js), or
// null when they see everything: All Access, superadmins, staff outside the
// marketing chain, and anyone not placed yet.
exports.getScope = async (req) => {
  if (req.scope !== undefined) return req.scope;
  const staff = await exports.loadStaff(req);
  if (!staff || staff.invalid || staff.unrestricted) {
    req.scope = null;
    return req.scope;
  }
  const { ALL, loadScopeCatalog, resolveScope } = require("../utils/orgScope");
  const catalog = await loadScopeCatalog();
  const scope = resolveScope(staff.user.org, catalog);
  if (scope.offline === ALL && scope.online === ALL) {
    req.scope = null;
    return req.scope;
  }
  // Expanded to plain id lists so filters work in find() and aggregate() alike.
  const ids = (dimension, all) =>
    dimension === ALL ? all.map((item) => item._id) : [...(dimension instanceof Set ? dimension : [])].map(toObjectId);
  req.scope = {
    branchIds: ids(scope.offline, catalog.branches),
    courseIds: ids(scope.online, catalog.onlineCourses),
  };
  return req.scope;
};

const toObjectId = (id) => new (require("mongoose").Types.ObjectId)(String(id));
