const AttendanceHomework = require("../model/attendanceHomework.model");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model");
const Content = require("../model/content.model");
const mongoose = require("mongoose");

exports.submitAttendanceHomework = async (req, res) => {
  try {
    const {
      slotId,
      sessionType,
      courseId,
      category,
      subCategory,
      students, // array (for standard)
      studentId, // single (for premium)
      attendanceStatus,
      homework,
      moduleId,
      lessonId,
      topicId,
    } = req.body;

    const userId = req.user.userId;

    const teacher = await Teacher.findOne({ userId }).select("_id name");
    if (!teacher)
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found." });

    const course = await Course.findById(courseId).select("_id name");
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found." });

    let attendanceEntries = [];

    if (sessionType === "premium") {
      if (!studentId)
        return res
          .status(400)
          .json({
            success: false,
            message: "Student ID is required for premium session.",
          });

      const student = await Student.findById(studentId).select("_id userId");
      if (!student)
        return res
          .status(404)
          .json({ success: false, message: "Student not found." });

      attendanceEntries.push({
        teacherId: teacher._id,
        studentId: student._id,
        userId: student.userId,
        slotId,
        sessionType,
        courseId,
        category,
        subCategory,
        attendanceStatus: attendanceStatus || "Present",
        homework: homework || "",
        moduleId: moduleId || null,
        lessonId: lessonId || null,
        topicId: topicId || null,
      });
    } else if (sessionType === "standard") {
      if (!students || !Array.isArray(students) || students.length === 0)
        return res
          .status(400)
          .json({
            success: false,
            message: "Students array is required for standard session.",
          });

      attendanceEntries = await Promise.all(
        students.map(async (s) => {
          const student = await Student.findById(s.studentId).select(
            "_id userId"
          );
          if (!student) return null;

          return {
            teacherId: teacher._id,
            studentId: student._id,
            userId: student.userId,
            slotId,
            sessionType,
            courseId,
            category,
            subCategory,
            attendanceStatus: s.attendanceStatus || "Present",
            homework: s.homework || "",
            moduleId: s.moduleId || null,
            lessonId: s.lessonId || null,
            topicId: s.topicId || null,
          };
        })
      );

      attendanceEntries = attendanceEntries.filter((a) => a !== null);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid session type." });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await AttendanceHomework.findOne({
      teacherId: teacher._id,
      courseId,
      slotId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Attendance already recorded for this slot today.",
      });
    }

    await AttendanceHomework.insertMany(attendanceEntries);

    return res.status(201).json({
      success: true,
      message: `Attendance & homework recorded successfully.`,
      data: {
        slotId,
        sessionType,
        courseId,
        category,
        createdAt: new Date(),
        students:
          sessionType === "standard"
            ? attendanceEntries.map((s) => ({
                studentId: s.studentId,
                attendanceStatus: s.attendanceStatus,
                homework: s.homework,
                moduleId: s.moduleId,
              }))
            : {
                studentId: attendanceEntries[0].studentId,
                attendanceStatus: attendanceEntries[0].attendanceStatus,
                homework: attendanceEntries[0].homework,
                moduleId: attendanceEntries[0].moduleId,
              },
      },
    });
  } catch (error) {
    console.error("Error submitting attendance/homework:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// exports.submitStudentHomework = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { studentHomework } = req.body;

//     if (!studentHomework)
//       return res
//         .status(400)
//         .json({ success: false, message: "Homework content is required." });

//     const updated = await AttendanceHomework.findByIdAndUpdate(
//       id,
//       {
//         studentHomework,
//         homeworkStatus: "Submitted",
//       },
//       { new: true }
//     );

//     if (!updated)
//       return res
//         .status(404)
//         .json({ success: false, message: "Homework not found." });

//     res.json({
//       success: true,
//       message: "Homework submitted successfully.",
//       data: updated,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.giveHomeworkFeedback = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { teacherFeedback } = req.body;

//     const updated = await AttendanceHomework.findByIdAndUpdate(
//       id,
//       {
//         teacherFeedback,
//         homeworkStatus: "Reviewed",
//       },
//       { new: true }
//     );

//     if (!updated)
//       return res
//         .status(404)
//         .json({ success: false, message: "Homework not found." });

//     res.json({
//       success: true,
//       message: "Feedback added successfully.",
//       data: updated,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

exports.getTeacherHomeworkHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const teacher = await Teacher.findOne({ userId }).select(
      "_id name weeklyAvailability"
    );
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const history = await AttendanceHomework.find({ teacherId: teacher._id })
      .populate({
        path: "studentId",
        select: "userId",
        populate: { path: "userId", select: "name email image" },
      })
      .populate("courseId", "name")
      .populate("category", "name icon")
      .sort({ createdAt: -1 })
      .lean();
    
    if (!history.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: "No homework history found for this teacher.",
      });
    }

    const slotMap = {};
    if (Array.isArray(teacher.weeklyAvailability)) {
      teacher.weeklyAvailability.forEach((slot) => {
        slotMap[slot._id.toString()] = {
          day: slot.days,
          startTime: slot.startTime,
          endTime: slot.endTime,
          sessionType: slot.sessionType,
        };
      });
    }

    const formattedHistory = history.map((item) => ({
      _id: item._id,
      studentName: item.studentId?.userId?.name || "Unknown",
      studentProfile: item.studentId?.userId?.image || null,
      courseName: item.courseId?.name || "N/A",
      categoryName: item.category?.name || "N/A",
      categoryIcon: item.category?.icon || "N/A",
      attendanceStatus: item.attendanceStatus,
      homework: item.homework || "No homework",
      sessionType: item.sessionType,
      createdAt: item.createdAt,
      slotDetails: slotMap[item.slotId?.toString()] || null,
    }));

    res.json({
      success: true,
      count: formattedHistory.length,
      data: formattedHistory,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentHomeworkDashboard = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing from token. Please log in again.",
      });
    }

    const student = await Student.findOne({ userId }).select("_id");
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const studentId = student._id;

    const homeworkList = await AttendanceHomework.find({ studentId })
      .populate("courseId", "name")
      .populate("category", "name")
      .populate("subCategory", "name")
      .sort({ date: -1 })
      .lean();

    if (!homeworkList.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: "No homework found for this student.",
      });
    }

    const contentDocs = await Content.find({}, "modules").lean();

    const formatted = homeworkList.map((hw) => {
      let moduleTitle = "";
      let lessonTitle = "";
      let topicTitle = "";

      for (const content of contentDocs) {
        for (const module of content.modules || []) {
          if (module._id.toString() === hw.moduleId?.toString()) {
            moduleTitle = module.title;
            for (const lesson of module.lessons || []) {
              if (lesson._id.toString() === hw.lessonId?.toString()) {
                lessonTitle = lesson.title;
                for (const topic of lesson.topics || []) {
                  if (topic._id.toString() === hw.topicId?.toString()) {
                    topicTitle = topic.title;
                  }
                }
              }
            }
          }
        }
      }

      return {
        _id: hw._id,
        courseName: hw.courseId?.name || "",
        categoryName: hw.category?.name || "",
        subCategoryName: hw.subCategory?.name || "",
        homework: hw.homework || "No homework assigned",
        lesson: lessonTitle || "",
        topic: topicTitle || "",
        module: moduleTitle || "",
        date: hw.date,
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching student homework dashboard:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
