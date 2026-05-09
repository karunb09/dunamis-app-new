const Admin = require("../model/admin.model");
const User = require("../model/user.model");
const sendPasswordTemplate = require("../mail/sendPassword");
const OtpGenerator = require("otp-generator");
const mailSender = require("../utils/mailSender");
const { sendValidationError } = require("../utils/validationErrorResponse");

exports.createAdmin = async (req, res) => {
  try {
    const {
      name: { firstName, lastName } = {},
      mobileNo,
      email,
      role,
      accessLevel,
      permission,
      department,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !mobileNo ||
      !accessLevel ||
      !permission ||
      !role ||
      !department
    ) {
      return res.status(403).json({
        success: false,
        message: "All fields are required",
      });
    }

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

    console.log("password generated: ", password);

    const user = await User.create({
      name: { firstName, lastName },
      email: normalizedEmail,
      mobileNo,
      password: password,
      accountType: "admin",
      image: `https://api.dicebear.com/9.x/initials/svg?seed=${firstName}%20${lastName}`,
    });

    const AdminDoc = await Admin.create({
      userId: user._id,
      role: role,
      accessLevel: accessLevel,
      permission: permission,
      department: department,
    });

    user.roleId = AdminDoc._id;
    user.roleModel = "admin";
    await user.save();
    await mailSender(
      email,
      `Your ${role} Account created`,
      sendPasswordTemplate(user, role, password)
    );

    return res.status(200).json({
      success: true,
      message: "Admin created successfully",
      user,
      admin: AdminDoc,
    });
  } catch (error) {
    console.error("error while creating admin", error);
    return sendValidationError(res, error, "Failed to create admin");
  }
};
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().populate("userId", "-password");

    res.status(200).json({
      success: true,
      admins,
    });
  } catch (error) {
    console.error("Error getting all admins:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get admins",
    });
  }
};
exports.getAdminById = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Error getting admin by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get admin",
    });
  }
};
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobileNo, role, accessLevel, permission, department } =
      req.body;

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

    // Update User fields
    if (name?.firstName) user.name.firstName = name.firstName;
    if (name?.lastName) user.name.lastName = name.lastName;
    if (email) user.email = email;
    if (mobileNo) user.mobileNo = mobileNo;

    // Update Admin fields
    if (role) admin.role = role;
    if (accessLevel) admin.accessLevel = accessLevel;
    if (permission) admin.permission = permission;
    if (department) admin.department = department;

    await user.save();
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      admin,
      user,
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    sendValidationError(res, error, "Failed to update admin");
  }
};
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const userId = admin.userId;

    await Admin.findByIdAndDelete(id);
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "Admin and associated user deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete admin",
    });
  }
};
