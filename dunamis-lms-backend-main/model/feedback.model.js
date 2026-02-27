const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    courseRating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    instructorRating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    additionalFeedback: { type: String },
  },
  { timestamps: true }
);

//  one feedback per student per course
feedbackSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
