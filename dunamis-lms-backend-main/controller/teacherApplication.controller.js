const TeacherApplication = require('../model/teacherApplication.model'); 
const asyncHandler = require("../utils/asyncHandler");
const { localFileUpload } = require('../utils/locallyUploader');
const User = require("../model/user.model");
const Teacher = require("../model/teacher.model");
const sendPasswordTemplate = require("../mail/sendPassword");
const sendApplicationStatus = require("../mail/sendApplicationStatus");
const OtpGenerator = require("otp-generator");
const mailSender = require("../utils/mailSender");

const getTodayDateString = () => {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
};

const isValidCurrentOrFutureDate = (value) => {
  const dateValue = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return false;

  const parsedDate = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) return false;

  return parsedDate.toISOString().slice(0, 10) === dateValue &&
    dateValue >= getTodayDateString();
};

exports.createTeacherApplication = asyncHandler(async (req, res) => {
    // Extract form data
    const {
      firstName,
      lastName,
      gender,
      readLanguage,
      speakLanguage,
      email,
      mobileNo,
      currentState,
      currentCity,
      currentAddress,
      areaOfExpertise,
      yearOfExperience,
      highestQualification,
      currentCTC,
      expectedCTC,
      noticePeriod,
      availability,
      mode,
      specialization, 
    } = req.body;

    // Validate required fields
    const requiredFields = {
      firstName,
      lastName,
      readLanguage,
      speakLanguage,
      email,
      mobileNo,
      currentState,
      currentCity,
      currentAddress,
      areaOfExpertise,
      yearOfExperience,
      highestQualification,
      currentCTC,
      expectedCTC,
      noticePeriod,
      availability,
      mode,
    };

    const missingFields = [];
    Object.entries(requiredFields).forEach(([key, value]) => {
      if (!value || (typeof value === "string" && value.trim() === "")) {
        missingFields.push(key);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (!isValidCurrentOrFutureDate(noticePeriod)) {
      return res.status(400).json({
        success: false,
        message: "Join date must be today or a future date",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address",
      });
    }

    // Validate files
    if (!req.files) {
      return res.status(400).json({
        success: false,
        message: "Files are required (CV and profile video)",
      });
    }

    const { cv, profileVideo, relevantCertificate, profilePicture } = req.files;

    // Validate required files
    if (!cv) {
      return res.status(400).json({
        success: false,
        message: "CV file is required",
      });
    }

    if (!profileVideo) {
      return res.status(400).json({
        success: false,
        message: "Profile video is required",
      });
    }

    if (!profilePicture) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required",
      });
    }

    // Validate file types by mimetype
    const allowedCVTypes = ["application/pdf"];
    const allowedVideoTypes = ["video/mp4", "video/mpeg", "video/avi", "video/quicktime"];
    const allowedCertificateTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    const allowedProfilePictureTypes = ["image/png", "image/jpeg", "image/jpg"];

    if (!allowedCVTypes.includes(cv.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "CV must be a PDF file",
      });
    }

    if (!allowedVideoTypes.includes(profileVideo.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Profile video must be a video file",
      });
    }

    if (!allowedProfilePictureTypes.includes(profilePicture.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Profile Picture must be an image file",
      });
    }

    if (relevantCertificate && !allowedCertificateTypes.includes(relevantCertificate.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Certificate must be a PDF or image file",
      });
    }

    // Check if email already exists
    const existingApplication = await TeacherApplication.findOne({
      email: normalizedEmail,
    });
    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "An application with this email already exists",
      });
    }

    // Upload files locally
    const cvUpload = await localFileUpload(cv, allowedCVTypes);
    const videoUpload = await localFileUpload(profileVideo, allowedVideoTypes);
    const profilePictureUpload = await localFileUpload(profilePicture, allowedProfilePictureTypes);
    let certificateUpload = null;
    if (relevantCertificate) {
      certificateUpload = await localFileUpload(relevantCertificate, allowedCertificateTypes);
    }

    // Extract uploaded file paths
    const cvUrl = cvUpload[0].path;
    const profileVideoUrl = videoUpload[0].path;
    const profilePictureUrl = profilePictureUpload[0].path;
    const certificateUrl = certificateUpload ? certificateUpload[0].path : null;

    // Create teacher application
    const teacherApplicationData = {
      name: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
      gender,
      language: {
        read: readLanguage.trim(),
        speak: speakLanguage.trim(),
      },
      email: normalizedEmail,
      mobileNo: parseInt(mobileNo),
      currentState: currentState.trim(),
      currentCity: currentCity.trim(),
      currentAddress: currentAddress.trim(),
      areaOfExpertise: areaOfExpertise.trim(),
      yearOfExperience: parseInt(yearOfExperience),
      highestQualification: highestQualification.trim(),
      cv: cvUrl,
      profileVideo: profileVideoUrl,
      profilePicture: profilePictureUrl,
      currentCTC: currentCTC.trim(),
      expectedCTC: expectedCTC.trim(),
      noticePeriod: noticePeriod.trim(),
      mode,
      status: "new",
    };

    // Add optional fields
    if (certificateUrl) {
      teacherApplicationData.relevantCertificate = certificateUrl;
    }

    if (availability) {
      teacherApplicationData.availability = availability.trim();
    }

    if (specialization) {
      // Accept either a single value or multiple specializations (array or
      // comma-separated). Stored as a comma-separated string for compatibility.
      teacherApplicationData.specilization = Array.isArray(specialization)
        ? specialization.map((item) => String(item).trim()).filter(Boolean).join(", ")
        : String(specialization).trim();
    }

    const teacherApplication = new TeacherApplication(teacherApplicationData);
    const savedApplication = await teacherApplication.save();

    res.status(201).json({
      success: true,
      message: "Teacher application submitted successfully",
      data: {
        id: savedApplication._id,
        name: savedApplication.name,
        email: savedApplication.email,
        status: savedApplication.status,
        submittedAt: savedApplication.createdAt,
      },
    });
});

// Get all teacher applications (for admin)
exports.getAllTeacherApplications = asyncHandler(async (req, res) => {
        const { status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        
        const filter = {};
        if (status) {
            filter.status = status;
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
        };

        const applications = await TeacherApplication.find(filter)
            .sort(options.sort)
            .limit(options.limit * 1)
            .skip((options.page - 1) * options.limit)
            .select('-__v');

        const total = await TeacherApplication.countDocuments(filter);
        const totalPages = Math.ceil(total / options.limit);

        res.status(200).json({
            success: true,
            data: applications,
            pagination: {
                currentPage: options.page,
                totalPages,
                totalApplications: total,
                hasNextPage: options.page < totalPages,
                hasPrevPage: options.page > 1
            }
        });
});

// Get teacher application by ID
exports.getTeacherApplicationById = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const application = await TeacherApplication.findById(id).select('-__v');

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Teacher application not found"
            });
        }

        res.status(200).json({
            success: true,
            data: application
        });
});

// Update application status
exports.updateApplicationStatus = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ["new", "shortlisted", "rejected", "interviewed", "selected"];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
            });
        }

        const application = await TeacherApplication.findById(id).select('-__v');
       

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Teacher application not found"
            });
        }
        const {firstName,lastName}= application.name;

        if (application.status === status) {
            return res.status(200).json({
                success: true,
                message: "Application status is already up to date",
                data: application,
                credentials: null,
            });
        }

        let generatedPassword = null;

        if (status === "selected") {
            let user = await User.findOne({ email: application.email });

            if (user && user.accountType !== "teacher") {
                return res.status(409).json({
                    success: false,
                    message: "A non-teacher user already exists with this email",
                });
            }

            if (!user) {
                generatedPassword = OtpGenerator.generate(7, {
                  upperCaseAlphabets: true,
                  lowerCaseAlphabets: true,
                  specialChars: true,
                });

                user = await User.create({
                  name: {
                    firstName,
                    lastName,
                  },
                  email: application.email,
                  mobileNo: application.mobileNo,
                  password: generatedPassword,
                  accountType: "teacher",
                  accountStatus: "active",
                  image: `https://api.dicebear.com/9.x/initials/svg?seed=${firstName}%20${lastName}`,
                });
            }

            let teacherDoc = await Teacher.findOne({
                $or: [
                    { teacherDetail: application._id },
                    { userId: user._id },
                ],
            });

            if (!teacherDoc) {
                teacherDoc = await Teacher.create({
                  userId: user._id,
                  teacherDetail: application._id,
                });
            }

            let shouldSaveUser = false;

            if (user.accountType !== "teacher") {
                user.accountType = "teacher";
                shouldSaveUser = true;
            }

            if (user.accountStatus !== "active") {
                user.accountStatus = "active";
                shouldSaveUser = true;
            }

            if (String(user.roleId || "") !== String(teacherDoc._id)) {
                user.roleId = teacherDoc._id;
                shouldSaveUser = true;
            }

            if (user.roleModel !== "teacher") {
                user.roleModel = "teacher";
                shouldSaveUser = true;
            }

            if (shouldSaveUser) {
                await user.save();
            }

            if (generatedPassword) {
                try {
                  await mailSender(
                    application.email,
                    "Your teacher Account created",
                    sendPasswordTemplate(user, "teacher", generatedPassword)
                  );
                } catch (mailErr) {
                  console.error("Failed to send teacher credentials email", mailErr);
                }
            }

            // Seed versioned document arrays from the application if not yet populated
            const needsSeeding =
              teacherDoc.certificates.length === 0 &&
              teacherDoc.profileVideos.length === 0 &&
              teacherDoc.profilePictures.length === 0;

            if (needsSeeding) {
              const seedPush = {};
              if (application.relevantCertificate) {
                seedPush.certificates = { filePath: application.relevantCertificate, uploadedAt: new Date(), isActive: true };
              }
              if (application.profileVideo) {
                seedPush.profileVideos = { filePath: application.profileVideo, uploadedAt: new Date(), isActive: true };
              }
              if (application.profilePicture) {
                seedPush.profilePictures = { filePath: application.profilePicture, uploadedAt: new Date(), isActive: true };
              }
              const pushOp = Object.fromEntries(
                Object.entries(seedPush).map(([k, v]) => [k, v])
              );
              if (Object.keys(pushOp).length > 0) {
                await Teacher.findByIdAndUpdate(teacherDoc._id, { $push: pushOp });
              }
            }
        }

        application.status = status;
        await application.save();

        try {
          await mailSender(
              application.email,
              "Dunamis India Application Update",
              sendApplicationStatus(firstName, application.email, application.status),
              sendApplicationStatus.attachments()
          );
        } catch (mailErr) {
          console.error("Failed to send application status email", mailErr);
        }

        res.status(200).json({
            success: true,
            message: "Application status updated successfully",
            data: application,
            credentials: generatedPassword
                ? {
                    email: application.email,
                    password: generatedPassword,
                  }
                : null,
        });
});

// Delete teacher application
exports.deleteTeacherApplication = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const application = await TeacherApplication.findById(id);

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Teacher application not found"
            });
        }

        const linkedTeacher = await Teacher.findOne({ teacherDetail: id }).select("_id");
        if (linkedTeacher) {
            return res.status(409).json({
                success: false,
                message: "This application is linked to an instructor. Delete the instructor from the Instructor tab instead."
            });
        }

        await TeacherApplication.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Teacher application deleted successfully"
        });
});

const OTP = require("../model/otp.model");

exports.sendInstructorEmailOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ success: false, message: "Enter a valid email address" });
  }
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await TeacherApplication.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ success: false, message: "An application with this email already exists. Contact support if you need help." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const existingOtp = await OTP.findOne({ email: normalizedEmail });
  if (existingOtp) {
    existingOtp.otp = otp;
    existingOtp.createdAt = Date.now();
    await existingOtp.save();
  } else {
    await OTP.create({ email: normalizedEmail, otp });
  }

  const body = `<p>Your Dunamis instructor application verification code is:</p>
<h2 style="letter-spacing:4px;font-size:32px;">${otp}</h2>
<p>This code expires in 5 minutes. Do not share it with anyone.</p>`;

  await mailSender(normalizedEmail, "Dunamis — Verify Your Email", body);
  res.json({ success: true, message: "Verification code sent to your email" });
});

exports.verifyInstructorEmailOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "email and otp are required" });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const otpDoc = await OTP.findOne({ email: normalizedEmail });
  if (!otpDoc) {
    return res.status(400).json({ success: false, message: "Code expired or not found. Please request a new one." });
  }
  if (otpDoc.otp !== otp.toString().trim()) {
    return res.status(400).json({ success: false, message: "Invalid code. Please try again." });
  }
  await otpDoc.deleteOne();
  res.json({ success: true, verified: true });
});
