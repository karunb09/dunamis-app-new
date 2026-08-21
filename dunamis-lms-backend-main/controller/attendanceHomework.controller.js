const AttendanceHomework = require("../model/attendanceHomework.model");
const asyncHandler = require("../utils/asyncHandler");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model");
const Slot = require("../model/slot.model");
const ClassRoster = require("../model/classRoster.model");
const mongoose = require("mongoose");
const { createDashboardNotice, notifyEvent } = require("../utils/notificationService");
const { buildContentTitleMaps } = require("../utils/contentTitles");
const { formatUserName: formatName } = require("../utils/formatName");

const HOMEWORK_WORD_LIMIT = 500;

const countWords = (text) =>
  String(text || "").trim().split(/\s+/).filter(Boolean).length;

const formatUserName = (name) => formatName(name, "Student");

const dayRangeOf = (value) => {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const end = new Date(value);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const formatClassDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

// Builds validated AttendanceHomework entries from the request body. Shared by
// create (submit) and edit (update). Returns { entries, error } — error is a
// { status, message } describing the first field/record that failed.
const resolveAttendanceEntries = async ({ body, teacher, course, slot }) => {
  const { sessionType, students, studentId } = body;
  const overLimit = [];

  const buildEntry = (student, fields) => {
    const words = countWords(fields.homework);
    if (words > HOMEWORK_WORD_LIMIT) {
      overLimit.push(`${formatUserName(student.userId?.name)} (${words} words)`);
    }
    return {
      teacherId: teacher._id,
      studentId: student._id,
      userId: student.userId?._id || student.userId,
      slotId: slot._id,
      sessionType,
      courseId: course._id,
      category: course.category,
      subCategory: course.subCategory,
      attendanceStatus: fields.attendanceStatus || "Present",
      homework: fields.homework || "",
      moduleId: fields.moduleId || null,
      lessonId: fields.lessonId || null,
      topicId: fields.topicId || null,
      date: slot.date || new Date(),
    };
  };

  let entries = [];
  if (sessionType === "premium") {
    if (!studentId)
      return { error: { status: 400, message: "Select the student before submitting a premium session." } };
    const student = await Student.findById(studentId)
      .select("_id userId")
      .populate("userId", "name");
    if (!student) return { error: { status: 404, message: "Student not found." } };
    entries.push(buildEntry(student, body));
  } else if (sessionType === "standard") {
    if (!students || !Array.isArray(students) || students.length === 0)
      return { error: { status: 400, message: "Add at least one student before submitting attendance." } };
    entries = (
      await Promise.all(
        students.map(async (s) => {
          const student = await Student.findById(s.studentId)
            .select("_id userId")
            .populate("userId", "name");
          return student ? buildEntry(student, s) : null;
        })
      )
    ).filter(Boolean);
  } else {
    return { error: { status: 400, message: "Invalid session type — expected standard or premium." } };
  }

  if (overLimit.length) {
    return {
      error: {
        status: 400,
        message: `Homework for ${overLimit.join(", ")} exceeds the ${HOMEWORK_WORD_LIMIT}-word limit.`,
      },
    };
  }

  return { entries };
};

exports.submitAttendanceHomework = asyncHandler(async (req, res) => {
    const { slotId, sessionType, courseId, category } = req.body;

    const userId = req.user.userId;

    const teacher = await Teacher.findOne({ userId }).select("_id name");
    if (!teacher)
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found." });

    const course = await Course.findById(courseId).select(
      "_id name category subCategory"
    );
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found." });

    const slot = await Slot.findById(slotId).select("date");
    if (!slot)
      return res
        .status(404)
        .json({ success: false, message: "Class slot not found." });

    const { entries: attendanceEntries, error } = await resolveAttendanceEntries({
      body: req.body,
      teacher,
      course,
      slot,
    });
    if (error)
      return res.status(error.status).json({ success: false, message: error.message });

    // "Date attended" is the class date, not the submission time.
    const classDate = slot.date || new Date();
    const classDay = dayRangeOf(classDate);
    const existing = await AttendanceHomework.findOne({
      teacherId: teacher._id,
      slotId,
      date: { $gte: classDay.start, $lte: classDay.end },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Attendance already recorded for this class on ${formatClassDate(classDate)}.`,
      });
    }

    await AttendanceHomework.insertMany(attendanceEntries);

    // Fire-and-forget: staff/student notices (does not affect HTTP response)
    setImmediate(async () => {
      try {
        await notifyEvent({
          event: "classAttendance",
          instructorUser: { _id: userId },
          title: "Attendance Submitted",
          message: `${teacher.name || "An instructor"} recorded attendance for ${course.name} — ${attendanceEntries.length} student(s).`,
          creatorId: userId,
        });

        const homeworkEntries = attendanceEntries.filter(
          (entry) => entry.homework && entry.homework.trim()
        );
        if (homeworkEntries.length) {
          await notifyEvent({
            event: "homework",
            instructorUser: { _id: userId },
            title: "Homework posted",
            message: `${teacher.name || "An instructor"} posted homework for ${course.name} — ${homeworkEntries.length} student(s).`,
            creatorId: userId,
          });

          await createDashboardNotice({
            title: "New homework posted",
            message: `You have new homework for ${course.name}. Check your dashboard.`,
            userIds: homeworkEntries.map((entry) => entry.userId),
            creatorId: userId,
          });
        }
      } catch (err) {
        console.error("Attendance notices failed:", err.message);
      }
    });

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
});

// Class roster + any existing submission for a slot — prefills the slide-over
// for both recording a new class and editing a submitted one.
exports.getTeacherClassAttendance = asyncHandler(async (req, res) => {
    const { slotId } = req.params;
    const userId = req.user.userId;

    const teacher = await Teacher.findOne({ userId }).select("_id");
    if (!teacher)
      return res.status(404).json({ success: false, message: "Teacher not found." });

    const slot = await Slot.findOne({ _id: slotId, createdBy: teacher._id })
      .populate("courseId", "name")
      .populate({
        path: "students",
        select: "userId",
        populate: { path: "userId", select: "name image" },
      })
      .lean();
    if (!slot)
      return res.status(404).json({ success: false, message: "Class not found." });

    // Students come from the recurring class roster (section membership) so a
    // past occurrence with a stale/empty students array still lists everyone.
    // Falls back to the slot's own students for legacy pre-roster classes.
    let rosterStudents = [];
    if (slot.parentAvailabilityId) {
      const roster = await ClassRoster.findOne({
        parentAvailabilityId: slot.parentAvailabilityId,
        status: "active",
      }).lean();
      if (roster) {
        const ids = (roster.students || [])
          .filter((m) => m.status === "active")
          .map((m) => m.studentId);
        rosterStudents = await Student.find({ _id: { $in: ids } })
          .select("userId")
          .populate("userId", "name image")
          .lean();
      }
    }
    const sourceStudents = rosterStudents.length ? rosterStudents : slot.students || [];

    const classDay = dayRangeOf(slot.date);
    const entries = await AttendanceHomework.find({
      teacherId: teacher._id,
      slotId,
      date: { $gte: classDay.start, $lte: classDay.end },
    }).lean();
    const byStudent = new Map(entries.map((e) => [String(e.studentId), e]));

    const students = sourceStudents.map((s) => {
      const entry = byStudent.get(String(s._id));
      return {
        _id: s._id,
        name: formatUserName(s.userId?.name),
        image: s.userId?.image || null,
        attendanceStatus: entry?.attendanceStatus || null,
        homework: entry?.homework || "",
        moduleId: entry?.moduleId || null,
        lessonId: entry?.lessonId || null,
        topicId: entry?.topicId || null,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        slotId: slot._id,
        courseId: slot.courseId?._id || slot.courseId,
        courseName: slot.courseId?.name || "N/A",
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        sessionType: slot.sessionType,
        submitted: entries.length > 0,
        students,
      },
    });
});

// Edit a previously recorded class — upserts each student's entry in place.
exports.updateAttendanceHomework = asyncHandler(async (req, res) => {
    const { slotId } = req.params;
    const userId = req.user.userId;

    const teacher = await Teacher.findOne({ userId }).select("_id");
    if (!teacher)
      return res.status(404).json({ success: false, message: "Teacher not found." });

    const slot = await Slot.findOne({ _id: slotId, createdBy: teacher._id }).select(
      "date courseId"
    );
    if (!slot)
      return res.status(404).json({ success: false, message: "Class not found." });

    const course = await Course.findById(slot.courseId).select(
      "_id name category subCategory"
    );
    if (!course)
      return res.status(404).json({ success: false, message: "Course not found." });

    const { entries, error } = await resolveAttendanceEntries({
      body: req.body,
      teacher,
      course,
      slot,
    });
    if (error)
      return res.status(error.status).json({ success: false, message: error.message });

    // Filter must be the unique key exactly, or the upsert's insert branch
    // throws E11000 instead of inserting. The slot lookup above already scoped
    // this to the requesting teacher.
    await Promise.all(
      entries.map((entry) =>
        AttendanceHomework.updateOne(
          { slotId: slot._id, studentId: entry.studentId },
          { $set: entry },
          { upsert: true }
        )
      )
    );

    return res.status(200).json({
      success: true,
      message: "Attendance & homework updated successfully.",
      count: entries.length,
    });
});

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

exports.getTeacherHomeworkHistory = asyncHandler(async (req, res) => {
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

    const { moduleTitles, lessonTitles, topicTitles } =
      await buildContentTitleMaps(history);

    const formattedHistory = history.map((item) => ({
      _id: item._id,
      studentName: formatUserName(item.studentId?.userId?.name),
      studentProfile: item.studentId?.userId?.image || null,
      courseName: item.courseId?.name || "N/A",
      categoryName: item.category?.name || "N/A",
      categoryIcon: item.category?.icon || "N/A",
      attendanceStatus: item.attendanceStatus,
      homework: item.homework || "No homework",
      module: moduleTitles[item.moduleId?.toString()] || "",
      lesson: lessonTitles[item.lessonId?.toString()] || "",
      topic: topicTitles[item.topicId?.toString()] || "",
      sessionType: item.sessionType,
      createdAt: item.createdAt,
      date: item.date,
      slotDetails: slotMap[item.slotId?.toString()] || null,
    }));

    res.json({
      success: true,
      count: formattedHistory.length,
      data: formattedHistory,
    });
});

exports.getTeacherPastClasses = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const courseFilter = req.query.courseId
      ? { courseId: new mongoose.Types.ObjectId(req.query.courseId) }
      : {};

    const teacher = await Teacher.findOne({ userId }).select("_id");
    if (!teacher)
      return res.status(404).json({ success: false, message: "Teacher not found." });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const total = await Slot.countDocuments({
      createdBy: teacher._id,
      slotType: "enrolled",
      date: { $lt: todayStart },
      "students.0": { $exists: true },
      ...courseFilter,
    });

    const slots = await Slot.find({
      createdBy: teacher._id,
      slotType: "enrolled",
      date: { $lt: todayStart },
      "students.0": { $exists: true },
      ...courseFilter,
    })
      .populate("courseId", "name")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Batch fetch attendance counts to avoid N+1
    const slotIds = slots.map((s) => s._id);
    const submittedCounts = await AttendanceHomework.aggregate([
      { $match: { slotId: { $in: slotIds } } },
      { $group: { _id: "$slotId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(
      submittedCounts.map((r) => [r._id.toString(), r.count])
    );

    const data = slots.map((slot) => {
      const studentCount = slot.students?.length || 0;
      const submittedCount = countMap[slot._id.toString()] || 0;
      let coverageStatus = "Missing";
      if (submittedCount >= studentCount && studentCount > 0) coverageStatus = "Full";
      else if (submittedCount > 0) coverageStatus = "Partial";

      return {
        slotId: slot._id,
        courseId: slot.courseId?._id || slot.courseId,
        courseName: slot.courseId?.name || "N/A",
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        sessionType: slot.sessionType,
        studentCount,
        submittedCount,
        coverageStatus,
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data,
    });
});

// One card per recurring class section (batch), driven by the roster — students
// come from section membership, not a single dated slot. A course with multiple
// batches (different day/time) therefore surfaces every batch, each with its own
// students and its latest (most recent) class occurrence to record against.
exports.getTeacherCourseClasses = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const teacher = await Teacher.findOne({ userId }).select("_id");
    if (!teacher)
      return res.status(404).json({ success: false, message: "Teacher not found." });

    const rosters = await ClassRoster.find({ teacherId: teacher._id, status: "active" })
      .populate("courseId", "name")
      .lean();

    const sections = rosters
      .map((roster) => ({
        ...roster,
        memberIds: (roster.students || [])
          .filter((m) => m.status === "active")
          .map((m) => m.studentId),
      }))
      .filter((section) => section.memberIds.length > 0);

    if (!sections.length)
      return res.status(200).json({ success: true, count: 0, data: [] });

    const allStudentIds = [
      ...new Set(sections.flatMap((s) => s.memberIds.map((id) => String(id)))),
    ];
    const studentDocs = await Student.find({ _id: { $in: allStudentIds } })
      .select("userId")
      .populate("userId", "name image")
      .lean();
    const studentById = new Map(
      studentDocs.map((s) => [
        String(s._id),
        { _id: s._id, name: formatUserName(s.userId?.name), image: s.userId?.image || null },
      ])
    );

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const data = await Promise.all(
      sections.map(async (section) => {
        const latest = await Slot.findOne({
          createdBy: teacher._id,
          slotType: "enrolled",
          parentAvailabilityId: section.parentAvailabilityId,
          date: { $lte: todayEnd },
        })
          .sort({ date: -1 })
          .lean();

        let latestClass = null;
        if (latest) {
          const classDay = dayRangeOf(latest.date);
          const submitted = await AttendanceHomework.exists({
            teacherId: teacher._id,
            slotId: latest._id,
            date: { $gte: classDay.start, $lte: classDay.end },
          });
          latestClass = {
            slotId: latest._id,
            date: latest.date,
            startTime: latest.startTime,
            endTime: latest.endTime,
            submitted: Boolean(submitted),
          };
        }

        const students = section.memberIds
          .map((id) => studentById.get(String(id)))
          .filter(Boolean);

        return {
          parentAvailabilityId: section.parentAvailabilityId,
          courseId: section.courseId?._id || section.courseId,
          courseName: section.courseId?.name || "N/A",
          recurringDays: section.recurringDays || [],
          startTime: section.startTime,
          endTime: section.endTime,
          sessionType: section.sessionType,
          studentCount: students.length,
          students,
          latestClass,
        };
      })
    );

    // Most recently held sections first; sections with no class yet fall to the end.
    data.sort((a, b) => {
      const ad = a.latestClass ? new Date(a.latestClass.date).getTime() : -Infinity;
      const bd = b.latestClass ? new Date(b.latestClass.date).getTime() : -Infinity;
      return bd - ad;
    });

    return res.status(200).json({ success: true, count: data.length, data });
});

exports.getStudentHomeworkDashboard = asyncHandler(async (req, res) => {
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

    const { moduleTitles, lessonTitles, topicTitles } =
      await buildContentTitleMaps(homeworkList);

    const formatted = homeworkList.map((hw) => ({
      _id: hw._id,
      courseName: hw.courseId?.name || "",
      categoryName: hw.category?.name || "",
      subCategoryName: hw.subCategory?.name || "",
      homework: hw.homework || "No homework assigned",
      attendanceStatus: hw.attendanceStatus,
      sessionType: hw.sessionType,
      lesson: lessonTitles[hw.lessonId?.toString()] || "",
      topic: topicTitles[hw.topicId?.toString()] || "",
      module: moduleTitles[hw.moduleId?.toString()] || "",
      date: hw.date,
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
});

