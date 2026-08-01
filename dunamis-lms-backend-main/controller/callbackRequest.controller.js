const CallbackRequest = require("../model/callbackRequest.model");
const Course = require("../model/course.model");
const asyncHandler = require("../utils/asyncHandler");

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

exports.getAllCallbackRequests = asyncHandler(async (req, res) => {
  const { status, courseId } = req.query;
  const query = {};
  if (status) query.status = status;
  if (courseId) query.courseId = courseId;

  const callbackRequests = await CallbackRequest.find(query)
    .populate({ path: "courseId", select: "name code category" })
    .sort({ createdAt: -1 });

  res.json({ success: true, callbackRequests });
});

exports.updateCallbackRequest = asyncHandler(async (req, res) => {
  const { status } = req.body;

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
