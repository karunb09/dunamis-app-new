const Admin = require("../model/admin.model");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../model/user.model");
const Branch = require("../model/branch.model");
const City = require("../model/city.model");
const sendPasswordTemplate = require("../mail/sendPassword");
const OtpGenerator = require("otp-generator");
const mailSender = require("../utils/mailSender");
const { generateEmployeeId, resolvePrefix } = require("../utils/employeeId");
const {
  ALL_ACCESS,
  LAST_ALL_ACCESS_HINT,
  PROTECTED_ACCOUNT_HINT,
  countActiveTopAdmins,
  isUnrestrictedCaller,
  touchesProtectedPermissions,
} = require("../utils/staffAccess");
const { ORG_NAME_POPULATE, sameOrg, validateStaffPlacement } = require("../services/orgPlacement");

// The validator accepts a single string or an array; the model stores an array.
const asPermissionList = (value) => [].concat(value ?? []).map(String);

const forbidden = (res, message) =>
  res.status(403).json({ success: false, message, hint: PROTECTED_ACCOUNT_HINT });

// Personal HR data stays out of lists (the Enquiries page loads every admin).
const LIST_SAFE = "-dateOfBirth -emergencyContact -address";

const lastTopAdmin = (res) =>
  res.status(409).json({
    success: false,
    message: "This is the last active admin with All Access.",
    hint: LAST_ALL_ACCESS_HINT,
  });

exports.createAdmin = asyncHandler(async (req, res) => {
    const {
      name: { firstName, lastName } = {},
      mobileNo,
      email,
      role,
      permission,
      org,
      employeePrefix,
      dateOfJoining,
      dateOfBirth,
      emergencyContact,
      address,
    } = req.body;

    if (!firstName || !lastName || !email || !mobileNo || !permission || !role || !org) {
      return res.status(403).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (
      touchesProtectedPermissions([], asPermissionList(permission)) &&
      !(await isUnrestrictedCaller(req.user))
    ) {
      return forbidden(res, "You can't grant All Access or Admin Management.");
    }

    const placement = await validateStaffPlacement({ targetUserId: null, org });

    //check user already exist or not
    const normalizedEmail = email.trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "user already exist",
      });
    }
    console.log("existing user checked");
    var password = OtpGenerator.generate(7, {
      upperCaseAlphabets: true,
      lowerCaseAlphabets: true,
      specialChars: true,
    });

    const employeeId = await generateEmployeeId(resolvePrefix(employeePrefix, "DSMA"));

    const user = await User.create({
      name: { firstName, lastName },
      email: normalizedEmail,
      mobileNo,
      password: password,
      accountType: "admin",
      employeeId,
      image: `https://api.dicebear.com/9.x/initials/svg?seed=${firstName}%20${lastName}`,
      org: placement,
    });

    const AdminDoc = await Admin.create({
      userId: user._id,
      role: role,
      permission: permission,
      dateOfJoining,
      dateOfBirth: dateOfBirth || undefined,
      emergencyContact,
      address,
    });

    user.roleId = AdminDoc._id;
    user.roleModel = "admin";
    await user.save();
    await mailSender(
      email,
      `Your ${role} Account created`,
      sendPasswordTemplate(user, role, password),
      sendPasswordTemplate.attachments
    );

    user.password = undefined;

    return res.status(200).json({
      success: true,
      message: "Admin created successfully",
      user,
      admin: AdminDoc,
    });
});
exports.getAllAdmins = asyncHandler(async (req, res) => {
    const admins = await Admin.find().select(LIST_SAFE).populate({
      path: "userId",
      select: "-password",
      populate: ORG_NAME_POPULATE,
    });

    res.status(200).json({
      success: true,
      admins,
    });
});
exports.getAdminById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const admin = await Admin.findById(id).populate("userId", "-password");
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      admin,
    });
});
exports.updateAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      name,
      email,
      mobileNo,
      role,
      permission,
      org,
      dateOfJoining,
      dateOfBirth,
      emergencyContact,
      address,
    } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const user = await User.findById(admin.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const callerUnrestricted = await isUnrestrictedCaller(req.user);
    const targetIsTop = admin.permission.includes(ALL_ACCESS);

    if (targetIsTop && !callerUnrestricted) {
      return forbidden(res, "This admin has All Access and can't be edited from your account.");
    }

    const isSelf = String(req.user.userId) === String(admin.userId);

    // Scope decides what someone is responsible for, so like permissions it
    // is not something a person can widen for themselves.
    const placement = org ? await validateStaffPlacement({ targetUserId: user._id, org }) : null;
    if (placement && isSelf && !callerUnrestricted && !sameOrg(user.org, placement)) {
      return forbidden(res, "You can't change your own designation, manager or responsibility.");
    }

    const nextPermissions = permission ? asPermissionList(permission) : null;
    if (nextPermissions) {
      // The edit form always resends the full list, so only a real change counts.
      const changed =
        nextPermissions.length !== admin.permission.length ||
        nextPermissions.some((key) => !admin.permission.includes(key));
      if (isSelf && changed && !callerUnrestricted) {
        return forbidden(res, "You can't change your own permissions.");
      }
      if (touchesProtectedPermissions(admin.permission, nextPermissions) && !callerUnrestricted) {
        return forbidden(res, "You can't grant or remove All Access or Admin Management.");
      }
      if (
        targetIsTop &&
        !nextPermissions.includes(ALL_ACCESS) &&
        user.accountStatus === "active" &&
        (await countActiveTopAdmins({ excludeUserId: user._id })) === 0
      ) {
        return lastTopAdmin(res);
      }
    }

    // Update User fields
    if (name?.firstName) user.name.firstName = name.firstName;
    if (name?.lastName) user.name.lastName = name.lastName;
    if (email) user.email = email;
    if (mobileNo) user.mobileNo = mobileNo;

    if (placement) user.org = placement;

    // Update Admin fields
    if (role) admin.role = role;
    if (nextPermissions) admin.permission = nextPermissions;
    if (dateOfJoining) admin.dateOfJoining = dateOfJoining;
    if (dateOfBirth !== undefined) admin.dateOfBirth = dateOfBirth || undefined;
    if (emergencyContact !== undefined) admin.emergencyContact = emergencyContact;
    if (address !== undefined) admin.address = address;

    await user.save();
    await admin.save();

    const populatedAdmin = await Admin.findById(admin._id).populate({
      path: "userId",
      select: "-password",
      populate: ORG_NAME_POPULATE,
    });
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      admin: populatedAdmin,
      user,
    });
});
exports.deleteAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const userId = admin.userId;

    if (admin.permission.includes(ALL_ACCESS)) {
      if (!(await isUnrestrictedCaller(req.user))) {
        return forbidden(res, "This admin has All Access and can't be deleted from your account.");
      }
      if ((await countActiveTopAdmins({ excludeUserId: userId })) === 0) {
        return lastTopAdmin(res);
      }
    }

    const [hasReports, managesBranch, managesCity] = await Promise.all([
      User.exists({ "org.reportsTo": userId }),
      Branch.exists({ branchManager: userId }),
      City.exists({ cityManager: userId }),
    ]);
    if (hasReports || managesBranch || managesCity) {
      return res.status(409).json({
        success: false,
        message: hasReports
          ? "People still report to this admin."
          : "This admin is still the contact for a branch or city.",
        hint: hasReports
          ? "Move their team to another manager from the Reporting structure tab first."
          : "Pick another centre contact or city manager first.",
      });
    }

    await Admin.findByIdAndDelete(id);
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "Admin and associated user deleted successfully",
    });
});
