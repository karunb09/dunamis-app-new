const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    assessmentDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Overdue"],
      default: "Pending",
    },
    homework: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },
    performanceSkills: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },
    learningSpeed: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },
    practice: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },
    totalScore: {
      type: Number,
      default: null,
    },
    trainerFeedback: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Unique record per assessment cycle
assessmentSchema.index(
  { studentId: 1, courseId: 1, dueDate: 1 },
  { unique: true }
);

module.exports = mongoose.model("assessment", assessmentSchema);
