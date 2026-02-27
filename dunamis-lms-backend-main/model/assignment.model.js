const mongoose = require("mongoose");

const studentSubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    submissionDate: {
      type: Date,
    },
    submissionUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          const urlRegex =
            /^(https?:\/\/)?([\w.-]+\.[a-z]{2,})([\/\w.-]*)*(\?[^\s]*)?$/i;
          return urlRegex.test(v);
        },
        message: "Invalid video submission URL.",
      },
    },
    status: {
      type: String,
      enum: ["reminder", "assigned", "reviewed", "overdue", "pending"],
      default: "reminder",
    },
    grade: {
      type: String,
    },
    feedback: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    title: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    dueDate: {
      type: Date,
      required: null,
    },
    students: {
      type: [studentSubmissionSchema],
    },
  },
  { timestamps: true }
);

// Unique record per 3-month assignment cycle
assignmentSchema.index(
  { "students.studentId": 1, courseId: 1, dueDate: 1 },
  { unique: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
