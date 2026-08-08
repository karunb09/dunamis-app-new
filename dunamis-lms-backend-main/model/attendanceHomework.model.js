const mongoose = require("mongoose");

const attendanceHomeworkSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    sessionType: {
      type: String,
      enum: ["standard", "premium"],
      required: true,
    },
    attendanceStatus: {
      type: String,
      enum: ["Present", "Absent"],
      required: true,
    },
    homework: {
      type: String,
      default: "",
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content.modules",
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

attendanceHomeworkSchema.index(
  { studentId: 1, courseId: 1, date: 1 },
  { unique: true }
);
attendanceHomeworkSchema.index({ date: -1 });

module.exports = mongoose.model("attendanceHomework", attendanceHomeworkSchema);
