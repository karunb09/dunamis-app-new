const mongoose = require("mongoose");

// Copied onto the assessment when the instructor sends it. Editing the source
// questionnaire afterwards must not rewrite what a learner was asked, and the
// answers have to stay readable if it is later deleted.
const questionSnapshotSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    type: { type: String, enum: ["fill_blank", "checkbox"], required: true },
    options: { type: [String], default: [] },
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    type: { type: String, enum: ["fill_blank", "checkbox"], required: true },
    // Free text for fill_blank; `selected` for checkbox. Answers are
    // qualitative — nothing is marked right or wrong.
    text: { type: String, default: "" },
    selected: { type: [String], default: [] },
  },
  { _id: false }
);

// Every move of a due date, and why. The billing clock keeps the same trail on
// payments.dueDateAdjustments.
const dueDateAdjustmentSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    fromDate: { type: Date, default: null },
    toDate: { type: Date, default: null },
    days: { type: Number, default: 0 },
    reason: { type: String, default: "" },
  },
  { _id: false }
);

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
    // Pending  — scheduled by the cycle, questionnaire not sent yet
    // Sent      — instructor has sent the questionnaire to the learner
    // Submitted — learner has answered it
    // Completed — instructor has scored it
    status: {
      type: String,
      enum: ["Pending", "Sent", "Submitted", "Completed", "Overdue"],
      default: "Pending",
    },
    questionnaireId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Questionnaire",
      default: null,
    },
    questionnaire: {
      title: { type: String, default: "" },
      questions: { type: [questionSnapshotSchema], default: [] },
    },
    sentAt: { type: Date, default: null },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    submission: {
      videoUrl: { type: String, default: "" },
      answers: { type: [answerSchema], default: [] },
      submittedAt: { type: Date, default: null },
    },
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Certificate",
      default: null,
    },
    dueDateAdjustments: { type: [dueDateAdjustmentSchema], default: [] },
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
