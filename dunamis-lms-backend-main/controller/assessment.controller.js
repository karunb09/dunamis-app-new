const Assessment = require("../model/assessment.model");
const asyncHandler = require("../utils/asyncHandler");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model");
const Certificate = require("../model/certificate.model");
const Course = require("../model/course.model");
const Questionnaire = require("../model/questionnaire.model");
const { formatUserName } = require("../utils/formatName");
const { createDashboardNotice } = require("../utils/notificationService");
const { nextCertificateNumber } = require("../services/certificatePdf");

const toId = (value) => String(value?._id || value || "");

// The teacher record behind the logged-in user. req.user.roleId already holds
// it, but the existing handlers look it up by userId — keep that consistent.
const teacherFor = async (req) =>
  Teacher.findOne({ userId: req.user.userId }).select("_id userId");

exports.submitAssessment = asyncHandler(async (req, res) => {
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
});

// Sends one questionnaire to any number of the instructor's own assessments —
// a whole class or a single learner, the caller supplies the ids.
exports.sendQuestionnaire = asyncHandler(async (req, res) => {
  const { questionnaireId, assessmentIds } = req.body;

  const teacher = await teacherFor(req);
  if (!teacher) {
    return res
      .status(403)
      .json({ success: false, message: "Teacher not found or unauthorized." });
  }

  const questionnaire = await Questionnaire.findById(questionnaireId);
  if (!questionnaire || toId(questionnaire.teacherId) !== toId(teacher._id)) {
    return res
      .status(404)
      .json({ success: false, message: "Questionnaire not found." });
  }

  if (questionnaire.status !== "published") {
    return res.status(400).json({
      success: false,
      message: "Publish this questionnaire before sending it.",
    });
  }

  if (!questionnaire.questions.length) {
    return res
      .status(400)
      .json({ success: false, message: "This questionnaire has no questions yet." });
  }

  const assessments = await Assessment.find({
    _id: { $in: assessmentIds },
    teacherId: teacher._id,
    status: { $in: ["Pending", "Overdue", "Sent"] },
  }).populate("courseId", "name");

  if (!assessments.length) {
    return res.status(404).json({
      success: false,
      message: "No assessments of yours are waiting to be sent.",
    });
  }

  // Snapshot, so editing the questionnaire later never rewrites what a learner
  // was asked — and the answers stay readable if it is deleted.
  const snapshot = {
    title: questionnaire.title,
    questions: questionnaire.questions.map((q) => ({
      prompt: q.prompt,
      type: q.type,
      options: q.options,
      required: q.required,
    })),
  };

  const sentAt = new Date();
  await Assessment.updateMany(
    { _id: { $in: assessments.map((a) => a._id) } },
    {
      $set: {
        questionnaireId: questionnaire._id,
        questionnaire: snapshot,
        sentAt,
        sentBy: req.user.userId,
        status: "Sent",
      },
    }
  );

  const students = await Student.find({
    _id: { $in: assessments.map((a) => a.studentId) },
  })
    .select("userId")
    .lean();

  await createDashboardNotice({
    title: "Assessment form ready",
    message: `Your instructor has sent "${questionnaire.title}". Answer it and add your video link from the Assessments page.`,
    userIds: students.map((s) => s.userId).filter(Boolean),
    contentType: "Reminder",
  });

  res.status(200).json({
    success: true,
    message: `Sent to ${assessments.length} learner${
      assessments.length === 1 ? "" : "s"
    }.`,
    count: assessments.length,
  });
});

// The learner's side: their video link and their answers.
exports.submitAssessmentResponse = asyncHandler(async (req, res) => {
  const { videoUrl, answers } = req.body;

  const student = await Student.findOne({ userId: req.user.userId }).select("_id");
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }

  const assessment = await Assessment.findOne({
    _id: req.params.id,
    studentId: student._id,
  });

  if (!assessment) {
    return res
      .status(404)
      .json({ success: false, message: "Assessment not found." });
  }

  if (!assessment.sentAt) {
    return res.status(409).json({
      success: false,
      message: "Your instructor has not sent this assessment yet.",
    });
  }

  if (assessment.status === "Completed") {
    return res.status(409).json({
      success: false,
      message: "This assessment has already been scored and can no longer be changed.",
    });
  }

  const missing = (assessment.questionnaire?.questions || []).filter((q, index) => {
    if (!q.required) return false;
    const answer = answers[index];
    return q.type === "checkbox"
      ? !(answer?.selected || []).length
      : !(answer?.text || "").trim();
  });

  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: `Answer every required question — ${missing.length} still empty.`,
    });
  }

  assessment.submission = {
    videoUrl: videoUrl || "",
    answers: (assessment.questionnaire?.questions || []).map((q, index) => ({
      prompt: q.prompt,
      type: q.type,
      text: q.type === "fill_blank" ? answers[index]?.text || "" : "",
      selected: q.type === "checkbox" ? answers[index]?.selected || [] : [],
    })),
    submittedAt: new Date(),
  };
  assessment.status = "Submitted";
  await assessment.save();

  res.status(200).json({ success: true, data: assessment });
});

// The explicit award. Idempotent: a second tick returns the same certificate
// rather than minting a second number.
exports.issueCertificate = asyncHandler(async (req, res) => {
  const teacher = await teacherFor(req);
  if (!teacher) {
    return res
      .status(403)
      .json({ success: false, message: "Teacher not found or unauthorized." });
  }

  const assessment = await Assessment.findOne({
    _id: req.params.id,
    teacherId: teacher._id,
  });

  if (!assessment) {
    return res
      .status(404)
      .json({ success: false, message: "Assessment not found." });
  }

  if (assessment.status !== "Completed") {
    return res.status(409).json({
      success: false,
      message: "Score the assessment before issuing a certificate.",
    });
  }

  const existing = await Certificate.findOne({ assessmentId: assessment._id });
  if (existing) {
    return res.status(200).json({ success: true, certificate: existing });
  }

  const [student, course, teacherUser] = await Promise.all([
    Student.findById(assessment.studentId).populate("userId", "name").lean(),
    Course.findById(assessment.courseId).populate("category", "name").lean(),
    Teacher.findById(teacher._id).populate("userId", "name").lean(),
  ]);

  const certificate = await Certificate.create({
    studentId: assessment.studentId,
    courseId: assessment.courseId,
    teacherId: teacher._id,
    assessmentId: assessment._id,
    level: course?.level || "beginner",
    studentName: formatUserName(student?.userId?.name, "Student"),
    courseName: course?.name || "Course",
    categoryName: course?.category?.name || "",
    instructorName: formatUserName(teacherUser?.userId?.name, "Instructor"),
    certificateNumber: await nextCertificateNumber(),
    issuedBy: req.user.userId,
  });

  assessment.certificateId = certificate._id;
  await assessment.save();

  if (student?.userId?._id) {
    await createDashboardNotice({
      title: "Certificate awarded",
      message: `Your ${certificate.level} certificate for ${certificate.courseName} is ready to download from your profile.`,
      userIds: [student.userId._id],
      contentType: "Transactional",
    });
  }

  res.status(201).json({ success: true, certificate });
});

exports.getTeacherAssessments = asyncHandler(async (req, res) => {
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

    // Every status needs a bucket — an assessment whose status has no bucket
    // silently disappears from the instructor's page.
    const grouped = {
      pending: [],
      overdue: [],
      sent: [],
      submitted: [],
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
        studentId: assessment.studentId?._id,
        questionnaire: assessment.sentAt ? assessment.questionnaire : null,
        sentAt: assessment.sentAt || null,
        submission: assessment.submission?.submittedAt ? assessment.submission : null,
        certificateId: assessment.certificateId || null,
      };

      const bucket = {
        Pending: grouped.pending,
        Overdue: grouped.overdue,
        Sent: grouped.sent,
        Submitted: grouped.submitted,
        Completed: grouped.completed,
      }[assessment.status];
      if (bucket) bucket.push(data);
    });

    res.status(200).json({
      success: true,
      message: "Teacher assessments fetched successfully.",
      data: grouped,
    });
});

exports.getStudentAssessments = asyncHandler(async (req, res) => {
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
      questionnaire: a.sentAt ? a.questionnaire : null,
      sentAt: a.sentAt,
      submission: a.submission?.submittedAt ? a.submission : null,
      certificateId: a.certificateId,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: formattedAssessments.length,
      data: formattedAssessments,
    });
});

exports.getAllAssessments = asyncHandler(async (req, res) => {
    const data = await Assessment.find()
      .populate("studentId", "userId")
      .populate("courseId", "name")
      .populate("teacherId", "userId");
    res.status(200).json({ success: true, count: data.length, data });
});
