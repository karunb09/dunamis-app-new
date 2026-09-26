const mongoose = require("mongoose");

// What an instructor earns per learner per month, before attendance pro-rata.
// Rates are absolute per level rather than "beginner + 250" deltas so a level
// can be repriced without recomputing the ones above it.
const instructorRateSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    sessionType: {
      type: String,
      enum: ["standard", "premium"],
      required: true,
    },
    ratePerLearnerMonth: {
      type: Number,
      required: true,
      min: 0,
    },
    // The full month's sessions this rate buys — two a week.
    sessionsPerMonth: {
      type: Number,
      default: 8,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  { timestamps: true }
);

instructorRateSchema.index(
  { categoryId: 1, level: 1, sessionType: 1 },
  { unique: true }
);

module.exports = mongoose.model("InstructorRate", instructorRateSchema);
