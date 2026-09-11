const mongoose = require("mongoose");

// The record of truth for "which level did this learner complete". There is no
// second level field on Student — the certificates are the level history, and
// the Profile page groups by them.
const certificateSchema = new mongoose.Schema(
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
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "assessment",
      required: true,
      unique: true,
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    // Snapshots: a certificate already awarded must not change because a course
    // was renamed or a learner updated their profile.
    studentName: { type: String, required: true },
    courseName: { type: String, required: true },
    categoryName: { type: String, default: "" },
    instructorName: { type: String, default: "" },
    certificateNumber: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    // Cached render, keyed by a hash of everything printed — same contract as
    // the payslip cache.
    pdfFile: {
      hash: { type: String, default: null },
      path: { type: String, default: null },
      generatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

certificateSchema.index({ studentId: 1, issuedAt: -1 });

module.exports = mongoose.model("Certificate", certificateSchema);
