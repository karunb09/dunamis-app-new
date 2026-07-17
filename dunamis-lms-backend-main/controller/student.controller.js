const User = require("../model/user.model");
const asyncHandler = require("../utils/asyncHandler");
const OTP = require("../model/otp.model");
const otpTemplate = require("../mail/emailVerification");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");
const OtpGenerator = require("otp-generator");
const welcomeEmailTemplate = require("../mail/welcomeEmail");
const Student = require("../model/student.model");
const Assignment = require("../model/assignment.model");
const Teacher = require("../model/teacher.model");
const { notifyEvent } = require("../utils/notificationService");
const { getStudentSchedules } = require("../utils/classRoster");

// Send OTP
exports.sendOTP = asyncHandler(async (req, res) => {
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
});
// Create Student
exports.createStudent = asyncHandler(async (req, res) => {
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

    notifyEvent({
      event: "signUp",
      title: "New student registration",
      message: `${firstName} ${lastName} (${normalizedEmail}) signed up.`,
      creatorId: user._id,
    }).catch((err) => console.error("Signup staff notice failed:", err.message));

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
});
// Get all Stud.
exports.getAllStudents = asyncHandler(async (req, res) => {
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
});
// Get by id
exports.getStudentById = asyncHandler(async (req, res) => {
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
      .populate("payments.transactionRef", "discountAmount originalAmount referralCode")
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

    // Recurring schedule comes from the class roster (durable membership), not
    // from a single dated slot — so it survives weekly slot regeneration.
    const schedules = await getStudentSchedules(student._id);
    const scheduleByCourse = new Map(
      schedules.map((schedule) => [String(schedule.courseId), schedule])
    );

    const teacherIds = [
      ...new Set(schedules.map((s) => String(s.teacherId)).filter(Boolean)),
    ];
    const teacherDocs = teacherIds.length
      ? await Teacher.find({ _id: { $in: teacherIds } }).select("name")
      : [];
    const teacherNameById = new Map(
      teacherDocs.map((teacher) => [String(teacher._id), teacher.name])
    );

    const studentData = student.toObject();
    studentData.enrolledCourses = (studentData.enrolledCourses || []).map((course) => {
      const courseId = String(course.courseId?._id || course.courseId);
      const schedule = scheduleByCourse.get(courseId);
      return {
        ...course,
        slotDetails: schedule
          ? {
              parentAvailabilityId: schedule.parentAvailabilityId,
              day: schedule.recurringDays,
              recurringDays: schedule.recurringDays,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              sessionType: schedule.sessionType,
              branchId: schedule.branchId,
              teacherId: schedule.teacherId,
              teacherName: teacherNameById.get(String(schedule.teacherId)) || null,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      message: "Student fetched successfully",
      student: studentData,
    });
});
// Update Stud.
exports.updateStudent = asyncHandler(async (req, res) => {
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
});
// DeleteStud.
exports.deleteStudent = asyncHandler(async (req, res) => {
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
});
// Get by type
exports.getStudentsByType = asyncHandler(async (req, res) => {
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
});

exports.searchStudents = asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.status(400).json({ success: false, message: "Query parameter 'q' is required" });
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const or = [
      { "name.firstName": regex },
      { "name.lastName": regex },
      { email: regex },
    ];

    const digits = q.replace(/\D/g, "");
    if (digits) {
      // mobileNo is a Number (double) — $toString alone yields scientific notation
      const suffix = digits.length > 10 ? digits.slice(-10) : digits;
      or.push({
        $expr: {
          $regexMatch: {
            input: { $toString: { $convert: { input: "$mobileNo", to: "long", onError: 0, onNull: 0 } } },
            regex: suffix,
          },
        },
      });
    }

    const matchingUsers = await User.find({
      accountType: "student",
      $or: or,
    })
      .select("_id name email mobileNo")
      .limit(20)
      .lean();

    if (matchingUsers.length === 0) {
      return res.status(200).json({ success: true, students: [] });
    }

    const userIds = matchingUsers.map((u) => u._id);
    const students = await Student.find({ userId: { $in: userIds } })
      .select("_id userId")
      .lean();

    const studentByUserId = new Map(students.map((s) => [s.userId.toString(), s._id]));

    const results = matchingUsers.map((u) => ({
      _id: studentByUserId.get(u._id.toString()) || null,
      userId: u._id,
      name: `${u.name?.firstName || ""} ${u.name?.lastName || ""}`.trim(),
      email: u.email,
      phone: u.mobileNo || null,
    }));

    return res.status(200).json({ success: true, students: results });
});
