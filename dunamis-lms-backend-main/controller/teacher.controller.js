const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const TeacherDetail = require("../model/teacherApplication.model");
const Feedback = require("../model/feedback.model");
const Student = require("../model/student.model");
const sendPasswordTemplate = require("../mail/sendPassword");
const OtpGenerator = require("otp-generator");
const mailSender = require("../utils/mailSender");

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

const canManageTeacher = (requestUser, teacherDoc) => {
  if (!requestUser || !teacherDoc) return false;

  return (
    requestUser.accountType === "admin" ||
    requestUser.accountType === "superadmin" ||
    String(requestUser.roleId) === String(teacherDoc._id) ||
    String(requestUser.userId) === String(teacherDoc.userId)
  );
};

exports.createTeacher = async (req, res) => {
  try {
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
      noticePeriod,
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
      },
    });
  } catch (error) {
    console.error("Error creating teacher:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(error.errors).map((item) => item.message),
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An instructor with this email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getAllTeachers = async (req, res) => {
  try {
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
        select: "name email mobileNo accountType accountStatus image _id",
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

        // Calculate student count
        const students = await Student.find({
          "enrolledCourses.courseId": { $in: courseIds },
        })
          .populate({
            path: "userId",
            select: "name email mobileNo image",
          })
          .populate({
            path: "enrolledCourses.courseId",
            select: "name sessionType",
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

        const formattedStudents = students.map((s) => ({
          id: s._id,
          name: s.userId?.name,
          email: s.userId?.email,
          mobileNo: s.userId?.mobileNo,
          image: s.userId?.image,
          courses: s.enrolledCourses
            .filter((ec) =>
              courseIds.some((tid) => ec.courseId?._id?.equals(tid))
            )
            .map((ec) => ({
              id: ec.courseId?._id,
              name: ec.courseId?.name,
              sessionType: ec.courseId?.sessionType,
              enrollmentDate: ec.enrollmentDate,
            })),
        }));

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
                    teacherDetail.mode === "online" ? "Online" : "Offline",
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;

    // Populate teacher with all relevant details
    const teacher = await Teacher.findById(id)
      .select("+weeklyAvailability")
      .populate({
        path: "userId",
        select: "name email mobileNo accountType image _id",
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

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Get courses IDs
    const courseIds = teacher.course.map((c) => c._id);

    // Get all students enrolled in teacher's courses
    const students = await Student.find({
      "enrolledCourses.courseId": { $in: courseIds },
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
    const formattedStudents = students.map((s) => ({
      id: s._id,
      name: s.userId?.name,
      email: s.userId?.email,
      mobileNo: s.userId?.mobileNo,
      image: s.userId?.image,
      courses: s.enrolledCourses
        .filter((ec) => courseIds.some((tid) => ec.courseId?._id?.equals(tid)))
        .map((ec) => {
          const course = ec.courseId;
          return {
            id: course?._id,
            name: course?.name,
            code: course?.code,
            description: course?.description,
            sessionType: course?.sessionType,
            mode: course?.mode,
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
          };
        }),
    }));

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
                teacher.teacherDetail.mode === "online" ? "Online" : "Offline",
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
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID format",
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { salaryStatus, user, teacherDetails, courses } = req.body;

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
      await User.findByIdAndUpdate(teacher.userId, user, { new: true });
    }

    // 5. teacher info
    if (teacherDetails && teacher.teacherDetail) {
      await TeacherDetail.findByIdAndUpdate(
        teacher.teacherDetail,
        teacherDetails,
        { new: true }
      );
    }

    // 6. Save
    await teacher.save();

    const updatedTeacher = await Teacher.findById(id).populate("teacherDetail");

    res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      teacher: updatedTeacher,
    });
  } catch (error) {
    console.error("Error updating teacher:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.addBankDetails = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Error adding bank details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
