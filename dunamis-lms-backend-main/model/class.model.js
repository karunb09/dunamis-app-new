const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      default: "absent",
    },
    joinedAt: { type: Date },
    leftAt: { type: Date },
  },
  { timestamps: true }
);

const classSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    mode: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
    students: [attendanceSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", classSchema);
