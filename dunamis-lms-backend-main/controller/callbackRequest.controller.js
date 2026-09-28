const CallbackRequest = require("../model/callbackRequest.model");
const Course = require("../model/course.model");
const asyncHandler = require("../utils/asyncHandler");
const { getScope } = require("../middleware/auth");

exports.createCallbackRequest = asyncHandler(async (req, res) => {
  const { courseId, name, phone, preferredTime } = req.body;

  const course = await Course.findById(courseId).select("_id");
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  const callbackRequest = await CallbackRequest.create({
    courseId,
    name,
    phone,
    preferredTime: preferredTime || "",
  });

  res.status(201).json({
    success: true,
    message: "Callback request submitted successfully",
    callbackRequest,
  });
});

// Callback requests name a course but no branch: a scoped admin sees those
// for their online courses and for offline courses taught at their branches.
const coursesInArea = async (area) => [
  ...area.courseIds,
  ...(await Course.find({ mode: "offline", branches: { $in: area.branchIds } }).distinct("_id")),
];

exports.getAllCallbackRequests = asyncHandler(async (req, res) => {
  const { status, courseId } = req.query;
  const query = {};
  if (status) query.status = status;
  if (courseId) query.courseId = courseId;
  const area = await getScope(req);
  if (area) query.$and = [{ courseId: { $in: await coursesInArea(area) } }];

  const callbackRequests = await CallbackRequest.find(query)
    .populate({ path: "courseId", select: "name code category" })
    .sort({ createdAt: -1 });

  res.json({ success: true, callbackRequests });
});

exports.updateCallbackRequest = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const area = await getScope(req);
  if (area) {
    const existing = await CallbackRequest.findById(req.params.id).select("courseId").lean();
    const allowed = (await coursesInArea(area)).map(String);
    if (!existing || !allowed.includes(String(existing.courseId))) {
      return res.status(404).json({ success: false, message: "Callback request not found" });
    }
  }

  const callbackRequest = await CallbackRequest.findByIdAndUpdate(
    req.params.id,
    { status },
    { returnDocument: "after", runValidators: true }
  );

  if (!callbackRequest) {
    return res.status(404).json({ success: false, message: "Callback request not found" });
  }

  res.json({
    success: true,
    message: "Callback request updated successfully",
    callbackRequest,
  });
});
