const asyncHandler = require("../utils/asyncHandler");
const CourseRequest = require("../model/courseRequest.model");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");
const { localFileUpload } = require("../utils/locallyUploader");
const mailSender = require("../utils/mailSender");

const VIDEO_MIMES = ["video/mp4", "video/mpeg", "video/avi", "video/quicktime"];

exports.submitCourseRequest = asyncHandler(async (req, res) => {
  const teacherId = req.user.roleId;
  const { requestType } = req.body;

  if (!requestType || !["single", "multiple"].includes(requestType)) {
    return res.status(400).json({ success: false, message: "requestType must be 'single' or 'multiple'" });
  }

  let coursesRaw;
  try {
    coursesRaw = typeof req.body.courses === "string" ? JSON.parse(req.body.courses) : req.body.courses;
  } catch {
    return res.status(400).json({ success: false, message: "Invalid courses JSON" });
  }

  if (!Array.isArray(coursesRaw) || coursesRaw.length === 0) {
    return res.status(400).json({ success: false, message: "At least one course is required" });
  }

  const courses = [];
  for (let i = 0; i < coursesRaw.length; i++) {
    const item = coursesRaw[i];
    if (!item.category) {
      return res.status(400).json({ success: false, message: `courses[${i}].category is required` });
    }
    let demoVideo = null;
    const videoFile = req.files?.[`demoVideo_${i}`];
    if (videoFile) {
      const [uploaded] = await localFileUpload(videoFile, VIDEO_MIMES);
      demoVideo = uploaded.path;
    }
    courses.push({
      category: item.category,
      subCategory: item.subCategory || null,
      demoVideo,
    });
  }

  const courseRequest = await CourseRequest.create({ instructor: teacherId, requestType, courses });

  const populated = await courseRequest.populate([
    { path: "courses.category", select: "name" },
    { path: "courses.subCategory", select: "name" },
  ]);

  res.status(201).json({ success: true, data: populated });
});

exports.getMyRequests = asyncHandler(async (req, res) => {
  const teacherId = req.user.roleId;
  const requests = await CourseRequest.find({ instructor: teacherId })
    .populate("courses.category", "name")
    .populate("courses.subCategory", "name")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: requests });
});

exports.getAllRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status && ["pending", "approved", "rejected", "mixed"].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const requests = await CourseRequest.find(filter)
    .populate({
      path: "instructor",
      select: "userId teacherDetail",
      populate: [
        { path: "userId", select: "name email image" },
        { path: "teacherDetail", select: "name profilePicture" },
      ],
    })
    .populate("courses.category", "name")
    .populate("courses.subCategory", "name")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: requests });
});

exports.updateRequestStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({ success: false, message: "status must be 'approved' or 'rejected'" });
  }

  const request = await CourseRequest.findById(id).populate({
    path: "instructor",
    select: "userId teacherDetail",
    populate: [
      { path: "userId", select: "name email" },
      { path: "teacherDetail", select: "name" },
    ],
  });

  if (!request) return res.status(404).json({ success: false, message: "Course request not found" });

  request.status = status;
  request.reviewedAt = new Date();
  if (adminNotes !== undefined) request.adminNotes = adminNotes;
  await request.save();

  const instructorEmail = request.instructor?.userId?.email;
  const firstName = request.instructor?.teacherDetail?.name?.firstName || "Instructor";
  if (instructorEmail) {
    const statusLabel = status === "approved" ? "Approved" : "Rejected";
    const noteSection = adminNotes ? `<p><strong>Admin Note:</strong> ${adminNotes}</p>` : "";
    const body = `<p>Dear ${firstName},</p>
<p>Your course request has been <strong>${statusLabel}</strong>.</p>
${noteSection}
<p>Log in to your dashboard to view details.</p>
<p>— Dunamis Team</p>`;
    try {
      await mailSender(instructorEmail, `Course Request ${statusLabel}`, body);
    } catch {
      // non-fatal — status already saved
    }
  }

  res.json({ success: true, data: request });
});

const ITEM_POPULATE = [
  {
    path: "instructor",
    select: "userId teacherDetail",
    populate: [
      { path: "userId", select: "name email image" },
      { path: "teacherDetail", select: "name profilePicture" },
    ],
  },
  { path: "courses.category", select: "name" },
  { path: "courses.subCategory", select: "name" },
  { path: "courses.approvedCourseId", select: "name image" },
];

exports.updateCourseItemStatus = asyncHandler(async (req, res) => {
  const { id, itemIndex } = req.params;
  const { status, adminNotes, courseId } = req.body;
  const idx = parseInt(itemIndex, 10);

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ success: false, message: "status must be 'approved' or 'rejected'" });
  }

  const request = await CourseRequest.findById(id);
  if (!request) return res.status(404).json({ success: false, message: "Course request not found" });
  if (isNaN(idx) || idx < 0 || idx >= request.courses.length) {
    return res.status(400).json({ success: false, message: "Invalid course item index" });
  }
  if (request.courses[idx].status !== "pending") {
    return res.status(400).json({ success: false, message: "This item has already been reviewed" });
  }

  request.courses[idx].status = status;
  if (adminNotes !== undefined) request.courses[idx].adminNotes = adminNotes;

  if (status === "approved") {
    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId is required when approving" });
    }
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    await Course.findByIdAndUpdate(courseId, { $addToSet: { teacher: request.instructor } });
    await Teacher.findByIdAndUpdate(request.instructor, { $addToSet: { course: courseId } });
    request.courses[idx].approvedCourseId = courseId;
  }

  // Recompute top-level status once all items are decided
  const allDecided = request.courses.every((c) => c.status !== "pending");
  if (allDecided) {
    const approvedCount = request.courses.filter((c) => c.status === "approved").length;
    const rejectedCount = request.courses.filter((c) => c.status === "rejected").length;
    if (approvedCount > 0 && rejectedCount > 0) request.status = "mixed";
    else request.status = approvedCount > 0 ? "approved" : "rejected";
    request.reviewedAt = new Date();
  }

  await request.save();
  await request.populate(ITEM_POPULATE);

  res.json({ success: true, data: request });
});
