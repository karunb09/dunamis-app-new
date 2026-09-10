const mongoose = require("mongoose");

// One earning line per learner per class the instructor taught that month.
const payoutLineSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    studentName: { type: String, default: "" },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    courseName: { type: String, default: "" },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    categoryName: { type: String, default: "" },
    level: { type: String, default: "" },
    sessionType: { type: String, enum: ["standard", "premium"], required: true },
    sessionsAttended: { type: Number, default: 0 },
    sessionsPerMonth: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    // No rate card row covers this category/level/session type. The line is
    // kept at zero and surfaced, never silently dropped.
    rateMissing: { type: Boolean, default: false },
  },
  { _id: false }
);

const adjustmentSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    // Negative for a deduction.
    amount: { type: Number, required: true },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const remunerationSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    // YYYY-MM
    month: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    lines: { type: [payoutLineSchema], default: [] },
    demoConversions: { type: Number, default: 0 },
    demoAmount: { type: Number, default: 0 },
    adjustments: { type: [adjustmentSchema], default: [] },
    groupStudents: { type: Number, default: 0 },
    individualStudents: { type: Number, default: 0 },
    demoStudents: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalEarningsInWords: { type: String, default: "" },
    payDueDate: { type: Date, default: null },
    generatedAt: { type: Date, default: Date.now },
    // Until this is set the payout is a draft: admins can see and edit it, the
    // instructor cannot see it at all.
    approvedAt: { type: Date, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    payStatus: {
      type: String,
      enum: ["Due", "Paid"],
      default: "Due",
    },
    // Cached payslip render. `hash` covers everything the PDF prints, so an
    // edited adjustment invalidates the file without anything having to
    // remember to delete it.
    payslipFile: {
      hash: { type: String, default: null },
      path: { type: String, default: null },
      generatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// Regeneration upserts the month rather than failing on a duplicate.
remunerationSchema.index({ teacherId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Remuneration", remunerationSchema);
