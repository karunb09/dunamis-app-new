const mongoose = require("mongoose");

// Answers are qualitative — nothing is marked right or wrong. The instructor
// reads the responses and scores the assessment themselves.
const questionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true, maxlength: 500 },
    type: {
      type: String,
      enum: ["fill_blank", "checkbox"],
      required: true,
    },
    // Checkbox items only; a fill_blank is free text.
    options: { type: [String], default: [] },
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

// An instructor's own reusable form. They build it once and send it to a whole
// class or to individual learners; authorship is recorded because this becomes
// billable work later.
const questionnaireSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    // Optional scoping — a library filter, not a restriction on who it can go to.
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      default: null,
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", null],
      default: null,
    },
    // A draft can be edited freely; only a published one can be sent.
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true }
);

questionnaireSchema.index({ teacherId: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model("Questionnaire", questionnaireSchema);
