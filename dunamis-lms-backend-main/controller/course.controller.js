const Course = require("../model/course.model");
const { localFileUpload } = require("../utils/locallyUploader");
const Teacher = require("../model/teacher.model");
const updateTeacherStats = require("../utils/updateTeacherStats");
const Student = require("../model/student.model");
const Branch = require("../model/branch.model")

// CREATE COURSE
exports.createCourse = async (req, res) => {
  try {
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
      parsedPrice = parsedPrice.map((p) => ({
        sessionType: p.sessionType,
        monthlyFee: p.monthlyFee,
        fullPayment: p.fullPayment,
        discount: p.discount || 0,
        isActive: p.isActive ?? true,
        isSelected: p.isSelected ?? true,
        installments: p.totalInstallments || 1,
      }));
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL COURSES
exports.getAllCourses = async (req, res) => {
  try {
    let courses = await Course.find()
      .populate("category subCategory content branches")
      .populate({
        path: "teacher",
        populate: [
          {
            path: "teacherDetail",
            model: "TeacherApplication",
            select: "name profilePicture",
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET COURSE BY ID
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id)
      .populate("category subCategory content branches")
      .populate({
        path: "teacher",
        populate: [
          {
            path: "teacherDetail",
            model: "TeacherApplication",
            select: "name profilePicture",
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
    })
    .select("userId branch mode enrolledCourses followUps adminActions");

    // Calculate total
    const totalStudents = enrolledStudents.length;

    // Merge with course data
    const courseWithStudents = {
      ...course,
      totalStudents,
      students: enrolledStudents,
      branchCount: course.branches?.length || 0,
    };

    res.status(200).json({ success: true, data: courseWithStudents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE COURSE
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the existing course
    const existingCourse = await Course.findById(id);
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    let updateData = { ...req.body };

     const parseJSON = (field) => {
       if (!req.body[field]) return null;
       try {
         const parsed = JSON.parse(req.body[field]);
         return Array.isArray(parsed) ? parsed : [parsed];
       } catch {
         return req.body[field]
           .toString()
           .replace(/[[\]'"]/g, "")
           .split(",")
           .map((id) => id.trim());
       }
    };
    
    updateData.subCategory =
      parseJSON("subCategory") || existingCourse.subCategory;
    updateData.teacher = parseJSON("teacher") || existingCourse.teacher;
    updateData.content = parseJSON("content") || existingCourse.content;
    updateData.objectives =
      parseJSON("objectives") || existingCourse.objectives;
    updateData.price = parseJSON("price") || existingCourse.price;
    if (req.body.isPublished !== undefined) {
      updateData.isPublished =
        typeof req.body.isPublished === "string"
          ? req.body.isPublished === "true"
          : Boolean(req.body.isPublished);
    }
    const parsedBranches = parseJSON("branches") || [];

    if (updateData.mode === "offline") {
      const existingBranches = existingCourse.branches.map((b) => b.toString());
      const mergedBranches = Array.from(
        new Set([...existingBranches, ...parsedBranches])
      );
      updateData.branches = mergedBranches;
    } else if (updateData.mode === "online") {
      updateData.branches = [];
    }

    if (req.files && req.files.image) {
      const uploadedFiles = await localFileUpload(req.files.image, [
        "image/png",
        "image/jpeg",
        "image/jpg",
      ]);
      updateData.image = uploadedFiles[0].path;
    }

    const mergedTeachers = Array.from(
      new Set([
        ...(existingCourse.teacher || []).map((t) => t.toString()),
        ...(updateData.teacher || []).map((t) => t.toString()),
      ])
    ).filter(Boolean);
    updateData.teacher = mergedTeachers;

    const updatedCourse = await Course.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    for (const teacherId of mergedTeachers) {
      await Teacher.findByIdAndUpdate(
        teacherId,
        { $addToSet: { course: updatedCourse._id } },
        { new: true }
      );
    }

    if (updateData.mode === "offline" && updateData.branches.length > 0) {
      for (const branchId of updateData.branches) {
        await Branch.findByIdAndUpdate(
          branchId,
          {
            $addToSet: {
              courses: updatedCourse._id,
              teachers: { $each: mergedTeachers },
            },
          },
          { new: true }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE COURSE
exports.deleteCourse = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
