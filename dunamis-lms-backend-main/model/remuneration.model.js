const mongoose = require("mongoose");

const remunerationSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    month: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
    },
    workDays: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0, // e.g. 50%
    },
    basic: {
      type: Number,
      default: 0,
    },
    deductions: {
      type: Number,
      default: 0, // percentage
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    totalEarningsInWords: {
      type: String,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    groupHours: {
      type: Number,
      default: 0,
    },
    individualHours: {
      type: Number,
      default: 0,
    },
    missedClasses: {
      type: Number,
      default: 0,
    },
    groupStudents: {
      type: Number,
      default: 0,
    },
    individualStudents: {
      type: Number,
      default: 0,
    },
    demoStudents: {
      type: Number,
      default: 0,
    },
    payStatus: {
      type: String,
      enum: ["Due", "Paid"],
      default: "Due",
    },
    paySlipUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Remuneration", remunerationSchema);
