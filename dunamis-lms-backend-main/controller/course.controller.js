const Course = require("../model/course.model");
const asyncHandler = require("../utils/asyncHandler");
const { localFileUpload } = require("../utils/locallyUploader");
const Teacher = require("../model/teacher.model");
const updateTeacherStats = require("../utils/updateTeacherStats");
const Student = require("../model/student.model");
const Branch = require("../model/branch.model");
const fs = require("fs/promises");
const path = require("path");

const deleteLocalUpload = async (filePath) => {
  if (!filePath || !filePath.startsWith("/uploads/")) {
    return;
  }

  const absolutePath = path.join(
    __dirname,
    "..",
    filePath.replace(/^\/+/, "")
  );

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to delete file:", error.message);
    }
  }
};

const normalizeInstallments = (price = {}) => {
  const parsed = Number(
    price.installments ??
      price.totalInstallments ??
      price.total_installments
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const normalizeTenurePlans = (plans = []) => {
  if (!Array.isArray(plans)) return [];
  return plans
    .map((plan = {}) => {
      const months = Number(plan.months);
      if (!Number.isFinite(months) || months <= 0) return null;
      return {
        months,
        monthlyFee: Number(plan.monthlyFee) || 0,
        discount: Number(plan.discount) || 0,
        fullPayment: Number(plan.fullPayment) || 0,
        isActive: plan.isActive ?? true,
      };
    })
    .filter(Boolean);
};

const normalizePricePayload = (price = {}) => ({
  sessionType: price.sessionType,
  monthlyFee: Number(price.monthlyFee) || 0,
  fullPayment: Number(price.fullPayment) || 0,
  discount: Number(price.discount) || 0,
  isActive: price.isActive ?? true,
  isSelected: price.isSelected ?? true,
  installments: normalizeInstallments(price),
  tenurePlans: normalizeTenurePlans(price.tenurePlans),
});

const normalizeIdList = (values = []) => {
  const list = Array.isArray(values) ? values : values ? [values] : [];

  return Array.from(
    new Set(
      list
        .map((value) => {
          if (!value && value !== 0) return "";
          if (typeof value === "string" || typeof value === "number") {
            return String(value).trim();
          }

          return String(value._id || value.id || value.value || "").trim();
        })
        .filter(Boolean)
    )
  );
};

const syncCourseTeachers = async ({
  courseId,
  previousTeacherIds = [],
  nextTeacherIds = [],
}) => {
  const removedTeacherIds = previousTeacherIds.filter(
    (teacherId) => !nextTeacherIds.includes(teacherId)
  );

  if (removedTeacherIds.length > 0) {
    await Teacher.updateMany(
      { _id: { $in: removedTeacherIds } },
      { $pull: { course: courseId } }
    );
  }

  if (nextTeacherIds.length > 0) {
    await Teacher.updateMany(
      { _id: { $in: nextTeacherIds } },
      { $addToSet: { course: courseId } }
    );
  }
};

const syncCourseBranches = async ({
  courseId,
  previousBranchIds = [],
  nextBranchIds = [],
  nextTeacherIds = [],
}) => {
  const removedBranchIds = previousBranchIds.filter(
    (branchId) => !nextBranchIds.includes(branchId)
  );

  if (removedBranchIds.length > 0) {
    await Branch.updateMany(
      { _id: { $in: removedBranchIds } },
      { $pull: { courses: courseId } }
    );
  }

  if (nextBranchIds.length > 0) {
    await Branch.updateMany(
      { _id: { $in: nextBranchIds } },
      {
        $addToSet: {
          courses: courseId,
          teachers: { $each: nextTeacherIds },
        },
      }
    );
  }
};

const formatPublicTeacherForCourse = (teacher) => {
  if (!teacher) return null;

  return {
    _id: teacher._id,
    id: teacher._id,
    averageRating: Number(teacher.averageRating) || 0,
    studentCount: Number(teacher.studentCount) || 0,
    teacherDetail: teacher.teacherDetail
      ? {
          _id: teacher.teacherDetail._id,
          name: teacher.teacherDetail.name,
          profilePicture: teacher.teacherDetail.profilePicture,
          profileVideo: teacher.teacherDetail.profileVideo,
          mode: teacher.teacherDetail.mode,
          areaOfExpertise: teacher.teacherDetail.areaOfExpertise,
          currentState: teacher.teacherDetail.currentState,
          currentCity: teacher.teacherDetail.currentCity,
          yearOfExperience: teacher.teacherDetail.yearOfExperience,
          highestQualification: teacher.teacherDetail.highestQualification,
        }
      : null,
    userId: teacher.userId
      ? {
          _id: teacher.userId._id,
          name: teacher.userId.name,
          image: teacher.userId.image,
        }
      : null,
  };
};

const publicTeacherPopulate = {
  path: "teacher",
  select: "averageRating studentCount teacherDetail userId",
  populate: [
    {
      path: "teacherDetail",
      model: "TeacherApplication",
      select:
        "name profilePicture profileVideo mode areaOfExpertise currentState currentCity yearOfExperience highestQualification",
    },
    {
      path: "userId",
      model: "user",
      select: "name image",
    },
  ],
};

const courseBranchPopulate = {
  path: "branches",
  populate: {
    path: "city",
    select: "cityName location",
  },
};

const withPublicCourseTotals = async (courses = []) => {
  if (!courses.length) return [];

  const courseIds = courses.map((course) => course._id);
  const studentCounts = await Student.aggregate([
    { $unwind: "$enrolledCourses" },
    { $match: { "enrolledCourses.courseId": { $in: courseIds } } },
    {
      $group: {
        _id: "$enrolledCourses.courseId",
        totalStudents: { $sum: 1 },
      },
    },
  ]);

  const studentCountByCourseId = studentCounts.reduce((acc, item) => {
    acc[String(item._id)] = item.totalStudents;
    return acc;
  }, {});

  return courses.map((course) => ({
    ...course,
    teacher: Array.isArray(course.teacher)
      ? course.teacher.map(formatPublicTeacherForCourse).filter(Boolean)
      : [],
    branchCount: course.branches?.length || 0,
    totalStudents: studentCountByCourseId[String(course._id)] || 0,
  }));
};

// CREATE COURSE
exports.createCourse = asyncHandler(async (req, res) => {
    const {
      name,
      code,
      description,
      category,
      subCategory,
      branches,
      mode,
      courseType,
      level,
      certification,
      startDate,
      endDate,
      teacher,
      price,
      objectives,
      content,
      isPublished,
    } = req.body;

    // Handle image upload (optional)
    let imagePath = null;
    if (req.files && req.files.image) {
      const uploadedFiles = await localFileUpload(req.files.image, [
        "image/png",
        "image/jpeg",
        "image/jpg",
      ]);
      imagePath = uploadedFiles[0].path;
    }

    let parsedSubCategory = [];
    if (subCategory) {
      if (typeof subCategory === "string") {
        parsedSubCategory = subCategory.split(",").map(id => id.trim());
      } else if (Array.isArray(subCategory)) {
        parsedSubCategory = subCategory;
      }
    }

    let parsedPrice = [];
    try {
      parsedPrice = price ? JSON.parse(price) : [];
      parsedPrice = parsedPrice.map(normalizePricePayload);
    } catch {
      parsedPrice = [];
    }

    const parsedBranches =
      typeof branches === "string" ? JSON.parse(branches) : branches || [];

    let teacherIds = [];
    try {
      teacherIds = typeof teacher === "string" ? JSON.parse(teacher) : teacher;
    } catch {
      teacherIds = teacher;
    }

    if (!Array.isArray(teacherIds)) teacherIds = teacherIds ? [teacherIds] : [];
    teacherIds = teacherIds.filter(Boolean);

    const publishFlag =
      typeof isPublished === "string" ? isPublished === "true" : Boolean(isPublished);

    // Create the course
    const course = await Course.create({
      name,
      code,
      description,
      category,
      subCategory: parsedSubCategory,
      branches: mode === "offline" ? parsedBranches : [],
      mode,
      courseType,
      level,
      certification,
      startDate,
      endDate,
      objectives: objectives ? JSON.parse(objectives) : [],
      content: content ? JSON.parse(content) : [],
      teacher: teacherIds,
      image: imagePath,
      price: parsedPrice,
      isPublished: publishFlag,
    });
   
    try {
      teacherIds = typeof teacher === "string" ? JSON.parse(teacher) : teacher;
    } catch (err) {
      teacherIds = teacher;
    }

    if (!Array.isArray(teacherIds)) {
      teacherIds = teacherIds ? [teacherIds] : [];
    }
    teacherIds = teacherIds.filter(Boolean);

    for (const teacherId of teacherIds) {
      await Teacher.findByIdAndUpdate(
        teacherId,
        { $addToSet: { course: course._id } },
        { new: true }
      );
    }

    if (mode === "offline" && parsedBranches.length > 0) {
      for (const branchId of parsedBranches) {
        await Branch.findByIdAndUpdate(
          branchId,
          {
            $addToSet: {
              courses: course._id,
              teachers: { $each: teacherIds },
            },
          },
          { new: true }
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
    });
});

// GET ALL COURSES
exports.getAllCourses = asyncHandler(async (req, res) => {
    const courses = await Course.find()
      .populate("category subCategory")
      .populate(courseBranchPopulate)
      .populate(publicTeacherPopulate)
      .lean();

    if (courses.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const publicCourses = await withPublicCourseTotals(courses);

    res.status(200).json({
      success: true,
      count: publicCourses.length,
      data: publicCourses,
    });
});

// GET COURSE BY ID
exports.getCourseById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const course = await Course.findById(id)
      .populate("category subCategory content")
      .populate(courseBranchPopulate)
      .populate(publicTeacherPopulate)
      .lean();

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const totalStudents = await Student.countDocuments({
      "enrolledCourses.courseId": id,
    });

    const publicCourse = {
      ...course,
      teacher: Array.isArray(course.teacher)
        ? course.teacher.map(formatPublicTeacherForCourse).filter(Boolean)
        : [],
      totalStudents,
      branchCount: course.branches?.length || 0,
    };

    res.status(200).json({ success: true, data: publicCourse });
});

exports.getAllCoursesAdmin = asyncHandler(async (req, res) => {
    let courses = await Course.find()
      .populate("category subCategory content")
      .populate(courseBranchPopulate)
      .populate({
        path: "teacher",
        populate: [
          {
            path: "teacherDetail",
            model: "TeacherApplication",
            select: "name profilePicture profileVideo mode areaOfExpertise",
          },
          {
            path: "userId",
            model: "user",
            select: "image",
          },
        ],
      })
      .lean();

    if (courses.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const students = await Student.find({}).populate("userId").lean();

    courses = courses.map((course) => {
      const enrolledStudents = students
        .filter(
          (s) =>
            Array.isArray(s.enrolledCourses) &&
            s.enrolledCourses.some(
              (ec) => ec.courseId.toString() === course._id.toString()
            )
        )
        .map((s) => ({
          _id: s._id,
          name: `${s.userId.name.firstName} ${s.userId.name.lastName}`,
          email: s.userId.email,
          image: s.userId.image,
          progress: s.enrolledCourses.find(
            (ec) => ec.courseId.toString() === course._id.toString()
          ).progress,
          status: s.enrolledCourses.find(
            (ec) => ec.courseId.toString() === course._id.toString()
          ).status,
        }));

      return {
        ...course,
        branchCount: course.branches?.length || 0,
        enrolledStudents,
        totalStudents: enrolledStudents.length,
      };
    });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
});

exports.getCourseByIdAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const course = await Course.findById(id)
      .populate("category subCategory content")
      .populate(courseBranchPopulate)
      .populate({
        path: "teacher",
        populate: [
          {
            path: "teacherDetail",
            model: "TeacherApplication",
            select: "name profilePicture profileVideo mode areaOfExpertise",
          },
          {
            path: "userId",
            model: "user",
            select: "image",
          },
        ],
      })
      .lean();

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const enrolledStudents = await Student.find({
      "enrolledCourses.courseId": id,
    })
      .populate({
        path: "userId",
        model: "user",
        select: "name email image",
      })
      .populate({
        path: "branch",
        model: "Branch",
        select: "branchName city",
        populate: {
          path: "city",
          select: "cityName location",
        },
      })
      .select("userId branch mode enrolledCourses followUps adminActions");

    const totalStudents = enrolledStudents.length;

    const courseWithStudents = {
      ...course,
      totalStudents,
      students: enrolledStudents,
      branchCount: course.branches?.length || 0,
    };

    res.status(200).json({ success: true, data: courseWithStudents });
});

// UPDATE COURSE
exports.updateCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const removeImage = req.body.removeImage === "true";

    // Fetch the existing course
    const existingCourse = await Course.findById(id);
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    let updateData = { ...req.body };
    delete updateData.removeImage;

     const parseArrayField = (field) => {
       const hasField = Object.prototype.hasOwnProperty.call(req.body || {}, field);
       if (!hasField) return null;

       const rawValue = req.body[field];

       try {
          if (rawValue === null || rawValue === undefined || rawValue === "") {
            return [];
          }

         if (Array.isArray(rawValue)) {
           return rawValue;
         }

         const parsed = JSON.parse(rawValue);
          if (Array.isArray(parsed)) {
            return parsed;
          }

          return parsed || parsed === 0 ? [parsed] : [];
       } catch {
          return rawValue
           .toString()
           .replace(/[[\]'"]/g, "")
           .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
       }
    };
    
    const parsedSubCategory = parseArrayField("subCategory");
    const parsedTeachers = parseArrayField("teacher");
    const parsedContent = parseArrayField("content");
    const parsedObjectives = parseArrayField("objectives");
    const parsedPrice = parseArrayField("price");

    updateData.subCategory =
      parsedSubCategory !== null ? parsedSubCategory : existingCourse.subCategory;
    updateData.teacher =
      parsedTeachers !== null ? parsedTeachers : existingCourse.teacher;
    updateData.content =
      parsedContent !== null ? parsedContent : existingCourse.content;
    updateData.objectives =
      parsedObjectives !== null ? parsedObjectives : existingCourse.objectives;
    updateData.price = parsedPrice
      ? parsedPrice.map(normalizePricePayload)
      : existingCourse.price;
    if (req.body.isPublished !== undefined) {
      updateData.isPublished =
        typeof req.body.isPublished === "string"
          ? req.body.isPublished === "true"
          : Boolean(req.body.isPublished);
    }
    const nextMode = updateData.mode || existingCourse.mode;
    const parsedBranches = parseArrayField("branches");

    if (nextMode === "offline") {
      updateData.branches =
        parsedBranches !== null ? parsedBranches : existingCourse.branches;
    } else if (nextMode === "online") {
      updateData.branches = [];
    }

    const previousTeacherIds = normalizeIdList(existingCourse.teacher);
    const nextTeacherIds = normalizeIdList(updateData.teacher);
    const previousBranchIds = normalizeIdList(existingCourse.branches);
    const nextBranchIds = normalizeIdList(updateData.branches);

    updateData.teacher = nextTeacherIds;
    updateData.branches = nextBranchIds;

    if (req.files && req.files.image) {
      const uploadedFiles = await localFileUpload(req.files.image, [
        "image/png",
        "image/jpeg",
        "image/jpg",
      ]);
      updateData.image = uploadedFiles[0].path;
    } else if (removeImage) {
      const nextIsPublished =
        updateData.isPublished !== undefined
          ? updateData.isPublished
          : existingCourse.isPublished;

      if (nextIsPublished) {
        return res.status(400).json({
          success: false,
          message:
            "Published courses require an image. Upload a replacement or save as draft.",
        });
      }

      updateData.image = null;
    }

    const persistedCourse = await Course.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (
      existingCourse.image &&
      persistedCourse.image !== existingCourse.image &&
      (removeImage || req.files?.image)
    ) {
      await deleteLocalUpload(existingCourse.image);
    }

    await syncCourseTeachers({
      courseId: persistedCourse._id,
      previousTeacherIds,
      nextTeacherIds,
    });

    await syncCourseBranches({
      courseId: persistedCourse._id,
      previousBranchIds,
      nextBranchIds,
      nextTeacherIds,
    });

    const updatedCourse = await Course.findById(id)
      .populate("category subCategory content")
      .populate(courseBranchPopulate)
      .populate({
        path: "teacher",
        populate: [
          {
            path: "teacherDetail",
            model: "TeacherApplication",
            select: "name profilePicture profileVideo mode areaOfExpertise",
          },
          {
            path: "userId",
            model: "user",
            select: "image",
          },
        ],
      })
      .lean();

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: {
        ...updatedCourse,
        branchCount: updatedCourse?.branches?.length || 0,
      },
    });
});

// DELETE COURSE
exports.deleteCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    // Remove this course from all teachers
    if (course.teacher && course.teacher.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: course.teacher } },
        { $pull: { course: id } }
      );

      // Update teacher stats for all affected teachers
      for (const teacherId of course.teacher) {
        await updateTeacherStats(teacherId, true);
      }
    }

    res
      .status(200)
      .json({ success: true, message: "Course deleted successfully" });
});
