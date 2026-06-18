const mongoose = require("mongoose");

const courseItemSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      default: null,
    },
    demoVideo: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    approvedCourseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      default: null,
    },
  },
  { _id: false }
);

const courseRequestSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    requestType: {
      type: String,
      enum: ["single", "multiple"],
      required: true,
    },
    courses: {
      type: [courseItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 1,
        message: "At least one course must be included in the request.",
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "mixed"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CourseRequest", courseRequestSchema);
