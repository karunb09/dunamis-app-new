const User = require("../model/user.model")
const OTP = require("../model/otp.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mailSender = require("../utils/mailSender");
const otpTemplate= require("../mail/emailVerification");
require("dotenv").config();
const AdminNotice = require("../model/adminNotice.model");
const { localFileUpload } = require("../utils/locallyUploader");
const Teacher = require("../model/teacher.model");
const TeacherDetail = require("../model/teacherApplication.model");
const {
  ACCESS_TOKEN_TTL_SECONDS,
  ACCESS_TOKEN_TTL_MS,
} = require("../config/auth");
const asyncHandler = require("../utils/asyncHandler");
const { EMPLOYEE_ID_REGEX, bumpCounterFloor } = require("../utils/employeeId");
const { isReferralCodeTaken } = require("../utils/referral");

const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

const populateSessionUser = (query) =>
  query
    .populate("adminDetails")
    .populate("teacherDetails")
    .populate("studentDetails");

const buildSessionUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  mobileNo: user.mobileNo,
  accountType: user.accountType,
  accountStatus: user.accountStatus,
  image: user.image,
  roleId: user.roleId?._id || user.roleId,
  roleModel: user.roleModel,
  permissions: user.permissions,
  role: user.role,
  adminDetails: user.adminDetails,
  teacherDetails: user.teacherDetails,
  studentDetails: user.studentDetails,
});

const canManageUser = (requestUser, targetUserId) => {
  if (!requestUser) return false;

  return (
    requestUser.accountType === "admin" ||
    requestUser.accountType === "superadmin" ||
    String(requestUser.userId) === String(targetUserId)
  );
};

//Login
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(403).json({
        success: false,
        message: "All fields are mandatory, please try again",
      });
    }

    const user = await populateSessionUser(User.findOne({ email }));

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User is not registered, please signup first",
      });
    }

    if (user.accountStatus !== "active") {
      return res.status(400).json({
        success: false,
        message: "Your account has been deactivated, please contact admin",
      });
    }

    if (await bcrypt.compare(password, user.password)) {
      const payload = {
        email: user.email,
        userId: user._id,
        roleId: user.roleId,
        accountType: user.accountType,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      });

      user.token = token;
      user.password = undefined;

      const options = {
        expires: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
        ...authCookieOptions,
      };

      res
        .cookie("token", token, options)
        .status(200)
        .json({
          success: true,
          token,
          user: buildSessionUser(user),
          message: "Logged in successfully",
        });
    } else {
      return res.status(401).json({
        success: false,
        message: "Email or password is incorrect",
      });
    }
});

exports.getCurrentUser = asyncHandler(async (req, res) => {
    const user = await populateSessionUser(
      User.findById(req.user.userId).select("-password")
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.accountStatus !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated, please contact admin",
      });
    }

    return res.status(200).json({
      success: true,
      token: req.token,
      user: buildSessionUser(user),
    });
});

exports.logout = async (req, res) => {
  return res
    .clearCookie("token", authCookieOptions)
    .status(200)
    .json({
      success: true,
      message: "Logged out successfully",
    });
};

//change password
exports.changePassword = asyncHandler(async (req, res) => {
      //get data from req body
      const userDetails = await User.findById(req.user.userId);
   
      //get oldPassword,newPassword,confirmNewPassword
      
      const{oldPassword,newPassword}=req.body;
      //validation
      const isOldPasswordMatch = await bcrypt.compare(
          oldPassword,
          userDetails.password,
      )
  
      if(!isOldPasswordMatch){
          return res.status(401).json({
              success:false,
              message:"The password is incorrect"
          })
      }
      //update password
      const encryptedPassword = await bcrypt.hash(newPassword,10);
      const updatedUserDetails = await User.findByIdAndUpdate(req.user.userId,
          {
              password:encryptedPassword
          },
          {returnDocument: "after"}
      )
  
      function passwordUpdated(email, message) {
          return `
        <h2>Password Updated Successfully</h2>
        <p>${message}</p>
        <p>If you did not request this, please contact support immediately.</p>
    `;
      }
  
      
      //send mail -password updated
      try {
          const emailResponse =await mailSender(
              updatedUserDetails.email,
              "Password for your acoount has been updated successfully",
              passwordUpdated(
                  updatedUserDetails.email,
                  `password updated succcessfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
              )
  
          )
          console.log("email Sent successfully:",emailResponse.response);
          
      } catch (error) {
          console.error("error while sending email:",error);
          return res.status(500).json({
              success:false,
              message:"error while sending email",
              error:error.message
          })
          
      }
      
      
      //return response
      return res.status(200).json({
        success:true,
        message:"password changed successfully",
      })
});

// Forgot Password - Send OTP
exports.forgotPassword = asyncHandler(async (req, res) => {
        const { email } = req.body;

        // Validation
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User with this email does not exist",
            });
        }

        // Check if account is active
        if (user.accountStatus !== "active") {
            return res.status(400).json({
                success: false,
                message: "Your account has been deactivated. Please contact admin.",
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Check if OTP already exists for this email
        const existingOTP = await OTP.findOne({ email });
        if (existingOTP) {
            // Update existing OTP
            existingOTP.otp = otp;
            existingOTP.createdAt = Date.now();
            await existingOTP.save();
        } else {
            // Create new OTP entry
            await OTP.create({ email, otp });
        }

        // Send OTP via email
        try {
            await mailSender(
                email,
                "Password Reset OTP",
                otpTemplate(otp, `${user.name.firstName} ${user.name.lastName}`)
            );

            return res.status(200).json({
              success: true,
              message: "OTP sent to your email successfully",
            });
        } catch (error) {
            console.error("Error sending OTP email:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email",
                error: error.message,
            });
        }
});

// Verify OTP
exports.verifyOTP = asyncHandler(async (req, res) => {
        const { email, otp } = req.body;

        // Validation
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Find the most recent OTP for this email
        const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new OTP.",
            });
        }

        // Check if OTP has expired (5 minutes validity)
        const otpAge = Date.now() - otpRecord.createdAt;
        const OTP_VALIDITY = 5 * 60 * 1000; // 5 minutes

        if (otpAge > OTP_VALIDITY) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP.",
            });
        }

        // Verify OTP
        if (otpRecord.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again.",
            });
        }

        // OTP is valid
        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
        });
});

// Reset Password (After OTP Verification)
exports.resetPassword = asyncHandler(async (req, res) => {
        const { email, otp, newPassword } = req.body;

        // Validation
        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email, OTP, and new password are required",
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Verify OTP one more time
        const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new OTP.",
            });
        }

        // Check if OTP has expired
        const otpAge = Date.now() - otpRecord.createdAt;
        const OTP_VALIDITY = 5 * 60 * 1000; // 5 minutes

        if (otpAge > OTP_VALIDITY) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP.",
            });
        }

        // Verify OTP
        if (otpRecord.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again.",
            });
        }

        user.password = newPassword;
        await user.save(); 
        // Delete used OTP
        await OTP.deleteOne({ _id: otpRecord._id });

        // Send confirmation email
        function passwordResetSuccess(email, name) {
            return `
                <h2>Password Reset Successful</h2>
                <p>Hello ${name},</p>
                <p>Your password has been reset successfully.</p>
                <p>If you did not make this change, please contact support immediately.</p>
                <p>Thanks,<br/>Support Team</p>
            `;
        }

        try {
            await mailSender(
                email,
                "Password Reset Successful",
                passwordResetSuccess(email, `${user.name.firstName} ${user.name.lastName}`)
            );
        } catch (error) {
            console.error("Error sending confirmation email:", error);
        }

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. You can now login with your new password.",
        });
});

// Get All Users
exports.getAllUsers = asyncHandler(async (req, res) => {
        const users = await User.find()
            .select("-password -__v")
            .populate("roleId")
            .populate("adminDetails"); // Add this line

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No users found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Users retrieved successfully",
            users,
        });
});

// Get by id
exports.getUserById = asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!canManageUser(req.user, id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access this user",
            });
        }

        const user = await User.findById(id)
            .select("-password")
            .populate("roleId")
            .populate("adminDetails"); // Add this line
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "User fetched successfully",
            user,
            permissions: user.permissions // Add permissions explicitly
        });
});

// Update User - WITH IMAGE UPLOAD SUPPORT
exports.updateUser = asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!canManageUser(req.user, id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this user",
            });
        }

        // Debug logs
        console.log("Request Body:", req.body);
        console.log("Request Files:", req.files);

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Handle file upload if present
        let imagePath = user.image; // Keep existing image by default
        let didUploadProfileImage = false;
        
        if (req.files && req.files.profileImage) {
            console.log("Processing image upload...");
            try {
                // Define allowed image types
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                
                // Upload file (returns array)
                const uploadResults = await localFileUpload(req.files.profileImage, allowedTypes);
                
                console.log("Upload results:", uploadResults);
                
                // Extract path from first result (since it returns an array)
                if (uploadResults && uploadResults.length > 0 && uploadResults[0].path) {
                    imagePath = uploadResults[0].path;
                    didUploadProfileImage = true;
                    console.log("Image path updated:", imagePath);
                }
            } catch (uploadError) {
                console.error("Error uploading image:", uploadError);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload image",
                    error: uploadError.message,
                });
            }
        } else {
            console.log("No file found in request");
        }

        // Extract fields from request body
        const { 
            firstName, 
            lastName, 
            name, 
            mobileNo, 
            email, 
            accountType, 
            accountStatus, 
            roleModel,
            location,
            bio 
        } = req.body;

        // Update User fields (only if provided)
        if (firstName !== undefined) user.name.firstName = firstName;
        if (lastName !== undefined) user.name.lastName = lastName;
        
        // Handle nested name object
        if (name?.firstName !== undefined) user.name.firstName = name.firstName;
        if (name?.lastName !== undefined) user.name.lastName = name.lastName;
        
        if (mobileNo !== undefined) user.mobileNo = mobileNo;
        if (email !== undefined) user.email = email;
        if (location !== undefined) user.location = location;
        if (bio !== undefined) user.bio = bio;

        // accountType/accountStatus/roleModel change privilege — only staff
        // may grant them, never the account being updated itself.
        const isStaffCaller = ["admin", "superadmin"].includes(req.user?.accountType);
        if (isStaffCaller) {
          if (accountType !== undefined) user.accountType = accountType;
          if (accountStatus !== undefined) user.accountStatus = accountStatus;
          if (roleModel !== undefined) user.roleModel = roleModel;
        }
        
        // Update image
        user.image = imagePath;

        await user.save();

        if (didUploadProfileImage && user.accountType === "teacher" && user.roleId) {
            const teacher = await Teacher.findById(user.roleId).select("teacherDetail");
            if (teacher?.teacherDetail) {
                await TeacherDetail.findByIdAndUpdate(teacher.teacherDetail, {
                    profilePicture: imagePath,
                });
            }
        }

        console.log("User saved with image:", user.image);

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                mobileNo: user.mobileNo,
                accountType: user.accountType,
                accountStatus: user.accountStatus,
                image: user.image,
                roleModel: user.roleModel,
                location: user.location,
                bio: user.bio,
            },
        });
});

const buildDashboardNoticeFilter = (requestUser, includeDeleted = false) => {
  const userId = requestUser.userId;
  const accountType = requestUser.accountType;
  const roleTarget =
    accountType === "student"
      ? "All Students"
      : accountType === "admin" || accountType === "superadmin"
        ? "All Admins"
        : null;

  const targetConditions = [
    { targetUsers: "All" },
    { targetUsers: "Specific Users", specificUsers: userId },
  ];

  if (roleTarget) {
    targetConditions.push({ targetUsers: roleTarget });
  }

  return {
    ...(includeDeleted ? {} : { deletedBy: { $ne: userId } }),
    modeOfUpdate: { $in: ["Dashboard notification", "Both"] },
    status: "Sent",
    $or: targetConditions,
  };
};

exports.setEmployeeId = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employeeId = String(req.body.employeeId || "").trim().toUpperCase();

  if (!EMPLOYEE_ID_REGEX.test(employeeId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee ID format. Expected e.g. DMPL001 or DSMI001.",
    });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.employeeId !== employeeId && (await isReferralCodeTaken(employeeId, { excludeUserId: user._id }))) {
    return res.status(409).json({
      success: false,
      message: `Employee ID ${employeeId} is already in use`,
    });
  }

  user.employeeId = employeeId;
  await user.save();
  await bumpCounterFloor(employeeId);

  return res.status(200).json({
    success: true,
    message: "Employee ID updated",
    user: { _id: user._id, employeeId: user.employeeId },
  });
});

exports.getUserDashboardNotices = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const notices = await AdminNotice.find({
      ...buildDashboardNoticeFilter(req.user),
    })
      .populate({ path: "creator", select: "name email" })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      notices: notices.map((notice) => {
        const noticeObject = notice.toObject();
        noticeObject.isRead = (notice.readBy || []).some(
          (readerId) => String(readerId) === String(userId)
        );
        return noticeObject;
      }),
    });
});

exports.markAllDashboardNoticesRead = asyncHandler(async (req, res) => {
    const result = await AdminNotice.updateMany(
      buildDashboardNoticeFilter(req.user),
      { $addToSet: { readBy: req.user.userId } }
    );

    res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount || 0,
    });
});

exports.clearDashboardNotices = asyncHandler(async (req, res) => {
    const result = await AdminNotice.updateMany(
      buildDashboardNoticeFilter(req.user),
      { $addToSet: { deletedBy: req.user.userId } }
    );

    res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount || 0,
    });
});

exports.markDashboardNoticeRead = asyncHandler(async (req, res) => {
    const notice = await AdminNotice.findByIdAndUpdate(
      req.params.noticeId,
      { $addToSet: { readBy: req.user.userId } },
      { returnDocument: "after" }
    );

    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found." });
    }

    res.status(200).json({ success: true, notice });
});

exports.deleteDashboardNotice = asyncHandler(async (req, res) => {
    const notice = await AdminNotice.findByIdAndUpdate(
      req.params.noticeId,
      { $addToSet: { deletedBy: req.user.userId } },
      { returnDocument: "after" }
    );

    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found." });
    }

    res.status(200).json({ success: true, noticeId: req.params.noticeId });
});
