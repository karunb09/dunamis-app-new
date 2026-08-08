const mongoose = require("mongoose");
const { getMaxStudents } = require("../utils/slotCapacity");

const slotSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    slotType: {
      type: String,
      enum: ["demo", "enrolled"],
      required: true,
    },
    sessionType: {
      type: String,
      enum: ["standard", "premium"],
      required: true,
    },
    recurringDays: [
      {
        type: String,
        enum: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
      },
    ],
    isRecurring: { type: Boolean, default: false },
    batchLabel: { type: String, default: null },
    maxStudents: {
      type: Number,
      default: function () {
        return getMaxStudents(this);
      },
    },
    currentStudentsCount: {
      type: Number,
      default: 0,
    },
    parentAvailabilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher.weeklyAvailability",
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "student",
        default: [],
      },
    ],
    attendanceNotifiedAt: {
      type: Date,
      default: null,
    },
    classReminderSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

slotSchema.index({ date: 1, slotType: 1 });

module.exports = mongoose.model("Slot", slotSchema);
