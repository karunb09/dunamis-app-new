const Assignment = require("../model/assignment.model");
const asyncHandler = require("../utils/asyncHandler");
const ClassRoster = require("../model/classRoster.model");
const Course = require("../model/course.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const { formatUserName } = require("../utils/formatName");
const { createDashboardNotice } = require("../utils/notificationService");

const toId = (value) => String(value?._id || value || "");

// Everyone the instructor actually teaches, per course — the roster is the
// durable membership, so a removed learner never appears.
const teacherLearners = async (teacherId) => {
  const rosters = await ClassRoster.find({ teacherId })
    .select("courseId students")
    .populate("courseId", "name")
    .lean();

  const pairs = new Map();
  rosters.forEach((roster) =>
    (roster.students || [])
      .filter((member) => member.status !== "removed")
      .forEach((member) => {
        const key = `${toId(member.studentId)}|${toId(roster.courseId)}`;
        if (!pairs.has(key)) {
          pairs.set(key, {
            studentId: toId(member.studentId),
            courseId: toId(roster.courseId),
            courseName: roster.courseId?.name || "Course",
          });
        }
      })
  );

  const learners = [...pairs.values()];
  const students = await Student.find({ _id: { $in: learners.map((l) => l.studentId) } })
    .select("userId")
    .populate("userId", "name")
    .lean();
  const nameById = new Map(
    students.map((st) => [toId(st._id), formatUserName(st.userId?.name, "Learner")])
  );

  return learners.map((l) => ({ ...l, studentName: nameById.get(l.studentId) || "Learner" }));
};

exports.listTeacherLearners = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ userId: req.user.userId }).select("_id");
  if (!teacher) {
    return res.status(404).json({ success: false, message: "Teacher not found." });
  }

  const learners = await teacherLearners(teacher._id);
  res.status(200).json({ success: true, count: learners.length, learners });
});

// Creates an assignment for each chosen learner. A learner whose monthly cycle
// has already opened a placeholder gets that placeholder filled rather than a
// second assignment, so the cycle does not then open another one on top.
exports.createAssignment = asyncHandler(async (req, res) => {
  const { courseId, studentIds, title, description, dueDate } = req.body;

  const teacher = await Teacher.findOne({ userId: req.user.userId }).select("_id userId");
  if (!teacher) {
    return res.status(404).json({ success: false, message: "Teacher not found." });
  }

  const onRoster = new Set(
    (await teacherLearners(teacher._id))
      .filter((l) => l.courseId === String(courseId))
      .map((l) => l.studentId)
  );
  const refused = studentIds.filter((id) => !onRoster.has(String(id)));
  if (refused.length) {
    return res.status(403).json({
      success: false,
      message: `${refused.length} of the selected learners are not in your ${
        refused.length === 1 ? "class" : "classes"
      } for this course.`,
    });
  }

  const course = await Course.findById(courseId).select("name category").lean();
  const created = [];
  const filled = [];

  for (const studentId of studentIds) {
    const stub = await Assignment.findOne({
      teacherId: teacher._id,
      courseId,
      students: { $size: 1 },
      "students.0.studentId": studentId,
      "students.0.status": "reminder",
    });

    if (stub) {
      stub.title = title;
      stub.description = description || "";
      stub.dueDate = dueDate;
      stub.students[0].status = "assigned";
      await stub.save();
      filled.push(stub);
      continue;
    }

    try {
      created.push(
        await Assignment.create({
          courseId,
          teacherId: teacher._id,
          userId: teacher.userId,
          category: course?.category || undefined,
          title,
          description: description || "",
          dueDate,
          students: [{ studentId, status: "assigned" }],
        })
      );
    } catch (err) {
      // The cycle index allows one assignment per learner per course per due date.
      if (err?.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "One of these learners already has an assignment for this course due at that exact time. Pick a different due date.",
        });
      }
      throw err;
    }
  }

  const students = await Student.find({ _id: { $in: studentIds } }).select("userId").lean();
  createDashboardNotice({
    title: "New assignment posted",
    message: `You have a new assignment: "${title}", due ${new Date(dueDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
    userIds: students.map((st) => st.userId).filter(Boolean),
    creatorId: req.user.userId,
  }).catch((err) => console.error("Assignment student notice failed:", err.message));

  res.status(201).json({
    success: true,
    message: `Assigned to ${studentIds.length} learner${studentIds.length === 1 ? "" : "s"}.`,
    created: created.length,
    filledMonthlySlot: filled.length,
  });
});

exports.submitAssignment = asyncHandler(async (req, res) => {
    const { assignmentId, submissionUrl } = req.body;
    const studentId = req.user.roleId;

    if (!assignmentId || !submissionUrl) {
      return res.status(400).json({ message: "assignmentId and submissionUrl is required" });
    }

    const urlPattern =
      /^(https?:\/\/)?([\w.-]+\.[a-z]{2,})([\/\w.-]*)*(\?[^\s]*)?$/i;
    if (!urlPattern.test(submissionUrl)) {
      return res.status(400).json({ message: "Invalid submission URL." });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment)
      return res.status(404).json({ message: "Assignment not found" });

    const studentSubmission = assignment.students.find(
      (s) => s.studentId.toString() === studentId
    );
    if (!studentSubmission)
      return res
        .status(400)
        .json({ message: "Student not part of this assignment" });

    if (studentSubmission.submissionUrl) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this assignment.",
      });
    }
    
    studentSubmission.status = "pending";
    studentSubmission.submissionDate = new Date();
    studentSubmission.submissionUrl = submissionUrl;

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Video URL submitted successful",
      url: submissionUrl,
    });
});

exports.reviewSubmission = asyncHandler(async (req, res) => {
    const { assignmentId, studentId, feedback, rating } = req.body;

    const assignment = await Assignment.findById(assignmentId)
      .populate({
        path: "teacherId",
        populate: [
          { path: "userId", select: "name email image" },
          { path: "teacherDetail", select: "name qualification experience" },
        ],
      })
      .populate({
        path: "userId",
        select: "name email image",
      });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const teacher = await Teacher.findOne({ userId: req.user.userId }).select("_id");
    if (!teacher || toId(assignment.teacherId) !== toId(teacher._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only review assignments you set.",
      });
    }

    // Always the learner being reviewed — students[0] marked the wrong person
    // reviewed on any assignment shared by more than one learner.
    const studentSubmission = assignment.students.find(
      (s) => toId(s.studentId) === String(studentId)
    );

    if (!studentSubmission) {
      return res
        .status(404)
        .json({ message: "Student not found in this assignment" });
    }

    studentSubmission.feedback = feedback;
    studentSubmission.rating = rating;
    studentSubmission.status = "reviewed";

    await assignment.save();

    let instructorName = "Instructor not assigned";
    if (assignment.teacherId) {
      const userName = assignment.teacherId.userId?.name;
      const detailName = assignment.teacherId.teacherDetail?.name;

      if (userName?.firstName && userName?.lastName) {
        instructorName = `${userName.firstName} ${userName.lastName}`;
      } else if (detailName?.firstName && detailName?.lastName) {
        instructorName = `${detailName.firstName} ${detailName.lastName}`;
      }
    }

    const response = {
      assignmentTitle: assignment.title,
      instructorName,
      feedback: studentSubmission.feedback,
      rating: studentSubmission.rating || 0,
      status: studentSubmission.status,
      dueDate: assignment.dueDate,
    };

    res.status(200).json({
      success: true,
      message: "Assignment reviewed successfully",
      data: response,
    });
});

exports.getAssignmentsByStatus = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { status } = req.query;

    const teacher = await Teacher.findOne({ userId });
    if (!teacher)
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });

    const assignments = await Assignment.find({ teacherId: teacher._id })
      .populate({
        path: "students.studentId",
        populate: { path: "userId", select: "name email image" },
      })
      .populate("courseId", "name")
      .populate({
        path: "teacherId",
        populate: [
          { path: "userId", select: "name email image" },
          { path: "teacherDetail", select: "name" },
        ],
      })
      .populate("category", "name");

    const cleanAssignments = assignments.map((a) => ({
      _id: a._id,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      course: { _id: a.courseId._id, name: a.courseId.name },
      teacher: {
        _id: a.teacherId._id,
        name: a.teacherId.userId?.name
          ? `${a.teacherId.userId.name.firstName} ${a.teacherId.userId.name.lastName}`
          : a.teacherId.teacherDetail?.name
          ? `${a.teacherId.teacherDetail.name.firstName} ${a.teacherId.teacherDetail.name.lastName}`
          : "Instructor not assigned",
        email: a.teacherId.userId?.email || null,
        image: a.teacherId.userId?.image || null,
      },
      students: a.students.map((s) => ({
        _id: s.studentId._id,
        name: s.studentId.userId
          ? `${s.studentId.userId.name.firstName} ${s.studentId.userId.name.lastName}`
          : "Student",
        email: s.studentId.userId?.email || null,
        status: s.status,
        feedback: s.feedback,
        rating: s.rating,
        submissionUrl: s.submissionUrl,
        submissionDate: s.submissionDate,
        reminderSent: s.reminderSent || false,
      })),
    }));

    const grouped = {
      all: cleanAssignments,
      reminder: cleanAssignments.filter((a) =>
        a.students.some((s) => s.status === "reminder")
      ),
      assigned: cleanAssignments.filter((a) =>
        a.students.some((s) => s.status === "assigned")
      ),
      pending: cleanAssignments.filter((a) =>
        a.students.some((s) => s.status === "pending")
      ),
      reviewed: cleanAssignments.filter((a) =>
        a.students.some((s) => s.status === "reviewed")
      ),
      overdue: cleanAssignments.filter((a) =>
        a.students.some((s) => s.status === "overdue")
      ),
    };

    if (!status || status.toLowerCase() === "all") {
      return res.status(200).json({ success: true, data: grouped });
    }

    res.status(200).json({
      success: true,
      data: grouped[status.toLowerCase()] || [],
    });
});

exports.getStudentAssignments = asyncHandler(async (req, res) => {
    const studentId = req.user.roleId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignments = await Assignment.find({
      "students.studentId": studentId,
      "students.status": { $ne: "reminder" },
    })
      .populate("courseId", "name")
      .populate({
        path: "teacherId",
        populate: [
          { path: "userId", select: "name email image" },
          { path: "teacherDetail", select: "name qualification experience" },
        ],
      })
      .populate("category", "name")
      .lean();

    const studentAssignments = assignments.map((a) => {
      const studentData = a.students.find(
        (s) => s.studentId.toString() === studentId.toString()
      );

      let computedStatus = studentData?.status || "assigned";

      if (
        a.dueDate &&
        new Date(a.dueDate) < today &&
        (studentData?.status === "assigned" ||
          studentData?.status === "pending")
      ) {
        computedStatus = "overdue";
      }

      const teacherName =
        a.teacherId?.userId?.name?.firstName &&
        a.teacherId?.userId?.name?.lastName
          ? `${a.teacherId.userId.name.firstName} ${a.teacherId.userId.name.lastName}`
          : a.teacherId?.teacherDetail?.name
          ? `${a.teacherId.teacherDetail.name.firstName} ${a.teacherId.teacherDetail.name.lastName}`
          : "Instructor not assigned";

      return {
        _id: a._id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        course: {
          _id: a.courseId?._id,
          title: a.courseId?.title,
        },
        teacher: {
          name: teacherName,
          email: a.teacherId?.userId?.email || null,
          image: a.teacherId?.userId?.image || null,
        },
        assignmentStatus: computedStatus,
        submissionDate: studentData?.submissionDate,
        submissionUrl: studentData?.submissionUrl || [],
        feedback: studentData?.feedback || "",
        rating: studentData?.rating || null,
        isOverdue: computedStatus === "overdue",
      };
    });

    res.status(200).json({
      success: true,
      count: studentAssignments.length,
      data: studentAssignments,
    });
});
