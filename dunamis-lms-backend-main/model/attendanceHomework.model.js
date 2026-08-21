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

// One row per student per class occurrence. slotId (not date) is the class
// identity: a student can attend two batches of the same course on the same
// day — Wed-Sat and Sat-Sun both include Saturday — and a course can run both
// premium (1:1) and standard (group) sections.
attendanceHomeworkSchema.index({ slotId: 1, studentId: 1 }, { unique: true });
// Replaces the studentId prefix the old unique key used to provide.
attendanceHomeworkSchema.index({ studentId: 1, date: -1 });
attendanceHomeworkSchema.index({ date: -1 });

module.exports = mongoose.model("attendanceHomework", attendanceHomeworkSchema);
