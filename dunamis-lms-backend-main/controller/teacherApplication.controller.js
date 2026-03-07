const TeacherApplication = require('../model/teacherApplication.model'); 
const { localFileUpload } = require('../utils/locallyUploader');
const User = require("../model/user.model");
const Teacher = require("../model/teacher.model");
const sendPasswordTemplate = require("../mail/sendPassword");
const sendApplicationStatus = require("../mail/sendApplicationStatus");
const OtpGenerator = require("otp-generator");
const mailSender = require("../utils/mailSender");

exports.createTeacherApplication = async (req, res) => {
  try {
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
      mode,
      // specialization, // Uncomment if specialization is required
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
    const existingApplication = await TeacherApplication.findOne({ email });
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
      email: email.toLowerCase().trim(),
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
      noticePeriod,
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
      teacherApplicationData.specialization = specialization.trim(); // Added specialization
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
  } catch (error) {
    console.error("Error creating teacher application:", error);

    // Handle specific MongoDB errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: validationErrors,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An application with this email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: error,
    });
  }
};

// Get all teacher applications (for admin)
exports.getAllTeacherApplications = async (req, res) => {
    try {
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

    } catch (error) {
        console.error('Error fetching teacher applications:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get teacher application by ID
exports.getTeacherApplicationById = async (req, res) => {
    try {
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

    } catch (error) {
        console.error('Error fetching teacher application:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID format"
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Update application status
exports.updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ["new", "shortlisted", "rejected", "interviewed", "selected"];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
            });
        }

        const application = await TeacherApplication.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        ).select('-__v');
       

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Teacher application not found"
            });
        }
        const {firstName,lastName}= application.name

        let generatedPassword = null;

        if(application.status=='selected'){
            await mailSender(application.email,`your application have been ${application.status}`,sendApplicationStatus(firstName,application.email,application.status));
            const email =application.email
            const existingUser = await User.find({email:email});
            if(existingUser.length!=0){
                return res.status(400).json({
                    success:false,
                    message:"user already exist with this email"
                })
            }

                generatedPassword = OtpGenerator.generate(7, {
                  upperCaseAlphabets: true,
                  lowerCaseAlphabets: true,
                  specialChars: true,
                });
            
                console.log("password generated: ", generatedPassword);

               
            
                const user = await User.create({
                  name: {
                    firstName:firstName,
                    lastName:lastName
                  },
                  email: application.email,
                  mobileNo:application.mobileNo,
                  password: generatedPassword,
                  accountType: "teacher",
                  accountStatus: "active",
                  image: `https://api.dicebear.com/9.x/initials/svg?seed=${firstName}%20${lastName}`,
                });
            
                const TeacherDoc = await Teacher.create({
                  userId: user._id,
                  teacherDetail:application._id,
                
                });
            
                user.roleId = TeacherDoc._id;
                user.roleModel = "teacher";
                await user.save();
                
                await mailSender(
                  application.email,
                  `Your teacher Account created`,
                  sendPasswordTemplate(user, "teacher", generatedPassword)
                );
        }
        else{
            await mailSender(application.email,`your application have been ${application.status}`,sendApplicationStatus(firstName,application.email,application.status));
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

    } catch (error) {
        console.error('Error updating application status:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID format"
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Delete teacher application
exports.deleteTeacherApplication = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await TeacherApplication.findByIdAndDelete(id);

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Teacher application not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Teacher application deleted successfully"
        });

    } catch (error) {
        console.error('Error deleting teacher application:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID format"
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
