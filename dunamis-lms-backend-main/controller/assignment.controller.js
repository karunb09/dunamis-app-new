const Assignment = require("../model/assignment.model");
const asyncHandler = require("../utils/asyncHandler");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const { createDashboardNotice } = require("../utils/notificationService");

exports.createAssignment = asyncHandler(async (req, res) => {
    const { assignmentId, title, description, dueDate } = req.body;

    if (!assignmentId || !title || !dueDate || !description) {
      return res.status(400).json({
        success: false,
        message: "title, dueDate, description, and assignmentId are required.",
      });
    }

    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found." });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found." });
    }

    if (assignment.teacherId.toString() !== teacher._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this assignment.",
      });
    }

    assignment.title = title;
    assignment.description = description;
    assignment.dueDate = new Date(dueDate);

    assignment.students = assignment.students.map((s) => ({
      ...s.toObject(),
      status: "assigned",
    }));

    await assignment.save();

    Student.find({ _id: { $in: assignment.students.map((s) => s.studentId) } })
      .select("userId")
      .then((students) =>
        createDashboardNotice({
          title: "New assignment posted",
          message: `You have a new assignment: "${title}", due ${new Date(dueDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
          userIds: students.map((s) => s.userId),
          creatorId: req.user.userId,
        })
      )
      .catch((err) => console.error("Assignment student notice failed:", err.message));

    res.status(201).json({
        success: true,
        message: "Assignment assigned successfully.",
        assignment,
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
    const { assignmentId, feedback, rating } = req.body;

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

    const studentSubmission = assignment.students[0];

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
      course: { _id: a.courseId._id, title: a.courseId.title },
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
