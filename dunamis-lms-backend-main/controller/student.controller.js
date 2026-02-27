const User = require("../model/user.model");
const OTP = require("../model/otp.model");
const otpTemplate = require("../mail/emailVerification");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");
const OtpGenerator = require("otp-generator");
const welcomeEmailTemplate = require("../mail/welcomeEmail");
const Student = require("../model/student.model");
const Assignment = require("../model/assignment.model");
const Teacher = require("../model/teacher.model");

// Send OTP
exports.sendOTP = async (req, res) => {
  try {
    //fetch email from request body
    const { email } = req.body;
    console.log(email);

    //check if user already exist
    const checkUserPresent = await User.findOne({ email });

    //if user already exist,then return a response
    if (checkUserPresent) {
      console.log("hello world");
      return res.status(401).json({
        success: false,
        message: `User already registered`,
      });
    }

    //generate otp
    var otp = OtpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
    console.log("otp-generated:", otp);

    //check unique otp or not
    let result = await OTP.findOne({ otp: otp });

    while (result) {
      otp = OtpGenerator(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
      result = await OTP.findOne({ otp: otp });
    }

    //create an entry for otp
    const otpPayload = {
      otp,
      email,

      // expiresAt:new Date(Date.now()+10*60*1000),
    };
    // TODO: Enable this later
    await mailSender(email, "email verification", otpTemplate(otp));
    const otpBody = await OTP.create(otpPayload);

    console.log(otpBody);

    // //return respnose successfully
    res.status(200).json({
      success: true,
      message: `OTP sent successfully`,
      otp,
    });
  } catch (error) {
    console.log("error in otp generation:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Create Student
exports.createStudent = async (req, res) => {
  try {
    const {
      name: { firstName, lastName } = {},
      mobileNo,
      email,
      password,
      confirmPassword,
      otp,
      age,
    } = req.body;

    if (!otp || !email) {
      return res.status(403).json({
        success: false,
        message: "email and otp are required",
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

    //find most recent OTP stored for the user
    const recentOtp = await OTP.find({ email: normalizedEmail })
      .sort({ createdAt: -1 })
      .limit(1);

    //validate otp
    if (recentOtp.length == 0) {
      //OTP not found
      return res.status(400).json({
        success: false,
        message: "OTP expired ,please create a new otp",
      });
    } else if (otp !== recentOtp[0].otp) {
      //invalid otp
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    //data validate kro
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !mobileNo
    ) {
      return res.status(403).json({
        success: false,
        message: "All fields are required",
      });
    }
    //2 password match krlo
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "password and confirmPassword do not match,please try again",
      });
    }
    console.log("password match");

    const user = await User.create({
      name: { firstName, lastName },
      email: normalizedEmail,
      mobileNo,
      password,
      accountType: "student",
      image: `https://api.dicebear.com/9.x/initials/svg?seed=${firstName}%20${lastName}`,
    });

    const studentDoc = await Student.create({
      userId: user._id,
      age: age || null,
      followUps: {
        followUp1: "pending",
        followUp2: "pending",
        followUp3: "pending",
      },
      adminActions: {
        isBlocked: false,
        isReported: false,
        isDisabled: false,
        isArchived: false,
      },
    });

    user.roleId = studentDoc._id;
    user.roleModel = "student";
    await user.save();
     // TODO: Enable this later
    await mailSender(
      email,
      "Welcome to Duanamis Institute – Thank You for Trusting Us!",
      welcomeEmailTemplate(email, firstName)
    );

    return res.status(200).json({
      success: true,
      message: "User is registered successfully",
      user,
      student: studentDoc,
    });
  } catch (error) {
    console.error("error while creating Student", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Get all Stud.
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate("userId", "-password")
      // .populate("assignment")
      .populate("enrolledCourses.courseId")
      .populate("demoCourse")
      .populate("branch");

    res.status(200).json({
      success: true,
      message: "All students fetched successfully",
      students,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Get by id
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id)
      .populate("userId", "-password")
      .populate({
        path: "enrolledCourses.courseId",
        populate: { path: "category", select: "name color icon" },
      })
      .populate({
        path: "assignment",
        populate: {
          path: "category",
          select: "name color icon",
        },
      })
      .populate("payments.courseId", "name code")
      .populate({
        path: "demoCourse",
        populate: {
          path: "slotId",
          populate: [
            { path: "courseId", select: "name mode" },
            { path: "branchId", select: "name location" },
          ],
        },
      })
      .populate("branch", "name location");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const slotIds = student.enrolledCourses
      .map((c) => c.slotId)
      .filter((id) => id);

    if (slotIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Student fetched successfully",
        student,
      });
    }

    const teachers = await Teacher.find({
      "weeklyAvailability._id": { $in: slotIds },
    }).select("name weeklyAvailability");

    const slotMap = {};
    teachers.forEach((teacher) => {
      teacher.weeklyAvailability.forEach((slot) => {
        if (slotIds.some((s) => s.toString() === slot._id.toString())) {
          slotMap[slot._id.toString()] = {
            _id: slot._id,
            day: slot.days,
            startTime: slot.startTime,
            endTime: slot.endTime,
            recurringDays: slot.recurringDays,
            sessionType: slot.sessionType,
            maxStudents: slot.maxStudents,
            teacherName: teacher.name,
            teacherId: teacher._id,
          };
        }
      });
    });

    const enrichedCourses = student.enrolledCourses.map((course) => ({
      ...course.toObject(),
      slotDetails: slotMap[course.slotId?.toString()] || null,
    }));

    const studentData = student.toObject();
    studentData.enrolledCourses = enrichedCourses;

    res.status(200).json({
      success: true,
      message: "Student fetched successfully",
      student: studentData,
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Update Stud.
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    // const { assignment, course, demoCourse, mode, branch } = req.body;
    const {
      mode,
      branch,
      enrolledCourses,
      demoCourse,
      followUps,
      adminActions,
      age,
    } = req.body;
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Only update provided fields
    // if (assignment) student.assignment = assignment;
    if (demoCourse) student.demoCourse = demoCourse;
    if (mode) student.mode = mode;
    if (branch) student.branch = branch;
    if (age) student.age = age;

    // Follow-up updates (dropdown: pending/complete)
    if (followUps) {
      student.followUps = {
        ...student.followUps,
        ...followUps,
      };
    }

    // Admin action updates
    if (adminActions) {
      student.adminActions = {
        ...student.adminActions,
        ...adminActions,
      };
    }

    if (enrolledCourses && enrolledCourses.length > 0) {
      enrolledCourses.forEach((newCourse) => {
        // Check if course already exists
        const existingCourse = student.enrolledCourses.find((c) =>
          c.courseId.equals(newCourse.courseId)
        );

        if (existingCourse) {
          // Optional: update progress/status if provided
          if (newCourse.progress !== undefined)
            existingCourse.progress = newCourse.progress;
          if (newCourse.status) existingCourse.status = newCourse.status;
          if (newCourse.completedAt)
            existingCourse.completedAt = newCourse.completedAt;
        } else {
          // Add new course
          student.enrolledCourses.push({
            courseId: newCourse.courseId,
            progress: newCourse.progress || 0,
            status: newCourse.status || "in-progress",
            completedAt: newCourse.completedAt || null,
          });
        }
      });
    }

    await student.save();

    const updatedStudent = await Student.findById(id)
      .populate("userId", "-password")
      // .populate("assignment")
      .populate("demoCourse")
      .populate("branch")
      .populate("enrolledCourses.courseId");

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// DeleteStud.
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Delete linked user
    await User.findByIdAndDelete(student.userId);

    // Delete student
    await Student.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Student and linked user deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Get by type
exports.getStudentsByType = async (req, res) => {
  try {
    const allStudents = await Student.find()
      .populate({
        path: "userId",
        match: { accountType: "student" },
        select: "-password",
      })
      .populate("enrolledCourses.courseId")
      .populate({
        path: "demoCourse",
        populate: [
          {
            path: "slotId",
            populate: [
              { path: "courseId", select: "name mode" },
              { path: "branchId", select: "branchName location" },
            ],
          },
        ],
      })
      .populate("branch", "branchName location");

    const students = allStudents.filter((s) => s.userId !== null);

    // Remove null enrolledCourses
    students.forEach((s) => {
      s.enrolledCourses = s.enrolledCourses.filter((c) => c.courseId !== null);
    });

    // Registered = all students
    const registered = students;

    // Enrolled = students who have completed at least one payment
    const enrolled = students.filter(
      (s) =>
        s.payments && s.payments.some((p) => p.PaymentStatus === "completed")
    );

    // Demo students = students who have at least one demo booking
    const demo = students.filter(
      (s) => s.demoCourse && s.demoCourse.length > 0
    );

    return res.status(200).json({
      success: true,
      registered,
      enrolled,
      demo,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message,
    });
  }
};
