const Feedback = require("../model/feedback.model");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model");
const updateTeacherStats = require("../utils/updateTeacherStats");

// Create Feedback
exports.createFeedback = async (req, res) => {
  try {
    const {
      courseId,
      teacherId,
      instructorRating,
      courseRating,
      additionalFeedback,
    } = req.body;
    const studentId = req.user.userId;

    if (!courseId || !teacherId || !instructorRating || !courseRating) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // validate references
    const course = await Course.findById(courseId);
    const teacher = await Teacher.findById(teacherId);
    const student = await Student.findOne({ userId: studentId });

    if (!course || !teacher || !student) {
      return res.status(404).json({
        success: false,
        message: "Invalid course, teacher, or student",
      });
    }

    const feedback = await Feedback.create({
      courseId,
      teacherId,
      studentId: student._id,
      instructorRating,
      courseRating,
      additionalFeedback,
    });

    await updateTeacherStats(courseId);

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted feedback for this course.",
      });
    }
    console.error("Error creating feedback:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get Feedback for a Course
exports.getFeedbackByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const feedbacks = await Feedback.find({ courseId })
      .populate("teacherId", "userId")
      .populate("studentId", "userId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching feedback",
      error: error.message,
    });
  }
};

// Get Feedback for a Teacher
exports.getFeedbackByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const feedbacks = await Feedback.find({ teacherId: teacherId })
      .populate("courseId", "name")
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "name",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching feedback",
      error: error.message,
    });
  }
};

// Delete Feedback
exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findByIdAndDelete(id);

    if (!feedback) {
      return res
        .status(404)
        .json({ success: false, message: "Feedback not found" });
    }

    res.status(200).json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting feedback",
      error: error.message,
    });
  }
};
