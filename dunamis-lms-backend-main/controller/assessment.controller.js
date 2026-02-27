const Assessment = require("../model/assessment.model");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model")

exports.submitAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { homework, practice, speed, performance, trainerFeedback } =
      req.body;
    const userId = req.user.userId;

    if (
      homework == null ||
      practice == null ||
      speed == null ||
      performance == null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (homework, practice, speed, performance) are required.",
      });
    }

    const teacher = await Teacher.findOne({ userId }).select("_id");
    if (!teacher) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Teacher not found or unauthorized.",
        });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res
        .status(404)
        .json({ success: false, message: "Assessment not found." });
    }

    if (
      !assessment.teacherId ||
      assessment.teacherId.toString() !== teacher._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to submit this assessment (not assigned teacher)..",
      });
    }

    if (assessment.status === "Completed") {
      return res
        .status(400)
        .json({ success: false, message: "Assessment already completed." });
    }

    assessment.homework = Number(homework);
    assessment.practice = Number(practice);
    assessment.learningSpeed = Number(speed);
    assessment.performanceSkills = Number(performance);
    assessment.trainerFeedback = trainerFeedback || "";
    assessment.assessmentDate = new Date();
    assessment.status = "Completed";

    assessment.totalScore =
      Number(homework) + Number(practice) + Number(speed) + Number(performance);

    await assessment.save();

    res.status(200).json({
      success: true,
      message: "Assessment submitted successfully.",
      data: assessment,
    });
  } catch (error) {
    console.error("Error submitting assessment:", error);
    res.status(500).json({
      success: false,
      message: "Server error while submitting assessment.",
      error: error.message,
    });
  }
};

exports.getTeacherAssessments = async (req, res) => {
  try {
    const userId = req.user.userId;

    const teacher = await Teacher.findOne({ userId }).select("_id name");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const assessments = await Assessment.find({ teacherId: teacher._id })
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "name email",
        },
      })
      .populate("courseId", "name")
      .sort({ dueDate: -1 });

    const grouped = {
      pending: [],
      overdue: [],
      completed: [],
    };

    assessments.forEach((assessment) => {
      const data = {
        _id: assessment._id,
        studentName: assessment.studentId?.userId?.name || "Unknown Student",
        studentEmail: assessment.studentId?.userId?.email || "",
        courseId: assessment.courseId?._id,
        courseTitle: assessment.courseId?.name || "Untitled Course",
        dueDate: assessment.dueDate,
        assessmentDate: assessment.assessmentDate || null,
        status: assessment.status,
        homework: assessment.homework || null,
        performanceSkills: assessment.performanceSkills || null,
        learningSpeed: assessment.learningSpeed || null,
        practice: assessment.practice || null,
        totalScore: assessment.totalScore || null,
        trainerFeedback: assessment.trainerFeedback || "",
      };

      if (assessment.status === "Pending") grouped.pending.push(data);
      else if (assessment.status === "Overdue") grouped.overdue.push(data);
      else if (assessment.status === "Completed") grouped.completed.push(data);
    });

    res.status(200).json({
      success: true,
      message: "Teacher assessments fetched successfully.",
      data: grouped,
    });
  } catch (error) {
    console.error("Error fetching teacher assessments:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching assessments.",
      error: error.message,
    });
  }
};

exports.getStudentAssessments = async (req, res) => {
  try {
    const userId = req.user.userId;

    const student = await Student.findOne({ userId }).select("_id name");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const assessments = await Assessment.find({ studentId: student._id })
      .populate({
        path: "teacherId",
        select: "_id userId",
        populate: {
          path: "userId",
          select: "name",
        },
      })
      .populate("courseId", "name")
      .sort({ dueDate: -1 });
    
    const formattedAssessments = assessments.map((a) => ({
      _id: a._id,
      studentId: a.studentId,
      course: a.courseId?.name || null,
      courseId: a.courseId?._id,
      teacherId: a.teacherId?._id,
      teacherName: `${a.teacherId?.userId?.name?.firstName || ""} ${
        a.teacherId?.userId?.name?.lastName || ""
      }`.trim(),
      homework: a.homework,
      performanceSkills: a.performanceSkills,
      learningSpeed: a.learningSpeed,
      practice: a.practice,
      totalScore: a.totalScore,
      trainerFeedback: a.trainerFeedback,
      status: a.status,
      dueDate: a.dueDate,
      assessmentDate: a.assessmentDate,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: formattedAssessments.length,
      data: formattedAssessments,
    });
  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

exports.getAllAssessments = async (req, res) => {
  try {
    const data = await Assessment.find()
      .populate("studentId", "userId")
      .populate("courseId", "name")
      .populate("teacherId", "userId");
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
