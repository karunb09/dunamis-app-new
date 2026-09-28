const Admin = require("../model/admin.model");
const User = require("../model/user.model");

const ALL_ACCESS = "allAccess";
// Holding either lets someone hand out every other permission, so granting
// them is reserved for the top of the org.
const PROTECTED_PERMISSIONS = [ALL_ACCESS, "adminManagement"];

const PROTECTED_ACCOUNT_HINT =
  "Only an admin with All Access (the CEO's account) can make this change.";
const LAST_ALL_ACCESS_HINT =
  "Give another active admin All Access first, so someone can still manage admins.";

// Permissions come from the Admin doc, never the JWT: the token only carries
// accountType/roleId, and a revoked permission must stop working immediately.
const getPermissions = async (userId) => {
  const admin = await Admin.findOne({ userId }).select("permission").lean();
  return admin?.permission || [];
};

const hasAllAccess = async (userId) =>
  (await getPermissions(userId)).includes(ALL_ACCESS);

const isUnrestrictedCaller = async (requestUser) => {
  if (!requestUser) return false;
  if (requestUser.accountType === "superadmin") return true;
  return requestUser.accountType === "admin" && hasAllAccess(requestUser.userId);
};

const isTopAccount = async (user) => {
  if (!user) return false;
  if (user.accountType === "superadmin") return true;
  return user.accountType === "admin" && hasAllAccess(user._id);
};

// Prod has no superadmin accounts, so an active allAccess admin is the only
// thing standing between the company and a locked admin panel. Superadmins
// still count where they exist (local seed data).
const countActiveTopAdmins = async ({ excludeUserId } = {}) => {
  const holders = await Admin.find({ permission: ALL_ACCESS }).select("userId").lean();
  const excluded = String(excludeUserId || "");
  const holderIds = holders
    .map((admin) => admin.userId)
    .filter((id) => id && String(id) !== excluded);

  return User.countDocuments({
    accountStatus: "active",
    ...(excluded ? { _id: { $ne: excludeUserId } } : {}),
    $or: [
      { accountType: "superadmin" },
      { accountType: "admin", _id: { $in: holderIds } },
    ],
  });
};

// Anyone who can edit an All Access account's email can take it over through
// forgot-password, so every change to one is reserved for its peers. Sends the
// 403 and returns true when the caller may not touch `target`.
const guardTopAccount = async (req, res, target) => {
  const isSelf = String(req.user?.userId) === String(target._id);
  if (isSelf || !(await isTopAccount(target))) return false;
  if (await isUnrestrictedCaller(req.user)) return false;
  res.status(403).json({
    success: false,
    message: "This account has All Access and can't be changed from your account.",
    hint: PROTECTED_ACCOUNT_HINT,
  });
  return true;
};

const touchesProtectedPermissions = (before = [], after = []) =>
  PROTECTED_PERMISSIONS.some(
    (key) => before.includes(key) !== after.includes(key)
  );

module.exports = {
  ALL_ACCESS,
  LAST_ALL_ACCESS_HINT,
  PROTECTED_ACCOUNT_HINT,
  countActiveTopAdmins,
  getPermissions,
  guardTopAccount,
  hasAllAccess,
  isTopAccount,
  isUnrestrictedCaller,
  touchesProtectedPermissions,
};
