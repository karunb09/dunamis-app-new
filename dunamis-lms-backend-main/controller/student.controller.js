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
const Slot = require("../model/slot.model");
const AttendanceHomework = require("../model/attendanceHomework.model");
const { notifyEvent } = require("../utils/notificationService");
const { getStudentSchedules } = require("../utils/classRoster");
const { buildContentTitleMaps } = require("../utils/contentTitles");

const IT_SUPPORT_HINT = process.env.IT_SUPPORT_EMAIL
  ? `Contact IT support at ${process.env.IT_SUPPORT_EMAIL} if this issue persists.`
  : "Contact IT support if this issue persists.";

const FOLLOW_UP_KEYS = ["followUp1", "followUp2", "followUp3"];
const FOLLOW_UP_STATUSES = ["pending", "contacted", "completed"];

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
    await mailSender(email, "email verification", otpTemplate(otp), otpTemplate.attachments);
    await OTP.create(otpPayload);

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

    user.password = undefined;

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
            { path: "branchId", select: "branchName location" },
          ],
        },
      })
      .populate("branch", "branchName location");

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
      ? await Teacher.find({ _id: { $in: teacherIds } })
          .select("userId")
          .populate("userId", "name")
      : [];
    const teacherNameById = new Map(
      teacherDocs.map((teacher) => [
        String(teacher._id),
        `${teacher.userId?.name?.firstName || ""} ${teacher.userId?.name?.lastName || ""}`.trim() || null,
      ])
    );

    const studentData = student.toObject();
    studentData.enrolledCourses = (studentData.enrolledCourses || [])
      // A student viewing their own record should only ever see their
      // current class — a reassigned-away entry would just confuse them.
      // Staff (admin/teacher) still see both, so the dashboard can render
      // the old one as a disabled/history card.
      .filter((course) => req.user?.accountType !== "student" || course.active !== false)
      .map((course) => {
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
// Overview: upcoming classes + recent activity + recent payments
exports.getStudentOverview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const student = await Student.findById(id)
      .select("payments")
      .populate("payments.courseId", "name code")
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [upcomingClasses, recentActivity] = await Promise.all([
      Slot.find({
        slotType: "enrolled",
        students: student._id,
        date: { $gte: todayStart },
      })
        .select("date startTime endTime sessionType courseId branchId createdBy")
        .populate("courseId", "name code mode")
        .populate("branchId", "branchName location")
        .populate({
          path: "createdBy",
          select: "userId",
          populate: { path: "userId", select: "name" },
        })
        .sort({ date: 1 })
        .limit(10)
        .lean(),
      AttendanceHomework.find({ studentId: student._id })
        .select("courseId attendanceStatus homework sessionType date")
        .populate("courseId", "name code")
        .sort({ date: -1 })
        .limit(15)
        .lean(),
    ]);

    const recentPayments = [...(student.payments || [])]
      .sort(
        (a, b) =>
          new Date(b.paidAt || b.dueDate || 0) - new Date(a.paidAt || a.dueDate || 0)
      )
      .slice(0, 5)
      .map((p) => ({
        _id: p._id,
        courseName: p.courseId?.name || null,
        amount: p.amount,
        PaymentStatus: p.PaymentStatus,
        feeStatus: p.feeStatus,
        paymentType: p.paymentType,
        installmentNo: p.installmentNo,
        installmentTotal: p.installmentTotal,
        dueDate: p.dueDate,
        paidAt: p.paidAt,
      }));

    res.status(200).json({
      success: true,
      overview: { upcomingClasses, recentActivity, recentPayments },
    });
});
// Attendance & Homework (admin view of a student's full attendance history)
exports.getStudentAttendanceHomework = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { courseId } = req.query;

    const student = await Student.findById(id).select("_id").lean();
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const records = await AttendanceHomework.find({ studentId: student._id })
      .populate("courseId", "name code")
      .populate({
        path: "teacherId",
        select: "userId",
        populate: { path: "userId", select: "name" },
      })
      .sort({ date: -1 })
      .lean();

    const { moduleTitles, lessonTitles, topicTitles } =
      await buildContentTitleMaps(records);

    const summary = records.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r.attendanceStatus === "Present") acc.present += 1;
        else if (r.attendanceStatus === "Absent") acc.absent += 1;
        return acc;
      },
      { total: 0, present: 0, absent: 0 }
    );
    summary.attendancePct = summary.total
      ? Math.round((summary.present / summary.total) * 100)
      : 0;

    const courses = [];
    const seenCourses = new Set();
    for (const r of records) {
      const cid = r.courseId?._id ? String(r.courseId._id) : null;
      if (cid && !seenCourses.has(cid)) {
        seenCourses.add(cid);
        courses.push({ _id: cid, name: r.courseId?.name || "" });
      }
    }

    const filtered = courseId
      ? records.filter((r) => String(r.courseId?._id) === String(courseId))
      : records;

    const formatted = filtered.map((r) => ({
      _id: r._id,
      courseName: r.courseId?.name || "",
      courseId: r.courseId?._id || null,
      teacherName: [r.teacherId?.userId?.name?.firstName, r.teacherId?.userId?.name?.lastName]
        .filter(Boolean)
        .join(" "),
      attendanceStatus: r.attendanceStatus,
      sessionType: r.sessionType,
      homework: r.homework || "",
      module: moduleTitles[r.moduleId?.toString()] || "",
      lesson: lessonTitles[r.lessonId?.toString()] || "",
      topic: topicTitles[r.topicId?.toString()] || "",
      date: r.date,
    }));

    res.status(200).json({
      success: true,
      summary,
      courses,
      records: formatted,
    });
});
// Update Stud.
exports.updateStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { mode, branch, enrolledCourses: enrolledCoursesInput, demoCourse, age } = req.body;
    const isStaff = ["admin", "superadmin"].includes(req.user?.accountType);
    const followUps = isStaff ? req.body.followUps : undefined;
    const adminActions = isStaff ? req.body.adminActions : undefined;
    // Enrollment is only ever granted by fulfillPaidTransaction() (or the
    // admin cash-enrollment path) — a student must never be able to add
    // themselves to a course via this endpoint.
    const enrolledCourses = isStaff ? enrolledCoursesInput : undefined;
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

    if (followUps) {
      for (const key of FOLLOW_UP_KEYS) {
        const value = followUps[key];
        if (value === undefined) continue;
        if (!FOLLOW_UP_STATUSES.includes(value)) {
          return res.status(400).json({
            success: false,
            message: `Invalid follow-up status "${value}".`,
          });
        }
        if (student.followUps?.[key] === "completed" && value !== "completed") {
          return res.status(400).json({
            success: false,
            message: `Follow-up ${key.slice(-1)} is completed and locked.`,
            hint: `Completed follow-ups cannot be reopened. ${IT_SUPPORT_HINT}`,
          });
        }
        student.followUps[key] = value;
      }
      if (typeof followUps.response === "string") {
        student.followUps.response = followUps.response;
      }
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
        // Allow-list, not "-password": list views render only these, and a
        // deny-list ships every field added to User later.
        select: "name email mobileNo image accountStatus createdAt",
      })
      .populate({
        path: "enrolledCourses.courseId",
        select: "name code mode sessionType category",
        populate: { path: "category", select: "name" },
      })
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

    // Enrolled and demo are subsets of the same list — sending IDs instead of
    // three full copies keeps the payload at one serialization of each student.
    const enrolledIds = students
      .filter((s) => s.payments?.some((p) => p.PaymentStatus === "completed"))
      .map((s) => s._id);

    const demoIds = students
      .filter((s) => s.demoCourse?.length > 0)
      .map((s) => s._id);

    return res.status(200).json({
      success: true,
      students,
      enrolledIds,
      demoIds,
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
