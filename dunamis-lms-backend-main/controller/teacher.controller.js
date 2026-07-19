const Teacher = require("../model/teacher.model");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../model/user.model");
const TeacherDetail = require("../model/teacherApplication.model");
const Feedback = require("../model/feedback.model");
const Student = require("../model/student.model");
const Course = require("../model/course.model");
const Branch = require("../model/branch.model");
const Slot = require("../model/slot.model");
const ClassRoster = require("../model/classRoster.model");
const DemoBooking = require("../model/demoBooking.model");
const sendPasswordTemplate = require("../mail/sendPassword");
const OtpGenerator = require("otp-generator");
const mailSender = require("../utils/mailSender");
const { localFileUpload } = require("../utils/locallyUploader");
const { generateEmployeeId, resolvePrefix } = require("../utils/employeeId");

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

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

const parseObjectField = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const canManageTeacher = (requestUser, teacherDoc) => {
  if (!requestUser || !teacherDoc) return false;

  return (
    requestUser.accountType === "admin" ||
    requestUser.accountType === "superadmin" ||
    String(requestUser.roleId) === String(teacherDoc._id) ||
    String(requestUser.userId) === String(teacherDoc.userId)
  );
};

const safeParseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDayLabel = (day) => {
  const value = String(day || "").trim().toLowerCase();
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1, 3);
};

const formatAvailabilitySlot = (slot) => {
  if (!slot || !Array.isArray(slot.days) || !slot.days.length) {
    return "Not specified";
  }

  const dayLabel = slot.days.map(toDayLabel).filter(Boolean).join(", ");
  const timeLabel =
    slot.startTime && slot.endTime
      ? `${slot.startTime} - ${slot.endTime}`
      : "Time not specified";

  return `${dayLabel} (${timeLabel})`;
};

const formatPublicTeacherApplication = (teacherDetail) => {
  if (!teacherDetail) return null;

  return {
    id: teacherDetail._id,
    name: teacherDetail.name,
    gender: teacherDetail.gender,
    language: teacherDetail.language,
    currentState: teacherDetail.currentState,
    currentCity: teacherDetail.currentCity,
    areaOfExpertise: teacherDetail.areaOfExpertise,
    yearOfExperience: teacherDetail.yearOfExperience,
    highestQualification: teacherDetail.highestQualification,
    availability: teacherDetail.availability,
    mode: teacherDetail.mode,
    profilePicture: teacherDetail.profilePicture,
    profileVideo: teacherDetail.profileVideo,
    specialization:
      teacherDetail.specilization || teacherDetail.specialization || "",
  };
};

const formatPublicCourseSummary = (course) => {
  if (!course) return null;

  return {
    _id: course._id,
    id: course._id,
    name: course.name,
    code: course.code,
    mode: course.mode,
    level: course.level,
    image: course.image,
    category: course.category
      ? {
          _id: course.category._id,
          name: course.category.name,
          icon: course.category.icon,
          color: course.category.color,
        }
      : null,
  };
};

const formatPublicUserSummary = (user) => {
  if (!user) return null;

  return {
    _id: user._id,
    name: user.name,
    image: user.image,
  };
};

const formatPublicTeacherSummary = (teacher) => {
  const teacherDetail = teacher.teacherDetail;
  const courseSummaries = Array.isArray(teacher.course)
    ? teacher.course.map(formatPublicCourseSummary).filter(Boolean)
    : [];
  const firstCourse = courseSummaries[0] || null;
  const firstAvailability = Array.isArray(teacher.weeklyAvailability)
    ? teacher.weeklyAvailability[0]
    : null;

  return {
    id: teacher._id,
    user: formatPublicUserSummary(teacher.userId),
    averageRating: safeParseNumber(teacher.averageRating, 0),
    studentCount: safeParseNumber(teacher.studentCount, 0),
    teacherApplication: formatPublicTeacherApplication(teacherDetail),
    courses: courseSummaries,
    attendanceHistory: [
      {
        courseCategory: firstCourse?.category?.name || "N/A",
        courseName: firstCourse?.name || "N/A",
        slot: formatAvailabilitySlot(firstAvailability),
        sessionType:
          teacherDetail?.mode === "online" ? "Online" : teacherDetail?.mode === "offline" ? "Offline" : teacherDetail?.mode === "hybrid" ? "Hybrid" : teacherDetail?.mode || "N/A",
      },
    ],
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  };
};

const formatPublicTeacherDetails = (teacher) => ({
  id: teacher._id,
  user: formatPublicUserSummary(teacher.userId),
  averageRating: safeParseNumber(teacher.averageRating, 0),
  studentCount: safeParseNumber(teacher.studentCount, 0),
  teacherDetails: formatPublicTeacherApplication(teacher.teacherDetail),
  courses: Array.isArray(teacher.course)
    ? teacher.course.map(formatPublicCourseSummary).filter(Boolean)
    : [],
  introVideoUrl: teacher.teacherDetail?.profileVideo || "",
  createdAt: teacher.createdAt,
  updatedAt: teacher.updatedAt,
});

exports.createTeacher = asyncHandler(async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      mobileNo,
      gender,
      readLanguage,
      speakLanguage,
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
      profilePicture,
      employeePrefix,
    } = req.body;

    const readLanguages = normalizeStringArray(readLanguage);
    const speakLanguages = normalizeStringArray(speakLanguage);
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedMobileNo = String(mobileNo || "").trim();

    const missingFields = [];
    [
      ["firstName", firstName],
      ["lastName", lastName],
      ["email", normalizedEmail],
      ["mobileNo", normalizedMobileNo],
      ["currentState", currentState],
      ["currentCity", currentCity],
      ["currentAddress", currentAddress],
      ["areaOfExpertise", areaOfExpertise],
      ["yearOfExperience", yearOfExperience],
      ["highestQualification", highestQualification],
      ["currentCTC", currentCTC],
      ["expectedCTC", expectedCTC],
      ["noticePeriod", noticePeriod],
      ["availability", availability],
      ["mode", mode],
    ].forEach(([key, value]) => {
      if (!value || (typeof value === "string" && value.trim() === "")) {
        missingFields.push(key);
      }
    });

    if (!readLanguages.length) {
      missingFields.push("readLanguage");
    }

    if (!speakLanguages.length) {
      missingFields.push("speakLanguage");
    }

    if (missingFields.length) {
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

    if (!/^\d{10}$/.test(normalizedMobileNo)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const existingTeacherDetail = await TeacherDetail.findOne({
      email: normalizedEmail,
    });
    if (existingTeacherDetail) {
      return res.status(409).json({
        success: false,
        message: "An instructor profile with this email already exists",
      });
    }

    const password = OtpGenerator.generate(8, {
      upperCaseAlphabets: true,
      lowerCaseAlphabets: true,
      digits: true,
      specialChars: true,
    });

    const employeeId = await generateEmployeeId(resolvePrefix(employeePrefix, "DSMI"));

    const user = await User.create({
      name: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
      email: normalizedEmail,
      mobileNo: Number(normalizedMobileNo),
      password,
      accountType: "teacher",
      accountStatus: "active",
      employeeId,
      image: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
        `${firstName.trim()} ${lastName.trim()}`
      )}`,
    });

    const teacherDetail = await TeacherDetail.create({
      name: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
      source: "admin",
      gender,
      language: {
        read: readLanguages,
        speak: speakLanguages,
      },
      email: normalizedEmail,
      mobileNo: Number(normalizedMobileNo),
      currentState: currentState.trim(),
      currentCity: currentCity.trim(),
      currentAddress: currentAddress.trim(),
      areaOfExpertise: areaOfExpertise.trim(),
      yearOfExperience: Number(yearOfExperience),
      highestQualification: highestQualification.trim(),
      currentCTC: String(currentCTC).trim(),
      expectedCTC: String(expectedCTC).trim(),
      noticePeriod: noticePeriod.trim(),
      availability,
      mode,
      status: "selected",
      profilePicture: profilePicture?.trim() || "",
      specilization: specialization?.trim() || "",
    });

    const teacher = await Teacher.create({
      userId: user._id,
      teacherDetail: teacherDetail._id,
    });

    user.roleId = teacher._id;
    user.roleModel = "teacher";
    await user.save();

    await mailSender(
      normalizedEmail,
      "Your teacher account has been created",
      sendPasswordTemplate(user, "teacher", password)
    );

    res.status(201).json({
      success: true,
      message: "Instructor created successfully",
      data: {
        id: teacher._id,
        userId: user._id,
        teacherDetailId: teacherDetail._id,
        email: user.email,
        employeeId: user.employeeId,
      },
    });
});

exports.getPublicTeachers = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
    } = req.query;

    const filter = {};
    if (search) {
      const regex = { $regex: search, $options: "i" };
      const teacherDetailIds = await TeacherDetail.find({
        $or: [
          { "name.firstName": regex },
          { "name.lastName": regex },
          { areaOfExpertise: regex },
        ],
      }).distinct("_id");

      filter.$or = [{ teacherDetail: { $in: teacherDetailIds } }];
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 50, 1);

    const teachers = await Teacher.find(filter)
      .populate({
        path: "userId",
        select: "name image _id",
      })
      .populate({
        path: "teacherDetail",
        select:
          "name gender language currentState currentCity areaOfExpertise yearOfExperience highestQualification availability mode profilePicture profileVideo specilization specialization",
      })
      .populate({
        path: "course",
        select: "_id name code mode level image category",
        populate: {
          path: "category",
          model: "Category",
          select: "name icon color",
        },
      })
      .select(
        "userId teacherDetail course studentCount averageRating weeklyAvailability createdAt updatedAt"
      )
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const total = await Teacher.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: teachers.map(formatPublicTeacherSummary),
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalTeachers: total,
        hasNextPage: pageNumber * limitNumber < total,
        hasPrevPage: pageNumber > 1,
      },
    });
});

exports.getAllTeachers = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
    } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { "name.firstName": { $regex: search, $options: "i" } },
        { "name.lastName": { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 },
    };

    const teachers = await Teacher.find(filter)
      .populate({
        path: "userId",
        select: "name email mobileNo accountType accountStatus employeeId image _id",
      })
      .populate({
        path: "teacherDetail",
        select: "-__v",
      })
      .populate({
        path: "course",
        select: "_id name",
      })
      .populate({
        path: "students",
        populate: {
          path: "userId",
          select: "name email mobileNo image",
        },
      })
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const total = await Teacher.countDocuments(filter);
    const totalPages = Math.ceil(total / options.limit);

    const formattedTeachers = await Promise.all(
      teachers.map(async (teacher) => {
        const teacherDetail = teacher.teacherDetail;
        const courseIds = teacher.course.map((c) => c._id);
        const teacherIdStr = String(teacher._id);

        // Students assigned to THIS teacher only — a shared course would
        // otherwise count every co-teacher's students. payments[].teacherId is
        // the authoritative student↔teacher link.
        const students = await Student.find({
          "payments.teacherId": teacher._id,
        })
          .populate({
            path: "userId",
            select: "name email mobileNo image",
          })
          .populate({
            path: "enrolledCourses.courseId",
            select: "name sessionType mode",
          });

        const studentIds = students.map((s) => s._id);
        const studentCount = studentIds.length;

        const feedbacks = await Feedback.find({ courseId: { $in: courseIds } });
        const averageRating =
          feedbacks.length > 0
            ? feedbacks.reduce((sum, f) => sum + f.instructorRating, 0) /
              feedbacks.length
            : 0;

        // teacher model
        await Teacher.findByIdAndUpdate(teacher._id, {
          students: studentIds,
          studentCount,
          averageRating: parseFloat(averageRating.toFixed(1)),
        });

        const formattedStudents = students.map((s) => {
          const enrollmentByCourse = {};
          (s.payments || []).forEach((p) => {
            if (String(p.teacherId) !== teacherIdStr || !p.courseId) return;
            const cid = String(p.courseId);
            if (!enrollmentByCourse[cid]) {
              enrollmentByCourse[cid] = {
                deliveryMode: p.deliveryMode || null,
                sessionType: p.sessionType || null,
              };
            }
          });

          return {
            id: s._id,
            name: s.userId?.name,
            email: s.userId?.email,
            mobileNo: s.userId?.mobileNo,
            image: s.userId?.image,
            courses: s.enrolledCourses
              .filter((ec) => enrollmentByCourse[String(ec.courseId?._id)])
              .map((ec) => {
                const enrollment =
                  enrollmentByCourse[String(ec.courseId?._id)] || {};
                return {
                  id: ec.courseId?._id,
                  name: ec.courseId?.name,
                  sessionType: enrollment.sessionType || ec.courseId?.sessionType,
                  mode: enrollment.deliveryMode || ec.courseId?.mode,
                  enrollmentDate: ec.enrollmentDate,
                };
              }),
          };
        });

        return {
          id: teacher._id,
          user: teacher.userId,
          salaryStatus: teacher.salaryStatus,
          studentCount,
          averageRating: parseFloat(averageRating.toFixed(1)),
          bankDetails: teacher.bankDetails
            ? {
                accountHolderName: teacher.bankDetails.accountHolderName,
                accountNumber: teacher.bankDetails.accountNumber,
                ifscCode: teacher.bankDetails.ifscCode,
                bankName: teacher.bankDetails.bankName,
                branchAddress: teacher.bankDetails.branchAddress,
              }
            : null,
          isBankDetailsSubmitted: teacher.isBankDetailsSubmitted || false,
          teacherApplication: teacherDetail
            ? {
                name: teacherDetail.name,
                gender: teacherDetail.gender,
                language: teacherDetail.language,
                email: teacherDetail.email,
                mobileNo: teacherDetail.mobileNo,
                currentState: teacherDetail.currentState,
                currentCity: teacherDetail.currentCity,
                currentAddress: teacherDetail.currentAddress,
                areaOfExpertise: teacherDetail.areaOfExpertise,
                yearOfExperience: teacherDetail.yearOfExperience,
                highestQualification: teacherDetail.highestQualification,
                relevantCertificate: teacherDetail.relevantCertificate,
                cv: teacherDetail.cv,
                profileVideo: teacherDetail.profileVideo,
                profilePicture: teacherDetail.profilePicture,
                currentCTC: teacherDetail.currentCTC,
                expectedCTC: teacherDetail.expectedCTC,
                noticePeriod: teacherDetail.noticePeriod,
                availability: teacherDetail.availability,
                mode: teacherDetail.mode,
                status: teacherDetail.status,
                notes: teacherDetail.notes,
                createdAt: teacherDetail.createdAt,
                updatedAt: teacherDetail.updatedAt,
              }
            : null,
          courses: teacher.course,
          students: formattedStudents,
          attendanceHistory: teacherDetail
            ? [
                {
                  user: `${teacherDetail.name.firstName} ${teacherDetail.name.lastName}`,
                  courseCategory: "Music",
                  courseName:
                    teacher.course.length > 0 ? teacher.course[0].title : "N/A",
                  slot: "Mon-Thu 4:00 PM - 5:00 PM",
                  dateOfJoining: teacherDetail.createdAt,
                  sessionType:
                    teacherDetail.mode === "online" ? "Online" : teacherDetail.mode === "hybrid" ? "Hybrid" : "Offline",
                  attendance:
                    teacherDetail.status === "selected" ? "Present" : "Absent",
                  homework: "Lorem ipsum dolor sit amet",
                  date: teacherDetail.createdAt,
                },
              ]
            : [],
          createdAt: teacher.createdAt,
          updatedAt: teacher.updatedAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: formattedTeachers,
      pagination: {
        currentPage: options.page,
        totalPages,
        totalTeachers: total,
        hasNextPage: options.page < totalPages,
        hasPrevPage: options.page > 1,
      },
    });
});

exports.getPublicTeacherById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const teacher = await Teacher.findById(id)
      .populate({
        path: "userId",
        select: "name image _id",
      })
      .populate({
        path: "teacherDetail",
        select:
          "name gender language currentState currentCity areaOfExpertise yearOfExperience highestQualification availability mode profilePicture profileVideo specilization specialization",
      })
      .populate({
        path: "course",
        select: "_id name code mode level image category",
        populate: {
          path: "category",
          model: "Category",
          select: "name icon color",
        },
      })
      .select(
        "userId teacherDetail course studentCount averageRating createdAt updatedAt"
      );

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    res.status(200).json({
      success: true,
      data: formatPublicTeacherDetails(teacher),
    });
});

exports.getTeacherById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const teacherAccess = await Teacher.findById(id).select("userId");
    if (!teacherAccess) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    if (!canManageTeacher(req.user, teacherAccess)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this teacher",
      });
    }

    // Populate teacher with all relevant details
    const teacher = await Teacher.findById(id)
      .select("+weeklyAvailability")
      .populate({
        path: "userId",
        select: "name email mobileNo accountType employeeId image _id",
      })
      .populate({
        path: "teacherDetail",
        select: "-__v",
      })
      .populate({
        path: "course",
        populate: [
          {
            path: "category",
            model: "Category",
          },
          {
            path: "subCategory",
            model: "SubCategory",
          },
          {
            path: "branches",
            model: "Branch",
            select: "branchName location branchTimings branchOpenDays",
          },
          {
            path: "content",
            model: "Content",
            populate: [
              {
                path: "modules",
                model: "Module",
              },
            ],
          },
        ],
      })
      .populate({
        path: "students",
        populate: {
          path: "userId",
          select: "name email mobileNo image",
        },
      })
      .populate("remunerations");

    // Get courses IDs
    const courseIds = teacher.course.map((c) => c._id);

    // Students actually assigned to THIS teacher. A course may have several
    // teachers, so matching by courseId alone leaks every teacher's roster into
    // each profile. payments[].teacherId is the authoritative student↔teacher
    // link, written at fulfillment for both online and cash enrollments.
    const teacherIdStr = String(teacher._id);
    const students = await Student.find({
      "payments.teacherId": teacher._id,
    })
      .populate({
        path: "userId",
        select: "name email mobileNo image",
      })
      .populate({
        path: "enrolledCourses.courseId",
        populate: [
          {
            path: "category",
            model: "Category",
          },
          {
            path: "subCategory",
            model: "SubCategory",
          },
          {
            path: "content",
            model: "Content",
            populate: [
              {
                path: "modules",
                model: "Module",
                populate: [
                  {
                    path: "lessons",
                    model: "Lesson",
                    populate: [
                      {
                        path: "topics",
                        model: "Topic",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

    const studentIds = students.map((s) => s._id);
    const studentCount = studentIds.length;

    // Per-student, per-course recurring schedule (days/time/session type)
    const rosters = await ClassRoster.find({
      teacherId: teacher._id,
      status: "active",
    })
      .select("courseId recurringDays startTime endTime sessionType students")
      .lean();

    const scheduleByStudentCourse = {};
    rosters.forEach((roster) => {
      (roster.students || [])
        .filter((member) => member.status === "active")
        .forEach((member) => {
          scheduleByStudentCourse[`${member.studentId}_${roster.courseId}`] = {
            days: roster.recurringDays || [],
            startTime: roster.startTime,
            endTime: roster.endTime,
            sessionType: roster.sessionType,
          };
        });
    });

    // Calculate average rating
    const feedbacks = await Feedback.find({ courseId: { $in: courseIds } });
    const averageRating =
      feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + f.instructorRating, 0) /
          feedbacks.length
        : 0;

    // Update teacher stats
    await Teacher.findByIdAndUpdate(teacher._id, {
      students: studentIds,
      studentCount,
      averageRating: parseFloat(averageRating.toFixed(1)),
    });

    // Format students
    const formattedStudents = students.map((s) => {
      // Courses this student takes WITH this teacher, plus the delivery mode
      // (online/offline) captured on the enrolling payment — the instructor's
      // own mode may be "hybrid", which is not the student's session mode.
      const enrollmentByCourse = {};
      (s.payments || []).forEach((p) => {
        if (String(p.teacherId) !== teacherIdStr || !p.courseId) return;
        const cid = String(p.courseId);
        if (!enrollmentByCourse[cid]) {
          enrollmentByCourse[cid] = {
            deliveryMode: p.deliveryMode || null,
            sessionType: p.sessionType || null,
          };
        }
      });

      return {
        id: s._id,
        name: s.userId?.name,
        email: s.userId?.email,
        mobileNo: s.userId?.mobileNo,
        image: s.userId?.image,
        courses: s.enrolledCourses
          .filter((ec) => enrollmentByCourse[String(ec.courseId?._id)])
          .map((ec) => {
            const course = ec.courseId;
            const enrollment = enrollmentByCourse[String(course?._id)] || {};
            return {
              id: course?._id,
              name: course?.name,
              code: course?.code,
              description: course?.description,
              sessionType: enrollment.sessionType || course?.sessionType,
              mode: enrollment.deliveryMode || course?.mode,
              level: course?.level,
              startDate: course?.startDate,
              endDate: course?.endDate,
              certification: course?.certification,
              category: course?.category,
              subCategory: course?.subCategory,
              content: course?.content,
              objectives: course?.objectives,
              image: course?.image,
              price: course?.price,
              enrollmentDate: ec.enrollmentDate,
              schedule: scheduleByStudentCourse[`${s._id}_${course?._id}`] || null,
            };
          }),
      };
    });

    // Format teacher for response
    const formattedTeacher = {
      id: teacher._id,
      user: teacher.userId,
      salaryStatus: teacher.salaryStatus,
      studentCount,
      averageRating: parseFloat(averageRating.toFixed(1)),
      teacherDetails: teacher.teacherDetail
        ? {
            ...teacher.teacherDetail._doc,
            id: teacher.teacherDetail._id,
          }
        : null,
      weeklyAvailability: teacher.weeklyAvailability,
      courses: teacher.course,
      students: formattedStudents,
      remunerations: teacher.remunerations,
      bankDetails: teacher.bankDetails
        ? {
            accountHolderName: teacher.bankDetails.accountHolderName || null,
            accountNumber: teacher.bankDetails.accountNumber || null,
            ifscCode: teacher.bankDetails.ifscCode || null,
            bankName: teacher.bankDetails.bankName || null,
            branchAddress: teacher.bankDetails.branchAddress || null,
            isSubmitted: teacher.isBankDetailsSubmitted,
          }
        : null,
      attendanceHistory: teacher.teacherDetail
        ? [
            {
              user: `${teacher.teacherDetail.name.firstName} ${teacher.teacherDetail.name.lastName}`,
              courseCategory: teacher.course[0]?.category?.name || "N/A",
              courseName: teacher.course[0]?.name || "N/A",
              slot: "Mon-Thu 4:00 PM - 5:00 PM",
              dateOfJoining: teacher.teacherDetail.createdAt,
              sessionType:
                teacher.teacherDetail.mode === "online" ? "Online" : teacher.teacherDetail.mode === "hybrid" ? "Hybrid" : "Offline",
              attendance:
                teacher.teacherDetail.status === "selected"
                  ? "Present"
                  : "Absent",
              homework: "Lorem ipsum dolor sit amet",
              date: teacher.teacherDetail.createdAt,
            },
          ]
        : [],
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: formattedTeacher,
    });
});

exports.updateTeacher = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { salaryStatus } = req.body;
    const user = parseObjectField(req.body.user);
    const teacherDetails = parseObjectField(req.body.teacherDetails);
    const courses = parseObjectField(req.body.courses) || req.body.courses;

    // 1 Find
    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    if (!canManageTeacher(req.user, teacher)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this teacher",
      });
    }

    // 2. Salary status
    if (salaryStatus) {
      teacher.salaryStatus = salaryStatus;
    }

    // 3. Courses
    if (courses && Array.isArray(courses)) {
      teacher.course = courses;
    }

    // 4. user info
    if (user && teacher.userId) {
      await User.findByIdAndUpdate(teacher.userId, user, { returnDocument: "after" });
    }

    const teacherDetailsUpdate = teacherDetails ? { ...teacherDetails } : {};
    const profilePictureFile = req.files?.profilePicture || req.files?.profileImage;

    if (profilePictureFile) {
      const uploadedFiles = await localFileUpload(profilePictureFile, [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ]);
      teacherDetailsUpdate.profilePicture = uploadedFiles[0].path;
    }

    // 5. teacher info
    if (teacher.teacherDetail && Object.keys(teacherDetailsUpdate).length) {
      await TeacherDetail.findByIdAndUpdate(
        teacher.teacherDetail,
        teacherDetailsUpdate,
        { returnDocument: "after" }
      );
    }

    // 6. Save
    await teacher.save();

    const updatedTeacher = await Teacher.findById(id)
      .populate({ path: "userId", select: "name email mobileNo accountType accountStatus employeeId image _id" })
      .populate({ path: "teacherDetail" })
      .populate({ path: "course", select: "_id name code mode level image category" });

    res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      data: formatPublicTeacherDetails(updatedTeacher),
    });
});

exports.deleteTeacher = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const teacher = await Teacher.findById(id).populate("userId teacherDetail");
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const [
      occupiedSlotCount,
      demoBookingCount,
      paymentReferenceCount,
      courseAssignmentCount,
      branchAssignmentCount,
    ] = await Promise.all([
      Slot.countDocuments({
        createdBy: teacher._id,
        "students.0": { $exists: true },
      }),
      DemoBooking.countDocuments({ teacherId: teacher._id }),
      Student.countDocuments({ "payments.teacherId": teacher._id }),
      Course.countDocuments({ teacher: teacher._id }),
      Branch.countDocuments({ teachers: teacher._id }),
    ]);

    if (occupiedSlotCount || demoBookingCount || paymentReferenceCount) {
      return res.status(409).json({
        success: false,
        message:
          "This instructor has live bookings, payments, or occupied slots. Disable the account instead of deleting it.",
        blockers: {
          occupiedSlots: occupiedSlotCount,
          demoBookings: demoBookingCount,
          paymentReferences: paymentReferenceCount,
        },
      });
    }

    await Promise.all([
      Course.updateMany(
        { teacher: teacher._id },
        { $pull: { teacher: teacher._id } }
      ),
      Branch.updateMany(
        { teachers: teacher._id },
        { $pull: { teachers: teacher._id } }
      ),
      Slot.deleteMany({ createdBy: teacher._id }),
    ]);

    if (teacher.teacherDetail?._id) {
      await TeacherDetail.findByIdAndDelete(teacher.teacherDetail._id);
    }

    if (teacher.userId?._id) {
      await User.findByIdAndDelete(teacher.userId._id);
    }

    await Teacher.findByIdAndDelete(teacher._id);

    return res.status(200).json({
      success: true,
      message: "Instructor deleted successfully",
      deletedTeacherId: id,
      cleanup: {
        removedFromCourses: courseAssignmentCount,
        removedFromBranches: branchAssignmentCount,
      },
    });
});

exports.addBankDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      branchAddress,
    } = req.body;

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    if (!canManageTeacher(req.user, teacher)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this teacher",
      });
    }

    if (teacher.isBankDetailsSubmitted) {
      return res.status(400).json({
        success: false,
        message: "Bank details already submitted and cannot be updated.",
      });
    }

    teacher.bankDetails = {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      branchAddress,
    };
    teacher.isBankDetailsSubmitted = true;

    await teacher.save();

    res.status(200).json({
      success: true,
      message: "Bank details saved successfully.",
      teacher,
    });
});

const ALLOWED_DOC_TYPES = {
  certificate: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
  profileVideo: ["video/mp4", "video/mpeg", "video/avi", "video/quicktime"],
  profilePicture: ["image/jpeg", "image/png", "image/jpg"],
};

const DOC_ARRAY_MAP = {
  certificate: "certificates",
  profileVideo: "profileVideos",
  profilePicture: "profilePictures",
};

exports.updateInstructorDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  if (!DOC_ARRAY_MAP[type]) {
    return res.status(400).json({ success: false, message: "type must be certificate, profileVideo, or profilePicture" });
  }

  const teacher = await Teacher.findById(id);
  if (!teacher) return res.status(404).json({ success: false, message: "Instructor not found" });

  const isSelf = req.user.roleId?.toString() === id;
  const isAdmin = ["admin", "superadmin"].includes(req.user.accountType);
  if (!isSelf && !isAdmin) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  if (!req.files?.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const { localFileUpload: upload } = require("../utils/locallyUploader");
  const [uploaded] = await upload(req.files.file, ALLOWED_DOC_TYPES[type]);

  const arrayName = DOC_ARRAY_MAP[type];

  await Teacher.updateOne({ _id: id }, { $set: { [`${arrayName}.$[].isActive`]: false } });
  await Teacher.findByIdAndUpdate(id, {
    $push: { [arrayName]: { filePath: uploaded.path, uploadedAt: new Date(), isActive: true } },
  });

  const updated = await Teacher.findById(id).select(arrayName);
  res.json({ success: true, data: updated[arrayName] });
});

exports.getInstructorDocuments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isSelf = req.user.roleId?.toString() === id;
  const isAdmin = ["admin", "superadmin"].includes(req.user.accountType);
  if (!isSelf && !isAdmin) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const teacher = await Teacher.findById(id)
    .select("certificates profileVideos profilePictures teacherDetail")
    .populate("teacherDetail", "relevantCertificate profileVideo profilePicture");

  if (!teacher) return res.status(404).json({ success: false, message: "Instructor not found" });

  res.json({
    success: true,
    data: {
      certificates: teacher.certificates,
      profileVideos: teacher.profileVideos,
      profilePictures: teacher.profilePictures,
      originalApplicationDocs: {
        certificate: teacher.teacherDetail?.relevantCertificate || null,
        profileVideo: teacher.teacherDetail?.profileVideo || null,
        profilePicture: teacher.teacherDetail?.profilePicture || null,
      },
    },
  });
});

exports.getTeacherCourseMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isSelf = req.user.roleId?.toString() === id;
  const isAdmin = ["admin", "superadmin"].includes(req.user.accountType);
  if (!isSelf && !isAdmin) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const teacher = await Teacher.findById(id).populate({
    path: "course",
    select: "name image teacherMedia",
  });
  if (!teacher) return res.status(404).json({ success: false, message: "Instructor not found" });

  const data = (teacher.course || []).map((course) => {
    const entry = (course.teacherMedia || []).find(
      (m) => m.teacher?.toString() === id
    );
    return {
      courseId: course._id,
      courseName: course.name,
      courseImage: course.image,
      demoVideos: entry?.demoVideos || [],
      certificates: entry?.certificates || [],
    };
  });

  res.json({ success: true, data });
});
