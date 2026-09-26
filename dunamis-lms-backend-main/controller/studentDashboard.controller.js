const Student = require("../model/student.model");
const asyncHandler = require("../utils/asyncHandler");
const { buildStudentDashboard } = require("../services/studentDashboard");

exports.getMyDashboard = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user.userId }).select("_id");
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found." });
  }
  res.status(200).json({ success: true, ...(await buildStudentDashboard(student._id)) });
});
