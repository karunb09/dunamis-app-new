// utils/updateTeacherStats.js
const mongoose = require("mongoose");
const Teacher = require("../model/teacher.model");
const Course = require("../model/course.model");
const Student = require("../model/student.model");
const Feedback = require("../model/feedback.model");

/**
 * Update teacher stats (studentCount + averageRating)
 * Works even if course is deleted or reassigned.
 * @param {ObjectId | string} courseId - The course ID or teacher ID.
 * @param {boolean} isTeacherId - Set true if passing a teacherId instead of courseId.
 */
async function updateTeacherStats(courseIdOrTeacherId, isTeacherId = false) {
  try {
    let teacherId;

    if (isTeacherId) {
      teacherId = courseIdOrTeacherId;
    } else {
      const course = await Course.findById(courseIdOrTeacherId).populate(
        "teacher"
      );
      if (!course || !course.teacher) return;
      teacherId = course.teacher._id;
    }

    // Fetch all teacher's courses
    const teacherCourses = await Course.find({ teacher: teacherId }).select(
      "_id"
    );
    const courseIds = teacherCourses.map((c) => c._id);

    // Count total unique students under this teacher
    const enrolledStudents = await Student.countDocuments({
      "enrolledCourses.courseId": { $in: courseIds },
    });

    // Calculate average instructor rating
    const feedbacks = await Feedback.find({ courseId: { $in: courseIds } });

    let averageRating = 0;
    if (feedbacks.length > 0) {
      const totalRating = feedbacks.reduce(
        (sum, f) => sum + f.instructorRating,
        0
      );
      averageRating = totalRating / feedbacks.length;
    }

    // Update teacher doc
    await Teacher.findByIdAndUpdate(teacherId, {
      studentCount: enrolledStudents,
      averageRating: averageRating.toFixed(2),
    });

    console.log(`Teacher stats updated for ${teacherId}`);
  } catch (err) {
    console.error("Error updating teacher stats:", err.message);
  }
}

module.exports = updateTeacherStats;
